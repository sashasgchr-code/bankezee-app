from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import FileResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import uuid
import shutil
import logging
import base64
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
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-dev-key-not-for-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/storage", tags=["File Storage"])

# Storage directory (fallback for local storage)
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
    Upload a document - stores file content in MongoDB for persistence across deployments
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
        
        # Safe filename
        safe_name = f"{document_type}_{timestamp}_{file_id}{file_ext}"
        relative_path = f"{lead_id}/{safe_name}" if lead_id else safe_name
        
        # Store file content in MongoDB (base64 encoded for JSON compatibility)
        file_doc = {
            "file_id": file_id,
            "file_name": safe_name,
            "original_name": file.filename,
            "file_path": relative_path,
            "content": base64.b64encode(content).decode('utf-8'),  # Store as base64 string
            "size": len(content),
            "mime_type": file.content_type,
            "uploaded_at": uploaded_at,
            "uploaded_by": current_user.id,
            "lead_id": lead_id,
            "document_type": document_type
        }
        
        # Save to files collection in MongoDB
        await db.files.insert_one(file_doc)
        logger.info(f"File stored in MongoDB: {safe_name} by {current_user.id}")
        
        # Document metadata to return and store (without content for response)
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
        
        # Save document metadata to lead's documents array if lead_id provided
        if lead_id:
            lead = await db.leads.find_one({"id": lead_id})
            if lead:
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


@router.post("/upload-public")
async def upload_public_file(
    file: UploadFile = File(...),
    document_type: str = Form("id_card")
):
    """
    Public upload endpoint for ID cards during registration (no auth required)
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {file_ext} not allowed")
    
    # Validate content type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Content type {file.content_type} not allowed")
    
    try:
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        file_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_name = f"{document_type}_{timestamp}_{file_id}{file_ext}"
        
        # Store in MongoDB (primary) for persistence across deployments
        encoded_content = base64.b64encode(content).decode('utf-8')
        await db.files.insert_one({
            "file_id": file_id,
            "file_name": safe_name,
            "original_name": file.filename,
            "content_type": file.content_type,
            "content": encoded_content,
            "size": len(content),
            "document_type": document_type,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "is_public": True
        })
        
        return {
            "success": True,
            "file_id": file_id,
            "file_name": safe_name,
            "file_path": f"id_cards/{safe_name}",
            "file_url": f"/api/storage/download/{file_id}",
            "size": len(content)
        }
        
    except Exception as e:
        logger.error(f"Failed to upload public file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/public/{file_path:path}")
async def get_public_file(file_path: str):
    """Serve public files like ID cards (no auth required)"""
    full_path = STORAGE_DIR / file_path
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check
    try:
        full_path.resolve().relative_to(STORAGE_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=full_path,
        filename=full_path.name
    )


@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    token: str = None,
    current_user: User = None
):
    """Download a file by path or file_id - retrieves from MongoDB storage"""
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
    
    # Try to find file in MongoDB - search by file_path OR file_id
    file_doc = await db.files.find_one(
        {"$or": [{"file_path": file_path}, {"file_id": file_path}]}, 
        {"_id": 0}
    )
    
    # Also try searching in leads collection documents array
    if not file_doc:
        # Search in leads documents array
        lead_with_doc = await db.leads.find_one(
            {"documents": {"$elemMatch": {"$or": [{"file_path": file_path}, {"file_id": file_path}]}}},
            {"_id": 0, "documents": 1}
        )
        if lead_with_doc and lead_with_doc.get("documents"):
            for doc in lead_with_doc["documents"]:
                if doc.get("file_path") == file_path or doc.get("file_id") == file_path:
                    # Found metadata in lead, now get from files collection using file_id
                    file_id = doc.get("file_id")
                    if file_id:
                        file_doc = await db.files.find_one({"file_id": file_id}, {"_id": 0})
                    break
    
    if file_doc and file_doc.get("content"):
        # File found in MongoDB - decode and return
        try:
            content = base64.b64decode(file_doc["content"])
            return Response(
                content=content,
                media_type=file_doc.get("mime_type", "application/octet-stream"),
                headers={
                    "Content-Disposition": f'attachment; filename="{file_doc.get("original_name", file_doc.get("file_name", "download"))}"'
                }
            )
        except Exception as e:
            logger.error(f"Error decoding file from MongoDB: {e}")
            raise HTTPException(status_code=500, detail="Error retrieving file")
    
    # Fallback to local filesystem (for backwards compatibility)
    full_path = STORAGE_DIR / file_path
    
    if not full_path.exists():
        # File not found anywhere - likely an old file that was lost
        logger.warning(f"File not found: {file_path} (not in MongoDB or local storage)")
        raise HTTPException(
            status_code=404, 
            detail="File not found. This document may have been uploaded before the storage update and needs to be re-uploaded."
        )
    
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



@router.get("/download-all/{lead_id}")
async def download_all_documents(
    lead_id: str,
    token: str = None,
    current_user: User = None
):
    """Download all documents for a lead as a ZIP file"""
    import zipfile
    import io

    # Auth via token query param
    if not current_user and token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
                if user_doc:
                    current_user = User(**user_doc)
        except Exception:
            pass
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0, "full_name": 1, "source_id": 1, "documents": 1})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    documents = lead.get("documents", [])
    if not documents:
        raise HTTPException(status_code=404, detail="No documents found")

    # Get agent/partner name
    customer_name = (lead.get("full_name") or "Customer").replace(" ", "_")
    source_id = lead.get("source_id", "")
    agent_name = "Unknown"
    if source_id:
        agent = await db.agents.find_one({"id": source_id}, {"_id": 0, "full_name": 1})
        if not agent:
            agent = await db.partners.find_one({"id": source_id}, {"_id": 0, "full_name": 1, "name": 1})
        if agent:
            agent_name = (agent.get("full_name") or agent.get("name", "Unknown")).replace(" ", "_")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in documents:
            file_id = doc.get("file_id")
            file_name = doc.get("original_name") or doc.get("file_name", f"file_{file_id}")
            file_doc = await db.files.find_one({"file_id": file_id}, {"_id": 0, "content": 1})
            if file_doc and file_doc.get("content"):
                try:
                    content = base64.b64decode(file_doc["content"])
                    zf.writestr(file_name, content)
                except Exception:
                    pass
            else:
                # Try local filesystem
                file_path = doc.get("file_path", "")
                local_path = STORAGE_DIR / file_path
                if local_path.exists():
                    zf.write(local_path, file_name)

    zip_buffer.seek(0)
    zip_name = f"{customer_name}-{agent_name}.zip"
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'}
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
    
    # Try to delete from MongoDB first
    result = await db.files.delete_one({"file_path": file_path})
    
    if result.deleted_count > 0:
        logger.info(f"File deleted from MongoDB: {file_path} by {current_user.id}")
        return {"success": True, "message": "File deleted successfully"}
    
    # Fallback to local filesystem
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
        logger.info(f"File deleted from local storage: {file_path} by {current_user.id}")
        return {"success": True, "message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/status")
async def storage_status():
    """Check storage status"""
    try:
        # Count files in MongoDB
        mongo_files = await db.files.count_documents({})
        
        # Get total size from MongoDB
        pipeline = [{"$group": {"_id": None, "total_size": {"$sum": "$size"}}}]
        result = await db.files.aggregate(pipeline).to_list(1)
        mongo_size = result[0]["total_size"] if result else 0
        
        # Local storage stats (fallback)
        local_files = sum(1 for _ in STORAGE_DIR.rglob("*") if _.is_file())
        local_size = sum(f.stat().st_size for f in STORAGE_DIR.rglob("*") if f.is_file())
        
        return {
            "configured": True,
            "storage_type": "mongodb",
            "mongodb_files": mongo_files,
            "mongodb_size_mb": round(mongo_size / (1024 * 1024), 2),
            "local_files": local_files,
            "local_size_mb": round(local_size / (1024 * 1024), 2),
            "message": "MongoDB storage is active (files persist across deployments)"
        }
    except Exception as e:
        return {
            "configured": False,
            "message": f"Storage error: {str(e)}"
        }
