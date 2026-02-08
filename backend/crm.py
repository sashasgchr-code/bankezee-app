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
db = client[os.environ['DB_NAME']]

router = APIRouter()

class StatusUpdate(BaseModel):
    status: str

class NoteAdd(BaseModel):
    note: str

class LeadUpdate(BaseModel):
    loan_type: Optional[str] = None
    ticket_size: Optional[float] = None
    bank_name: Optional[str] = None

class LeadAssignment(BaseModel):
    assigned_to: str

class EligibilityEntry(BaseModel):
    bank_name: str
    is_eligible: bool
    eligible_amount: Optional[float] = None
    eligible_tenure: Optional[int] = None
    login_done: Optional[bool] = None
    login_bank: Optional[str] = None
    login_rejection_reason: Optional[str] = None
    approval_status: Optional[str] = None  # approved, declined
    approved_bank: Optional[str] = None
    approved_amount: Optional[float] = None
    approved_tenure: Optional[int] = None
    approved_roi: Optional[float] = None
    declined_bank: Optional[str] = None
    declined_reason: Optional[str] = None
    disbursed: Optional[bool] = None
    disbursed_bank: Optional[str] = None
    disbursed_amount: Optional[float] = None
    disbursed_tenure: Optional[int] = None
    disbursed_roi: Optional[float] = None
    disbursement_rejection_reason: Optional[str] = None

class EligibilityUpdate(BaseModel):
    eligibilities: List[EligibilityEntry]

@router.put("/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status_update: StatusUpdate,
    current_user: User = Depends(get_current_user)
):
    valid_statuses = ["new", "contacted", "documents_collected", "sent_to_bank", "approved", "disbursed", "rejected"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "status": status_update.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "activities": {
                    "type": "status_change",
                    "message": f"Status changed to {status_update.status}",
                    "by": current_user.id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    if status_update.status == "disbursed":
        if lead.get("source_id"):
            if lead.get("source") == "agent":
                await db.agents.update_one(
                    {"id": lead["source_id"]},
                    {"$inc": {"performance.converted_leads": 1}}
                )
            elif lead.get("source") in ["partner", "retail_qr"]:
                await db.partners.update_one(
                    {"id": lead["source_id"]},
                    {"$inc": {"approved_cases": 1}}
                )
    
    return {"message": "Status updated successfully"}

@router.post("/{lead_id}/notes")
async def add_note(
    lead_id: str,
    note_data: NoteAdd,
    current_user: User = Depends(get_current_user)
):
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$push": {
                "activities": {
                    "type": "note",
                    "message": note_data.note,
                    "by": current_user.id,
                    "by_name": current_user.full_name,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Note added successfully"}

@router.put("/{lead_id}")
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    current_user: User = Depends(get_current_user)
):
    update_fields = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if not update_fields:
        return {"message": "No updates provided"}
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead updated successfully"}

@router.get("/{lead_id}/activities")
async def get_lead_activities(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0, "activities": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead.get("activities", [])


@router.put("/{lead_id}/assign")
async def assign_lead(
    lead_id: str,
    assignment: LeadAssignment,
    current_user: User = Depends(get_current_user)
):
    """Assign a lead to an operations team member"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can assign leads")
    
    # Verify the assignee exists and is an operations team member
    assignee = await db.users.find_one({"id": assignment.assigned_to}, {"_id": 0})
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    if assignee.get("role") != "operations":
        raise HTTPException(status_code=400, detail="Can only assign to operations team members")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "assigned_to": assignment.assigned_to,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "activities": {
                    "type": "assignment",
                    "message": f"Lead assigned to {assignee.get('full_name', 'Operations Team')}",
                    "by": current_user.id,
                    "by_name": current_user.full_name,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"message": f"Lead assigned to {assignee.get('full_name')}", "assigned_to": assignment.assigned_to}

@router.get("/operations-team")
async def get_operations_team(current_user: User = Depends(get_current_user)):
    """Get list of operations team members for assignment dropdown"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    ops_team = await db.users.find(
        {"role": "operations", "is_active": True, "is_approved": True},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1}
    ).to_list(100)
    
    return ops_team