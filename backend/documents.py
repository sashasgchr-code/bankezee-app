from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import io
import tempfile
import logging
from datetime import datetime, timezone
from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

router = APIRouter()

@router.post("/upload")
async def upload_document(
    lead_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    document = {
        "filename": file.filename,
        "storage": "local",
        "uploaded_by": current_user.id,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$push": {"documents": document}}
    )
    
    return {"message": "Document uploaded successfully", "document": document}