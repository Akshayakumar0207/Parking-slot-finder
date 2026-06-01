# backend/auth.py
import os, jwt, bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv

load_dotenv()

SECRET   = os.getenv("JWT_SECRET", "parkease_secret_key_2024")
EXPIRY_H = int(os.getenv("JWT_EXPIRY_HOURS", 24))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "exp":   datetime.now(timezone.utc) + timedelta(hours=EXPIRY_H),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=["HS256"])


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        try:
            data = decode_token(auth.split(" ", 1)[1])
            g.user_id = data["sub"]
            g.email   = data["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired — please login again"}), 401
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated
