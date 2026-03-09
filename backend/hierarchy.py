from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
from datetime import datetime, timezone
from typing import Optional, List
import logging
from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

router = APIRouter()


class UserMappingRequest(BaseModel):
    user_id: str
    user_type: str  # 'agent' or 'partner'
    manager_id: str
    team_leader_id: Optional[str] = None


@router.get("/managers")
async def get_managers(current_user: User = Depends(get_current_user)):
    """Get all managers"""
    if current_user.role not in ["admin", "operations", "manager", "team_leader"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    managers = await db.users.find(
        {"role": "manager", "is_active": True},
        {"_id": 0, "password": 0}
    ).to_list(100)
    return managers


@router.get("/team-leaders")
async def get_team_leaders(
    manager_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all team leaders, optionally filtered by manager"""
    if current_user.role not in ["admin", "operations", "manager", "team_leader"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = {"role": "team_leader", "is_active": True}
    if manager_id:
        query["manager_id"] = manager_id
    
    team_leaders = await db.users.find(query, {"_id": 0, "password": 0}).to_list(100)
    return team_leaders


@router.post("/map-user")
async def map_user_to_hierarchy(
    mapping: UserMappingRequest,
    current_user: User = Depends(get_current_user)
):
    """Map an agent/partner to a manager and optionally a team leader"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can map users")
    
    # Verify manager exists
    manager = await db.users.find_one({"id": mapping.manager_id, "role": "manager"})
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    # If team leader specified, verify and ensure they're under the same manager
    if mapping.team_leader_id:
        team_leader = await db.users.find_one({"id": mapping.team_leader_id, "role": "team_leader"})
        if not team_leader:
            raise HTTPException(status_code=404, detail="Team leader not found")
        if team_leader.get("manager_id") != mapping.manager_id:
            raise HTTPException(status_code=400, detail="Team leader is not under this manager")
    
    # Update the agent or partner
    collection = db.agents if mapping.user_type == "agent" else db.partners
    
    result = await collection.update_one(
        {"id": mapping.user_id},
        {"$set": {
            "manager_id": mapping.manager_id,
            "team_leader_id": mapping.team_leader_id,
            "mapped_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail=f"{mapping.user_type.capitalize()} not found")
    
    return {"message": f"{mapping.user_type.capitalize()} mapped successfully"}


@router.get("/my-team")
async def get_my_team(current_user: User = Depends(get_current_user)):
    """Get team members under the current manager or team leader"""
    if current_user.role not in ["manager", "team_leader"]:
        raise HTTPException(status_code=403, detail="Only managers and team leaders can access this")
    
    result = {
        "agents": [],
        "partners": [],
        "team_leaders": []
    }
    
    if current_user.role == "manager":
        # Get team leaders under this manager
        team_leaders = await db.users.find(
            {"role": "team_leader", "manager_id": current_user.id},
            {"_id": 0, "password": 0}
        ).to_list(100)
        result["team_leaders"] = team_leaders
        
        # Get agents/partners directly under manager OR under manager's team leaders
        tl_ids = [tl["id"] for tl in team_leaders]
        
        # Agents under manager or their team leaders
        agents = await db.agents.find(
            {"$or": [
                {"manager_id": current_user.id},
                {"team_leader_id": {"$in": tl_ids}}
            ]},
            {"_id": 0}
        ).to_list(1000)
        result["agents"] = agents
        
        # Partners under manager or their team leaders
        partners = await db.partners.find(
            {"$or": [
                {"manager_id": current_user.id},
                {"team_leader_id": {"$in": tl_ids}}
            ]},
            {"_id": 0}
        ).to_list(1000)
        result["partners"] = partners
        
    elif current_user.role == "team_leader":
        # Get only agents/partners directly under this team leader
        agents = await db.agents.find(
            {"team_leader_id": current_user.id},
            {"_id": 0}
        ).to_list(1000)
        result["agents"] = agents
        
        partners = await db.partners.find(
            {"team_leader_id": current_user.id},
            {"_id": 0}
        ).to_list(1000)
        result["partners"] = partners
    
    return result


@router.get("/my-leads")
async def get_my_team_leads(current_user: User = Depends(get_current_user)):
    """Get all leads from team members (for manager/team leader view)"""
    if current_user.role not in ["manager", "team_leader"]:
        raise HTTPException(status_code=403, detail="Only managers and team leaders can access this")
    
    # Get team members
    team = await get_my_team(current_user)
    
    # Collect all agent and partner IDs
    source_ids = []
    source_ids.extend([a["id"] for a in team["agents"]])
    source_ids.extend([p["id"] for p in team["partners"]])
    
    if not source_ids:
        return []
    
    # Get leads from these sources
    leads = await db.leads.find(
        {"source_id": {"$in": source_ids}},
        {"_id": 0}
    ).to_list(10000)
    
    return leads


@router.get("/stats")
async def get_hierarchy_stats(
    manager_id: Optional[str] = None,
    team_leader_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get stats filtered by manager or team leader (for admin export)"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Build query based on filters
    agent_query = {}
    partner_query = {}
    
    if team_leader_id:
        agent_query["team_leader_id"] = team_leader_id
        partner_query["team_leader_id"] = team_leader_id
    elif manager_id:
        # Get team leaders under this manager
        team_leaders = await db.users.find(
            {"role": "team_leader", "manager_id": manager_id},
            {"_id": 0, "id": 1}
        ).to_list(100)
        tl_ids = [tl["id"] for tl in team_leaders]
        
        # Agents/partners directly under manager OR under their team leaders
        agent_query = {"$or": [
            {"manager_id": manager_id},
            {"team_leader_id": {"$in": tl_ids}}
        ]}
        partner_query = {"$or": [
            {"manager_id": manager_id},
            {"team_leader_id": {"$in": tl_ids}}
        ]}
    
    agents = await db.agents.find(agent_query, {"_id": 0}).to_list(1000) if agent_query else []
    partners = await db.partners.find(partner_query, {"_id": 0}).to_list(1000) if partner_query else []
    
    # Get source IDs
    source_ids = [a["id"] for a in agents] + [p["id"] for p in partners]
    
    # Get leads from these sources
    leads = []
    if source_ids:
        leads = await db.leads.find(
            {"source_id": {"$in": source_ids}},
            {"_id": 0}
        ).to_list(10000)
    
    return {
        "agents": agents,
        "partners": partners,
        "leads": leads
    }
