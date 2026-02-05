from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter()

@router.get("/admin")
async def get_admin_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    contacted_leads = await db.leads.count_documents({"status": "contacted"})
    approved_leads = await db.leads.count_documents({"status": "approved"})
    disbursed_leads = await db.leads.count_documents({"status": "disbursed"})
    rejected_leads = await db.leads.count_documents({"status": "rejected"})
    
    total_agents = await db.agents.count_documents({})
    pending_agents = await db.agents.count_documents({"is_approved": False})
    approved_agents = await db.agents.count_documents({"is_approved": True})
    
    total_partners = await db.partners.count_documents({})
    
    leads_by_source = await db.leads.aggregate([
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    commissions = await db.commissions.find({}, {"_id": 0}).to_list(1000)
    total_revenue = sum(c.get("revenue", 0) for c in commissions)
    total_commissions_paid = sum(c.get("agent_commission", 0) + c.get("partner_commission", 0) for c in commissions)
    
    conversion_rate = (disbursed_leads / total_leads * 100) if total_leads > 0 else 0
    
    top_agents = await db.agents.find(
        {"is_approved": True},
        {"_id": 0}
    ).sort("performance.converted_leads", -1).limit(10).to_list(10)
    
    return {
        "total_leads": total_leads,
        "leads_by_status": {
            "new": new_leads,
            "contacted": contacted_leads,
            "approved": approved_leads,
            "disbursed": disbursed_leads,
            "rejected": rejected_leads
        },
        "conversion_rate": round(conversion_rate, 2),
        "agents": {
            "total": total_agents,
            "pending": pending_agents,
            "approved": approved_agents
        },
        "total_partners": total_partners,
        "leads_by_source": {item["_id"]: item["count"] for item in leads_by_source},
        "revenue": {
            "total_revenue": total_revenue,
            "total_commissions": total_commissions_paid
        },
        "top_agents": top_agents
    }

@router.get("/agent")
async def get_agent_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role != "sales_agent":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    agent = await db.agents.find_one({"email": current_user.email}, {"_id": 0})
    if not agent:
        my_leads = await db.leads.find({"assigned_to": current_user.id}, {"_id": 0}).to_list(1000)
        total_leads = len(my_leads)
        converted = len([l for l in my_leads if l.get("status") == "disbursed"])
        
        return {
            "total_leads": total_leads,
            "converted_leads": converted,
            "pending_leads": len([l for l in my_leads if l.get("status") in ["new", "contacted"]]),
            "total_commission": 0,
            "recent_leads": my_leads[:5]
        }
    
    agent_id = agent["id"]
    
    my_leads = await db.leads.find({"assigned_to": current_user.id}, {"_id": 0}).to_list(1000)
    
    commissions = await db.commissions.find({"agent_id": agent_id}, {"_id": 0}).to_list(1000)
    total_commission = sum(c.get("agent_commission", 0) for c in commissions)
    pending_commission = sum(c.get("agent_commission", 0) for c in commissions if c.get("status") == "pending")
    
    return {
        "agent_code": agent.get("agent_code"),
        "total_leads": len(my_leads),
        "converted_leads": len([l for l in my_leads if l.get("status") == "disbursed"]),
        "pending_leads": len([l for l in my_leads if l.get("status") in ["new", "contacted"]]),
        "total_commission": total_commission,
        "pending_commission": pending_commission,
        "recent_leads": my_leads[:5],
        "performance": agent.get("performance", {})
    }

@router.get("/partner/{partner_id}")
async def get_partner_dashboard(
    partner_id: str,
    current_user: User = Depends(get_current_user)
):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    leads = await db.leads.find({"source_id": partner_id}, {"_id": 0}).to_list(1000)
    
    commissions = await db.commissions.find({"partner_id": partner_id}, {"_id": 0}).to_list(1000)
    
    return {
        "partner_code": partner.get("referral_code"),
        "total_leads": len(leads),
        "approved_cases": partner.get("approved_cases", 0),
        "wallet_balance": partner.get("wallet_balance", 0),
        "total_earnings": partner.get("total_earnings", 0),
        "recent_leads": leads[:5],
        "recent_commissions": commissions[:5]
    }