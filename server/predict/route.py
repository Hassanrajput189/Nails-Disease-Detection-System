
import base64
import time
import cv2
import numpy as np
from bson import ObjectId
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from CRUD.analysis.route import  create_analysis
from database.schema import PredictionResponse
from decouple import config
from utils import (
    predict,
    make_scorecam_heatmap,
    overlay_heatmap,
    convert_to_base64,
    gatekeeper_inference,
    handle_cloud_upload
)

router = APIRouter()

CLASS_LABELS = [
    "Healthy",
    "Acral_Lentiginous_Melanoma",
    "blue_finger",
    "clubbing",
    "Onychogryphosis",
    "pitting",
    "Onychomycosis",
    "psoriasis",
]


def make_original_preview(image_bytes: bytes) -> str:
    """
    Create a compact JPEG preview of the uploaded image.
    The preview preserves the original image's colours.
    """
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    original = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if original is None:
        raise HTTPException(
            status_code=422,
            detail="Unprocessable Image",
        )

    height, width = original.shape[:2]
    max_dimension = 512

    if max(height, width) > max_dimension:
        scale = max_dimension / max(height, width)
        new_width = max(1, int(width * scale))
        new_height = max(1, int(height * scale))

        original = cv2.resize(
            original,
            (new_width, new_height),
            interpolation=cv2.INTER_AREA,
        )

    success, encoded = cv2.imencode(
        ".jpg",
        original,
        [cv2.IMWRITE_JPEG_QUALITY, 80],
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Unable to save the uploaded image preview.",
        )

    encoded_string = base64.b64encode(encoded.tobytes()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded_string}"


@router.post("/predict", response_model=PredictionResponse)
async def predict_grade(
    image: UploadFile = File(...),    
    user_email: str = Form(...),
    ):

    try:
        total_start = time.perf_counter()

        class_labels = [
            "Healthy",
            "Acral_Lentiginous_Melanoma",
            "blue_finger",
            "clubbing",
            "Onychogryphosis",
            "pitting",
            "Onychomycosis",
            "psoriasis"
        ]


        # 1. Read uploaded image

        start = time.perf_counter()

        contents = await image.read()

        read_time = time.perf_counter() - start


        # 2. Decode image

        start = time.perf_counter()

        nparr = np.frombuffer(contents, np.uint8)
        img_gray = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        if img_gray is None:
            raise HTTPException(
                status_code=422,
                detail="Unprocessable Image"
            )

        decode_time = time.perf_counter() - start


        # 3. Convert grayscale -> RGB

        start = time.perf_counter()

        img_rgb = cv2.cvtColor(img_gray, cv2.COLOR_GRAY2RGB)

        rgb_time = time.perf_counter() - start

        # Gate Keeper validation        
        is_valid_knee = gatekeeper_inference(img_rgb)[0][0] >= 0.5        
        
        if(not is_valid_knee):
            raise HTTPException(
                status_code=422,
                detail="Please enter a valid nail image"
            )

        # 4. ROI extraction

        start = time.perf_counter()


        roi_time = time.perf_counter() - start


        # 5. Resize images

        start = time.perf_counter()

        img_resized = cv2.resize(img_rgb, (224, 224))
        img_heatmap = cv2.resize(img_rgb, (224, 224))

        resize_time = time.perf_counter() - start


        # 6. CNN prediction

        start = time.perf_counter()

        y_pred = predict(img_resized)

        prediction_time = time.perf_counter() - start


        # 7. Process prediction

        start = time.perf_counter()

        prediction_idx = int(np.argmax(y_pred))
        predicted_category = class_labels[prediction_idx]

        confidence = round(
            float(np.max(y_pred)),4)

        class_probs = {
            label: round(float(prob), 4)
            for label, prob in zip(class_labels, y_pred)
        }

        prediction_processing_time = time.perf_counter() - start


        analysis_data = {
        "userEmail": user_email,

        "result": {
            "predicted_category": predicted_category,
            "confidence": confidence,
            "class_probabilities": class_probs,
        },
        }
        CLOUD_NAME = config("CLOUD_NAME")
        if image:            
            output = await handle_cloud_upload(image,"KOA_X_ray_images",CLOUD_NAME,"nails_images")

            analysis_data["image"] = {
                "url": output["secure_url"],
                "publicId": output["public_id"],
            }
        else:
            analysis_data["image"] = {
                    "url": "not-available",
                    "publicId": "not-available",
            }

        create_analysis(analysis_data)
        
        # 8. Score-CAM heatmap

        start = time.perf_counter()

        heatmap = make_scorecam_heatmap(
            img_heatmap[np.newaxis, ...],            
        )

        scorecam_time = time.perf_counter() - start


        # 9. Overlay heatmap

        start = time.perf_counter()

        result_img = overlay_heatmap(
            img_gray,
            heatmap
        )

        overlay_time = time.perf_counter() - start


        # 10. Convert image to Base64

        start = time.perf_counter()

        converted_img = convert_to_base64(result_img)

        base64_time = time.perf_counter() - start


        # TOTAL

        total_time = time.perf_counter() - total_start


        # Print timing information

        print("\n========== PREDICTION TIMING ==========")
        print(f"Image read:              {read_time:.4f} sec")
        print(f"Image decode:            {decode_time:.4f} sec")
        print(f"Grayscale -> RGB:        {rgb_time:.4f} sec")
        print(f"ROI extraction:          {roi_time:.4f} sec")
        print(f"Image resize:            {resize_time:.4f} sec")
        print(f"CNN prediction:          {prediction_time:.4f} sec")
        print(f"Prediction processing:   {prediction_processing_time:.4f} sec")
        print(f"Score-CAM:                {scorecam_time:.4f} sec")
        print(f"Heatmap overlay:          {overlay_time:.4f} sec")
        print(f"Base64 conversion:       {base64_time:.4f} sec")        
        print(f"TOTAL TIME:              {total_time:.4f} sec")        

        return JSONResponse(
            status_code=200,
            content={
                "predicted_category": predicted_category,
                "confidence": confidence,
                "class_probabilities": class_probs,
                "heatmap": converted_img,                
            }
        )

    except Exception as e:        
        raise HTTPException(
        status_code=500,
        detail=str(e)
)


@router.get("/history")
def get_prediction_history(user_email: str):
    user_email = user_email.strip().lower()

    if not user_email:
        raise HTTPException(
            status_code=400,
            detail="User email is required.",
        )

    try:
        records = list(
            prediction_collection.find(
                {"user_email": user_email},
                {"heatmap": 0},
            ).sort("created_at", -1)
        )

        for record in records:
            record["id"] = str(record.pop("_id"))
            record["at"] = record.get("created_at")

        return {"predictions": records}

    except Exception as exc:
        print("History error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Unable to load prediction history.",
        )


@router.delete("/history/{prediction_id}")
def delete_prediction(prediction_id: str, user_email: str):
    user_email = user_email.strip().lower()

    if not user_email:
        raise HTTPException(
            status_code=400,
            detail="User email is required.",
        )

    if not ObjectId.is_valid(prediction_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid prediction ID.",
        )

    try:
        result = prediction_collection.delete_one(
            {
                "_id": ObjectId(prediction_id),
                "user_email": user_email,
            }
        )

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Result not found for this user.",
            )

        return {
            "success": True,
            "message": "Prediction deleted successfully.",
            "id": prediction_id,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("Delete prediction error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Unable to delete prediction.",
        )
