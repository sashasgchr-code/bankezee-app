"""
Admin-only data export endpoints for Google Sheets integration.
Returns JSON data per collection — consumed by Apps Script.
"""
from fastapi import APIRouter, Depends, Query
from auth import get_current_user, User
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'test_database')]

EXPORTABLE = ["leads", "users", "agents", "bank_policies", "commissions", "files"]

# Fields to strip from export (binary blobs, internal mongo ids)
STRIP_FIELDS = {"_id", "content", "password", "hashed_password"}


def clean_doc(doc):
    """Flatten a mongo document into a simple dict for spreadsheet export."""
    out = {}
    for k, v in doc.items():
        if k in STRIP_FIELDS:
            continue
        if isinstance(v, dict):
            for k2, v2 in v.items():
                if isinstance(v2, (dict, list)):
                    import json
                    out[f"{k}.{k2}"] = str(v2)[:5000]
                else:
                    out[f"{k}.{k2}"] = v2
        elif isinstance(v, list):
            if v and isinstance(v[0], dict):
                import json
                out[k] = str(v)[:5000]
            else:
                out[k] = ", ".join(str(x) for x in v)
        else:
            out[k] = v
    return out


@router.get("/sheets-data/{collection}")
async def export_collection(
    collection: str,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        return {"error": "Admin only"}
    if collection not in EXPORTABLE:
        return {"error": f"Collection not exportable. Choose from: {EXPORTABLE}"}

    docs = await db[collection].find({}, {"_id": 0}).to_list(10000)
    cleaned = [clean_doc(d) for d in docs]

    # Collect all unique keys across all docs
    keys = []
    seen = set()
    for d in cleaned:
        for k in d:
            if k not in seen:
                keys.append(k)
                seen.add(k)

    # Build rows
    rows = []
    for d in cleaned:
        rows.append([str(d.get(k, "")) for k in keys])

    return {"collection": collection, "count": len(rows), "headers": keys, "rows": rows}


@router.get("/sheets-manifest")
async def export_manifest(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        return {"error": "Admin only"}
    result = {}
    for c in EXPORTABLE:
        count = await db[c].count_documents({})
        result[c] = count
    return result
