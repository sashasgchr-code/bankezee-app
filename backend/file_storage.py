from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import uuid
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path
from jose import jwt

from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-dev-key-not-for-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/storage", tags=["File Storage"])

# Storage directory
STORAGE_DIR = Path("/app/uploads")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    lead_id: str = Form(None),
    document_type: str = Form("general"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document to local storage and save metadata to MongoDB
    - file: The file to upload
    - lead_id: Optional lead ID to associate the document with
    - document_type: Type of document (e.g., 'id_proof', 'income_proof', 'bank_statement')
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        uploaded_at = datetime.now(timezone.utc).isoformat()
        
        # Create lead-specific directory if lead_id provided
        if lead_id:
            file_dir = STORAGE_DIR / lead_id
            file_dir.mkdir(parents=True, exist_ok=True)
        else:
            file_dir = STORAGE_DIR
        
        # Safe filename
        safe_name = f"{document_type}_{timestamp}_{file_id}{file_ext}"
        file_path = file_dir / safe_name
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File uploaded: {safe_name} by {current_user.id}")
        
        # Generate URLs
        relative_path = str(file_path.relative_to(STORAGE_DIR))
        
        # Document metadata to return and store
        doc_metadata = {
            "file_id": file_id,
            "file_name": safe_name,
            "original_name": file.filename,
            "file_path": relative_path,
            "size": len(content),
            "mime_type": file.content_type,
            "uploaded_at": uploaded_at,
            "uploaded_by": current_user.id,
            "lead_id": lead_id,
            "document_type": document_type
        }
        
        # Save document metadata to MongoDB if lead_id provided
        if lead_id:
            # Check if lead exists
            lead = await db.leads.find_one({"id": lead_id})
            if lead:
                # Add document to lead's documents array
                await db.leads.update_one(
                    {"id": lead_id},
                    {"$push": {"documents": doc_metadata}}
                )
                logger.info(f"Document metadata saved to lead {lead_id}")
        
        return {
            "success": True,
            **doc_metadata
        }
        
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    token: str = None,
    current_user: User = None
):
    """Download a file by path - supports both header auth and token query param"""
    # Try to get user from token query param if no current_user
    if not current_user and token:
        try:
            from jose import jwt
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
                if user_doc:
                    current_user = User(**user_doc)
        except Exception as e:
            logger.warning(f"Token validation failed: {e}")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    full_path = STORAGE_DIR / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure file is within storage directory
    try:
        full_path.resolve().relative_to(STORAGE_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=full_path,
        filename=full_path.name,
        media_type="application/octet-stream"
    )


@router.get("/files/{lead_id}")
async def list_lead_files(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    """List all files for a specific lead"""
    lead_dir = STORAGE_DIR / lead_id
    
    if not lead_dir.exists():
        return {"lead_id": lead_id, "count": 0, "files": []}
    
    base_url = os.environ.get("FRONTEND_URL", "")
    files = []
    
    for file_path in lead_dir.iterdir():
        if file_path.is_file():
            stat = file_path.stat()
            relative_path = str(file_path.relative_to(STORAGE_DIR))
            files.append({
                "file_name": file_path.name,
                "file_path": relative_path,
                "download_url": f"{base_url}/api/storage/download/{relative_path}",
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat()
            })
    
    return {
        "lead_id": lead_id,
        "count": len(files),
        "files": sorted(files, key=lambda x: x["created_at"], reverse=True)
    }


@router.delete("/files/{file_path:path}")
async def delete_file(
    file_path: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a file (Admin/Ops only)"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can delete files")
    
    full_path = STORAGE_DIR / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check
    try:
        full_path.resolve().relative_to(STORAGE_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        full_path.unlink()
        logger.info(f"File deleted: {file_path} by {current_user.id}")
        return {"success": True, "message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/status")
async def storage_status():
    """Check storage status"""
    try:
        total_files = sum(1 for _ in STORAGE_DIR.rglob("*") if _.is_file())
        total_size = sum(f.stat().st_size for f in STORAGE_DIR.rglob("*") if f.is_file())
        
        return {
            "configured": True,
            "storage_type": "local",
            "storage_path": str(STORAGE_DIR),
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "message": "Local storage is ready"
        }
    except Exception as e:
        return {
            "configured": False,
            "message": f"Storage error: {str(e)}"
        }
