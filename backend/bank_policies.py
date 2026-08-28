from fastapi import APIRouter, HTTPException, Depends, Query, Body
from auth import get_current_user, User
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import uuid

router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'test_database')]

# Bank Policy schema fields
POLICY_FIELDS = [
    "bank_name", "is_active", "applicable_profiles", "min_salary", "max_salary",
    "min_cibil", "max_age", "min_age", "min_loan_amount", "max_loan_amount",
    "min_tenure", "max_tenure", "roi_min", "roi_max", "max_foir",
    "company_categories", "min_present_employment_months", "min_total_employment_months",
    "bachelor_accommodation", "hostel_accommodation",
    "bt_allowed", "max_bt_count", "app_loan_bt", "cc_bt_allowed", "topup_allowed",
    "merge_consolidation", "min_loan_seasoning_months",
    "processing_fee", "special_notes", "required_documents",
    "serviceable_locations", "special_features",
    "loan_types"
]


@router.post("/policies")
async def create_policy(policy: dict = Body(...), current_user: User = Depends(get_current_user)):
    """Create a new bank/lender policy"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    policy_doc = {
        "id": str(uuid.uuid4()),
        "bank_name": policy.get("bank_name", "").strip(),
        "is_active": policy.get("is_active", True),
        "applicable_profiles": policy.get("applicable_profiles", ["salaried"]),
        "loan_types": policy.get("loan_types", ["personal_loan"]),
        "min_salary": policy.get("min_salary"),
        "max_salary": policy.get("max_salary"),
        "min_cibil": policy.get("min_cibil"),
        "min_age": policy.get("min_age", 21),
        "max_age": policy.get("max_age", 60),
        "min_loan_amount": policy.get("min_loan_amount"),
        "max_loan_amount": policy.get("max_loan_amount"),
        "min_tenure": policy.get("min_tenure"),
        "max_tenure": policy.get("max_tenure"),
        "roi_min": policy.get("roi_min"),
        "roi_max": policy.get("roi_max"),
        "max_foir": policy.get("max_foir"),
        "company_categories": policy.get("company_categories", []),
        "min_present_employment_months": policy.get("min_present_employment_months"),
        "min_total_employment_months": policy.get("min_total_employment_months"),
        "bachelor_accommodation": policy.get("bachelor_accommodation"),
        "hostel_accommodation": policy.get("hostel_accommodation"),
        "bt_allowed": policy.get("bt_allowed", False),
        "max_bt_count": policy.get("max_bt_count"),
        "app_loan_bt": policy.get("app_loan_bt", False),
        "cc_bt_allowed": policy.get("cc_bt_allowed", False),
        "topup_allowed": policy.get("topup_allowed", False),
        "merge_consolidation": policy.get("merge_consolidation", False),
        "min_loan_seasoning_months": policy.get("min_loan_seasoning_months"),
        "processing_fee": policy.get("processing_fee"),
        "special_notes": policy.get("special_notes", ""),
        "required_documents": policy.get("required_documents", []),
        "serviceable_locations": policy.get("serviceable_locations", []),
        "special_features": policy.get("special_features", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.full_name
    }

    if not policy_doc["bank_name"]:
        raise HTTPException(status_code=400, detail="Bank name is required")

    await db.bank_policies.insert_one(policy_doc)
    return {"message": "Policy created", "id": policy_doc["id"]}


@router.get("/policies")
async def get_policies(
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """Get all bank policies"""
    query = {}
    if active_only:
        query["is_active"] = True
    policies = await db.bank_policies.find(query, {"_id": 0}).sort("bank_name", 1).to_list(500)
    return policies


@router.get("/policies/{policy_id}")
async def get_policy(policy_id: str, current_user: User = Depends(get_current_user)):
    """Get a single policy"""
    policy = await db.bank_policies.find_one({"id": policy_id}, {"_id": 0})
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.put("/policies/{policy_id}")
async def update_policy(
    policy_id: str,
    updates: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update a bank policy"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    existing = await db.bank_policies.find_one({"id": policy_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Policy not found")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = current_user.full_name
    updates.pop("id", None)
    updates.pop("_id", None)
    updates.pop("created_at", None)

    await db.bank_policies.update_one({"id": policy_id}, {"$set": updates})
    return {"message": "Policy updated"}


@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, current_user: User = Depends(get_current_user)):
    """Delete a bank policy"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.bank_policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"message": "Policy deleted"}


@router.post("/policies/bulk-import")
async def bulk_import_policies(
    policies: list = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Bulk import policies from a structured list"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    count = 0
    for p in policies:
        p["id"] = str(uuid.uuid4())
        p["is_active"] = p.get("is_active", True)
        p["created_at"] = datetime.now(timezone.utc).isoformat()
        p["updated_at"] = datetime.now(timezone.utc).isoformat()
        p["updated_by"] = current_user.full_name
        await db.bank_policies.insert_one(p)
        count += 1

    return {"message": f"Imported {count} policies"}


# ============================================================
# ELIGIBILITY ENGINE
# ============================================================

def evaluate_lead_against_policy(lead_data, policy):
    """Evaluate a single lead against a single bank policy. Returns eligibility result."""
    ad = lead_data.get("additional_data", {})
    results = []
    eligibility = "eligible"  # start optimistic
    confidence = "high"
    reasons_pass = []
    reasons_fail = []
    reasons_warning = []

    # Resolve EMI from multiple possible field names
    resolved_emi = ad.get("existing_emi") or ad.get("current_emi") or ad.get("obligations_emi")

    # Auto-calculate FOIR if not explicitly set
    resolved_foir = ad.get("foir")
    if not resolved_foir and resolved_emi and ad.get("net_salary"):
        try:
            emi_val = float(resolved_emi)
            salary_val = float(ad["net_salary"])
            if salary_val > 0:
                resolved_foir = round((emi_val / salary_val) * 100, 1)
        except (ValueError, TypeError):
            pass

    def check(rule_name, customer_val, requirement, operator="gte", source="CRM Data", critical=True):
        """Check a rule. critical=True means missing data downgrades eligibility; False means warning only."""
        nonlocal eligibility, confidence
        if customer_val is None or customer_val == "" or customer_val == 0:
            reasons_warning.append({
                "rule": rule_name, "customer": "Not available",
                "required": str(requirement), "result": "UNKNOWN", "source": source
            })
            if critical and eligibility == "eligible":
                eligibility = "possibly_eligible"
            if confidence == "high":
                confidence = "medium"
            return
        try:
            cv = float(customer_val)
            rv = float(requirement)
        except (ValueError, TypeError):
            reasons_warning.append({
                "rule": rule_name, "customer": str(customer_val),
                "required": str(requirement), "result": "UNKNOWN", "source": source
            })
            return

        passed = False
        if operator == "gte":
            passed = cv >= rv
        elif operator == "lte":
            passed = cv <= rv
        elif operator == "between":
            passed = rv <= cv  # simplified

        if passed:
            reasons_pass.append({
                "rule": rule_name, "customer": str(customer_val),
                "required": str(requirement), "result": "PASS", "source": source
            })
        else:
            reasons_fail.append({
                "rule": rule_name, "customer": str(customer_val),
                "required": str(requirement), "result": "FAIL", "source": source
            })
            eligibility = "not_eligible"

    # 1. Salary check
    net_salary = ad.get("net_salary")
    if policy.get("min_salary"):
        check("Net Salary", net_salary, policy["min_salary"], "gte", "CRM Data")

    # 2. CIBIL check
    cibil = ad.get("cibil_score")
    if policy.get("min_cibil"):
        check("CIBIL Score", cibil, policy["min_cibil"], "gte", "CRM Data")

    # 3. Age check (non-critical: missing age doesn't downgrade eligibility)
    age = ad.get("age")
    if not age and ad.get("dob"):
        try:
            from datetime import datetime as dt
            dob = dt.fromisoformat(ad["dob"].replace("Z", "+00:00"))
            age = (datetime.now(timezone.utc) - dob).days // 365
        except Exception:
            pass
    if policy.get("min_age") and age:
        check("Minimum Age", age, policy["min_age"], "gte", "Calculated", critical=False)
    if policy.get("max_age") and age:
        check("Maximum Age", age, policy["max_age"], "lte", "Calculated", critical=False)

    # 4. FOIR check
    foir = resolved_foir
    foir_source = "CRM Data" if ad.get("foir") else "Auto-calculated"
    if policy.get("max_foir") and foir:
        try:
            foir_val = float(foir)
            max_foir = float(policy["max_foir"])
            if foir_val <= max_foir:
                reasons_pass.append({
                    "rule": "FOIR", "customer": f"{foir_val}%",
                    "required": f"≤{max_foir}%", "result": "PASS", "source": foir_source
                })
            else:
                reasons_fail.append({
                    "rule": "FOIR", "customer": f"{foir_val}%",
                    "required": f"≤{max_foir}%", "result": "FAIL", "source": foir_source
                })
                eligibility = "not_eligible"
        except (ValueError, TypeError):
            pass

    # 5. Company category check
    company_type = ad.get("company_type", "").lower()
    allowed_categories = [c.lower() for c in (policy.get("company_categories") or [])]
    if allowed_categories and company_type:
        if company_type in allowed_categories or "all" in allowed_categories:
            reasons_pass.append({
                "rule": "Company Category", "customer": company_type.title(),
                "required": ", ".join(allowed_categories), "result": "PASS", "source": "CRM Data"
            })
        else:
            reasons_fail.append({
                "rule": "Company Category", "customer": company_type.title(),
                "required": ", ".join(allowed_categories), "result": "FAIL", "source": "Policy Rule"
            })
            eligibility = "not_eligible"
    elif allowed_categories and not company_type:
        reasons_warning.append({
            "rule": "Company Category", "customer": "Not specified",
            "required": ", ".join(allowed_categories), "result": "UNKNOWN", "source": "Policy Rule"
        })
        confidence = "medium"

    # 6. Employment vintage (non-critical: missing employment data doesn't downgrade eligibility)
    if policy.get("min_present_employment_months"):
        emp_months = ad.get("present_employment_months")
        check("Present Employment", emp_months, policy["min_present_employment_months"], "gte", "CRM Data", critical=False)

    if policy.get("min_total_employment_months"):
        total_emp = ad.get("total_employment_months")
        check("Total Employment", total_emp, policy["min_total_employment_months"], "gte", "CRM Data", critical=False)

    # 7. CIBIL Issues
    cibil_issues = ad.get("cibil_issues", "").lower()
    if cibil_issues == "major":
        reasons_fail.append({
            "rule": "CIBIL Issues", "customer": "Major Issues",
            "required": "No major issues", "result": "FAIL", "source": "CRM Data"
        })
        eligibility = "not_eligible"
    elif cibil_issues == "minor":
        reasons_warning.append({
            "rule": "CIBIL Issues", "customer": "Minor Issues",
            "required": "No issues preferred", "result": "WARNING", "source": "CRM Data"
        })
        if confidence == "high":
            confidence = "medium"

    # 8. Calculate eligible amount
    eligible_amount = None
    estimated_emi = None
    try:
        salary = float(net_salary or 0)
        max_foir_pct = float(policy.get("max_foir") or 60) / 100
        existing_emi = float(resolved_emi or 0)
        roi = float(policy.get("roi_min") or 12) / 100 / 12  # monthly rate
        max_tenure_months = int(policy.get("max_tenure") or 60)

        max_total_emi = salary * max_foir_pct
        available_emi = max_total_emi - existing_emi

        if available_emi > 0 and roi > 0:
            # PV of annuity formula
            eligible_amount = available_emi * ((1 - (1 + roi) ** (-max_tenure_months)) / roi)
            eligible_amount = round(eligible_amount, -3)  # round to nearest 1000
            estimated_emi = available_emi

            # Cap at policy max
            if policy.get("max_loan_amount") and eligible_amount > float(policy["max_loan_amount"]):
                eligible_amount = float(policy["max_loan_amount"])

            # Cap at policy min
            if policy.get("min_loan_amount") and eligible_amount < float(policy["min_loan_amount"]):
                eligible_amount = 0
                reasons_fail.append({
                    "rule": "Minimum Loan Amount", "customer": f"₹{eligible_amount:,.0f}",
                    "required": f"₹{float(policy['min_loan_amount']):,.0f}", "result": "FAIL", "source": "Calculated"
                })
                eligibility = "not_eligible"
    except Exception:
        pass

    # Determine confidence
    if len(reasons_warning) >= 3:
        confidence = "low"
    elif len(reasons_warning) >= 1 and confidence == "high":
        confidence = "medium"

    # Build rich BT info with text details
    bt_info = {
        "bt_allowed": policy.get("bt_allowed", False),
        "max_bt_count": policy.get("max_bt_count"),
        "bt_text": policy.get("bt_text", ""),
        "app_loan_bt": policy.get("app_loan_bt", False),
        "bt_app_loans_text": policy.get("bt_app_loans_text", ""),
        "cc_bt_allowed": policy.get("cc_bt_allowed", False),
        "topup_allowed": policy.get("topup_allowed", False),
        "topup_text": policy.get("topup_text", ""),
        "merge_consolidation": policy.get("merge_consolidation", False),
    }

    return {
        "bank_name": policy.get("bank_name"),
        "policy_id": policy.get("id"),
        "eligibility": eligibility,
        "confidence": confidence,
        "eligible_amount": eligible_amount,
        "estimated_emi": round(estimated_emi, 0) if estimated_emi else None,
        "roi_range": policy.get("roi_text") or f"{policy.get('roi_min', '?')}% – {policy.get('roi_max', '?')}%",
        "max_tenure": policy.get("max_tenure"),
        "tenure_text": policy.get("tenure_text", ""),
        "max_foir": policy.get("max_foir"),
        "foir_text": policy.get("foir_text", ""),
        "bt_info": bt_info,
        "reasons_pass": reasons_pass,
        "reasons_fail": reasons_fail,
        "reasons_warning": reasons_warning,
        "special_notes": policy.get("special_notes", ""),
        "processing_fee": policy.get("processing_fee", ""),
        "special_features": policy.get("special_features", ""),
        "salary_text": policy.get("salary_text", ""),
        "cibil_text": policy.get("cibil_text", ""),
        "age_text": policy.get("age_text", ""),
        "loan_amount_text": policy.get("loan_amount_text", ""),
        "eligible_employees": policy.get("eligible_employees", ""),
        "company_requirement_text": policy.get("company_requirement_text", ""),
        "present_employment_text": policy.get("present_employment_text", ""),
        "total_employment_text": policy.get("total_employment_text", ""),
        "bachelor_accommodation": policy.get("bachelor_accommodation", False),
        "hostel_accommodation": policy.get("hostel_accommodation", False),
        "required_documents": policy.get("required_documents", []),
        "applicable_profiles": policy.get("applicable_profiles", []),
    }


@router.post("/check-eligibility/{lead_id}")
async def check_eligibility(lead_id: str, current_user: User = Depends(get_current_user)):
    """Run eligibility check for a lead against all active bank policies"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    policies = await db.bank_policies.find({"is_active": True}, {"_id": 0}).to_list(500)
    if not policies:
        raise HTTPException(status_code=404, detail="No active bank policies found. Add policies in the Policy Master first.")

    ad = lead.get("additional_data", {})

    # Resolve EMI from multiple possible field names
    resolved_emi = ad.get("existing_emi") or ad.get("current_emi") or ad.get("obligations_emi")

    # Auto-calculate FOIR if not explicitly set but salary and EMI are available
    resolved_foir = ad.get("foir")
    if not resolved_foir and resolved_emi and ad.get("net_salary"):
        try:
            emi_val = float(resolved_emi)
            salary_val = float(ad["net_salary"])
            if salary_val > 0:
                resolved_foir = round((emi_val / salary_val) * 100, 1)
        except (ValueError, TypeError):
            pass

    # Collect customer profile summary
    profile = {
        "full_name": lead.get("full_name"),
        "city": lead.get("city"),
        "requirement": ad.get("type_of_loan") or lead.get("requirement"),
        "net_salary": ad.get("net_salary"),
        "cibil_score": ad.get("cibil_score"),
        "cibil_issues": ad.get("cibil_issues"),
        "foir": resolved_foir,
        "company_type": ad.get("company_type"),
        "age": ad.get("age"),
        "existing_emi": resolved_emi,
        "loan_amount_required": ad.get("loan_amount_required"),
        "star_rating": lead.get("star_rating"),
        "star_score": lead.get("star_score"),
    }

    # Determine overall profile strength
    score = lead.get("star_score", 0)
    if score >= 75:
        profile_strength = "Strong"
    elif score >= 45:
        profile_strength = "Moderate"
    elif score > 0:
        profile_strength = "Weak"
    else:
        profile_strength = "Insufficient Data"

    # Evaluate against each policy
    results = []
    for policy in policies:
        result = evaluate_lead_against_policy(lead, policy)
        results.append(result)

    # Sort: eligible first (sorted by amount desc), then possibly_eligible, then not_eligible
    order = {"eligible": 0, "possibly_eligible": 1, "not_eligible": 2}
    results.sort(key=lambda r: (order.get(r["eligibility"], 3), -(r["eligible_amount"] or 0)))

    # Assign ranking
    eligible_results = [r for r in results if r["eligibility"] == "eligible"]
    for i, r in enumerate(eligible_results[:3]):
        r["rank"] = i + 1

    # Count missing info
    all_warnings = set()
    for r in results:
        for w in r["reasons_warning"]:
            all_warnings.add(w["rule"])

    missing_info = list(all_warnings)

    # Save snapshot
    snapshot = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "profile": profile,
        "profile_strength": profile_strength,
        "results": results,
        "missing_info": missing_info,
        "total_policies": len(policies),
        "eligible_count": len([r for r in results if r["eligibility"] == "eligible"]),
        "possibly_eligible_count": len([r for r in results if r["eligibility"] == "possibly_eligible"]),
        "not_eligible_count": len([r for r in results if r["eligibility"] == "not_eligible"]),
        "generated_by": current_user.full_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.eligibility_snapshots.insert_one({**snapshot})
    # Remove _id for response
    snapshot.pop("_id", None)

    return snapshot


@router.get("/eligibility-history/{lead_id}")
async def get_eligibility_history(lead_id: str, current_user: User = Depends(get_current_user)):
    """Get all eligibility snapshots for a lead"""
    snapshots = await db.eligibility_snapshots.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("generated_at", -1).to_list(100)
    return snapshots
