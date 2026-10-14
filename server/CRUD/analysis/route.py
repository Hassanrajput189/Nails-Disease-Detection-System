from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from database.schema import Analysis
from database.connection import db
from database.db_utils import create_collection
from decouple import config
from fastapi import HTTPException

router = APIRouter()

collection_name = config("ANALYSIS_COLLECTION_NAME")
collection = create_collection(db, collection_name)


@router.post("/analysis")
def create_analysis(analysis: Analysis):    
    try:    
        analysis_data = analysis.model_dump()

        collection.insert_one(analysis_data)

        return JSONResponse(
            status_code=201,
            content={
                "message": "Analysis saved successfully",            
            }
        )
    except Exception as e:
        print("Error:", e)
        raise HTTPException(
            status_code=500, 
            detail="Internal Server Error | Please try again later"
        )


@router.get("/analysis/{user_email}")
def get_user_analyses(user_email: str):
    try :
        analyses = list(
            collection.find({"userEmail": user_email}).sort("createdAt", -1)
        )

        if not analyses:
            return JSONResponse(
            status_code=404,
            content={"detail": "No analysis found"}
            )
        for item in analyses:
            item.pop("_id", None)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Fetched successfully",
                "analysis_count": len(analyses),
                "analyses": jsonable_encoder(analyses)
            }
        )
    except Exception as e:
        print("Error:", e)
        raise HTTPException(
            status_code=500, 
            detail="Internal Server Error | Please try again later"
        )

    
    

@router.delete("/delete_analysis/{user_email}")
def delete_user_analysis(user_email: str):

    print("userEmail is:", user_email)

    try:
        result = collection.delete_many({
            "userEmail": user_email
        })

        print("result is:", result)

        return JSONResponse(
            status_code=200,
            content={
                "deleted_count": result.deleted_count,
                "message": "Deletion successful"
            }
        )

    except Exception as e:
        print("Error:", e)

        raise HTTPException(
            status_code=500,
            detail="Internal Server Error | Please try again later"
        )