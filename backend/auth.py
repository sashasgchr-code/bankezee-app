from fastapi import APIRouter, HTTPException, Depends, Header, Body
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging
from typing import Optional, List
from twilio.rest import Client
from functools import wraps
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

twilio_client = None
if os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"):
    twilio_client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

router = APIRouter()

class User(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True
    is_approved: bool = False
    created_at: str

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "sales_agent"
    city: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerification(BaseModel):
    phone: str
    code: str

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user')
            if not user:
                for arg in args:
                    if isinstance(arg, User):
                        user = arg
                        break
            
            if not user or user.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@router.post("/register")
async def register(user_data: UserRegistration):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data.password)
    user_id = str(uuid.uuid4())
    
    is_approved = user_data.role == "admin"
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role,
        "city": user_data.city,
        "is_active": True,
        "is_approved": is_approved,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Registration successful. Awaiting approval." if not is_approved else "Registration successful",
        "user_id": user_id,
        "requires_approval": not is_approved
    }

@router.post("/login")
async def login(login_data: LoginRequest):
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    if not user_doc.get("is_approved") and user_doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Account pending approval")
    
    token = create_access_token({"sub": user_doc["id"], "role": user_doc["role"]})
    
    user_response = {k: v for k, v in user_doc.items() if k != "password"}
    
    return {"token": token, "user": user_response}

@router.post("/send-otp")
async def send_otp(request: OTPRequest):
    if not twilio_client or not os.getenv("TWILIO_VERIFY_SERVICE"):
        return {"status": "mocked", "message": "Twilio not configured. Use code: 123456"}
    
    try:
        verification = twilio_client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")).verifications.create(
            to=request.phone,
            channel="sms"
        )
        return {"status": verification.status, "message": "OTP sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send OTP: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to send OTP: {str(e)}")

@router.post("/verify-otp")
async def verify_otp(request: OTPVerification):
    if not twilio_client or not os.getenv("TWILIO_VERIFY_SERVICE"):
        if request.code == "123456":
            user_doc = await db.users.find_one({"phone": request.phone}, {"_id": 0})
            if user_doc:
                token = create_access_token({"sub": user_doc["id"], "role": user_doc["role"]})
                user_response = {k: v for k, v in user_doc.items() if k != "password"}
                return {"valid": True, "token": token, "user": user_response}
            return {"valid": False, "message": "Phone number not registered"}
        return {"valid": False, "message": "Invalid OTP"}
    
    try:
        check = twilio_client.verify.services(os.getenv("TWILIO_VERIFY_SERVICE")).verification_checks.create(
            to=request.phone,
            code=request.code
        )
        
        if check.status == "approved":
            user_doc = await db.users.find_one({"phone": request.phone}, {"_id": 0})
            if user_doc:
                token = create_access_token({"sub": user_doc["id"], "role": user_doc["role"]})
                user_response = {k: v for k, v in user_doc.items() if k != "password"}
                return {"valid": True, "token": token, "user": user_response}
        
        return {"valid": check.status == "approved"}
    except Exception as e:
        logger.error(f"Failed to verify OTP: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to verify OTP: {str(e)}")

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user