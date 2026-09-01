"""
Admin-only data export endpoints for Google Sheets integration.
Returns JSON data per collection — consumed by Apps Script.
"""
from fastapi import APIRouter, Depends
from auth import get_current_user, User
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json

router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'test_database')]

EXPORTABLE = [
    "leads", "users", "agents", "bank_policies", "commissions",
    "files", "file_storage", "activity_log", "eligibilities",
]

STRIP_FIELDS = {"_id", "content", "password", "hashed_password"}


def flatten_doc(doc, max_len=30000):
    """Flatten a mongo doc: expand additional_data, keep arrays as JSON strings."""
    out = {}
    for k, v in doc.items():
        if k in STRIP_FIELDS:
            continue
        if k == "additional_data" and isinstance(v, dict):
            # Expand additional_data fields as top-level columns
            for k2, v2 in v.items():
                if isinstance(v2, (dict, list)):
                    out[f"ad.{k2}"] = json.dumps(v2, default=str)[:max_len]
                else:
                    out[f"ad.{k2}"] = v2
        elif isinstance(v, list):
            # Keep full JSON for arrays (activity_log, eligibilities, documents)
            out[k] = json.dumps(v, default=str)[:max_len]
        elif isinstance(v, dict):
            for k2, v2 in v.items():
                if isinstance(v2, (dict, list)):
                    out[f"{k}.{k2}"] = json.dumps(v2, default=str)[:max_len]
                else:
                    out[f"{k}.{k2}"] = v2
        else:
            out[k] = v
    return out


def build_sheet(docs):
    """Turn a list of flat dicts into {headers, rows, count}."""
    # Collect all unique keys preserving order
    keys = []
    seen = set()
    for d in docs:
        for k in d:
            if k not in seen:
                keys.append(k)
                seen.add(k)
    rows = [[str(d.get(k, "") or "") for k in keys] for d in docs]
    return {"headers": keys, "rows": rows, "count": len(rows)}


@router.get("/sheets-data/{collection}")
async def export_collection(
    collection: str,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        return {"error": "Admin only"}
    if collection not in EXPORTABLE:
        return {"error": f"Not exportable. Choose from: {EXPORTABLE}"}

    # --- Virtual sheets derived from leads ---
    if collection == "activity_log":
        return await _export_activity_log()
    if collection == "eligibilities":
        return await _export_eligibilities()

    # Exclude binary blobs at DB level
    projection = {"_id": 0, "content": 0, "password": 0, "hashed_password": 0}
    docs = await db[collection].find({}, projection).to_list(10000)
    cleaned = [flatten_doc(d) for d in docs]
    result = build_sheet(cleaned)
    result["collection"] = collection
    return result


async def _export_activity_log():
    """Extract activities from every lead into one flat sheet.
    One row per activity entry with lead reference."""
    leads = await db.leads.find(
        {}, {"_id": 0, "id": 1, "full_name": 1, "status": 1, "activities": 1, "activity_log": 1}
    ).to_list(10000)

    rows_data = []
    for lead in leads:
        lead_id = lead.get("id", "")
        lead_name = lead.get("full_name", "")
        lead_status = lead.get("status", "")
        # Support both field names
        entries = lead.get("activities") or lead.get("activity_log") or []
        for entry in entries:
            row = {
                "lead_id": lead_id,
                "lead_name": lead_name,
                "lead_status": lead_status,
                "type": entry.get("type", ""),
                "message": entry.get("message", entry.get("event", "")),
                "by": entry.get("by_name", entry.get("by", entry.get("user", ""))),
                "timestamp": str(entry.get("timestamp", entry.get("at", ""))),
                "old_status": entry.get("old_status", ""),
                "new_status": entry.get("new_status", ""),
            }
            rows_data.append(row)

    result = build_sheet(rows_data)
    result["collection"] = "activity_log"
    return result


async def _export_eligibilities():
    """Extract eligibilities array from every lead into one flat sheet.
    One row per bank eligibility entry."""
    leads = await db.leads.find(
        {}, {"_id": 0, "id": 1, "full_name": 1, "eligibilities": 1}
    ).to_list(10000)

    rows_data = []
    for lead in leads:
        lead_id = lead.get("id", "")
        lead_name = lead.get("full_name", "")
        for entry in (lead.get("eligibilities") or []):
            row = {
                "lead_id": lead_id,
                "lead_name": lead_name,
                "bank_name": entry.get("bank_name", ""),
                "is_eligible": entry.get("is_eligible", ""),
                "eligible_amount": entry.get("eligible_amount", ""),
                "approved_amount": entry.get("approved_amount", ""),
                "disbursed_amount": entry.get("disbursed_amount", ""),
                "roi": entry.get("roi", ""),
                "login_done": entry.get("login_done", ""),
                "disbursed": entry.get("disbursed", ""),
                "application_id": entry.get("application_id", ""),
                "not_eligible_reason": entry.get("not_eligible_reason", ""),
                "updated_at": str(entry.get("updated_at", "")),
            }
            rows_data.append(row)

    result = build_sheet(rows_data)
    result["collection"] = "eligibilities"
    return result


@router.get("/sheets-manifest")
async def export_manifest(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        return {"error": "Admin only"}
    result = {}
    for c in EXPORTABLE:
        if c in ("activity_log", "eligibilities"):
            continue  # virtual — derived from leads
        try:
            count = await db[c].count_documents({})
            result[c] = count
        except Exception:
            result[c] = 0
    result["activity_log"] = "(derived from leads)"
    result["eligibilities"] = "(derived from leads)"
    return result
