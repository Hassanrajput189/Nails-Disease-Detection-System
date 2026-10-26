from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from predict.route import router as prediction_router
from CRUD.user.route import router as user_router
from CRUD.analysis.route import router as analysis_router
from utils import  download_and_load_classifier,download_and_load_gatekeeper
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

CLIENT_URL = config("CLIENT_URL")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        CLIENT_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
download_and_load_gatekeeper()
download_and_load_classifier()

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