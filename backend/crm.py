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

class StatusUpdate(BaseModel):
    status: str
    application_id: Optional[str] = None

class NoteAdd(BaseModel):
    note: str

class LeadUpdate(BaseModel):
    loan_type: Optional[str] = None
    ticket_size: Optional[float] = None
    bank_name: Optional[str] = None

class LeadAssignment(BaseModel):
    assigned_to: str

class BulkLeadAssignment(BaseModel):
    lead_ids: List[str]
    assigned_to: str

class LeadDetailsUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    employment_type: Optional[str] = None
    requirement: Optional[str] = None
    additional_data: Optional[dict] = None

class EligibilityEntry(BaseModel):
    bank_name: str
    is_eligible: bool
    eligible_amount: Optional[float] = None
    eligible_tenure: Optional[int] = None
    not_eligible_reason: Optional[str] = None
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
    # Commission fields - entered manually by ops when disbursed
    commission_percentage: Optional[float] = None
    commission_amount: Optional[float] = None

class EligibilityUpdate(BaseModel):
    eligibilities: List[EligibilityEntry]


# Static routes MUST be defined before dynamic routes like /{lead_id}
@router.put("/bulk-assign")
async def bulk_assign_leads(
    assignment: BulkLeadAssignment,
    current_user: User = Depends(get_current_user)
):
    """Bulk assign multiple leads to an operations team member - Admin only"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can bulk assign leads")
    
    if not assignment.lead_ids:
        raise HTTPException(status_code=400, detail="No leads selected")
    
    # Verify the assignee exists and is an operations team member
    assignee = await db.users.find_one({"id": assignment.assigned_to}, {"_id": 0})
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    if assignee.get("role") != "operations":
        raise HTTPException(status_code=400, detail="Can only assign to operations team members")
    
    # Update all leads
    assigned_count = 0
    for lead_id in assignment.lead_ids:
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
                        "message": f"Lead assigned to {assignee.get('full_name', 'Operations Team')} (bulk)",
                        "by": current_user.id,
                        "by_name": current_user.full_name,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        if result.modified_count > 0:
            assigned_count += 1
    
    return {
        "message": f"{assigned_count} leads assigned to {assignee.get('full_name')}",
        "assigned_count": assigned_count,
        "assigned_to": assignment.assigned_to
    }


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


@router.put("/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status_update: StatusUpdate,
    current_user: User = Depends(get_current_user)
):
    valid_statuses = [
        "new", "contacted", "documents_collected", "not_eligible", 
        "sent_for_eligibility", "sent_for_login", "login", "not_login",
        "sent_for_approval", "underwriting", "fi", "query_hold",
        "approved", "declined", "disbursed", "not_disbursed", "rejected"
    ]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid statuses: {', '.join(valid_statuses)}")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add application_id if provided
    if status_update.application_id:
        update_data["application_id"] = status_update.application_id
    
    activity_message = f"Status changed to {status_update.status}"
    if status_update.application_id:
        activity_message += f" (Application ID: {status_update.application_id})"
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": update_data,
            "$push": {
                "activities": {
                    "type": "status_change",
                    "message": activity_message,
                    "from_status": lead.get("status"),
                    "to_status": status_update.status,
                    "application_id": status_update.application_id,
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

@router.put("/{lead_id}/details")
async def update_lead_details(
    lead_id: str,
    update_data: LeadDetailsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update lead customer details - for Admin and Operations only"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can update lead details")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Build update dict with only non-None values
    update_dict = {}
    if update_data.full_name is not None:
        update_dict["full_name"] = update_data.full_name
    if update_data.mobile is not None:
        update_dict["mobile"] = update_data.mobile
    if update_data.email is not None:
        update_dict["email"] = update_data.email
    if update_data.city is not None:
        update_dict["city"] = update_data.city
    if update_data.employment_type is not None:
        update_dict["employment_type"] = update_data.employment_type
    if update_data.requirement is not None:
        update_dict["requirement"] = update_data.requirement
    if update_data.additional_data is not None:
        # Merge additional_data with existing
        existing_additional = lead.get("additional_data", {}) or {}
        merged_additional = {**existing_additional, **update_data.additional_data}
        update_dict["additional_data"] = merged_additional
    
    if not update_dict:
        return {"message": "No changes to update"}
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": update_dict,
            "$push": {
                "activities": {
                    "type": "details_update",
                    "message": "Lead details updated",
                    "by": current_user.id,
                    "by_name": current_user.full_name,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"message": "Lead details updated successfully"}

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


@router.put("/{lead_id}/eligibilities")
async def update_eligibilities(
    lead_id: str,
    eligibility_update: EligibilityUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update lead eligibilities (up to 7 bank eligibilities)"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can update eligibilities")
    
    if len(eligibility_update.eligibilities) > 7:
        raise HTTPException(status_code=400, detail="Maximum 7 eligibilities allowed")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get existing eligibilities to compare
    existing_eligibilities = lead.get("eligibilities", [])
    existing_commissions = {}
    for e in existing_eligibilities:
        if e.get("bank_name") and e.get("commission_amount"):
            existing_commissions[e["bank_name"]] = e.get("commission_amount", 0)
    
    # Convert eligibilities to dict format and calculate commission
    eligibilities_data = []
    new_commission = 0
    
    for e in eligibility_update.eligibilities:
        elig_dict = e.dict()
        # Auto-calculate commission amount if percentage and disbursed amount provided
        if elig_dict.get('disbursed') and elig_dict.get('disbursed_amount') and elig_dict.get('commission_percentage'):
            calculated_commission = round(
                (elig_dict['disbursed_amount'] * elig_dict['commission_percentage']) / 100, 2
            )
            elig_dict['commission_amount'] = calculated_commission
            
            # Only credit NEW commission (not already credited)
            bank_name = elig_dict.get('bank_name', '')
            prev_commission = existing_commissions.get(bank_name, 0)
            if calculated_commission > prev_commission:
                new_commission += (calculated_commission - prev_commission)
        eligibilities_data.append(elig_dict)
    
    result = await db.leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "eligibilities": eligibilities_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "activities": {
                    "type": "eligibility_update",
                    "message": f"Eligibilities updated ({len(eligibilities_data)} bank(s))" + (f", Commission: ₹{new_commission}" if new_commission > 0 else ""),
                    "by": current_user.id,
                    "by_name": current_user.full_name,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    # If there's NEW commission to credit, update the source agent/partner
    if new_commission > 0 and lead.get("source_id"):
        source_type = lead.get("source")
        if source_type == "agent":
            await db.agents.update_one(
                {"id": lead["source_id"]},
                {"$inc": {"performance.total_commission": new_commission}}
            )
            # Log commission entry
            await db.commissions.insert_one({
                "lead_id": lead_id,
                "source_id": lead["source_id"],
                "source_type": "agent",
                "amount": new_commission,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        elif source_type in ["partner", "retail_qr"]:
            await db.partners.update_one(
                {"id": lead["source_id"]},
                {"$inc": {"total_earnings": new_commission, "wallet_balance": new_commission}}
            )
            # Log commission entry
            await db.commissions.insert_one({
                "lead_id": lead_id,
                "source_id": lead["source_id"],
                "source_type": "partner",
                "amount": new_commission,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {"message": "Eligibilities updated successfully", "count": len(eligibilities_data), "commission_credited": new_commission}

@router.get("/{lead_id}/eligibilities")
async def get_eligibilities(lead_id: str):
    """Get lead eligibilities - accessible to all authenticated users"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0, "eligibilities": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead.get("eligibilities", [])


@router.get("/earnings/{source_id}")
async def get_earnings(
    source_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get earnings summary for an agent or partner"""
    # Verify user has permission to view this data
    if current_user.role not in ["admin", "operations"] and current_user.id != source_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these earnings")
    
    # Get all commissions for this source
    commissions = await db.commissions.find(
        {"source_id": source_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate total earnings
    total_earnings = sum(c.get("amount", 0) for c in commissions)
    
    # Calculate monthly earnings (current month)
    now = datetime.now(timezone.utc)
    current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    monthly_earnings = sum(
        c.get("amount", 0) for c in commissions 
        if datetime.fromisoformat(c.get("created_at", "").replace("Z", "+00:00")) >= current_month_start
    )
    
    # Get commission history (last 10)
    recent_commissions = sorted(
        commissions, 
        key=lambda x: x.get("created_at", ""), 
        reverse=True
    )[:10]
    
    # Enrich with lead names
    for comm in recent_commissions:
        lead = await db.leads.find_one({"id": comm.get("lead_id")}, {"_id": 0, "full_name": 1})
        comm["lead_name"] = lead.get("full_name", "Unknown") if lead else "Unknown"
    
    return {
        "total_earnings": total_earnings,
        "monthly_earnings": monthly_earnings,
        "commission_count": len(commissions),
        "recent_commissions": recent_commissions
    }