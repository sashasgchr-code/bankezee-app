from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
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
db = client[os.environ['DB_NAME']]

router = APIRouter()

class PartnerRegistration(BaseModel):
    name: str
    mobile: str
    city: str
    occupation: Optional[str] = None
    upi_id: Optional[str] = None
    bank_details: Optional[dict] = None
    pan_number: Optional[str] = None

@router.post("/register")
async def register_partner(partner_data: PartnerRegistration):
    existing = await db.partners.find_one({"mobile": partner_data.mobile}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    partner_id = str(uuid.uuid4())
    referral_code = f"PTR{partner_id[:8].upper()}"
    
    partner_doc = {
        "id": partner_id,
        "referral_code": referral_code,
        "name": partner_data.name,
        "mobile": partner_data.mobile,
        "city": partner_data.city,
        "occupation": partner_data.occupation,
        "upi_id": partner_data.upi_id,
        "bank_details": partner_data.bank_details,
        "pan_number": partner_data.pan_number,
        "is_active": True,
        "wallet_balance": 0,
        "total_leads": 0,
        "approved_cases": 0,
        "total_earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.insert_one(partner_doc)
    
    user_doc = {
        "id": partner_id,
        "email": f"partner_{partner_id[:8]}@bankezee.com",
        "password": "",
        "full_name": partner_data.name,
        "phone": partner_data.mobile,
        "role": "partner",
        "city": partner_data.city,
        "is_active": True,
        "is_approved": True,
        "partner_id": partner_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Partner registered successfully. You can now login with OTP using your mobile number.",
        "partner_id": partner_id,
        "referral_code": referral_code,
        "login_instructions": "Use OTP login with your mobile number to access your dashboard"
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
    
    partners = await db.partners.find(query, {"_id": 0}).to_list(1000)
    return partners

@router.get("/by-code/{referral_code}")
async def get_partner_by_code(referral_code: str):
    partner = await db.partners.find_one({"referral_code": referral_code}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

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