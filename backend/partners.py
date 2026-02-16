from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext
import os
import uuid
from datetime import datetime, timezone
from typing import Optional
import logging
from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PartnerRegistration(BaseModel):
    name: str
    email: EmailStr
    password: str
    mobile: str
    city: str
    occupation: Optional[str] = None
    pan_number: Optional[str] = None
    bank_details: Optional[dict] = None
    id_card_url: Optional[str] = None

@router.post("/register")
async def register_partner(partner_data: PartnerRegistration):
    existing = await db.partners.find_one({"$or": [{"mobile": partner_data.mobile}, {"email": partner_data.email}]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email or mobile number already registered")
    
    partner_id = str(uuid.uuid4())
    referral_code = f"PTR{partner_id[:8].upper()}"
    hashed_password = pwd_context.hash(partner_data.password)
    
    partner_doc = {
        "id": partner_id,
        "referral_code": referral_code,
        "name": partner_data.name,
        "email": partner_data.email,
        "mobile": partner_data.mobile,
        "city": partner_data.city,
        "occupation": partner_data.occupation,
        "pan_number": partner_data.pan_number,
        "bank_details": partner_data.bank_details,
        "id_card_url": partner_data.id_card_url,
        "is_active": True,
        "is_approved": False,
        "wallet_balance": 0,
        "total_leads": 0,
        "approved_cases": 0,
        "total_earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.insert_one(partner_doc)
    
    # Create user account with same ID
    user_doc = {
        "id": partner_id,
        "email": partner_data.email,
        "password": hashed_password,
        "full_name": partner_data.name,
        "phone": partner_data.mobile,
        "role": "partner",
        "city": partner_data.city,
        "is_active": True,
        "is_approved": False,
        "partner_id": partner_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Retail Partner registration successful. Awaiting admin approval. You can login after approval.",
        "partner_id": partner_id,
        "referral_code": referral_code,
        "login_instructions": "Use OTP login with your mobile number after admin approval"
    }

@router.get("/")
async def get_partners(
    referral_code: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = {}
    if referral_code:
        query["referral_code"] = referral_code
    
    # Optimized projection for partner list view
    list_projection = {
        "_id": 0,
        "id": 1,
        "name": 1,
        "email": 1,
        "mobile": 1,
        "city": 1,
        "referral_code": 1,
        "is_approved": 1,
        "is_active": 1,
        "created_at": 1,
        "id_card_url": 1,
        "occupation": 1
    }
    
    partners = await db.partners.find(query, list_projection).to_list(1000)
    return partners

@router.get("/by-code/{referral_code}")
async def get_partner_by_code(referral_code: str):
    partner = await db.partners.find_one({"referral_code": referral_code}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@router.post("/approve/{partner_id}")
async def approve_partner(
    partner_id: str,
    approved: bool,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"is_approved": approved, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.users.update_one(
        {"partner_id": partner_id},
        {"$set": {"is_approved": approved}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return {"message": f"Partner {'approved' if approved else 'rejected'} successfully"}

@router.get("/{partner_id}")
async def get_partner(
    partner_id: str,
    current_user: User = Depends(get_current_user)
):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return partner

@router.get("/{partner_id}/earnings")
async def get_partner_earnings(
    partner_id: str,
    current_user: User = Depends(get_current_user)
):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    commissions = await db.commissions.find({"partner_id": partner_id}, {"_id": 0}).to_list(1000)
    
    return {
        "partner_id": partner_id,
        "partner_name": partner.get("name"),
        "wallet_balance": partner.get("wallet_balance", 0),
        "total_earnings": partner.get("total_earnings", 0),
        "total_leads": partner.get("total_leads", 0),
        "approved_cases": partner.get("approved_cases", 0),
        "commissions": commissions
    }