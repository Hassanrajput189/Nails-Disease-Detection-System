
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from database.schema import PredictionResponse
import cv2
import numpy as np
from utils import  predict,make_scorecam_heatmap,overlay_heatmap,convert_to_base64,gatekeeper_inference
import time
import traceback

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
async def predict_grade(
    image: UploadFile = File(...),    
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
            return JSONResponse(
                    status_code=422,
                    content={
                        "message":"Unprocessable Image"
                    }
                )

        decode_time = time.perf_counter() - start


        # 3. Convert grayscale -> RGB

        start = time.perf_counter()

        img_rgb = cv2.cvtColor(img_gray, cv2.COLOR_GRAY2RGB)

        rgb_time = time.perf_counter() - start

        # Gate Keeper validation
        is_valid_knee = gatekeeper_inference(img_rgb)[0][0] >= 0.5        
        
        if(not is_valid_knee):
            return JSONResponse(
                        status_code=422,
                        content={
                            "message":"Please enter a valid nail image"
                        }
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
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})
