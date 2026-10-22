
from fastapi import APIRouter, HTTPException
from pydantic import EmailStr
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from database.schema import User, UserUpdate, UserLogin
from database.connection import db
from database.db_utils import create_collection
from decouple import config
from argon2 import PasswordHasher

import smtplib
from email.message import EmailMessage

from CRUD.user.otp_utils import (
    generate_otp,
    save_otp,
    verify_otp,
    mark_reset_verified,
    consume_reset_verification,
)


router = APIRouter()

collection_name = config("USER_COLLECTION_NAME")
smtp_email = config("SMTP_EMAIL")
smtp_password = config("SMTP_PASSWORD")


collection = create_collection(db, collection_name)
ph = PasswordHasher()



# SEND OTP EMAIL


def send_otp_email(receiver_email, otp, purpose="reset"):
    msg = EmailMessage()

    if purpose == "login":
        subject = "Your Login Verification Code - NailCare AI"
        heading = "Verify Your Login"
        description = (
            "Enter this verification code to complete "
            "your NailCare AI login."
        )
    else:
        subject = "Password Reset Code - NailCare AI"
        heading = "Reset Your Password"
        description = (
            "Use this verification code to continue "
            "resetting your password."
        )

    msg["Subject"] = subject
    msg["From"] = smtp_email
    msg["To"] = receiver_email

    msg.set_content(
        f"{heading}\n\n"
        f"{description}\n\n"
        f"Your verification code is: {otp}\n\n"
        "This code expires in 5 minutes. "
        "Never share your code with anyone."
    )

    msg.add_alternative(
        f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:24px;background:#f3f6f4;
                     font-family:Arial,sans-serif;color:#243b35;">
            <div style="max-width:520px;margin:auto;background:#ffffff;
                        border-radius:16px;overflow:hidden;
                        border:1px solid #dce7e0;">
                <div style="background:#164e41;padding:28px;
                            text-align:center;">
                    <h1 style="margin:0;color:#ffffff;">
                        NAILCARE AI
                    </h1>
                    <p style="color:#d8eee5;">
                        Nail Disease Detection System
                    </p>
                </div>

                <div style="padding:30px 26px;text-align:center;">
                    <h2 style="color:#164e41;">{heading}</h2>

                    <p style="font-size:15px;line-height:1.7;">
                        {description}
                    </p>

                    <div style="margin:26px 0;padding:20px;
                                background:#edf5f0;border-radius:12px;">
                        <p style="font-size:12px;">
                            YOUR VERIFICATION CODE
                        </p>
                        <div style="font-size:32px;font-weight:bold;
                                    letter-spacing:8px;color:#164e41;">
                            {otp}
                        </div>
                    </div>

                    <p>This code expires in <strong>5 minutes</strong>.</p>
                    <p style="font-size:12px;color:#77857e;">
                        If you did not request this code, ignore this email.
                        Never share your verification code with anyone.
                    </p>
                </div>

                <div style="padding:16px;text-align:center;
                            background:#f7faf8;font-size:11px;">
                    NailCare AI - Nail Disease Detection System
                </div>
            </div>
        </body>
        </html>
        """,
        subtype="html",
    )

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(smtp_email, smtp_password)
        smtp.send_message(msg)



# LOGIN - PASSWORD CHECK, THEN SEND OTP


@router.post("/login")
def login(user: UserLogin):
    email = str(user.email).strip().lower()

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Email or password is incorrect.",
        )

    try:
        ph.verify(existing_user["password"], user.password)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Email or password is incorrect.",
        )

    otp = generate_otp()
    save_otp(f"login:{email}", otp)

    try:
        send_otp_email(email, otp, purpose="login")
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to send verification email. Please try again.",
        )

    return {"message": "otp_required"}



# VERIFY LOGIN OTP - COMPLETE LOGIN


@router.post("/login/verify-otp")
def verify_login_otp(email: EmailStr, otp: str):
    email = str(email).strip().lower()

    if not verify_otp(f"login:{email}", otp):
        raise HTTPException(
            status_code=400,
            detail="OTP is invalid or expired. Please request a new code.",
        )

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    existing_user["_id"] = str(existing_user["_id"])

    response = JSONResponse(
        status_code=200,
        content={
            "message": "login successful",
            "user": jsonable_encoder(existing_user),
        },
    )

    response.set_cookie(
        key="user_email",
        value=email,
        max_age=86400,
        httponly=True,
        secure=False,
        samesite="lax",
    )

    return response



# RESEND LOGIN OTP


@router.post("/login/resend-otp")
def resend_login_otp(email: EmailStr):
    email = str(email).strip().lower()

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    otp = generate_otp()
    save_otp(f"login:{email}", otp)

    try:
        send_otp_email(email, otp, purpose="login")
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to send verification email. Please try again.",
        )

    return {"message": "OTP sent successfully"}



# LOGOUT


@router.get("/logout")
def logout():
    response = JSONResponse(
        status_code=200,
        content={"message": "Logged out successfully"},
    )

    response.delete_cookie(
        key="user_email",
        httponly=True,
        secure=False,
        samesite="lax",
    )

    return response



# SIGNUP


@router.post("/signup")
def create_user(user: User):
    email = str(user.email).strip().lower()

    existing_user = collection.find_one({"email": email})

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists",
        )

    user_data = user.model_dump()
    user_data["email"] = email
    user_data["password"] = ph.hash(user.password)

    collection.insert_one(user_data)

    return JSONResponse(
        status_code=201,
        content={"message": "signup successful"},
    )



# UPDATE USER


@router.patch("/update")
def update_user(email: EmailStr, user: UserUpdate):
    email = str(email).strip().lower()

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user_info = user.model_dump(exclude_unset=True)

    if "password" in user_info:
        if user_info["password"]:
            user_info["password"] = ph.hash(user_info["password"])
        else:
            user_info.pop("password")

    if not user_info:
        raise HTTPException(
            status_code=400,
            detail="No changes were provided",
        )

    collection.update_one(
        {"email": email},
        {"$set": user_info},
    )

    return JSONResponse(
        status_code=200,
        content={"message": "User updated successfully"},
    )



# DELETE USER


@router.delete("/delete/{email}")
def delete_user(email: str):
    email = email.strip().lower()

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    collection.delete_one({"email": email})

    return JSONResponse(
        status_code=200,
        content={"message": "User deleted successfully"},
    )



# FORGOT PASSWORD - SEND RESET OTP


@router.post("/forgot-password")
def forgot_password(email: EmailStr):
    email = str(email).strip().lower()

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered",
        )

    otp = generate_otp()
    save_otp(f"reset:{email}", otp)

    try:
        send_otp_email(email, otp, purpose="reset")
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to send OTP. Please try again.",
        )

    return JSONResponse(
        status_code=200,
        content={"message": "OTP sent successfully"},
    )



# VERIFY PASSWORD RESET OTP


@router.post("/verify-otp")
def verify_reset_otp(email: EmailStr, otp: str):
    email = str(email).strip().lower()

    if not verify_otp(f"reset:{email}", otp):
        raise HTTPException(
            status_code=400,
            detail="OTP is invalid or expired. Please request a new OTP.",
        )

    mark_reset_verified(email)

    return JSONResponse(
        status_code=200,
        content={"message": "OTP verified successfully"},
    )



# RESET PASSWORD

@router.post("/reset-password")
def reset_password(email: EmailStr, new_password: str):
    email = str(email).strip().lower()

    if not consume_reset_verification(email):
        raise HTTPException(
            status_code=400,
            detail="Please verify a valid password-reset OTP first.",
        )

    existing_user = collection.find_one({"email": email})

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    hashed_password = ph.hash(new_password)

    result = collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Password could not be updated",
        )

    return JSONResponse(
        status_code=200,
        content={"message": "Password reset successfully"},
    )
