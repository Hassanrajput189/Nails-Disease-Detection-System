
import secrets
import time

# OTP records: {key: {"otp": "...", "expires_at": timestamp}}
otp_store = {}

OTP_EXPIRY_SECONDS = 300  # 5 minutes


def generate_otp():
    return f"{secrets.randbelow(900000) + 100000}"


def save_otp(key, otp):
    otp_store[key] = {
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
    }


def verify_otp(key, otp):
    record = otp_store.get(key)

    if not record:
        return False

    if time.time() >= record["expires_at"]:
        otp_store.pop(key, None)
        return False

    if not secrets.compare_digest(record["otp"], str(otp)):
        return False

    otp_store.pop(key, None)
    return True


# Tracks emails that have successfully verified a password-reset OTP.
# Each verification is valid for another 5 minutes.
verified_reset_store = {}


def mark_reset_verified(email):
    verified_reset_store[email] = time.time() + OTP_EXPIRY_SECONDS


def consume_reset_verification(email):
    expires_at = verified_reset_store.pop(email, None)

    if expires_at is None:
        return False

    return time.time() < expires_at
