from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
from auth import get_current_user, User, db

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/daily-report")
async def get_daily_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    manager_id: Optional[str] = Query(None, description="Filter by manager ID"),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive daily report of all leads with activity in date range"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")
    
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Build query for leads with activity in date range
    pipeline = [
        {
            "$match": {
                "activities": {
                    "$elemMatch": {
                        "timestamp": {
                            "$gte": start_date.isoformat(),
                            "$lte": end_date.isoformat()
                        }
                    }
                }
            }
        },
        {"$project": {"_id": 0}}
    ]
    
    leads = await db.leads.aggregate(pipeline).to_list(10000)
    
    # If no leads found with activity filter, try simpler approach
    if not leads:
        # Get all leads and filter by activity timestamp
        all_leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
        leads = []
        for lead in all_leads:
            activities = lead.get("activities", [])
            for activity in activities:
                ts = activity.get("timestamp", "")
                if ts:
                    try:
                        activity_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        if start_date <= activity_date <= end_date:
                            leads.append(lead)
                            break
                    except:
                        pass
    
    # Get all agents and partners for lookup
    agents = await db.agents.find({}, {"_id": 0}).to_list(1000)
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    agents_map = {a["id"]: a for a in agents}
    partners_map = {p["id"]: p for p in partners}
    users_map = {u["id"]: u for u in users}
    
    # Get managers for filtering
    managers = [u for u in users if u.get("role") == "manager"]
    
    # If manager_id filter is applied, filter leads by agents/partners under that manager
    if manager_id:
        # Get all agents and partners under this manager
        team_user_ids = set()
        for u in users:
            if u.get("manager_id") == manager_id:
                team_user_ids.add(u["id"])
        
        # Filter leads by source_id
        leads = [l for l in leads if l.get("source_id") in team_user_ids]
    
    # Enrich leads with additional data
    enriched_leads = []
    for lead in leads:
        # Get source info
        source_id = lead.get("source_id")
        source_info = None
        source_type = lead.get("source", "")
        
        if source_type == "agent" and source_id in agents_map:
            agent = agents_map[source_id]
            agent_user = users_map.get(source_id, {})
            source_info = {
                "type": "Agent",
                "name": agent_user.get("full_name", "Unknown"),
                "code": agent.get("referral_code", ""),
                "phone": agent_user.get("phone", "")
            }
        elif source_type == "partner" and source_id in partners_map:
            partner = partners_map[source_id]
            source_info = {
                "type": "Partner",
                "name": partner.get("name", "Unknown"),
                "code": partner.get("referral_code", ""),
                "phone": partner.get("mobile", "")
            }
        
        # Get manager info for the source
        source_user = users_map.get(source_id, {})
        manager_info = None
        if source_user.get("manager_id"):
            manager = users_map.get(source_user["manager_id"], {})
            manager_info = {
                "id": source_user["manager_id"],
                "name": manager.get("full_name", "Unknown")
            }
        
        # Get assigned ops info
        assigned_info = None
        if lead.get("assigned_to"):
            assigned_user = users_map.get(lead["assigned_to"], {})
            assigned_info = {
                "id": lead["assigned_to"],
                "name": assigned_user.get("full_name", "Unknown")
            }
        
        # Get activities in date range
        activities_in_range = []
        all_activities = lead.get("activities", [])
        for activity in all_activities:
            ts = activity.get("timestamp", "")
            if ts:
                try:
                    activity_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if start_date <= activity_date <= end_date:
                        activities_in_range.append(activity)
                except:
                    pass
        
        # Determine last status before date range and current status
        last_status = "new"
        status_changes = [a for a in all_activities if "status" in a.get("action", "").lower() or "changed" in a.get("action", "").lower()]
        
        for activity in status_changes:
            ts = activity.get("timestamp", "")
            if ts:
                try:
                    activity_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if activity_date < start_date:
                        # Extract status from action text
                        action = activity.get("action", "")
                        if "to " in action.lower():
                            last_status = action.split("to ")[-1].split()[0].strip()
                except:
                    pass
        
        # Extract eligibility summary
        eligibilities = lead.get("additional_data", {}).get("bank_eligibilities", [])
        eligibility_summary = []
        
        total_eligible_amount = 0
        total_approved_amount = 0
        total_disbursed_amount = 0
        total_login_amount = 0
        
        for elig in eligibilities:
            if elig.get("bank_name"):
                elig_data = {
                    "bank": elig.get("bank_name", ""),
                    "is_eligible": elig.get("is_eligible", ""),
                    "eligible_amount": elig.get("eligible_amount", ""),
                    "not_eligible_reason": elig.get("not_eligible_reason", ""),
                    "login_done": elig.get("login_done", ""),
                    "login_bank": elig.get("login_bank", ""),
                    "application_id": elig.get("application_id", ""),
                    "login_rejection_reason": elig.get("login_rejection_reason", ""),
                    "approval_status": elig.get("approval_status", ""),
                    "approved_amount": elig.get("approved_amount", ""),
                    "approved_roi": elig.get("approved_roi", ""),
                    "declined_reason": elig.get("declined_reason", ""),
                    "disbursed": elig.get("disbursed", ""),
                    "disbursed_amount": elig.get("disbursed_amount", ""),
                    "disbursed_roi": elig.get("disbursed_roi", ""),
                    "disbursement_rejection_reason": elig.get("disbursement_rejection_reason", ""),
                    "commission_percentage": elig.get("commission_percentage", ""),
                    "commission_amount": elig.get("commission_amount", "")
                }
                eligibility_summary.append(elig_data)
                
                # Sum amounts
                try:
                    if elig.get("eligible_amount"):
                        total_eligible_amount += float(elig.get("eligible_amount", 0))
                except:
                    pass
                try:
                    if elig.get("approved_amount"):
                        total_approved_amount += float(elig.get("approved_amount", 0))
                except:
                    pass
                try:
                    if elig.get("disbursed_amount"):
                        total_disbursed_amount += float(elig.get("disbursed_amount", 0))
                except:
                    pass
                # Sum login amounts (eligible amount when login is done)
                try:
                    if elig.get("login_done") == "Yes" and elig.get("eligible_amount"):
                        total_login_amount += float(elig.get("eligible_amount", 0))
                except:
                    pass
        
        # Get pending documents
        pending_docs = lead.get("pending_documents", "")
        
        # Get rejection reasons from activities
        rejection_reasons = []
        for activity in all_activities:
            action = activity.get("action", "")
            if "reject" in action.lower() or "decline" in action.lower() or "not eligible" in action.lower():
                rejection_reasons.append(activity)
        
        # Extract status-specific details
        status_details = {
            "rejection_reason": "",
            "not_eligible_reason": "",
            "login_amount": total_login_amount,
            "login_banks": [],
            "approved_banks": [],
            "disbursed_banks": [],
            "declined_banks": [],
            "pending_docs_reason": pending_docs
        }
        
        # Collect all reasons and bank-wise details
        for elig in eligibilities:
            bank = elig.get("bank_name", "")
            if not bank:
                continue
                
            # Not eligible reasons
            if elig.get("is_eligible") == "No" and elig.get("not_eligible_reason"):
                status_details["not_eligible_reason"] = elig.get("not_eligible_reason", "")
            
            # Login details
            if elig.get("login_done") == "Yes":
                login_info = {
                    "bank": bank,
                    "amount": elig.get("eligible_amount", ""),
                    "application_id": elig.get("application_id", "")
                }
                status_details["login_banks"].append(login_info)
            
            # Login rejection
            if elig.get("login_rejection_reason"):
                status_details["rejection_reason"] = elig.get("login_rejection_reason", "")
            
            # Approved details
            if elig.get("approval_status") == "Approved":
                approved_info = {
                    "bank": bank,
                    "amount": elig.get("approved_amount", ""),
                    "roi": elig.get("approved_roi", ""),
                    "tenure": elig.get("approved_tenure", "")
                }
                status_details["approved_banks"].append(approved_info)
            
            # Declined details
            if elig.get("approval_status") == "Declined":
                declined_info = {
                    "bank": bank,
                    "reason": elig.get("declined_reason", "")
                }
                status_details["declined_banks"].append(declined_info)
                if elig.get("declined_reason"):
                    status_details["rejection_reason"] = elig.get("declined_reason", "")
            
            # Disbursed details
            if elig.get("disbursed") == "Yes":
                disbursed_info = {
                    "bank": bank,
                    "amount": elig.get("disbursed_amount", ""),
                    "roi": elig.get("disbursed_roi", "")
                }
                status_details["disbursed_banks"].append(disbursed_info)
            
            # Disbursement rejection
            if elig.get("disbursed") == "No" and elig.get("disbursement_rejection_reason"):
                status_details["rejection_reason"] = elig.get("disbursement_rejection_reason", "")
        
        enriched_lead = {
            "id": lead.get("id"),
            "full_name": lead.get("full_name"),
            "mobile": lead.get("mobile"),
            "email": lead.get("email", ""),
            "city": lead.get("city", ""),
            "loan_type": lead.get("loan_type", ""),
            "loan_amount": lead.get("loan_amount", 0),
            "current_status": lead.get("status", "new"),
            "last_status_before_period": last_status,
            "pending_documents": pending_docs,
            "source_info": source_info,
            "manager_info": manager_info,
            "assigned_to": assigned_info,
            "eligibility_summary": eligibility_summary,
            "total_eligible_amount": total_eligible_amount,
            "total_approved_amount": total_approved_amount,
            "total_disbursed_amount": total_disbursed_amount,
            "total_login_amount": total_login_amount,
            "status_details": status_details,
            "activities_in_period": activities_in_range,
            "all_activities": all_activities,
            "rejection_reasons": rejection_reasons,
            "created_at": lead.get("created_at", ""),
            "additional_data": lead.get("additional_data", {})
        }
        enriched_leads.append(enriched_lead)
    
    # Calculate summary statistics
    status_counts = {}
    loan_type_counts = {}
    daily_activity_counts = {}
    
    for lead in enriched_leads:
        # Status counts
        status = lead["current_status"]
        status_counts[status] = status_counts.get(status, 0) + 1
        
        # Loan type counts
        loan_type = lead.get("loan_type", "Unknown")
        loan_type_counts[loan_type] = loan_type_counts.get(loan_type, 0) + 1
        
        # Daily activity counts
        for activity in lead.get("activities_in_period", []):
            ts = activity.get("timestamp", "")
            if ts:
                try:
                    date_str = ts[:10]  # YYYY-MM-DD
                    daily_activity_counts[date_str] = daily_activity_counts.get(date_str, 0) + 1
                except:
                    pass
    
    # Calculate totals
    total_eligible = sum(l.get("total_eligible_amount", 0) for l in enriched_leads)
    total_approved = sum(l.get("total_approved_amount", 0) for l in enriched_leads)
    total_disbursed = sum(l.get("total_disbursed_amount", 0) for l in enriched_leads)
    
    summary = {
        "total_leads": len(enriched_leads),
        "status_distribution": status_counts,
        "loan_type_distribution": loan_type_counts,
        "daily_activity": daily_activity_counts,
        "total_eligible_amount": total_eligible,
        "total_approved_amount": total_approved,
        "total_disbursed_amount": total_disbursed,
        "date_range": {
            "from": from_date,
            "to": to_date
        }
    }
    
    return {
        "summary": summary,
        "leads": enriched_leads,
        "managers": [{"id": m["id"], "name": m.get("full_name", "Unknown")} for m in managers]
    }


@router.get("/managers-list")
async def get_managers_list(current_user: User = Depends(get_current_user)):
    """Get list of all managers for filter dropdown"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access this")
    
    users = await db.users.find({"role": "manager"}, {"_id": 0}).to_list(1000)
    return [{"id": u["id"], "name": u.get("full_name", "Unknown")} for u in users]
