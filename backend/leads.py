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

class LeadCreate(BaseModel):
    full_name: str
    mobile: str
    city: str
    employment_type: str
    requirement: str
    source: Optional[str] = "digital"
    source_id: Optional[str] = None

@router.post("/create")
async def create_lead(lead_data: LeadCreate):
    lead_id = str(uuid.uuid4())
    
    available_agent = await db.users.find_one(
        {"role": "operations", "is_active": True, "is_approved": True},
        {"_id": 0}
    )
    
    assigned_to = available_agent["id"] if available_agent else None
    
    lead_doc = {
        "id": lead_id,
        "full_name": lead_data.full_name,
        "mobile": lead_data.mobile,
        "city": lead_data.city,
        "employment_type": lead_data.employment_type,
        "requirement": lead_data.requirement,
        "status": "new",
        "source": lead_data.source,
        "source_id": lead_data.source_id,
        "assigned_to": assigned_to,
        "activities": [],
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.insert_one(lead_doc)
    
    if lead_data.source_id:
        if lead_data.source == "agent":
            await db.agents.update_one(
                {"id": lead_data.source_id},
                {"$inc": {"performance.total_leads": 1}}
            )
        elif lead_data.source in ["partner", "retail_qr"]:
            await db.partners.update_one(
                {"id": lead_data.source_id},
                {"$inc": {"total_leads": 1}}
            )
    
    return {
        "message": "Lead created successfully",
        "lead_id": lead_id,
        "assigned_to": assigned_to
    }

@router.get("/")
async def get_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if current_user.role == "sales_agent":
        query["assigned_to"] = current_user.id
    elif current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if status:
        query["status"] = status
    if source:
        query["source"] = source
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads

@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if current_user.role == "sales_agent" and lead.get("assigned_to") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return lead

@router.put("/{lead_id}/assign")
async def assign_lead(
    lead_id: str,
    assigned_to: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "assigned_to": assigned_to,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "activities": {
                    "type": "assignment",
                    "message": f"Lead reassigned to {assigned_to}",
                    "by": current_user.id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead assigned successfully"}