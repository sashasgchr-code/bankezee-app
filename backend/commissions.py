from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
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

class CommissionCreate(BaseModel):
    lead_id: str
    revenue: float
    agent_commission: Optional[float] = 0
    partner_commission: Optional[float] = 0

@router.post("/create")
async def create_commission(
    commission_data: CommissionCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    lead = await db.leads.find_one({"id": commission_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    commission_id = str(uuid.uuid4())
    
    commission_doc = {
        "id": commission_id,
        "lead_id": commission_data.lead_id,
        "revenue": commission_data.revenue,
        "agent_commission": commission_data.agent_commission,
        "partner_commission": commission_data.partner_commission,
        "agent_id": lead.get("assigned_to"),
        "partner_id": lead.get("source_id") if lead.get("source") in ["partner", "retail_qr"] else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.commissions.insert_one(commission_doc)
    
    if lead.get("assigned_to"):
        await db.agents.update_one(
            {"id": lead["assigned_to"]},
            {
                "$inc": {
                    "performance.total_revenue": commission_data.revenue,
                    "performance.total_commission": commission_data.agent_commission
                }
            }
        )
    
    if commission_doc["partner_id"]:
        await db.partners.update_one(
            {"id": commission_doc["partner_id"]},
            {
                "$inc": {
                    "wallet_balance": commission_data.partner_commission,
                    "total_earnings": commission_data.partner_commission
                }
            }
        )
    
    return {
        "message": "Commission created successfully",
        "commission_id": commission_id
    }

@router.get("/")
async def get_commissions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = {}
    if status:
        query["status"] = status
    
    commissions = await db.commissions.find(query, {"_id": 0}).to_list(1000)
    return commissions

@router.get("/agent/{agent_id}")
async def get_agent_commissions(
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"] and current_user.id != agent_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    commissions = await db.commissions.find({"agent_id": agent_id}, {"_id": 0}).to_list(1000)
    
    total_commission = sum(c.get("agent_commission", 0) for c in commissions)
    pending = sum(c.get("agent_commission", 0) for c in commissions if c.get("status") == "pending")
    paid = sum(c.get("agent_commission", 0) for c in commissions if c.get("status") == "paid")
    
    return {
        "agent_id": agent_id,
        "total_commission": total_commission,
        "pending": pending,
        "paid": paid,
        "commissions": commissions
    }

@router.get("/partner/{partner_id}")
async def get_partner_commissions(
    partner_id: str,
    current_user: User = Depends(get_current_user)
):
    commissions = await db.commissions.find({"partner_id": partner_id}, {"_id": 0}).to_list(1000)
    
    total_commission = sum(c.get("partner_commission", 0) for c in commissions)
    pending = sum(c.get("partner_commission", 0) for c in commissions if c.get("status") == "pending")
    paid = sum(c.get("partner_commission", 0) for c in commissions if c.get("status") == "paid")
    
    return {
        "partner_id": partner_id,
        "total_commission": total_commission,
        "pending": pending,
        "paid": paid,
        "commissions": commissions
    }