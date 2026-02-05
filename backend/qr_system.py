from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import os
import qrcode
import io
import base64
import logging
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter()

@router.get("/generate/{partner_id}")
async def generate_qr(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
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
    img_io.seek(0)
    
    return StreamingResponse(img_io, media_type="image/png")

@router.get("/data/{partner_id}")
async def get_qr_data(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
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
        "partner_id": partner_id,
        "referral_code": partner["referral_code"],
        "qr_url": qr_url,
        "qr_image_base64": f"data:image/png;base64,{img_data}"
    }