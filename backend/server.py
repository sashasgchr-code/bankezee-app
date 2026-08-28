from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, UploadFile, File, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
import asyncio
import io
import tempfile
import base64

from auth import router as auth_router, get_current_user, User, require_role
from agents import router as agents_router
from partners import router as partners_router
from leads import router as leads_router
from crm import router as crm_router
from commissions import router as commissions_router
from qr_system import router as qr_router
from notifications import router as notifications_router
from documents import router as documents_router
from dashboard import router as dashboard_router
from google_drive import router as google_drive_router
from file_storage import router as file_storage_router
from hierarchy import router as hierarchy_router
from reports import router as reports_router
from bank_policies import router as bank_policies_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

app = FastAPI(title="Bankezee CRM API")
api_router = APIRouter(prefix="/api")

# Health check endpoint for Kubernetes probes - at root level (for /health)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bankezee-crm-api"}

# Health check also available at /api/health
@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "service": "bankezee-crm-api"}

@api_router.get("/")
async def root():
    return {"message": "Bankezee CRM API v1.0", "status": "running"}

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(agents_router, prefix="/agents", tags=["Agents"])
api_router.include_router(partners_router, prefix="/partners", tags=["Partners"])
api_router.include_router(leads_router, prefix="/leads", tags=["Leads"])
api_router.include_router(crm_router, prefix="/crm", tags=["CRM"])
api_router.include_router(commissions_router, prefix="/commissions", tags=["Commissions"])
api_router.include_router(qr_router, prefix="/qr", tags=["QR System"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(google_drive_router, tags=["Google Drive"])
api_router.include_router(file_storage_router, tags=["File Storage"])
api_router.include_router(hierarchy_router, prefix="/hierarchy", tags=["Hierarchy"])
api_router.include_router(reports_router, tags=["Reports"])
api_router.include_router(bank_policies_router, prefix="/bank-policies", tags=["Bank Policies"])

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()