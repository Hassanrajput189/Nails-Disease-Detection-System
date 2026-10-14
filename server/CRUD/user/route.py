from fastapi import APIRouter,HTTPException
from pydantic import EmailStr
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from database.schema import User,UserUpdate,UserLogin
from database.connection import db
from database.db_utils import create_collection
from decouple import config
from argon2 import PasswordHasher
import smtplib
from email.message import EmailMessage
from CRUD.user.otp_utils import generate_otp, otp_store


router = APIRouter()

collection_name = config("USER_COLLECTION_NAME")
smtp_email = config("SMTP_EMAIL")
smtp_password = config("SMTP_PASSWORD")
collection = create_collection(db, collection_name)
ph = PasswordHasher()

# send_otp_email function

def send_otp_email(receiver_email, otp):

    msg = EmailMessage()

    msg["Subject"] = "Password Reset OTP"
    msg["From"] = smtp_email
    msg["To"] = receiver_email

    msg.set_content(
        f"Your password reset OTP is: {otp}\n\n"
        "This OTP is valid for password reset."
    )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(smtp_email, smtp_password)
        smtp.send_message(msg)


@router.post("/login")
def get_user_data(user:UserLogin):
    print("request coming")

    existing_user = collection.find_one({"email": user.email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail=f"Unable to find user with email {user.email}"
        )

    try:
        ph.verify(existing_user["password"], user.password)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail=f"The entered password for the email {user.email} is incorrect"
        )

    existing_user["_id"] = str(existing_user["_id"])

    response = JSONResponse(
        status_code=200,
        content={
            "message": "login successful",
            "user": jsonable_encoder(existing_user)
        }
    )
    

    response.set_cookie(
        key="user_email",
        value=str(user.email),
        max_age=86400,
        httponly=False,
        secure=False,
        samesite="lax"
    )

    return response
    
@router.get("/logout")
def logout():
    response = JSONResponse(
        status_code=200,
        content={"message": "Logged out successfully"}
    )
    
    response.delete_cookie(key="user_email")  
    
    return response

@router.post("/signup")
def create_user(user: User):
    existing_user = collection.find_one({"email": user.email})
    print("request came")

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")    
    
    hashed_password = ph.hash(user.password)

    user_data = user.model_dump(exclude = {"password"})
    user_data["password"] = hashed_password

    collection.insert_one(user_data)

    return JSONResponse(status_code = 201, content = {
        "message":"signup successful"
    })
    

    
@router.patch("/update")
def update_user(
    email:str,
    user:UserUpdate,
    ):
    existing_user = collection.find_one({"email": email})
    
    if not existing_user:
        raise HTTPException(status_code = 404,detail = "user not found")    
        
    user_info_to_update = user.model_dump(exclude_unset = True)
    
    password = user_info_to_update.get("password")
    if password:
        user_info_to_update["password"] = ph.hash(password)
    else:
        user_info_to_update.pop("password", None)

    updated_user = {"$set": user_info_to_update}

    collection.update_one({"email": email}, updated_user)        
    
    return JSONResponse(status_code = 200, content = {
        "message":"User updated successfully"
    })
    

@router.delete("/delete/{email}")
def delete_user(
    email:str,    
    ):
    existing_user = collection.find_one({"email": email})
    
    if not existing_user:
        raise HTTPException(status_code = 404,detail = "user not found")
    
    collection.delete_one(existing_user)
    
    return JSONResponse(status_code = 200, content = {
        "message":"User deleted successfully"
    })

    # //otp
@router.post("/forgot-password")
def forgot_password(email: EmailStr):

    existing_user = collection.find_one({"email": str(email)})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered"
        )

    otp = generate_otp()

    otp_store[str(email)] = otp

    try:
        send_otp_email(str(email), otp)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to send OTP: {str(e)}"
        )

    return JSONResponse(
        status_code=200,
        content={
            "message": "OTP sent successfully"
        }
    )




    # verify
@router.post("/verify-otp")
def verify_otp(email: EmailStr, otp: str):

    saved_otp = otp_store.get(str(email))

    if not saved_otp:
        raise HTTPException(
            status_code=400,
            detail="OTP expired or not found"
        )

    if saved_otp != otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    return JSONResponse(
        status_code=200,
        content={
            "message": "OTP verified successfully"
        }
    )
  

    # reset password 
@router.post("/reset-password")
def reset_password(email: EmailStr, new_password: str):

    existing_user = collection.find_one({"email": str(email)})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    hashed_password = ph.hash(new_password)

    result = collection.update_one(
        {"email": str(email)},
        {
            "$set": {
                "password": hashed_password
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Password could not be updated"
        )

    otp_store.pop(str(email), None)

    return JSONResponse(
        status_code=200,
        content={
            "message": "Password reset successfully"
        }
    )
