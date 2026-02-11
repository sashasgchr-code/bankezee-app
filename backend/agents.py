from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
import logging
from auth import get_current_user, User, require_role

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AgentRegistration(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    password: str
    city: str
    bank_details: Optional[dict] = None
    referral_code: Optional[str] = None
    id_card_url: Optional[str] = None

class AgentApproval(BaseModel):
    agent_id: str
    approved: bool
    team_leader_id: Optional[str] = None

@router.post("/register")
async def register_agent(agent_data: AgentRegistration):
    existing = await db.agents.find_one({"email": agent_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    agent_id = str(uuid.uuid4())
    agent_code = f"AGT{agent_id[:8].upper()}"
    hashed_password = pwd_context.hash(agent_data.password)
    
    agent_doc = {
        "id": agent_id,
        "agent_code": agent_code,
        "full_name": agent_data.full_name,
        "phone": agent_data.phone,
        "email": agent_data.email,
        "city": agent_data.city,
        "bank_details": agent_data.bank_details,
        "referral_code": agent_data.referral_code,
        "id_card_url": agent_data.id_card_url,
        "is_approved": False,
        "is_active": True,
        "team_leader_id": None,
        "performance": {
            "total_leads": 0,
            "converted_leads": 0,
            "total_revenue": 0,
            "total_commission": 0
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.agents.insert_one(agent_doc)
    
    # Create user account for login
    user_doc = {
        "id": agent_id,
        "email": agent_data.email,
        "password": hashed_password,
        "full_name": agent_data.full_name,
        "phone": agent_data.phone,
        "role": "sales_agent",
        "is_active": True,
        "is_approved": False,
        "agent_id": agent_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Agent registration submitted. Awaiting approval. You can login after approval.",
        "agent_id": agent_id,
        "agent_code": agent_code
    }

@router.post("/approve")
async def approve_agent(
    approval: AgentApproval,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    update_data = {
        "is_approved": approval.approved,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": current_user.id
    }
    
    if approval.team_leader_id:
        update_data["team_leader_id"] = approval.team_leader_id
    
    result = await db.agents.update_one(
        {"id": approval.agent_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Also update the user document for login
    await db.users.update_one(
        {"id": approval.agent_id, "role": "sales_agent"},
        {"$set": {"is_approved": approval.approved}}
    )
    
    return {"message": "Agent approval status updated"}

@router.get("/")
async def get_agents(
    status: Optional[str] = None,
    email: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "operations"] and not email:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = {}
    if status == "pending":
        query["is_approved"] = False
    elif status == "approved":
        query["is_approved"] = True
    
    if email:
        query["email"] = email
    
    agents = await db.agents.find(query, {"_id": 0}).to_list(1000)
    return agents

@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if current_user.role not in ["admin", "operations"] and current_user.id != agent_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return agent

@router.get("/{agent_id}/performance")
async def get_agent_performance(
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    leads = await db.leads.find({"source_id": agent_id}, {"_id": 0}).to_list(1000)
    
    total_leads = len(leads)
    converted_leads = len([l for l in leads if l.get("status") == "disbursed"])
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    return {
        "agent_id": agent_id,
        "agent_name": agent.get("full_name"),
        "total_leads": total_leads,
        "converted_leads": converted_leads,
        "conversion_rate": round(conversion_rate, 2),
        "total_revenue": agent.get("performance", {}).get("total_revenue", 0),
        "total_commission": agent.get("performance", {}).get("total_commission", 0)
    }

@router.get("/by-code/{agent_code}")
async def get_agent_by_code(agent_code: str):
    agent = await db.agents.find_one({"agent_code": agent_code}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.get("/by-user/{user_id}")
async def get_agent_by_user(user_id: str, current_user: User = Depends(get_current_user)):
    # First check if user has agent_id field
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc and user_doc.get("agent_id"):
        agent = await db.agents.find_one({"id": user_doc["agent_id"]}, {"_id": 0})
        if agent:
            return agent
    
    # Fallback: search by email
    if user_doc and user_doc.get("email"):
        agent = await db.agents.find_one({"email": user_doc["email"]}, {"_id": 0})
        if agent:
            # Update user doc to include agent_id for next time
            await db.users.update_one({"id": user_id}, {"$set": {"agent_id": agent["id"]}})
            return agent
    
    raise HTTPException(status_code=404, detail="Agent not found")