from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import resend
import asyncio
from auth import get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

resend.api_key = os.getenv("RESEND_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")

router = APIRouter()

class EmailNotification(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

@router.post("/send-email")
async def send_email(
    email_data: EmailNotification,
    current_user: User = Depends(get_current_user)
):
    if not resend.api_key or resend.api_key == "":
        logger.warning("Resend API key not configured. Email not sent.")
        return {
            "status": "mocked",
            "message": f"Email would be sent to {email_data.recipient_email}"
        }
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email_data.recipient_email],
        "subject": email_data.subject,
        "html": email_data.html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Email sent to {email_data.recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.post("/notify-lead-assignment")
async def notify_lead_assignment(
    lead_id: str,
    current_user: User = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("assigned_to"):
        agent = await db.users.find_one({"id": lead["assigned_to"]}, {"_id": 0})
        if agent and agent.get("email"):
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0F766E;">New Lead Assigned</h2>
                <p>Hello {agent.get('full_name')},</p>
                <p>A new lead has been assigned to you:</p>
                <ul>
                    <li><strong>Name:</strong> {lead.get('full_name')}</li>
                    <li><strong>Mobile:</strong> {lead.get('mobile')}</li>
                    <li><strong>Requirement:</strong> {lead.get('requirement')}</li>
                </ul>
                <p>Please log in to the Bankezee CRM to view and manage this lead.</p>
            </div>
            """
            
            if resend.api_key and resend.api_key != "":
                try:
                    params = {
                        "from": SENDER_EMAIL,
                        "to": [agent["email"]],
                        "subject": "New Lead Assigned - Bankezee CRM",
                        "html": html_content
                    }
                    await asyncio.to_thread(resend.Emails.send, params)
                except Exception as e:
                    logger.error(f"Failed to send notification email: {str(e)}")
    
    return {"message": "Notification sent"}