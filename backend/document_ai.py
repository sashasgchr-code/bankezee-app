"""
AI Document Parsing Module for BankEzee CRM
Phase 4: Uses Gemini LLM to extract financial data from uploaded PDFs
(CRIF/CIBIL reports, salary slips, bank statements, Form 16)
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from auth import get_current_user, User
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import json
import base64
import tempfile
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'test_database')]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Extraction prompts for different document types
EXTRACTION_PROMPTS = {
    "crif": """You are a financial data extraction expert. Analyze this CRIF/CIBIL credit report PDF and extract the following data into a JSON object. Be precise with numbers. 

Extract EXACTLY this JSON structure (use null for missing values):
{
  "credit_score": <integer score, e.g. 776>,
  "score_type": "<e.g. PERFORM CONSUMER 2.2 or CIBIL TransUnion>",
  "total_accounts": <integer>,
  "active_accounts": <integer>,
  "closed_accounts": <integer>,
  "overdue_accounts": <integer>,
  "total_outstanding_balance": <number in rupees>,
  "total_monthly_emi": <estimated total monthly EMI obligation in rupees from active loan accounts>,
  "credit_card_total_balance": <sum of all active credit card balances>,
  "credit_card_total_limit": <sum of all active credit card limits>,
  "credit_utilization_pct": <credit card usage percentage>,
  "active_loans": [
    {"lender": "<name>", "type": "<personal/home/vehicle/gold/consumer>", "balance": <number>, "emi": <number or null>}
  ],
  "active_credit_cards": [
    {"lender": "<name>", "limit": <number>, "balance": <number>}
  ],
  "defaults_count": <integer>,
  "writeoffs_count": <integer>,
  "overdue_amount": <total overdue amount>,
  "recent_enquiries_count": <number of enquiries in last 6 months>,
  "dpd_30_plus_count": <number of times 30+ days past due in last 12 months>,
  "dpd_90_plus_count": <number of times 90+ days past due>,
  "customer_name": "<full name from report>",
  "pan_number": "<PAN if available>",
  "phone": "<phone if available>",
  "cibil_issues_summary": "<none/minor/major based on overdue/defaults/writeoffs>",
  "key_observations": "<1-2 sentence summary of credit health>"
}

Return ONLY the JSON object, no other text.""",

    "salary_slip": """You are a financial data extraction expert. Analyze this salary slip/pay slip PDF and extract the following data into a JSON object. Be precise with numbers.

Extract EXACTLY this JSON structure (use null for missing values):
{
  "employee_name": "<full name>",
  "employer_name": "<company name>",
  "employee_id": "<if available>",
  "designation": "<if available>",
  "month_year": "<e.g. July 2026>",
  "gross_salary": <number>,
  "basic_salary": <number or null>,
  "hra": <number or null>,
  "special_allowance": <number or null>,
  "other_allowances": <number or null>,
  "total_deductions": <number>,
  "pf_deduction": <number or null>,
  "professional_tax": <number or null>,
  "tds": <number or null>,
  "other_deductions": <number or null>,
  "net_salary": <number - take home pay>,
  "bank_account_number": "<if visible>",
  "bank_name": "<if visible>",
  "pan_number": "<if visible>",
  "uan_number": "<if visible>"
}

Return ONLY the JSON object, no other text.""",

    "bank_statement": """You are a financial data extraction expert. Analyze this bank statement PDF and extract the following data into a JSON object.

Extract EXACTLY this JSON structure (use null for missing values):
{
  "account_holder_name": "<full name>",
  "bank_name": "<bank name>",
  "account_number": "<account number>",
  "statement_period": "<e.g. Jan 2026 - Jun 2026>",
  "average_monthly_balance": <number>,
  "average_monthly_credits": <number - average of salary/income credits>,
  "average_monthly_debits": <number>,
  "identified_salary_credit": <number - the recurring salary amount>,
  "identified_emi_debits": [
    {"description": "<lender/description>", "amount": <number>, "frequency": "monthly"}
  ],
  "total_identified_emi": <sum of all identified EMI debits>,
  "bounce_count": <number of cheque/ECS/NACH bounces>,
  "minimum_balance": <lowest balance in period>,
  "maximum_balance": <highest balance in period>,
  "closing_balance": <last balance>,
  "key_observations": "<1-2 sentence summary>"
}

Return ONLY the JSON object, no other text.""",

    "form16": """You are a financial data extraction expert. Analyze this Form 16 / Income Tax document PDF and extract the following data into a JSON object.

Extract EXACTLY this JSON structure (use null for missing values):
{
  "employee_name": "<full name>",
  "employer_name": "<company name>",
  "pan_employee": "<PAN of employee>",
  "pan_employer": "<PAN/TAN of employer>",
  "assessment_year": "<e.g. 2026-27>",
  "gross_total_income": <number>,
  "total_deductions_80c": <number>,
  "taxable_income": <number>,
  "tax_paid": <number>,
  "net_salary_annual": <number>,
  "net_salary_monthly": <calculated monthly from annual>
}

Return ONLY the JSON object, no other text.""",

    "general": """You are a financial data extraction expert. Analyze this financial document PDF and extract any relevant financial data you can find. Look for: income/salary, credit scores, loan details, EMI obligations, bank balances, employment details.

Return a JSON object with whatever data you can extract:
{
  "document_type": "<detected type: crif_report/salary_slip/bank_statement/form16/other>",
  "customer_name": "<if found>",
  "extracted_data": {
    <any key financial fields you can identify>
  },
  "key_observations": "<summary of what this document reveals>"
}

Return ONLY the JSON object, no other text.""",
}


async def parse_document_with_llm(file_bytes: bytes, mime_type: str, doc_type: str) -> dict:
    """Parse a document using Gemini LLM with file attachment."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    prompt = EXTRACTION_PROMPTS.get(doc_type, EXTRACTION_PROMPTS["general"])

    # Write bytes to temp file for Gemini
    suffix = ".pdf" if "pdf" in mime_type else ".png" if "png" in mime_type else ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc-parse-{uuid.uuid4()}",
            system_message="You are a precise financial document parser. Extract data exactly as requested. Return only valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")

        file_content = FileContentWithMimeType(
            file_path=tmp_path,
            mime_type=mime_type
        )

        response = await chat.send_message(UserMessage(
            text=prompt,
            file_contents=[file_content]
        ))

        # send_message returns a plain string
        full_response = response

        # Parse JSON from response
        response_text = full_response.strip()
        # Remove markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        parsed = json.loads(response_text)
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}\nResponse: {full_response[:500]}")
        return {"error": "Failed to parse document", "raw_response": full_response[:1000]}
    except Exception as e:
        logger.error(f"Document parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Document parsing failed: {str(e)}")
    finally:
        os.unlink(tmp_path)


@router.post("/parse-document/{lead_id}")
async def parse_lead_document(
    lead_id: str,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Parse a specific document attached to a lead using AI.
    Body: { "document_index": 0, "document_type": "crif" }
    document_type: crif, salary_slip, bank_statement, form16, general
    """
    doc_index = body.get("document_index", 0)
    doc_type = body.get("document_type", "general")

    # Fetch lead with documents
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    documents = lead.get("documents", [])
    if not documents or doc_index >= len(documents):
        raise HTTPException(status_code=404, detail="Document not found. Upload documents first.")

    doc_meta = documents[doc_index]
    file_id = doc_meta.get("file_id") or doc_meta.get("id")

    # Fetch file content from MongoDB
    file_record = await db.file_storage.find_one({"file_id": file_id})
    if not file_record:
        raise HTTPException(status_code=404, detail="File content not found in storage")

    content_b64 = file_record.get("content")
    if not content_b64:
        raise HTTPException(status_code=404, detail="File has no content")

    file_bytes = base64.b64decode(content_b64)
    mime_type = file_record.get("mime_type") or doc_meta.get("mime_type") or "application/pdf"

    # Parse with LLM
    parsed_data = await parse_document_with_llm(file_bytes, mime_type, doc_type)

    # Save parsed result
    parse_result = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "document_index": doc_index,
        "document_name": doc_meta.get("original_name") or doc_meta.get("file_name", ""),
        "document_type": doc_type,
        "parsed_data": parsed_data,
        "parsed_by": current_user.full_name,
        "parsed_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.document_parses.insert_one({**parse_result})
    parse_result.pop("_id", None)

    return parse_result


@router.post("/parse-external-document")
async def parse_external_document(
    body: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Parse a document from a URL.
    Body: { "document_url": "https://...", "document_type": "crif", "lead_id": "optional" }
    """
    doc_url = body.get("document_url")
    doc_type = body.get("document_type", "general")
    lead_id = body.get("lead_id")

    if not doc_url:
        raise HTTPException(status_code=400, detail="document_url is required")

    import httpx
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(doc_url, timeout=30)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to download document")
        file_bytes = resp.content

    mime_type = "application/pdf"
    if doc_url.lower().endswith(".png"):
        mime_type = "image/png"
    elif doc_url.lower().endswith(".jpg") or doc_url.lower().endswith(".jpeg"):
        mime_type = "image/jpeg"

    parsed_data = await parse_document_with_llm(file_bytes, mime_type, doc_type)

    result = {
        "id": str(uuid.uuid4()),
        "lead_id": lead_id,
        "document_url": doc_url,
        "document_type": doc_type,
        "parsed_data": parsed_data,
        "parsed_by": current_user.full_name,
        "parsed_at": datetime.now(timezone.utc).isoformat(),
    }

    if lead_id:
        await db.document_parses.insert_one({**result})
        result.pop("_id", None)

    return result


@router.post("/auto-fill-from-parse/{lead_id}")
async def auto_fill_lead_from_parse(
    lead_id: str,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Auto-fill lead profile from parsed document data.
    Body: { "parsed_data": {...}, "document_type": "crif" }
    """
    parsed_data = body.get("parsed_data", {})
    doc_type = body.get("document_type", "general")

    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    ad = lead.get("additional_data", {})
    updates = {}
    fields_updated = []

    if doc_type == "crif":
        if parsed_data.get("credit_score"):
            updates["additional_data.cibil_score"] = str(parsed_data["credit_score"])
            fields_updated.append(f"CIBIL Score: {parsed_data['credit_score']}")

        # Calculate total EMI from active loans
        total_emi = parsed_data.get("total_monthly_emi")
        if not total_emi:
            active_loans = parsed_data.get("active_loans", [])
            total_emi = sum(l.get("emi", 0) or 0 for l in active_loans)

        if total_emi:
            updates["additional_data.obligations_emi"] = str(int(total_emi))
            fields_updated.append(f"Monthly EMI: ₹{int(total_emi):,}")

        if parsed_data.get("cibil_issues_summary"):
            issue_map = {"none": "no_issues", "minor": "minor", "major": "major"}
            mapped = issue_map.get(parsed_data["cibil_issues_summary"].lower(), "")
            if mapped:
                updates["additional_data.cibil_issues"] = mapped
                fields_updated.append(f"CIBIL Issues: {mapped}")

        # Store full CRIF analysis
        updates["additional_data.crif_analysis"] = {
            "score": parsed_data.get("credit_score"),
            "total_accounts": parsed_data.get("total_accounts"),
            "active_accounts": parsed_data.get("active_accounts"),
            "total_outstanding": parsed_data.get("total_outstanding_balance"),
            "credit_utilization": parsed_data.get("credit_utilization_pct"),
            "defaults": parsed_data.get("defaults_count", 0),
            "writeoffs": parsed_data.get("writeoffs_count", 0),
            "overdue_amount": parsed_data.get("overdue_amount", 0),
            "dpd_30_plus": parsed_data.get("dpd_30_plus_count", 0),
            "recent_enquiries": parsed_data.get("recent_enquiries_count"),
            "active_loans": parsed_data.get("active_loans", []),
            "active_credit_cards": parsed_data.get("active_credit_cards", []),
            "key_observations": parsed_data.get("key_observations"),
            "parsed_at": datetime.now(timezone.utc).isoformat(),
        }
        fields_updated.append("Full CRIF Analysis saved")

    elif doc_type == "salary_slip":
        if parsed_data.get("net_salary"):
            updates["additional_data.net_salary"] = str(int(parsed_data["net_salary"]))
            fields_updated.append(f"Net Salary: ₹{int(parsed_data['net_salary']):,}")

        if parsed_data.get("employer_name"):
            updates["additional_data.company_name"] = parsed_data["employer_name"]
            fields_updated.append(f"Company: {parsed_data['employer_name']}")

        if parsed_data.get("gross_salary"):
            updates["additional_data.gross_salary"] = str(int(parsed_data["gross_salary"]))
            fields_updated.append(f"Gross Salary: ₹{int(parsed_data['gross_salary']):,}")

    elif doc_type == "bank_statement":
        if parsed_data.get("identified_salary_credit") and not ad.get("net_salary"):
            updates["additional_data.net_salary"] = str(int(parsed_data["identified_salary_credit"]))
            fields_updated.append(f"Net Salary (from bank stmt): ₹{int(parsed_data['identified_salary_credit']):,}")

        if parsed_data.get("total_identified_emi"):
            updates["additional_data.obligations_emi"] = str(int(parsed_data["total_identified_emi"]))
            fields_updated.append(f"EMI (from bank stmt): ₹{int(parsed_data['total_identified_emi']):,}")

        if parsed_data.get("bounce_count") and parsed_data["bounce_count"] > 0:
            updates["additional_data.bank_stmt_bounces"] = parsed_data["bounce_count"]
            fields_updated.append(f"Bounces: {parsed_data['bounce_count']}")

    elif doc_type == "form16":
        if parsed_data.get("net_salary_monthly") and not ad.get("net_salary"):
            updates["additional_data.net_salary"] = str(int(parsed_data["net_salary_monthly"]))
            fields_updated.append(f"Net Salary: ₹{int(parsed_data['net_salary_monthly']):,}")

        if parsed_data.get("employer_name"):
            updates["additional_data.company_name"] = parsed_data["employer_name"]
            fields_updated.append(f"Company: {parsed_data['employer_name']}")

    if updates:
        await db.leads.update_one({"id": lead_id}, {"$set": updates})

        # Log activity
        activity = {
            "type": "ai_document_parse",
            "message": f"AI parsed {doc_type} document. Updated: {', '.join(fields_updated)}",
            "by": current_user.full_name,
            "at": datetime.now(timezone.utc).isoformat(),
        }
        await db.leads.update_one({"id": lead_id}, {"$push": {"activities": activity}})

    return {
        "message": f"Lead updated with {len(fields_updated)} fields from {doc_type} document",
        "fields_updated": fields_updated,
        "updates_applied": bool(updates),
    }


@router.get("/document-parses/{lead_id}")
async def get_document_parses(lead_id: str, current_user: User = Depends(get_current_user)):
    """Get all AI-parsed document results for a lead."""
    parses = await db.document_parses.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("parsed_at", -1).to_list(50)
    return parses



@router.post("/auto-parse-all/{lead_id}")
async def auto_parse_all_documents(lead_id: str, current_user: User = Depends(get_current_user)):
    """Auto-detect and parse all documents for a lead. Guesses document type from filename.
    Skips documents already parsed. Returns all parsed results and auto-fills lead profile."""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    documents = lead.get("documents", [])
    if not documents:
        return {"message": "No documents to parse", "parsed": [], "fields_updated": []}

    # Check which docs are already parsed
    existing_parses = await db.document_parses.find(
        {"lead_id": lead_id}, {"document_index": 1, "_id": 0}
    ).to_list(100)
    parsed_indices = {p.get("document_index") for p in existing_parses}

    all_results = []
    all_fields_updated = []

    for i, doc in enumerate(documents):
        if i in parsed_indices:
            continue  # Skip already-parsed documents

        fname = (doc.get("original_name") or doc.get("file_name") or "").lower()
        mime = doc.get("mime_type") or "application/pdf"

        # Only parse PDFs
        if "pdf" not in mime and not fname.endswith(".pdf"):
            continue

        # Auto-detect document type from filename
        doc_type = "general"
        if any(kw in fname for kw in ["crif", "cibil", "credit", "bureau", "experian", "equifax"]):
            doc_type = "crif"
        elif any(kw in fname for kw in ["salary", "payslip", "pay_slip", "pay slip"]):
            doc_type = "salary_slip"
        elif any(kw in fname for kw in ["bank", "statement", "transaction", "optransaction"]):
            doc_type = "bank_statement"
        elif any(kw in fname for kw in ["form16", "form 16", "form-16", "itr"]):
            doc_type = "form16"

        # Skip general documents (likely ID proofs, photos etc.)
        if doc_type == "general":
            continue

        file_id = doc.get("file_id") or doc.get("id")
        file_record = await db.file_storage.find_one({"file_id": file_id})
        if not file_record or not file_record.get("content"):
            continue

        try:
            file_bytes = base64.b64decode(file_record["content"])
            parsed_data = await parse_document_with_llm(file_bytes, mime, doc_type)

            parse_result = {
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "document_index": i,
                "document_name": doc.get("original_name") or doc.get("file_name", ""),
                "document_type": doc_type,
                "parsed_data": parsed_data,
                "parsed_by": current_user.full_name,
                "parsed_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.document_parses.insert_one({**parse_result})
            parse_result.pop("_id", None)
            all_results.append(parse_result)

            # Auto-fill from this parse
            if not parsed_data.get("error"):
                fill_result = await _auto_fill_from_parsed(lead_id, parsed_data, doc_type, current_user)
                all_fields_updated.extend(fill_result)

        except Exception as e:
            logger.error(f"Auto-parse failed for doc {i} ({fname}): {e}")
            continue

    return {
        "message": f"Parsed {len(all_results)} documents",
        "parsed": all_results,
        "fields_updated": all_fields_updated,
    }


async def _auto_fill_from_parsed(lead_id: str, parsed_data: dict, doc_type: str, current_user) -> list:
    """Internal helper to auto-fill lead from parsed data. Returns list of updated field descriptions."""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        return []

    ad = lead.get("additional_data", {})
    updates = {}
    fields_updated = []

    if doc_type == "crif":
        if parsed_data.get("credit_score"):
            updates["additional_data.cibil_score"] = str(parsed_data["credit_score"])
            fields_updated.append(f"CIBIL Score: {parsed_data['credit_score']}")
        total_emi = parsed_data.get("total_monthly_emi")
        if not total_emi:
            active_loans = parsed_data.get("active_loans", [])
            total_emi = sum(l.get("emi", 0) or 0 for l in active_loans)
        if total_emi:
            updates["additional_data.obligations_emi"] = str(int(total_emi))
            fields_updated.append(f"Monthly EMI: ₹{int(total_emi):,}")
        if parsed_data.get("cibil_issues_summary"):
            issue_map = {"none": "no_issues", "minor": "minor", "major": "major"}
            mapped = issue_map.get(parsed_data["cibil_issues_summary"].lower(), "")
            if mapped:
                updates["additional_data.cibil_issues"] = mapped
                fields_updated.append(f"CIBIL Issues: {mapped}")
        updates["additional_data.crif_analysis"] = {
            "score": parsed_data.get("credit_score"),
            "total_accounts": parsed_data.get("total_accounts"),
            "active_accounts": parsed_data.get("active_accounts"),
            "total_outstanding": parsed_data.get("total_outstanding_balance"),
            "credit_utilization": parsed_data.get("credit_utilization_pct"),
            "defaults": parsed_data.get("defaults_count", 0),
            "writeoffs": parsed_data.get("writeoffs_count", 0),
            "active_loans": parsed_data.get("active_loans", []),
            "active_credit_cards": parsed_data.get("active_credit_cards", []),
            "key_observations": parsed_data.get("key_observations"),
            "parsed_at": datetime.now(timezone.utc).isoformat(),
        }
        fields_updated.append("Full CRIF Analysis saved")
    elif doc_type == "salary_slip":
        if parsed_data.get("net_salary"):
            updates["additional_data.net_salary"] = str(int(parsed_data["net_salary"]))
            fields_updated.append(f"Net Salary: ₹{int(parsed_data['net_salary']):,}")
        if parsed_data.get("employer_name"):
            updates["additional_data.company_name"] = parsed_data["employer_name"]
            fields_updated.append(f"Company: {parsed_data['employer_name']}")
    elif doc_type == "bank_statement":
        if parsed_data.get("identified_salary_credit") and not ad.get("net_salary"):
            updates["additional_data.net_salary"] = str(int(parsed_data["identified_salary_credit"]))
            fields_updated.append(f"Net Salary: ₹{int(parsed_data['identified_salary_credit']):,}")
        if parsed_data.get("total_identified_emi"):
            updates["additional_data.obligations_emi"] = str(int(parsed_data["total_identified_emi"]))
            fields_updated.append(f"EMI: ₹{int(parsed_data['total_identified_emi']):,}")

    if updates:
        await db.leads.update_one({"id": lead_id}, {"$set": updates})
        activity = {
            "type": "ai_document_parse",
            "message": f"AI auto-parsed {doc_type}. Updated: {', '.join(fields_updated)}",
            "by": current_user.full_name,
            "at": datetime.now(timezone.utc).isoformat(),
        }
        await db.leads.update_one({"id": lead_id}, {"$push": {"activities": activity}})

    return fields_updated
