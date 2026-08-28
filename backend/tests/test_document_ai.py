"""
Backend tests for Phase 4: AI Document Parsing (document_ai.py)
- parse-external-document (CRIF PDF from URL)
- auto-fill-from-parse/{lead_id}
- parse-document/{lead_id} (404 for missing docs)
- document-parses/{lead_id}
- Auth enforcement
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@bankezee.com"
ADMIN_PASSWORD = "admin123"

CRIF_URL = (
    "https://customer-assets-m6fa6gv7.emergentagent.net/"
    "job_2a44ee6a-9fab-4414-8d1d-5349aad574f8/artifacts/"
    "prni2huw_CRIF-B2C-260820CR407600319-20-08-2026-16-04-25%20%281%29.pdf"
)

TEST_LEAD_ID = "4483f4cc-6214-4798-9b0d-aac648a78b11"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"No token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def parsed_crif(auth_headers):
    """Parse external CRIF PDF once and share result across tests."""
    r = requests.post(
        f"{API}/document-ai/parse-external-document",
        json={"document_url": CRIF_URL, "document_type": "crif", "lead_id": TEST_LEAD_ID},
        headers=auth_headers,
        timeout=120,
    )
    assert r.status_code == 200, f"parse-external failed: {r.status_code} {r.text[:500]}"
    return r.json()


# ---------- Auth enforcement ----------
class TestAuthEnforcement:
    def test_parse_external_no_auth(self):
        r = requests.post(f"{API}/document-ai/parse-external-document",
                          json={"document_url": CRIF_URL, "document_type": "crif"}, timeout=10)
        assert r.status_code in (401, 403), f"Expected auth error, got {r.status_code}"

    def test_auto_fill_no_auth(self):
        r = requests.post(f"{API}/document-ai/auto-fill-from-parse/{TEST_LEAD_ID}",
                          json={"parsed_data": {}, "document_type": "crif"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_parse_document_no_auth(self):
        r = requests.post(f"{API}/document-ai/parse-document/{TEST_LEAD_ID}",
                          json={"document_index": 0, "document_type": "crif"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_get_parses_no_auth(self):
        r = requests.get(f"{API}/document-ai/document-parses/{TEST_LEAD_ID}", timeout=10)
        assert r.status_code in (401, 403)


# ---------- parse-external-document (CRIF) ----------
class TestParseExternalCRIF:
    def test_status_and_shape(self, parsed_crif):
        assert "parsed_data" in parsed_crif
        assert parsed_crif["document_type"] == "crif"
        assert parsed_crif["lead_id"] == TEST_LEAD_ID
        assert "parsed_at" in parsed_crif
        assert "id" in parsed_crif

    def test_credit_score(self, parsed_crif):
        pd = parsed_crif["parsed_data"]
        assert pd.get("credit_score") == 776, f"Expected 776 got {pd.get('credit_score')}"

    def test_customer_name(self, parsed_crif):
        pd = parsed_crif["parsed_data"]
        name = (pd.get("customer_name") or "").lower()
        assert "vinil" in name and "varayogula" in name, f"Unexpected name: {name}"

    def test_active_accounts(self, parsed_crif):
        pd = parsed_crif["parsed_data"]
        # Allow small tolerance since LLM might interpret differently
        aa = pd.get("active_accounts")
        assert aa is not None and 6 <= aa <= 10, f"active_accounts={aa}"

    def test_outstanding_balance_present(self, parsed_crif):
        pd = parsed_crif["parsed_data"]
        assert pd.get("total_outstanding_balance") is not None
        assert pd.get("total_outstanding_balance") > 0

    def test_key_fields_present(self, parsed_crif):
        pd = parsed_crif["parsed_data"]
        for key in ["total_monthly_emi", "credit_card_total_balance",
                    "defaults_count", "cibil_issues_summary",
                    "active_loans", "active_credit_cards"]:
            assert key in pd, f"Missing key: {key}"


# ---------- auto-fill-from-parse ----------
class TestAutoFill:
    def test_auto_fill_updates_lead(self, auth_headers, parsed_crif):
        r = requests.post(
            f"{API}/document-ai/auto-fill-from-parse/{TEST_LEAD_ID}",
            json={"parsed_data": parsed_crif["parsed_data"], "document_type": "crif"},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        d = r.json()
        assert d.get("updates_applied") is True
        assert isinstance(d.get("fields_updated"), list)
        assert len(d["fields_updated"]) > 0
        # CIBIL score should be part of fields updated
        joined = " ".join(d["fields_updated"])
        assert "CIBIL Score" in joined or "776" in joined

    def test_lead_reflects_parsed_data(self, auth_headers):
        r = requests.get(f"{API}/leads/{TEST_LEAD_ID}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        lead = r.json()
        ad = lead.get("additional_data", {})
        assert str(ad.get("cibil_score")) == "776"
        assert "crif_analysis" in ad
        crif = ad["crif_analysis"]
        assert crif.get("score") == 776

    def test_eligibility_reruns_with_new_data(self, auth_headers):
        r = requests.post(f"{API}/bank-policies/check-eligibility/{TEST_LEAD_ID}",
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["profile"].get("cibil_score") in (776, "776")
        # Should have some eligible/possible/not-eligible counts
        assert d.get("total_policies", 0) > 0

    def test_auto_fill_bad_lead_returns_404(self, auth_headers):
        r = requests.post(
            f"{API}/document-ai/auto-fill-from-parse/does-not-exist",
            json={"parsed_data": {"credit_score": 700}, "document_type": "crif"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 404


# ---------- parse-document 404 for no docs ----------
class TestParseDocumentEdge:
    def test_lead_without_documents(self, auth_headers):
        # Create a temp lead with no documents
        payload = {
            "full_name": "TEST_DocAI_NoDocs",
            "mobile": "9999900001",
            "requirement": "Personal Loan",
            "city": "Hyderabad",
            "employment_type": "salaried",
        }
        r = requests.post(f"{API}/leads/create", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code in (200, 201), r.text
        lead_id = r.json()["lead_id"]
        try:
            r2 = requests.post(
                f"{API}/document-ai/parse-document/{lead_id}",
                json={"document_index": 0, "document_type": "crif"},
                headers=auth_headers, timeout=15,
            )
            assert r2.status_code == 404
        finally:
            requests.delete(f"{API}/leads/{lead_id}", headers=auth_headers, timeout=10)

    def test_nonexistent_lead(self, auth_headers):
        r = requests.post(
            f"{API}/document-ai/parse-document/nonexistent-lead-xyz",
            json={"document_index": 0, "document_type": "crif"},
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 404


# ---------- get parse history ----------
class TestParseHistory:
    def test_history_contains_recent_parse(self, auth_headers, parsed_crif):
        r = requests.get(f"{API}/document-ai/document-parses/{TEST_LEAD_ID}",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        parses = r.json()
        assert isinstance(parses, list)
        assert len(parses) >= 1
        # Should be sorted desc by parsed_at, latest should be crif
        first = parses[0]
        assert first["document_type"] == "crif"
        assert "_id" not in first  # mongo _id excluded
