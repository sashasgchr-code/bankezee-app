from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
from auth import get_current_user, User, db

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/quality-report")
async def get_quality_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    manager_id: Optional[str] = Query(None),
    loan_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Quality Report: Agent-wise star rating distribution"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")

    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat()

    # Build filter
    query = {"created_at": {"$gte": start_iso, "$lte": end_iso}}
    if loan_type:
        loan_types = loan_type.split(",")
        query["$or"] = [
            {"requirement": {"$in": loan_types}},
            {"additional_data.type_of_loan": {"$in": loan_types}}
        ]

    leads = await db.leads.find(query, {"_id": 0, "id": 1, "source_id": 1, "source": 1,
                                         "star_rating": 1, "star_score": 1, "status": 1,
                                         "additional_data": 1}).to_list(10000)

    # Filter by manager if specified
    if manager_id:
        agents = await db.agents.find({}, {"_id": 0, "id": 1, "manager_id": 1}).to_list(1000)
        partners = await db.partners.find({}, {"_id": 0, "id": 1, "manager_id": 1}).to_list(1000)
        users = await db.users.find({}, {"_id": 0, "id": 1, "manager_id": 1}).to_list(1000)
        valid_ids = set()
        for a in agents:
            if a.get("manager_id") == manager_id:
                valid_ids.add(a["id"])
        for p in partners:
            if p.get("manager_id") == manager_id:
                valid_ids.add(p["id"])
        for u in users:
            if u.get("manager_id") == manager_id:
                valid_ids.add(u["id"])
        leads = [l for l in leads if l.get("source_id") in valid_ids]

    # Fetch all users for name lookup
    all_users = await db.users.find({}, {"_id": 0, "id": 1, "full_name": 1, "role": 1}).to_list(5000)
    name_map = {u["id"]: u["full_name"] for u in all_users}

    # Build per-agent star distribution
    agent_data = {}
    for lead in leads:
        source_id = lead.get("source_id") or ""
        if not source_id:
            continue
        agent_name = name_map.get(source_id, source_id[:8])
        stars = lead.get("star_rating") or 1

        if agent_name not in agent_data:
            agent_data[agent_name] = {
                "agent_id": source_id,
                "agent_name": agent_name,
                "total": 0,
                "star_5": 0, "star_4": 0, "star_3": 0, "star_2": 0, "star_1": 0,
                "avg_score": 0, "scores_sum": 0
            }
        ad = agent_data[agent_name]
        ad["total"] += 1
        ad[f"star_{stars}"] += 1
        ad["scores_sum"] += (lead.get("star_score") or 0)

    # Calculate averages and sort
    agents_list = []
    totals = {"total": 0, "star_5": 0, "star_4": 0, "star_3": 0, "star_2": 0, "star_1": 0, "scores_sum": 0}
    for ad in agent_data.values():
        ad["avg_score"] = round(ad["scores_sum"] / ad["total"], 1) if ad["total"] > 0 else 0
        del ad["scores_sum"]
        agents_list.append(ad)
        for k in totals:
            totals[k] += ad.get(k, 0) if k != "scores_sum" else 0
        totals["scores_sum"] += ad.get("avg_score", 0) * ad["total"]

    totals["avg_score"] = round(totals["scores_sum"] / totals["total"], 1) if totals["total"] > 0 else 0
    del totals["scores_sum"]

    agents_list.sort(key=lambda x: x["avg_score"], reverse=True)

    # Overall distribution
    overall = {"star_5": 0, "star_4": 0, "star_3": 0, "star_2": 0, "star_1": 0, "total": len(leads)}
    for lead in leads:
        s = lead.get("star_rating") or 1
        overall[f"star_{s}"] += 1

    return {
        "agents": agents_list,
        "totals": totals,
        "overall": overall,
        "date_range": {"from": from_date, "to": to_date}
    }



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
        type_of_loan = lead.get("additional_data", {}).get("type_of_loan", "") or lead.get("requirement", "") or lead.get("loan_type", "")
        
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
    
    # Filter by date range - include leads that have ANY activity in range OR were created in range
    leads_in_range = []
    for lead in all_leads:
        activities = lead.get("activities", [])
        
        # Check if any activity is in date range
        has_activity_in_range = False
        for activity in activities:
            ts = activity.get("timestamp", "")
            if ts:
                try:
                    activity_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if start_date <= activity_date <= end_date:
                        has_activity_in_range = True
                        break
                except:
                    pass
        
        # Check if lead was created in date range
        created_in_range = False
        created = lead.get("created_at", "")
        if created:
            try:
                created_date = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if start_date <= created_date <= end_date:
                    created_in_range = True
            except:
                pass
        
        # Include lead if it has activity OR was created in the date range
        if has_activity_in_range or created_in_range:
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
    """Growth Partner performance: Files Generated (created date) + activity-based stats with current/spillover"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")
    
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    start_str = from_date
    end_str = to_date + "T23:59:59.999999"

    def is_in_range(ts_str):
        if not ts_str:
            return False
        try:
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            return start_date <= dt <= end_date
        except:
            return False

    def is_created_in_range(created_at):
        if not created_at:
            return False
        return created_at >= start_str and created_at <= end_str

    # Get all data
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    agents = await db.agents.find({}, {"_id": 0}).to_list(1000)
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    agents_map = {a["id"]: a for a in agents}
    partners_map = {p["id"]: p for p in partners}
    managers_map = {u["id"]: u for u in users if u.get("role") == "manager"}
    
    filtered_agents = agents
    filtered_partners = partners
    if manager_id:
        filtered_agents = [a for a in agents if a.get("manager_id") == manager_id]
        filtered_partners = [p for p in partners if p.get("manager_id") == manager_id]
    
    valid_source_ids = set([a["id"] for a in filtered_agents] + [p["id"] for p in filtered_partners])

    # Status groups matching dashboard
    login_and_beyond = {'login', 'sent_for_approval', 'underwriting', 'fi', 'fi_negative',
                        'fi_reinitiated', 'query_hold', 'approved', 'disbursed', 'declined', 'not_disbursed'}
    in_progress_statuses = {'contacted', 'documents_collected', 'documents_pending',
                            'sent_for_eligibility', 'sent_for_login', 'login',
                            'sent_for_approval', 'underwriting', 'fi', 'fi_reinitiated', 'query_hold'}
    interim_reject_statuses = {'fi_negative', 'declined', 'customer_not_interested', 'customer_not_supporting'}
    final_reject_statuses = {'rejected', 'not_eligible', 'not_login', 'not_disbursed'}

    # Build per-agent data
    agent_perf = {}

    for lead in all_leads:
        source_id = lead.get("source_id")
        if not source_id or source_id not in valid_source_ids:
            continue

        if source_id not in agent_perf:
            source_info = agents_map.get(source_id) or partners_map.get(source_id) or {}
            agent_perf[source_id] = {
                "agent_name": source_info.get("full_name") or source_info.get("name", "Unknown"),
                "agent_code": source_info.get("agent_code") or source_info.get("referral_code", ""),
                "files_generated": 0,
                "contacted": 0, "docs_collected": 0, "docs_pending": 0,
                "sent_elig": 0, "sent_login": 0, "login": 0,
                "sent_appr": 0, "uw": 0, "fi": 0, "fi_reinit": 0, "q_hold": 0,
                "login_c": 0, "login_s": 0,
                "approved_c": 0, "approved_s": 0,
                "disbursed_c": 0, "disbursed_s": 0,
                "interim_c": 0, "interim_s": 0,
                "final_c": 0, "final_s": 0,
                "appr_amt": 0, "disb_amt": 0, "pipeline_amt": 0,
            }

        perf = agent_perf[source_id]
        created_at = lead.get("created_at", "")
        lead_created_in_range = is_created_in_range(created_at)
        lead_status = (lead.get("status") or "new").lower()

        # Files Generated = created in date range
        if lead_created_in_range:
            perf["files_generated"] += 1

        # Determine current vs spillover for this lead
        is_current = lead_created_in_range
        suffix = "_c" if is_current else "_s"

        # Check activity in range (matches dashboard hasActivityInRange)
        has_activity = False
        activities = lead.get("activities", [])
        for act in activities:
            if is_in_range(act.get("timestamp")):
                has_activity = True
                break
        if not has_activity:
            for elig in lead.get("eligibilities", []):
                if (is_in_range(elig.get("login_done_at")) or
                    is_in_range(elig.get("approved_at")) or
                    is_in_range(elig.get("disbursed_at"))):
                    has_activity = True
                    break
        # For current leads with no activity, check created_at
        if not has_activity and is_current:
            has_activity = is_in_range(created_at)
        
        if not has_activity and not is_current:
            continue

        # In Progress: individual status columns (created date only)
        if is_current:
            status_col_map = {
                'contacted': 'contacted', 'documents_collected': 'docs_collected',
                'documents_pending': 'docs_pending', 'sent_for_eligibility': 'sent_elig',
                'sent_for_login': 'sent_login', 'login': 'login',
                'sent_for_approval': 'sent_appr', 'underwriting': 'uw',
                'fi': 'fi', 'fi_reinitiated': 'fi_reinit', 'query_hold': 'q_hold'
            }
            if lead_status in status_col_map:
                perf[status_col_map[lead_status]] += 1

        # Login (current status based + activity in range — matches dashboard)
        if lead_status in login_and_beyond and has_activity:
            perf[f"login{suffix}"] += 1
        elif lead_status == 'rejected' and has_activity:
            was_logged = any((act.get("to_status") or "").lower() in login_and_beyond for act in activities)
            if was_logged:
                perf[f"login{suffix}"] += 1

        # Approved (activity date based)
        lead_has_approval = False
        for elig in lead.get("eligibilities", []):
            if elig.get("approval_status") == "approved" and is_in_range(elig.get("approved_at")):
                if not lead_has_approval:
                    lead_has_approval = True
                    perf[f"approved{suffix}"] += 1
                perf["appr_amt"] += float(elig.get("approved_amount") or 0)

        # Disbursed (activity date based)
        lead_has_disbursal = False
        for elig in lead.get("eligibilities", []):
            if str(elig.get("disbursed", "")).lower() == "yes" and is_in_range(elig.get("disbursed_at")):
                if not lead_has_disbursal:
                    lead_has_disbursal = True
                    perf[f"disbursed{suffix}"] += 1
                perf["disb_amt"] += float(elig.get("disbursed_amount") or 0)

        # Interim Rejects (status based + activity date filtered)
        if lead_status in interim_reject_statuses and has_activity:
            perf[f"interim{suffix}"] += 1

        # Final Rejections (status based + activity date filtered)
        if lead_status in final_reject_statuses and has_activity:
            perf[f"final{suffix}"] += 1

        # Amt in Pipeline: eligible_amount where login_done=yes & app_id filled, excl. disbursed/declined/rejected
        pipeline_exclude = {'rejected', 'not_eligible', 'not_login', 'not_disbursed', 'declined', 'disbursed'}
        if lead_status not in pipeline_exclude and is_current:
            for elig in lead.get("eligibilities", []):
                ld = str(elig.get("login_done") or "").lower()
                app_id = (elig.get("application_id") or "").strip()
                ed = str(elig.get("disbursed") or "").lower()
                edc = (elig.get("approval_status") or "").lower()
                if ld == "yes" and app_id and ed != "yes" and edc != "declined":
                    perf["pipeline_amt"] += float(elig.get("eligible_amount") or 0)

    # Filter and sort
    agents_list = [p for p in agent_perf.values() if p["files_generated"] > 0 or 
                   (p["login_c"] + p["login_s"] + p["approved_c"] + p["approved_s"] + 
                    p["disbursed_c"] + p["disbursed_s"] + p["interim_c"] + p["interim_s"] + 
                    p["final_c"] + p["final_s"]) > 0]
    agents_list.sort(key=lambda x: x["files_generated"], reverse=True)

    # Totals
    def sum_field(field):
        return sum(a.get(field, 0) for a in agents_list)
    
    totals = {
        "total_agents": len(agents_list),
        "files_generated": sum_field("files_generated"),
        "contacted": sum_field("contacted"), "docs_collected": sum_field("docs_collected"),
        "docs_pending": sum_field("docs_pending"), "sent_elig": sum_field("sent_elig"),
        "sent_login": sum_field("sent_login"), "login": sum_field("login"),
        "sent_appr": sum_field("sent_appr"), "uw": sum_field("uw"),
        "fi": sum_field("fi"), "fi_reinit": sum_field("fi_reinit"), "q_hold": sum_field("q_hold"),
        "login_c": sum_field("login_c"), "login_s": sum_field("login_s"),
        "approved_c": sum_field("approved_c"), "approved_s": sum_field("approved_s"),
        "disbursed_c": sum_field("disbursed_c"), "disbursed_s": sum_field("disbursed_s"),
        "interim_c": sum_field("interim_c"), "interim_s": sum_field("interim_s"),
        "final_c": sum_field("final_c"), "final_s": sum_field("final_s"),
        "appr_amt": sum_field("appr_amt"), "disb_amt": sum_field("disb_amt"),
        "pipeline_amt": sum_field("pipeline_amt"),
    }

    return {
        "agents": agents_list,
        "totals": totals,
        "date_range": {"from": from_date, "to": to_date}
    }


@router.get("/sales-operations")
async def get_sales_operations_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    agent_id: Optional[str] = Query(None),
    manager_id: Optional[str] = Query(None),
    loan_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Sales & Operations Report with Current/Spillover split"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can access reports")

    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat()

    # Use both formats for date boundary to handle varied created_at formats
    # Some leads may have "YYYY-MM-DD" format, others "YYYY-MM-DDTHH:MM:SS+00:00"
    start_date_str = from_date  # "YYYY-MM-DD" 
    end_date_str = to_date + "T23:59:59.999999"  # ensure we capture everything up to end of day

    # Build base filter (agent, manager, loan type)
    base_filter = {}
    if manager_id:
        base_filter["manager_id"] = manager_id
    if agent_id:
        base_filter["assigned_to"] = agent_id
    if loan_type:
        loan_types = loan_type.split(",")
        base_filter["$or"] = [
            {"requirement": {"$in": loan_types}},
            {"additional_data.type_of_loan": {"$in": loan_types}}
        ]

    # Query 1: Current month leads (created within date range)
    current_query = {**base_filter, "created_at": {"$gte": start_date_str, "$lte": end_date_str}}
    current_leads = await db.leads.find(current_query, {"_id": 0}).to_list(10000)

    # Query 2: Spillover leads (created BEFORE date range - activity might be in range)
    spillover_query = {**base_filter, "created_at": {"$lt": start_date_str}}
    older_leads = await db.leads.find(spillover_query, {"_id": 0}).to_list(10000)

    # Fetch ALL users for name lookup (leads can be assigned to any role)
    all_users = await db.users.find({}, {"_id": 0, "id": 1, "full_name": 1, "role": 1}).to_list(5000)
    agents_map = {u["id"]: u["full_name"] for u in all_users}

    # --- Helper functions ---
    def parse_ts(ts_str):
        if not ts_str:
            return None
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    def in_range(ts_str):
        dt = parse_ts(ts_str)
        return dt is not None and start_date <= dt <= end_date

    def days_between(dt1, dt2):
        if dt1 and dt2:
            diff = round(abs((dt2 - dt1).total_seconds()) / 86400, 1)
            # Skip if timestamps are identical (bulk data entry)
            if diff == 0.0:
                return None
            return diff
        return None

    def tat_stats(values):
        if not values:
            return {"mode": None, "mode_count": 0, "min": None, "max": None, "avg": None, "count": 0}
        from collections import Counter
        rounded = [round(v) for v in values]
        counter = Counter(rounded)
        mode_val, mode_count = counter.most_common(1)[0]
        return {
            "mode": mode_val,
            "mode_count": mode_count,
            "min": round(min(values), 1),
            "max": round(max(values), 1),
            "avg": round(sum(values) / len(values), 1),
            "count": len(values)
        }

    def tat_distribution(values):
        """Return count of forms per rounded day bucket: {1: 3, 2: 5, ...}"""
        if not values:
            return {}
        from collections import Counter
        rounded = [max(1, round(v)) if v > 0 else 0 for v in values]
        rounded = [r for r in rounded if r > 0]  # exclude 0d
        return dict(sorted(Counter(rounded).items()))

    def categorize_rejection(reason_text, reasons_dict):
        reason_lower = (reason_text or "").strip()
        if not reason_lower:
            return
        # Use the actual reason text (title-cased) instead of bucketing into categories
        reason_key = reason_lower.title()
        reasons_dict[reason_key] = reasons_dict.get(reason_key, 0) + 1

    # --- Processing function for a set of leads ---
    def process_leads(leads, is_spillover=False):
        result = {
            "files": len(leads) if not is_spillover else 0,
            "logged": 0, "approvals": 0, "disbursals": 0,
            "disbursal_value": 0,
            "in_progress": 0, "interim_rejects": 0, "final_rejections": 0,
            "amt_in_pipeline": 0,
        }
        agent_data = {}
        bank_data = {}
        bank_tat_data = {}
        tat_data = {"l2l": [], "l2a": [], "a2d": [], "l2d": []}
        pipeline_data = {"pre_login": 0, "login": 0, "approved": 0}
        rejection_data = {}
        total_rejections = 0

        for lead in leads:
            eligibilities = lead.get("eligibilities", [])
            # Use source_id (actual agent/partner) for team metrics, fallback to assigned_to
            source_id = lead.get("source_id") or ""
            assigned_to = lead.get("assigned_to", "")
            agent_id = source_id if source_id else assigned_to
            agent_name = agents_map.get(agent_id, agents_map.get(assigned_to, assigned_to[:8] if assigned_to else "Unassigned"))

            # For spillover: check if any activity timestamp falls in range
            if is_spillover:
                has_activity_in_range = False
                for elig in eligibilities:
                    if (in_range(elig.get("login_done_at")) or
                            in_range(elig.get("approved_at")) or
                            in_range(elig.get("disbursed_at"))):
                        has_activity_in_range = True
                        break
                # Also check activity log for ANY activity in range (not just status_change)
                if not has_activity_in_range:
                    for act in lead.get("activities", []):
                        if in_range(act.get("timestamp")):
                            has_activity_in_range = True
                            break
                if not has_activity_in_range:
                    continue
                # Count spillover lead as a "file" in this context
                result["files"] += 1

            # Check if lead has any activity in the date range (used for status-based stats)
            # This matches the dashboard's hasActivityInRange logic
            lead_has_activity = True  # current leads always have activity (they were created in range)
            if is_spillover:
                lead_has_activity = True  # already verified above

            # For current leads, also verify activity in range (to match dashboard exactly)
            if not is_spillover:
                lead_has_activity = False
                for act in lead.get("activities", []):
                    if in_range(act.get("timestamp")):
                        lead_has_activity = True
                        break
                # If no activities but lead was created in range, check created_at as activity
                if not lead_has_activity:
                    lead_has_activity = in_range(lead.get("created_at"))

            if agent_name not in agent_data:
                agent_data[agent_name] = {"files": 0, "logins": 0, "approvals": 0, "disbursals": 0, "disbursal_value": 0}
            # Files count based on created date only (not spillover)
            if not is_spillover:
                agent_data[agent_name]["files"] += 1

            lead_has_login = False
            lead_has_approval = False
            lead_has_disbursal = False
            lead_has_rejection = False
            lead_disbursal_value = 0

            # Files Logged = any lead whose current status is at login stage or beyond
            # If current status is login, approved, declined, disbursed, etc. → it was logged
            login_and_beyond = {'login', 'sent_for_approval', 'underwriting', 'fi', 'fi_negative',
                                'fi_reinitiated', 'query_hold', 'approved', 'disbursed',
                                'declined', 'not_disbursed'}
            lead_status = (lead.get("status") or "").lower()
            if lead_status in login_and_beyond:
                if lead_has_activity:
                    lead_has_login = True
                    result["logged"] += 1
            # Also count rejected leads that were in login stage (check activity log)
            elif lead_status == 'rejected':
                was_logged = any(
                    (act.get("to_status") or "").lower() in login_and_beyond
                    for act in lead.get("activities", [])
                )
                if was_logged and lead_has_activity:
                    lead_has_login = True
                    result["logged"] += 1

            # In Progress: based on current status and CREATED DATE ONLY (no spillover)
            in_progress_statuses = {'contacted', 'documents_collected', 'documents_pending',
                                    'sent_for_eligibility', 'sent_for_login', 'login',
                                    'sent_for_approval', 'underwriting', 'fi', 'fi_reinitiated', 'query_hold'}
            if lead_status in in_progress_statuses and not is_spillover:
                result["in_progress"] += 1

            # Interim Rejects: fi_negative, declined, customer_not_interested, customer_not_supporting
            interim_reject_statuses = {'fi_negative', 'declined', 'customer_not_interested', 'customer_not_supporting'}
            if lead_status in interim_reject_statuses and lead_has_activity:
                result["interim_rejects"] += 1

            # Final Rejections: rejected, not_eligible, not_login, not_disbursed
            final_reject_statuses = {'rejected', 'not_eligible', 'not_login', 'not_disbursed'}
            if lead_status in final_reject_statuses and lead_has_activity:
                result["final_rejections"] += 1

            # Amt in Pipeline: eligible_amount where login_done=yes & app_id filled, excl disbursed/declined/rejected
            pipeline_exclude = {'rejected', 'not_eligible', 'not_login', 'not_disbursed', 'declined', 'disbursed'}
            if lead_status not in pipeline_exclude:
                for elig in eligibilities:
                    ld = str(elig.get("login_done") or "").lower()
                    app_id = (elig.get("application_id") or "").strip()
                    ed = str(elig.get("disbursed") or "").lower()
                    edc = (elig.get("approval_status") or "").lower()
                    if ld == "yes" and app_id and ed != "yes" and edc != "declined":
                        result["amt_in_pipeline"] += float(elig.get("eligible_amount") or 0)

            for elig in eligibilities:
                raw_bank = elig.get("bank_name") or elig.get("login_bank") or ""
                # Normalize bank name: uppercase, strip whitespace
                bank = raw_bank.strip().upper() if raw_bank.strip() else "UNKNOWN"

                # Always check activity timestamps for approvals and disbursals
                # This ensures consistency with dashboard stats
                approval_in_range = in_range(elig.get("approved_at"))
                disbursal_in_range = in_range(elig.get("disbursed_at"))

                # Eligible/Not eligible
                if elig.get("is_eligible") == "no":
                    categorize_rejection(elig.get("not_eligible_reason"), rejection_data)

                # Bank-level login tracking (for Bank Performance table)
                is_logged_elig = (elig.get("login_done") == "yes" or
                             elig.get("approval_status") in ("approved", "declined") or
                             elig.get("disbursed") == "yes")
                if is_logged_elig:
                    if bank and bank != "UNKNOWN":
                        if bank not in bank_data:
                            bank_data[bank] = {"logins": 0, "approvals": 0, "disbursals": 0, "disbursal_amount": 0}
                        bank_data[bank]["logins"] += 1

                # Approval
                if elig.get("approval_status") == "approved" and approval_in_range:
                    if not lead_has_approval:
                        lead_has_approval = True
                        result["approvals"] += 1
                    if bank and bank != "UNKNOWN":
                        if bank not in bank_data:
                            bank_data[bank] = {"logins": 0, "approvals": 0, "disbursals": 0, "disbursal_amount": 0}
                        bank_data[bank]["approvals"] += 1
                elif elig.get("approval_status") == "declined":
                    if not lead_has_rejection:
                        lead_has_rejection = True
                        total_rejections += 1
                    categorize_rejection(elig.get("declined_reason"), rejection_data)

                # Disbursal
                if elig.get("disbursed") == "yes" and disbursal_in_range:
                    amt = float(elig.get("disbursed_amount") or 0)
                    if not lead_has_disbursal:
                        lead_has_disbursal = True
                        result["disbursals"] += 1
                    lead_disbursal_value += amt
                    if bank and bank != "UNKNOWN":
                        if bank not in bank_data:
                            bank_data[bank] = {"logins": 0, "approvals": 0, "disbursals": 0, "disbursal_amount": 0}
                        bank_data[bank]["disbursals"] += 1
                        bank_data[bank]["disbursal_amount"] += amt

                # TAT - only compute for stages that actually occurred
                lead_created = parse_ts(lead.get("created_at"))
                login_at = parse_ts(elig.get("login_done_at"))
                approved_at = parse_ts(elig.get("approved_at"))
                disbursed_at = parse_ts(elig.get("disbursed_at"))

                if bank and bank != "UNKNOWN":
                    if bank not in bank_tat_data:
                        bank_tat_data[bank] = {"lead_to_login": [], "login_to_approval": [], "approval_to_disbursal": []}

                # Lead → Login TAT: only if login actually happened
                if login_at:
                    d = days_between(lead_created, login_at)
                    if d is not None:
                        tat_data["l2l"].append(d)
                        if bank and bank != "UNKNOWN":
                            bank_tat_data[bank]["lead_to_login"].append(d)

                # Login → Approval TAT: only if BOTH login and approval happened
                if login_at and approved_at:
                    d = days_between(login_at, approved_at)
                    if d is not None:
                        tat_data["l2a"].append(d)
                        if bank and bank != "UNKNOWN":
                            bank_tat_data[bank]["login_to_approval"].append(d)

                # Approval → Disbursal TAT: only if BOTH approval and disbursal happened
                if approved_at and disbursed_at:
                    d = days_between(approved_at, disbursed_at)
                    if d is not None:
                        tat_data["a2d"].append(d)
                        if bank and bank != "UNKNOWN":
                            bank_tat_data[bank]["approval_to_disbursal"].append(d)

                # Lead → Disbursal E2E TAT: only if disbursal actually happened
                if disbursed_at:
                    d = days_between(lead_created, disbursed_at)
                    if d is not None:
                        tat_data["l2d"].append(d)

            result["disbursal_value"] += lead_disbursal_value

            if lead_has_login:
                agent_data[agent_name]["logins"] += 1
            if lead_has_approval:
                agent_data[agent_name]["approvals"] += 1
            if lead_has_disbursal:
                agent_data[agent_name]["disbursals"] += 1
                agent_data[agent_name]["disbursal_value"] += lead_disbursal_value

            if not lead_has_disbursal:
                if lead_has_approval:
                    pipeline_data["approved"] += 1
                elif lead_has_login:
                    pipeline_data["login"] += 1
                else:
                    pipeline_data["pre_login"] += 1

        return {
            "metrics": result,
            "agent_data": agent_data,
            "bank_data": bank_data,
            "bank_tat_data": bank_tat_data,
            "tat_data": tat_data,
            "pipeline": pipeline_data,
            "rejections": rejection_data,
            "total_rejections": total_rejections,
        }

    # Process both sets
    curr = process_leads(current_leads, is_spillover=False)
    spill = process_leads(older_leads, is_spillover=True)

    # Merge helper
    def m(c, s):
        return {"current": c, "spillover": s, "total": c + s}

    cm = curr["metrics"]
    sm = spill["metrics"]

    total_files = cm["files"]  # Only current month for files generated
    total_logged = cm["logged"] + sm["logged"]
    total_approvals = cm["approvals"] + sm["approvals"]
    total_disbursals = cm["disbursals"] + sm["disbursals"]
    total_disbursal_value = cm["disbursal_value"] + sm["disbursal_value"]
    avg_loan_value = round(total_disbursal_value / total_disbursals, 2) if total_disbursals > 0 else 0

    # Conversion (based on totals)
    def pct(num, denom):
        return round((num / denom * 100), 1) if denom > 0 else 0

    # Merge agent stats
    merged_agents = {}
    for src in [curr["agent_data"], spill["agent_data"]]:
        for name, stats in src.items():
            if name not in merged_agents:
                merged_agents[name] = {"files": 0, "logins": 0, "approvals": 0, "disbursals": 0, "disbursal_value": 0}
            for k in ["files", "logins", "approvals", "disbursals", "disbursal_value"]:
                merged_agents[name][k] += stats[k]

    # Merge bank stats
    merged_banks = {}
    for src in [curr["bank_data"], spill["bank_data"]]:
        for bank, stats in src.items():
            if bank not in merged_banks:
                merged_banks[bank] = {"logins": 0, "approvals": 0, "disbursals": 0, "disbursal_amount": 0}
            for k in ["logins", "approvals", "disbursals", "disbursal_amount"]:
                merged_banks[bank][k] += stats[k]

    # Merge bank TAT
    merged_bank_tat = {}
    for src in [curr["bank_tat_data"], spill["bank_tat_data"]]:
        for bank, tat in src.items():
            if bank not in merged_bank_tat:
                merged_bank_tat[bank] = {"lead_to_login": [], "login_to_approval": [], "approval_to_disbursal": []}
            for k in ["lead_to_login", "login_to_approval", "approval_to_disbursal"]:
                merged_bank_tat[bank][k].extend(tat[k])

    # Merge TAT
    merged_tat = {}
    for k in ["l2l", "l2a", "a2d", "l2d"]:
        merged_tat[k] = curr["tat_data"][k] + spill["tat_data"][k]

    # Merge pipeline
    merged_pipeline = {}
    for k in ["pre_login", "login", "approved"]:
        merged_pipeline[k] = curr["pipeline"][k] + spill["pipeline"][k]

    # Merge rejections
    merged_rejections = {}
    for k in curr["rejections"]:
        merged_rejections[k] = curr["rejections"][k] + spill["rejections"].get(k, 0)
    total_rej = curr["total_rejections"] + spill["total_rejections"]

    num_agents = len([a for a in merged_agents if merged_agents[a]["files"] > 0])

    return {
        "business_volume": {
            "total_files_generated": total_files,
            "files_logged": m(cm["logged"], sm["logged"]),
            "approvals": m(cm["approvals"], sm["approvals"]),
            "disbursals": m(cm["disbursals"], sm["disbursals"]),
            "disbursal_value": m(cm["disbursal_value"], sm["disbursal_value"]),
            "avg_loan_value": avg_loan_value,
            "in_progress": m(cm["in_progress"], sm["in_progress"]),
            "interim_rejects": m(cm["interim_rejects"], sm["interim_rejects"]),
            "final_rejections": m(cm["final_rejections"], sm["final_rejections"]),
            "amt_in_pipeline": cm["amt_in_pipeline"] + sm["amt_in_pipeline"],
        },
        "conversion_metrics": {
            "lead_to_login": pct(cm["logged"], cm["files"]),
            "login_to_approval": pct(cm["approvals"], cm["logged"]),
            "approval_to_disbursal": pct(cm["disbursals"], cm["approvals"]),
            "logged_to_disbursal": pct(cm["disbursals"], cm["logged"]),
            "lead_to_disbursal_e2e": pct(cm["disbursals"], cm["files"]),
        },
        "tat_analysis": {
            "lead_to_login": tat_stats(merged_tat["l2l"]),
            "login_to_approval": tat_stats(merged_tat["l2a"]),
            "approval_to_disbursal": tat_stats(merged_tat["a2d"]),
            "lead_to_disbursal_e2e": tat_stats(merged_tat["l2d"]),
        },
        "tat_distribution": {
            "lead_to_login": tat_distribution(merged_tat["l2l"]),
            "login_to_approval": tat_distribution(merged_tat["l2a"]),
            "approval_to_disbursal": tat_distribution(merged_tat["a2d"]),
            "lead_to_disbursal_e2e": tat_distribution(merged_tat["l2d"]),
        },
        "team_productivity": {
            "num_agents": num_agents,
            "files_per_agent": round((total_files + sm["files"]) / num_agents, 1) if num_agents > 0 else 0,
            "disbursals_per_agent": round(total_disbursals / num_agents, 1) if num_agents > 0 else 0,
            "agent_breakdown": [
                {"name": name, **stats}
                for name, stats in sorted(merged_agents.items(), key=lambda x: x[1]["files"], reverse=True)
            ]
        },
        "bank_performance": [
            {
                "bank": bank,
                **stats,
                "tat": {
                    "lead_to_login": tat_stats(merged_bank_tat.get(bank, {}).get("lead_to_login", [])),
                    "login_to_approval": tat_stats(merged_bank_tat.get(bank, {}).get("login_to_approval", [])),
                    "approval_to_disbursal": tat_stats(merged_bank_tat.get(bank, {}).get("approval_to_disbursal", [])),
                }
            }
            for bank, stats in sorted(merged_banks.items(), key=lambda x: x[1]["disbursals"], reverse=True)
        ],
        "pipeline_health": {
            "pre_login": merged_pipeline["pre_login"],
            "login": merged_pipeline["login"],
            "approved": merged_pipeline["approved"],
            "total": sum(merged_pipeline.values()),
        },
        "rejection_analysis": {
            "total_rejection_pct": pct(total_rej, total_logged),
            "total_rejections": total_rej + sum(merged_rejections.values()),
            "reasons": merged_rejections,
        },
        "spillover_count": sm["files"],
        "date_range": {"from": from_date, "to": to_date},
        "filters_applied": {
            "agent_id": agent_id,
            "manager_id": manager_id,
            "loan_type": loan_type,
        }
    }
