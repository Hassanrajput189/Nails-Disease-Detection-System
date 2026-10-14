import random

otp_store = {}


def generate_otp():
    return str(random.randint(100000, 999999))