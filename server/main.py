from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from predict.route import router as prediction_router
from CRUD.user.route import router as user_router
from CRUD.analysis.route import router as analysis_router

from utils import  download_and_load_classifier,download_and_load_detector
from fastapi.responses import JSONResponse
from decouple import config

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
CLIENT = config("CLIENT_URl")
print("client is ",CLIENT)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
download_and_load_classifier()
download_and_load_detector()

app.include_router(user_router)
app.include_router(analysis_router)
app.include_router(prediction_router)

@app.get("/")  
async def say_hello():
    return JSONResponse(
        status_code=200,
        content={
            "message": "Hello from Nails Disease Detection Server!",            
        }
    )