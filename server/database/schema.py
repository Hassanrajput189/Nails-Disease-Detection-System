from pydantic import BaseModel,Field, EmailStr
from typing import Annotated,Optional,Dict
from datetime import datetime

class User(BaseModel):
    name:Annotated[str,Field(...,max_length = 40,description = "Enter your name",example = "Muhammad Hassan")]
    email:Annotated[EmailStr,Field(...,description = "Enter your email" , example = "example@example.com")]
    password:Annotated[str, Field(...,min_length = 8,description = "Enter your password and do not share it with anyone", example = "examplepassword")]    
    createdAt: datetime = Field(default_factory=datetime.now)    
    
class UserLogin(BaseModel):    
    email:Annotated[EmailStr,Field(...,description = "Enter your email" , example = "example@example.com")]
    password:Annotated[str, Field(...,min_length = 8,description = "Enter your password and do not share it with anyone", example = "examplepassword")]        

class UserUpdate(BaseModel):
    name:Annotated[Optional[str],Field(max_length = 40,description = "Enter you name to update",example = "Muhammad Hassan",default = None)]
    password:Annotated[Optional[str], Field(min_length = 8,description = "Enter you password to update and do not share it with anyone",default = None)]    
class PredictionResponse(BaseModel):
    predicted_category:Annotated[str,Field(...,description = "The category predicted by the model",example = "kl_0")]
    confidence:Annotated[float,Field(...,description = "The confidence score by the model for the predicted category" , example = 0.86)]
    class_probabilities:Annotated[Dict[str,float], Field(
        ...,
        description="This will show the probabilities of all classes for any particular input",
        example={
            "Healthy": 0.45,
            "Acral_Lentiginous_Melanoma": 0.76,
            "blue_finger": 0.89,
            "clubbing": 0.13,
            "Onychogryphosis": 0.71,
            "pitting": 0.32,
            "Onychomycosis": 0.64,
            "psoriasis": 0.27
        }
    )]



class PatientInfo(BaseModel):
    fullName: str
    age: int
    gender: str
    patiendEmail: EmailStr
    
    contactNumber: Optional[str] = None    
    clinicalNotes: Optional[str] = None


class ImageInfo(BaseModel):
    url: str 
    publicId: str

class AnalysisResult(BaseModel):
    predicted_category:str
    confidence: float
    class_probabilities:Dict[str,float]


class Analysis(BaseModel):
    userEmail: EmailStr
    
    patient: PatientInfo

    image: ImageInfo

    result: AnalysisResult

    createdAt: datetime = Field(default_factory=datetime.now)    