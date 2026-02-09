from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import qrcode
import io
import base64
import logging
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter()

def get_frontend_url(request: Request) -> str:
    """Get the frontend URL from environment or derive from request origin"""
    # First check environment variable
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        return frontend_url.rstrip('/')
    
    # Try to get from request origin/referer header
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip('/')
    
    referer = request.headers.get("referer")
    if referer:
        # Extract base URL from referer
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}"
    
    # Fallback to constructing from request
    # If request is coming to /api/..., the frontend is likely on the same domain without /api
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("host", "localhost:3000")
    return f"{scheme}://{host}"

@router.get("/generate/{id}")
async def generate_qr(id: str, request: Request):
    # Try agent first
    agent = await db.agents.find_one({"id": id}, {"_id": 0})
    if agent:
        frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "http://localhost:3000").replace('/api', ''))
        qr_url = f"{frontend_url}/lead-form?ref={agent['agent_code']}"
        ref_code = agent['agent_code']
    else:
        # Try partner
        partner = await db.partners.find_one({"id": id}, {"_id": 0})
        if partner:
            frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "http://localhost:3000").replace('/api', ''))
            qr_url = f"{frontend_url}/lead-form?ref={partner['referral_code']}"
            ref_code = partner['referral_code']
        else:
            raise HTTPException(status_code=404, detail="Agent or Partner not found")
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return StreamingResponse(img_io, media_type="image/png")

@router.get("/data/{id}")
async def get_qr_data(id: str):
    # Try agent first
    agent = await db.agents.find_one({"id": id}, {"_id": 0})
    if agent:
        frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "http://localhost:3000").replace('/api', ''))
        qr_url = f"{frontend_url}/lead-form?ref={agent['agent_code']}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_data = base64.b64encode(img_io.getvalue()).decode()
        
        return {
            "id": id,
            "type": "agent",
            "agent_id": id,
            "agent_code": agent["agent_code"],
            "qr_url": qr_url,
            "qr_image_base64": f"data:image/png;base64,{img_data}"
        }
    
    # Try partner
    partner = await db.partners.find_one({"id": id}, {"_id": 0})
    if partner:
        frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "http://localhost:3000").replace('/api', ''))
        qr_url = f"{frontend_url}/lead-form?ref={partner['referral_code']}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_data = base64.b64encode(img_io.getvalue()).decode()
        
        return {
            "id": id,
            "type": "partner",
            "partner_id": id,
            "referral_code": partner["referral_code"],
            "qr_url": qr_url,
            "qr_image_base64": f"data:image/png;base64,{img_data}"
        }
    
    raise HTTPException(status_code=404, detail="Agent or Partner not found")
