"""
Tests for EMI/FOIR bug fix in eligibility engine.

Bug: eligibility engine did not read 'obligations_emi' (used by lead form) and
FOIR was not auto-calculated from salary+EMI when not explicitly provided.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lead-gen-platform-13.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@bankezee.com"
ADMIN_PASSWORD = "admin123"

TEST_LEAD_WITH_OBLIGATIONS_EMI = "4483f4cc-6214-4798-9b0d-aac648a78b11"  # salary=60867, emi=16000
TEST_LEAD_NO_EMI = "f3a38ad7-eb68-4145-897b-0a17e022a81d"  # Raju Bhai, no EMI


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"No token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Basic sanity ----------
def test_lead_has_obligations_emi_field(headers):
    r = requests.get(f"{BASE_URL}/api/leads/{TEST_LEAD_WITH_OBLIGATIONS_EMI}", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    lead = r.json()
    ad = lead.get("additional_data", {})
    assert ad.get("obligations_emi") in (16000, "16000", 16000.0), f"obligations_emi={ad.get('obligations_emi')}"
    assert float(ad.get("net_salary")) == 60867.0


# ---------- Eligibility engine ----------
def test_eligibility_reads_obligations_emi(headers):
    """Bug fix core: EMI should be resolved from obligations_emi field."""
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_WITH_OBLIGATIONS_EMI}",
                      headers=headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    profile = data["profile"]
    # existing_emi in profile summary must equal obligations_emi value
    assert profile["existing_emi"] is not None, f"existing_emi is None in profile: {profile}"
    assert float(profile["existing_emi"]) == 16000.0, f"Expected 16000, got {profile['existing_emi']}"


def test_eligibility_auto_calculates_foir(headers):
    """FOIR should be auto-calculated as (16000/60867)*100 ≈ 26.3"""
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_WITH_OBLIGATIONS_EMI}",
                      headers=headers, timeout=60)
    assert r.status_code == 200
    data = r.json()
    foir = data["profile"]["foir"]
    assert foir is not None, "FOIR should be auto-calculated"
    assert 26.0 <= float(foir) <= 26.5, f"Expected ~26.3, got {foir}"


def test_foir_rule_source_is_autocalculated(headers):
    """FOIR check rule should list source as 'Auto-calculated'."""
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_WITH_OBLIGATIONS_EMI}",
                      headers=headers, timeout=60)
    data = r.json()
    found_foir_rule = False
    for res in data["results"]:
        for rule in (res.get("reasons_pass", []) + res.get("reasons_fail", [])):
            if rule.get("rule") == "FOIR":
                found_foir_rule = True
                assert rule.get("source") == "Auto-calculated", f"FOIR source={rule.get('source')}"
                break
        if found_foir_rule:
            break
    assert found_foir_rule, "No FOIR rule found in any bank policy result"


def test_eligible_amount_deducts_obligations_emi(headers):
    """Eligible amount = ((salary*max_foir) - existing_emi) discounted."""
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_WITH_OBLIGATIONS_EMI}",
                      headers=headers, timeout=60)
    data = r.json()
    # Find a policy that shows a valid eligible amount and verify EMI was deducted
    # Compare: with EMI=16000 vs EMI=0 — eligible amount must be lower than for zero-EMI case.
    # Instead we just check that at least one result has estimated_emi < salary*max_foir (i.e., deduction happened).
    salary = 60867.0
    for res in data["results"]:
        if res.get("eligible_amount") and res.get("estimated_emi") and res.get("max_foir"):
            max_total_emi = salary * float(res["max_foir"]) / 100
            # estimated_emi should equal max_total_emi - 16000 (available_emi)
            expected_available = max_total_emi - 16000
            # Allow small rounding tolerance
            assert abs(res["estimated_emi"] - expected_available) < 2, \
                f"EMI deduction incorrect for {res['bank_name']}: est_emi={res['estimated_emi']}, expected={expected_available}"
            return
    pytest.skip("No policy produced an eligible_amount to verify deduction")


# ---------- Backward compat / edge cases ----------
def test_raju_lead_bugfix_effect(headers):
    """Raju Bhai (salary=100000, obligations_emi=20000) — bug fix should now surface EMI + auto-FOIR=20%."""
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_NO_EMI}",
                      headers=headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    profile = data["profile"]
    assert float(profile["existing_emi"]) == 20000.0, f"Expected 20000, got {profile.get('existing_emi')}"
    assert profile["foir"] is not None
    assert abs(float(profile["foir"]) - 20.0) < 0.5, f"Expected ~20.0, got {profile['foir']}"


def test_backward_compat_existing_emi_field(headers):
    """Create a lead with existing_emi (old field name) and verify engine still reads it."""
    payload = {
        "full_name": "TEST_BackwardCompat_EMI",
        "mobile": "9998887777",
        "city": "Hyderabad",
        "employment_type": "salaried",
        "requirement": "personal_loan",
        "additional_data": {
            "net_salary": 50000,
            "cibil_score": 780,
            "age": 30,
            "existing_emi": 10000,  # OLD field name
            "company_type": "private",
        }
    }
    cr = requests.post(f"{BASE_URL}/api/leads/create", json=payload, timeout=30)
    assert cr.status_code in (200, 201), cr.text
    lead_id = cr.json().get("lead_id") or cr.json().get("id")
    assert lead_id, f"No lead id in response: {cr.json()}"

    try:
        er = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{lead_id}",
                           headers=headers, timeout=60)
        assert er.status_code == 200, er.text
        profile = er.json()["profile"]
        assert float(profile["existing_emi"]) == 10000.0
        # FOIR auto = 10000/50000*100 = 20.0
        assert profile["foir"] is not None
        assert abs(float(profile["foir"]) - 20.0) < 0.5
    finally:
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers, timeout=30)


def test_explicit_foir_overrides_autocalc(headers):
    """If foir is explicitly set on lead, engine must use it and mark source as 'CRM Data'."""
    payload = {
        "full_name": "TEST_ExplicitFOIR",
        "mobile": "9998886666",
        "city": "Hyderabad",
        "employment_type": "salaried",
        "requirement": "personal_loan",
        "additional_data": {
            "net_salary": 100000,
            "cibil_score": 780,
            "age": 30,
            "obligations_emi": 20000,
            "foir": 45,  # explicit — different from auto-calc (20)
            "company_type": "private",
        }
    }
    cr = requests.post(f"{BASE_URL}/api/leads/create", json=payload, timeout=30)
    assert cr.status_code in (200, 201), cr.text
    lead_id = cr.json().get("lead_id") or cr.json().get("id")
    try:
        er = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{lead_id}",
                           headers=headers, timeout=60)
        assert er.status_code == 200
        data = er.json()
        assert float(data["profile"]["foir"]) == 45.0
        # Source should be CRM Data (not auto-calc)
        for res in data["results"]:
            for rule in (res.get("reasons_pass", []) + res.get("reasons_fail", [])):
                if rule.get("rule") == "FOIR":
                    assert rule.get("source") == "CRM Data", f"Expected CRM Data, got {rule.get('source')}"
                    return
    finally:
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers, timeout=30)
