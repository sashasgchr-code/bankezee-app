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
        # Get agent IDs directly from agents collection where manager_id matches
        team_agent_ids = set()
        for agent in agents:
            if agent.get("manager_id") == manager_id:
                team_agent_ids.add(agent["id"])
        
        # Get partner IDs directly from partners collection where manager_id matches
        team_partner_ids = set()
        for partner in partners:
            if partner.get("manager_id") == manager_id:
                team_partner_ids.add(partner["id"])
        
        # Also check users collection for any users under this manager (fallback)
        team_user_ids = set()
        for u in users:
            if u.get("manager_id") == manager_id:
                team_user_ids.add(u["id"])
        
        # Combine all valid source IDs
        valid_source_ids = team_agent_ids | team_partner_ids | team_user_ids
        
        # Filter leads by source_id
        leads = [l for l in leads if l.get("source_id") in valid_source_ids]
    
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
        # Check both locations: direct eligibilities field and additional_data.bank_eligibilities
        eligibilities = lead.get("eligibilities", []) or lead.get("additional_data", {}).get("bank_eligibilities", [])
        eligibility_summary = []
        
        total_eligible_amount = 0  # Only sum where is_eligible=Yes AND login_done=Yes
        total_approved_amount = 0
        total_disbursed_amount = 0
        
        # Login bank details (where login = Yes)
        login_bank_details = []
        
        # Comprehensive reject reasons
        reject_reasons = []
        
        for elig in eligibilities:
            if elig.get("bank_name"):
                bank_name = elig.get("bank_name", "")
                elig_data = {
                    "bank": bank_name,
                    "is_eligible": elig.get("is_eligible", ""),
                    "eligible_amount": elig.get("eligible_amount", ""),
                    "eligible_roi": elig.get("eligible_roi", ""),
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
                
                # Sum eligible amount ONLY where is_eligible = yes AND login_done = yes
                login_done_val = str(elig.get("login_done", "")).lower()
                is_eligible_val = str(elig.get("is_eligible", "")).lower()
                approval_status_val = str(elig.get("approval_status", "")).lower()
                disbursed_val = str(elig.get("disbursed", "")).lower()
                
                # Only count if BOTH is_eligible AND login_done are 'yes'
                if is_eligible_val == "yes" and login_done_val == "yes":
                    try:
                        if elig.get("eligible_amount"):
                            total_eligible_amount += float(elig.get("eligible_amount", 0))
                    except:
                        pass
                    # Add to login bank details
                    login_bank_details.append({
                        "bank": bank_name,
                        "amount": elig.get("eligible_amount", ""),
                        "roi": elig.get("eligible_roi", "")
                    })
                
                # Sum approved amounts
                try:
                    if elig.get("approved_amount"):
                        total_approved_amount += float(elig.get("approved_amount", 0))
                except:
                    pass
                    
                # Sum disbursed amounts
                try:
                    if elig.get("disbursed_amount"):
                        total_disbursed_amount += float(elig.get("disbursed_amount", 0))
                except:
                    pass
                
                # Collect ALL rejection reasons
                # 1. Not eligible reason
                if is_eligible_val == "no" and elig.get("not_eligible_reason"):
                    reject_reasons.append({
                        "type": "Not Eligible",
                        "bank": bank_name,
                        "amount": elig.get("eligible_amount", ""),
                        "reason": elig.get("not_eligible_reason", "")
                    })
                
                # 2. Login rejection reason
                if login_done_val == "no" and elig.get("login_rejection_reason"):
                    reject_reasons.append({
                        "type": "Login Rejected",
                        "bank": bank_name,
                        "amount": elig.get("eligible_amount", ""),
                        "reason": elig.get("login_rejection_reason", "")
                    })
                
                # 3. Declined reason
                if approval_status_val == "declined" and elig.get("declined_reason"):
                    reject_reasons.append({
                        "type": "Declined",
                        "bank": bank_name,
                        "amount": elig.get("approved_amount", "") or elig.get("eligible_amount", ""),
                        "reason": elig.get("declined_reason", "")
                    })
                
                # 4. Disbursement rejection reason
                if disbursed_val == "no" and elig.get("disbursement_rejection_reason"):
                    reject_reasons.append({
                        "type": "Disbursement Rejected",
                        "bank": bank_name,
                        "amount": elig.get("approved_amount", ""),
                        "reason": elig.get("disbursement_rejection_reason", "")
                    })
        
        # Get pending documents
        pending_docs = lead.get("pending_documents", "")
        
        # Get rejection reasons from activities
        rejection_reasons = []
        for activity in all_activities:
            action = activity.get("action", "")
            if "reject" in action.lower() or "decline" in action.lower() or "not eligible" in action.lower():
                rejection_reasons.append(activity)
        
        # Extract status-specific details (for backward compatibility)
        status_details = {
            "rejection_reason": "",
            "not_eligible_reason": "",
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
            
            # Convert values to lowercase for comparison
            is_elig = str(elig.get("is_eligible", "")).lower()
            login_done = str(elig.get("login_done", "")).lower()
            approval_stat = str(elig.get("approval_status", "")).lower()
            disbursed_stat = str(elig.get("disbursed", "")).lower()
                
            # Not eligible reasons
            if is_elig == "no" and elig.get("not_eligible_reason"):
                status_details["not_eligible_reason"] = elig.get("not_eligible_reason", "")
            
            # Login details
            if login_done == "yes":
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
            if approval_stat == "approved":
                approved_info = {
                    "bank": bank,
                    "amount": elig.get("approved_amount", ""),
                    "roi": elig.get("approved_roi", ""),
                    "tenure": elig.get("approved_tenure", "")
                }
                status_details["approved_banks"].append(approved_info)
            
            # Declined details
            if approval_stat == "declined":
                declined_info = {
                    "bank": bank,
                    "reason": elig.get("declined_reason", "")
                }
                status_details["declined_banks"].append(declined_info)
                if elig.get("declined_reason"):
                    status_details["rejection_reason"] = elig.get("declined_reason", "")
            
            # Disbursed details
            if disbursed_stat == "yes":
                disbursed_info = {
                    "bank": bank,
                    "amount": elig.get("disbursed_amount", ""),
                    "roi": elig.get("disbursed_roi", "")
                }
                status_details["disbursed_banks"].append(disbursed_info)
            
            # Disbursement rejection
            if disbursed_stat == "no" and elig.get("disbursement_rejection_reason"):
                status_details["rejection_reason"] = elig.get("disbursement_rejection_reason", "")
        
        # Get type_of_loan from additional_data (this is the "Type of Loan" field in CRM)
        type_of_loan = lead.get("additional_data", {}).get("type_of_loan", "") or lead.get("loan_type", "")
        
        enriched_lead = {
            "id": lead.get("id"),
            "full_name": lead.get("full_name"),
            "mobile": lead.get("mobile"),
            "email": lead.get("email", ""),
            "city": lead.get("city", ""),
            "loan_type": type_of_loan,  # Use type_of_loan from additional_data
            "loan_amount": lead.get("loan_amount", 0),
            "current_status": lead.get("status", "new"),
            "last_status_before_period": last_status,
            "pending_documents": pending_docs,
            "source_info": source_info,
            "manager_info": manager_info,
            "assigned_to": assigned_info,
            "eligibility_summary": eligibility_summary,
            "total_eligible_amount": total_eligible_amount,  # Only where is_eligible=Yes AND login_done=Yes
            "total_approved_amount": total_approved_amount,
            "total_disbursed_amount": total_disbursed_amount,
            "status_details": status_details,
            "activities_in_period": activities_in_range,
            "all_activities": all_activities,
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
        
        # Loan type counts - use loan_type which now has type_of_loan value
        loan_type = lead.get("loan_type") or "Not Specified"
        if not loan_type.strip():
            loan_type = "Not Specified"
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
    
    # Calculate totals (total_eligible is only where login=Yes)
    total_eligible = sum(l.get("total_eligible_amount", 0) for l in enriched_leads)
    total_approved = sum(l.get("total_approved_amount", 0) for l in enriched_leads)
    total_disbursed = sum(l.get("total_disbursed_amount", 0) for l in enriched_leads)
    
    summary = {
        "total_leads": len(enriched_leads),
        "status_distribution": status_counts,
        "loan_type_distribution": loan_type_counts,
        "total_eligible_amount": total_eligible,  # Only where is_eligible=Yes AND login_done=Yes
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



@router.get("/rejected-cases")
async def get_rejected_cases_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    manager_id: Optional[str] = Query(None, description="Filter by manager ID"),
    current_user: User = Depends(get_current_user)
):
    """Get report of all rejected/declined cases with detailed eligibility info"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")
    
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get all leads
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    
    # Filter by date range based on LATEST activity date
    leads_in_range = []
    for lead in all_leads:
        activities = lead.get("activities", [])
        
        # Find the latest activity timestamp
        latest_activity_date = None
        for activity in activities:
            ts = activity.get("timestamp", "")
            if ts:
                try:
                    activity_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if latest_activity_date is None or activity_date > latest_activity_date:
                        latest_activity_date = activity_date
                except:
                    pass
        
        # If no activities, use created_at as fallback
        if latest_activity_date is None:
            created = lead.get("created_at", "")
            if created:
                try:
                    latest_activity_date = datetime.fromisoformat(created.replace("Z", "+00:00"))
                except:
                    pass
        
        # Check if latest activity is in date range
        if latest_activity_date and start_date <= latest_activity_date <= end_date:
            leads_in_range.append(lead)
    
    # Get agents, partners, users for manager filtering
    agents = await db.agents.find({}, {"_id": 0}).to_list(1000)
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    agents_map = {a["id"]: a for a in agents}
    partners_map = {p["id"]: p for p in partners}
    
    # Apply manager filter if specified
    if manager_id:
        # Get agent IDs directly from agents collection where manager_id matches
        team_agent_ids = set()
        for agent in agents:
            if agent.get("manager_id") == manager_id:
                team_agent_ids.add(agent["id"])
        
        # Get partner IDs directly from partners collection where manager_id matches
        team_partner_ids = set()
        for partner in partners:
            if partner.get("manager_id") == manager_id:
                team_partner_ids.add(partner["id"])
        
        # Also check users collection for any users under this manager
        team_user_ids = set()
        for u in users:
            if u.get("manager_id") == manager_id:
                team_user_ids.add(u["id"])
        
        # Combine all valid source IDs
        valid_source_ids = team_agent_ids | team_partner_ids | team_user_ids
        
        # Filter leads by source_id
        leads_in_range = [l for l in leads_in_range if l.get("source_id") in valid_source_ids]
    
    # Filter for rejected/declined cases
    # A case is considered rejected if ANY of the following:
    # 1. Lead status is rejected/declined/not_interested/not_supporting
    # 2. Any eligibility has is_eligible = 'no'
    # 3. Any eligibility has login_done = 'no' with a rejection reason
    # 4. Any eligibility has approval_status = 'declined'
    # 5. Any eligibility has disbursed = 'no' with a rejection reason
    
    rejected_leads = []
    
    # Summary counters
    summary = {
        "total_cases": 0,
        "not_eligible": 0,
        "not_login": 0,
        "fi_negative": 0,
        "declined": 0,
        "not_disbursed": 0,
        "customer_not_interested": 0
    }
    
    rejected_statuses = ['rejected', 'declined', 'not_interested', 'not_supporting', 'fi_negative', 'query_hold']
    
    for lead in leads_in_range:
        lead_status = (lead.get("status") or "").lower()
        eligibilities = lead.get("eligibilities", [])
        
        is_rejected = False
        lead_rejection_types = set()
        
        # Check lead status
        if lead_status in rejected_statuses:
            is_rejected = True
            if lead_status == 'not_interested':
                lead_rejection_types.add('customer_not_interested')
            elif lead_status == 'fi_negative':
                lead_rejection_types.add('fi_negative')
        
        # Check each eligibility for rejection
        for elig in eligibilities:
            is_eligible = str(elig.get("is_eligible", "")).lower()
            login_done = str(elig.get("login_done", "")).lower()
            approval_status = str(elig.get("approval_status", "")).lower()
            disbursed = str(elig.get("disbursed", "")).lower()
            
            # Not eligible
            if is_eligible == "no":
                is_rejected = True
                lead_rejection_types.add('not_eligible')
            
            # Login rejected
            if login_done == "no" and elig.get("login_rejection_reason"):
                is_rejected = True
                lead_rejection_types.add('not_login')
            
            # Declined
            if approval_status == "declined":
                is_rejected = True
                lead_rejection_types.add('declined')
                reason = (elig.get("declined_reason") or "").lower()
                if 'not interested' in reason or 'customer' in reason:
                    lead_rejection_types.add('customer_not_interested')
            
            # Not disbursed
            if disbursed == "no" and elig.get("disbursement_rejection_reason"):
                is_rejected = True
                lead_rejection_types.add('not_disbursed')
        
        if is_rejected:
            # Get source info
            source_id = lead.get("source_id")
            source_name = None
            if source_id:
                if source_id in agents_map:
                    source_name = agents_map[source_id].get("full_name")
                elif source_id in partners_map:
                    source_name = partners_map[source_id].get("name")
            
            rejected_leads.append({
                "id": lead.get("id"),
                "full_name": lead.get("full_name"),
                "mobile": lead.get("mobile"),
                "email": lead.get("email"),
                "city": lead.get("city"),
                "employment_type": lead.get("employment_type"),
                "requirement": lead.get("requirement"),
                "status": lead.get("status"),
                "source": lead.get("source"),
                "source_id": source_id,
                "source_name": source_name,
                "created_at": lead.get("created_at"),
                "eligibilities": eligibilities,
                "rejection_types": list(lead_rejection_types)
            })
            
            # Update summary
            summary["total_cases"] += 1
            if 'not_eligible' in lead_rejection_types:
                summary["not_eligible"] += 1
            if 'not_login' in lead_rejection_types:
                summary["not_login"] += 1
            if 'fi_negative' in lead_rejection_types:
                summary["fi_negative"] += 1
            if 'declined' in lead_rejection_types:
                summary["declined"] += 1
            if 'not_disbursed' in lead_rejection_types:
                summary["not_disbursed"] += 1
            if 'customer_not_interested' in lead_rejection_types:
                summary["customer_not_interested"] += 1
    
    return {
        "summary": summary,
        "leads": rejected_leads,
        "date_range": {
            "from": from_date,
            "to": to_date
        }
    }



@router.get("/agent-performance")
async def get_agent_performance_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    manager_id: Optional[str] = Query(None, description="Filter by manager ID"),
    current_user: User = Depends(get_current_user)
):
    """Get agent-wise performance summary based on lead STATUS (not bank eligibilities)"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")
    
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get all data
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    agents = await db.agents.find({}, {"_id": 0}).to_list(1000)
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    # Build lookup maps
    agents_map = {a["id"]: a for a in agents}
    partners_map = {p["id"]: p for p in partners}
    managers_map = {u["id"]: u for u in users if u.get("role") == "manager"}
    team_leaders_map = {u["id"]: u for u in users if u.get("role") == "team_leader"}
    
    # Filter agents by manager if specified
    filtered_agents = agents
    filtered_partners = partners
    if manager_id:
        filtered_agents = [a for a in agents if a.get("manager_id") == manager_id]
        filtered_partners = [p for p in partners if p.get("manager_id") == manager_id]
    
    # Get valid source IDs for filtering
    valid_source_ids = set([a["id"] for a in filtered_agents] + [p["id"] for p in filtered_partners])
    
    # Helper function to check if date is in range
    def is_date_in_range(date_str):
        if not date_str:
            return False
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return start_date <= dt <= end_date
        except:
            return False
    
    # Build agent performance data
    agent_performance = {}
    
    # Process all leads
    for lead in all_leads:
        source_id = lead.get("source_id")
        if not source_id or source_id not in valid_source_ids:
            continue
        
        # Initialize agent performance if not exists
        if source_id not in agent_performance:
            source_info = agents_map.get(source_id) or partners_map.get(source_id) or {}
            source_type = "agent" if source_id in agents_map else "partner"
            
            agent_performance[source_id] = {
                "agent_id": source_id,
                "agent_name": source_info.get("full_name") or source_info.get("name", "Unknown"),
                "agent_type": source_type,
                "agent_code": source_info.get("agent_code") or source_info.get("referral_code", ""),
                "phone": source_info.get("phone") or source_info.get("mobile", ""),
                "manager_id": source_info.get("manager_id"),
                "manager_name": managers_map.get(source_info.get("manager_id"), {}).get("full_name", ""),
                "total_leads": 0,  # Leads CREATED in date range
                "new": 0,
                "contacted": 0,
                "in_progress": 0,
                "query_hold": 0,
                "login": 0,
                "documents_collected": 0,
                "approved": 0,
                "disbursed": 0,
                "rejected": 0,
                "other": 0,
                "total_approved_amount": 0,
                "total_disbursed_amount": 0
            }
        
        perf = agent_performance[source_id]
        
        # COUNT LEADS - based on CREATED DATE
        created_at = lead.get("created_at", "")
        if is_date_in_range(created_at):
            perf["total_leads"] += 1
        
        # Get lead's current status
        status = (lead.get("status") or "new").lower()
        
        # Check if lead had any activity in date range
        activities = lead.get("activities", [])
        has_activity_in_range = False
        for act in activities:
            if is_date_in_range(act.get("timestamp")):
                has_activity_in_range = True
                break
        
        # Also count if lead was created in range
        if is_date_in_range(created_at):
            has_activity_in_range = True
        
        # Only count status if lead had activity in date range
        if has_activity_in_range:
            if status == "new" or status == "fresh":
                perf["new"] += 1
            elif status == "contacted":
                perf["contacted"] += 1
            elif status == "in_progress":
                perf["in_progress"] += 1
            elif status == "query_hold":
                perf["query_hold"] += 1
            elif status == "login":
                perf["login"] += 1
            elif status == "documents_collected":
                perf["documents_collected"] += 1
            elif status == "approved":
                perf["approved"] += 1
                # Sum approved amounts from eligibilities
                for elig in lead.get("eligibilities", []):
                    if str(elig.get("approval_status", "")).lower() == "approved":
                        try:
                            perf["total_approved_amount"] += float(elig.get("approved_amount") or 0)
                        except:
                            pass
            elif status == "disbursed":
                perf["disbursed"] += 1
                # Sum disbursed amounts from eligibilities
                for elig in lead.get("eligibilities", []):
                    if str(elig.get("disbursed", "")).lower() == "yes":
                        try:
                            perf["total_disbursed_amount"] += float(elig.get("disbursed_amount") or 0)
                        except:
                            pass
            elif status == "rejected":
                perf["rejected"] += 1
            else:
                # Capture any other/uncategorized statuses
                perf["other"] += 1
    
    # Filter out agents with no leads created in the date range
    agents_with_leads = [p for p in agent_performance.values() if p["total_leads"] > 0]
    
    # Sort by total leads descending
    agents_with_leads.sort(key=lambda x: x["total_leads"], reverse=True)
    
    # Calculate totals
    totals = {
        "total_agents": len(agents_with_leads),
        "total_leads": sum(a["total_leads"] for a in agents_with_leads),
        "new": sum(a["new"] for a in agents_with_leads),
        "contacted": sum(a["contacted"] for a in agents_with_leads),
        "in_progress": sum(a["in_progress"] for a in agents_with_leads),
        "query_hold": sum(a["query_hold"] for a in agents_with_leads),
        "login": sum(a["login"] for a in agents_with_leads),
        "documents_collected": sum(a["documents_collected"] for a in agents_with_leads),
        "approved": sum(a["approved"] for a in agents_with_leads),
        "disbursed": sum(a["disbursed"] for a in agents_with_leads),
        "rejected": sum(a["rejected"] for a in agents_with_leads),
        "other": sum(a["other"] for a in agents_with_leads),
        "total_approved_amount": sum(a["total_approved_amount"] for a in agents_with_leads),
        "total_disbursed_amount": sum(a["total_disbursed_amount"] for a in agents_with_leads)
    }
    
    return {
        "agents": agents_with_leads,
        "totals": totals,
        "date_range": {
            "from": from_date,
            "to": to_date
        }
    }
