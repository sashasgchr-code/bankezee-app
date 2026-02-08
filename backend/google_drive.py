from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import os
import io
import logging
from datetime import datetime, timezone

from auth import get_current_user, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/drive", tags=["Google Drive"])

# Path to service account credentials
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "google_drive_credentials.json")

# Google Drive folder ID where documents will be stored
# You need to create a folder in Google Drive and share it with the service account email
DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")

# Allowed file types
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def get_drive_service():
    """Get authenticated Google Drive service using service account"""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            CREDENTIALS_PATH,
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
        service = build('drive', 'v3', credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to create Drive service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Google Drive: {str(e)}")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    lead_id: str = None,
    document_type: str = "general",
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document to Google Drive
    - file: The file to upload
    - lead_id: Optional lead ID to associate the document with
    - document_type: Type of document (e.g., 'id_proof', 'income_proof', 'bank_statement')
    """
    # Check if folder ID is configured
    if not DRIVE_FOLDER_ID:
        raise HTTPException(
            status_code=500, 
            detail="Google Drive folder not configured. Please set GOOGLE_DRIVE_FOLDER_ID environment variable."
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX"
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
        service = get_drive_service()
        
        # Create a unique filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_filename = file.filename.replace(" ", "_")
        
        if lead_id:
            drive_filename = f"{lead_id}_{document_type}_{timestamp}_{safe_filename}"
        else:
            drive_filename = f"{document_type}_{timestamp}_{safe_filename}"
        
        # File metadata
        file_metadata = {
            'name': drive_filename,
            'parents': [DRIVE_FOLDER_ID],
            'description': f"Uploaded by {current_user.full_name} ({current_user.email}) for lead: {lead_id or 'N/A'}"
        }
        
        # Upload file
        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=file.content_type,
            resumable=True
        )
        
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, webContentLink, size, mimeType'
        ).execute()
        
        logger.info(f"File uploaded successfully: {uploaded_file.get('name')} (ID: {uploaded_file.get('id')})")
        
        return {
            "success": True,
            "file_id": uploaded_file.get("id"),
            "file_name": uploaded_file.get("name"),
            "original_name": file.filename,
            "view_link": uploaded_file.get("webViewLink"),
            "download_link": uploaded_file.get("webContentLink"),
            "size": uploaded_file.get("size"),
            "mime_type": uploaded_file.get("mimeType"),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by": current_user.id,
            "lead_id": lead_id,
            "document_type": document_type
        }
        
    except Exception as e:
        logger.error(f"Failed to upload file to Drive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/files/{lead_id}")
async def list_lead_documents(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    """List all documents for a specific lead"""
    if not DRIVE_FOLDER_ID:
        return {"files": [], "message": "Google Drive not configured"}
    
    try:
        service = get_drive_service()
        
        # Search for files with the lead_id prefix in the folder
        query = f"'{DRIVE_FOLDER_ID}' in parents and name contains '{lead_id}' and trashed = false"
        
        results = service.files().list(
            q=query,
            pageSize=50,
            fields="files(id, name, webViewLink, webContentLink, size, mimeType, createdTime)"
        ).execute()
        
        files = results.get('files', [])
        
        return {
            "lead_id": lead_id,
            "count": len(files),
            "files": [
                {
                    "file_id": f.get("id"),
                    "name": f.get("name"),
                    "view_link": f.get("webViewLink"),
                    "download_link": f.get("webContentLink"),
                    "size": f.get("size"),
                    "mime_type": f.get("mimeType"),
                    "created_at": f.get("createdTime")
                }
                for f in files
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_document(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a document from Google Drive (Admin/Ops only)"""
    if current_user.role not in ["admin", "operations"]:
        raise HTTPException(status_code=403, detail="Only admin or operations can delete documents")
    
    try:
        service = get_drive_service()
        service.files().delete(fileId=file_id).execute()
        
        logger.info(f"File deleted: {file_id} by {current_user.id}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/status")
async def check_drive_status():
    """Check if Google Drive is properly configured"""
    if not os.path.exists(CREDENTIALS_PATH):
        return {
            "configured": False,
            "message": "Service account credentials not found"
        }
    
    if not DRIVE_FOLDER_ID:
        return {
            "configured": False,
            "message": "GOOGLE_DRIVE_FOLDER_ID not set in environment variables"
        }
    
    try:
        service = get_drive_service()
        # Try to get folder info to verify access
        folder = service.files().get(fileId=DRIVE_FOLDER_ID, fields="id, name").execute()
        return {
            "configured": True,
            "folder_id": DRIVE_FOLDER_ID,
            "folder_name": folder.get("name"),
            "message": "Google Drive is properly configured"
        }
    except Exception as e:
        return {
            "configured": False,
            "message": f"Error accessing Drive folder: {str(e)}"
        }
