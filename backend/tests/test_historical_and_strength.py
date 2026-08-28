"""Tests for Historical Case Learning + smart profile_strength."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lead-gen-platform-13.preview.emergentagent.com').rstrip('/')
TEST_LEAD_ID = "2ee497ea-72a8-43d6-b200-fb0555e05f12"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@bankezee.com", "password": "admin123"},
                      timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="session")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def snapshot(headers):
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_ID}",
                      headers=headers, timeout=120)
    assert r.status_code == 200, r.text
    return r.json()


def test_profile_strength_is_strong(snapshot):
    ps = snapshot.get("profile_strength")
    ec = snapshot.get("eligible_count", 0)
    print(f"profile_strength={ps} eligible_count={ec}")
    assert ec >= 20, f"expected >=20 eligible banks, got {ec}"
    assert ps == "Strong", f"expected Strong, got {ps}"


def test_results_have_historical_field(snapshot):
    results = snapshot.get("results", [])
    assert len(results) > 0
    for r in results:
        assert "historical" in r, f"missing historical field in {r.get('bank_name')}"


def test_hdfc_has_historical_data(snapshot):
    hdfc = None
    for r in snapshot["results"]:
        if "hdfc" in (r.get("bank_name") or "").lower():
            hdfc = r
            break
    assert hdfc is not None, "HDFC bank not found in results"
    h = hdfc.get("historical")
    print(f"HDFC historical: {h}")
    assert h is not None, "HDFC should have historical data"
    for k in ["total_cases", "total_logins", "total_approved", "total_disbursed",
              "similar_approved", "similar_disbursed", "approval_rate", "avg_approved_amount"]:
        assert k in h, f"missing field {k}"
    assert h["total_approved"] > 0, f"expected HDFC total_approved>0, got {h['total_approved']}"
    # approval_rate cap
    if h.get("approval_rate") is not None:
        assert h["approval_rate"] <= 100, f"approval_rate must be capped at 100, got {h['approval_rate']}"


def test_approval_rate_capped_all_banks(snapshot):
    for r in snapshot["results"]:
        h = r.get("historical")
        if h and h.get("approval_rate") is not None:
            assert h["approval_rate"] <= 100, f"{r['bank_name']} approval_rate>100: {h['approval_rate']}"


def test_banks_without_history_have_null(snapshot):
    # At least assert schema consistency - historical is either None or a dict
    for r in snapshot["results"]:
        h = r.get("historical")
        assert h is None or isinstance(h, dict)


def test_low_salary_low_cibil_not_eligible(headers):
    """Create a lead with salary=5000, CIBIL=500 -> profile_strength should be 'Not Eligible'."""
    lead_payload = {
        "full_name": "TEST_LowStrength Case",
        "mobile": "9000000199",
        "email": "TEST_lowstrength@example.com",
        "city": "Hyderabad",
        "requirement": "personal_loan",
        "employment_type": "salaried",
        "source": "test",
        "additional_data": {
            "net_salary": 5000,
            "cibil_score": 500,
            "company_type": "unlisted",
            "age": 30
        }
    }
    r = requests.post(f"{BASE_URL}/api/leads/create", json=lead_payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    lead = r.json()
    lead_id = lead.get("lead_id") or lead.get("id")
    assert lead_id, f"lead created but no id: {lead}"

    try:
        elig = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{lead_id}",
                             headers=headers, timeout=120)
        assert elig.status_code == 200, elig.text
        snap = elig.json()
        ps = snap.get("profile_strength")
        ec = snap.get("eligible_count", 0)
        pc = snap.get("possibly_eligible_count", 0)
        print(f"low-salary lead: strength={ps} eligible={ec} possibly={pc}")
        assert ec == 0 and pc == 0, f"expected 0 eligible/possibly, got {ec}/{pc}"
        assert ps == "Not Eligible", f"expected 'Not Eligible', got {ps}"
    finally:
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers, timeout=30)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
