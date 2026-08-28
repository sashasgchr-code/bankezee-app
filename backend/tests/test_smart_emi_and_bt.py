"""Tests for smart EMI resolution, FOIR auto-calc, and BT loan-type awareness in bank_policies rules engine."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

TEST_LEAD_BT = "6e442992-4a1a-481d-807f-3881f3c83e4b"   # EMI from loan fields, BT request
LEAD_BACKCOMPAT_1 = "2ee497ea-72a8-43d6-b200-fb0555e05f12"  # obligations_emi=12522
LEAD_BACKCOMPAT_2 = "4483f4cc-6214-4798-9b0d-aac648a78b11"  # obligations_emi=16000


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@bankezee.com", "password": "admin123"})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def bt_snapshot(headers):
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{TEST_LEAD_BT}",
                      headers=headers, timeout=60)
    assert r.status_code == 200, f"check-eligibility failed: {r.status_code} {r.text}"
    return r.json()


# ---------------- Smart EMI Resolution ----------------
def test_bt_lead_emi_resolved_to_sum_of_loans(bt_snapshot):
    profile = bt_snapshot["profile"]
    assert profile["existing_emi"] == 21809, f"Expected EMI=21809, got {profile['existing_emi']}"


def test_bt_lead_emi_source_string(bt_snapshot):
    src = bt_snapshot["profile"].get("emi_source", "")
    # Expected format: "Calculated from 3 loan(s)"
    assert "Calculated from 3" in src and "loan" in src, f"Unexpected emi_source: {src}"


def test_bt_lead_foir_auto_calc(bt_snapshot):
    foir = bt_snapshot["profile"]["foir"]
    # 21809 / 66280 * 100 = 32.9
    assert foir is not None
    assert abs(float(foir) - 32.9) < 0.2, f"Expected FOIR~32.9, got {foir}"


# ---------------- BT check ----------------
def test_bt_lead_bajaj_not_eligible(bt_snapshot):
    bajaj = [r for r in bt_snapshot["results"]
             if "bajaj" in r["bank_name"].lower()]
    assert bajaj, "Bajaj Finserv policy missing"
    for r in bajaj:
        assert r["eligibility"] == "not_eligible", f"Bajaj should be not_eligible, got {r['eligibility']}"
        bt_fail = [f for f in r["reasons_fail"] if "balance transfer" in f["rule"].lower()]
        assert bt_fail, f"Missing 'Balance Transfer Support' FAIL reason for Bajaj: {r['reasons_fail']}"


def test_bt_lead_hdfc_eligible_realistic_amount(bt_snapshot):
    hdfc = [r for r in bt_snapshot["results"]
            if r["bank_name"].strip().lower().startswith("hdfc")]
    assert hdfc, "HDFC policy missing"
    hdfc = hdfc[0]
    assert hdfc["eligibility"] == "eligible", f"HDFC should be eligible, got {hdfc['eligibility']} reasons_fail={hdfc['reasons_fail']}"
    amt = hdfc.get("eligible_amount") or 0
    # Expected ~10-11L, allow generous range 8-13L to avoid brittleness
    assert 800000 <= amt <= 1400000, f"HDFC amount not realistic: {amt}"


def test_bt_lead_eligible_counts(bt_snapshot):
    # Spec says 9 eligible banks
    ec = bt_snapshot["eligible_count"]
    assert ec == 9, f"Expected 9 eligible banks, got {ec}"


def test_bt_lead_profile_strength_fair(bt_snapshot):
    # 9 eligible => not Strong (needs >=20), should be Fair (>=5)
    ps = bt_snapshot["profile_strength"]
    assert ps == "Fair", f"Expected 'Fair' profile_strength for 9 eligible banks, got '{ps}'"


# ---------------- Backward compatibility ----------------
def test_backcompat_lead_with_obligations_emi_only(headers):
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{LEAD_BACKCOMPAT_1}",
                      headers=headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    # obligations_emi=12522 should be used directly
    assert float(data["profile"]["existing_emi"]) == 12522.0
    assert data["profile"].get("emi_source", "CRM Data") == "CRM Data"


def test_backcompat_lead_16000(headers):
    r = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{LEAD_BACKCOMPAT_2}",
                      headers=headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert float(data["profile"]["existing_emi"]) == 16000.0


# ---------------- Priority: obligations_emi wins over loan text ----------------
def test_obligations_emi_takes_priority_over_loan_fields(headers):
    """Create a temp lead with both obligations_emi=5000 and existing_loan_1='Bank 3000';
       resolver must pick 5000 (not 3000). Then delete lead."""
    payload = {
        "full_name": "TEST_EMIPriority",
        "phone": "9999900021",
        "mobile": "9999900021",
        "city": "Hyderabad",
        "requirement": "personal_loan",
        "employment_type": "salaried",
        "additional_data": {
            "net_salary": 60000,
            "cibil_score": 750,
            "obligations_emi": "5000",
            "existing_loan_1": "Bank 3000",
            "type_of_loan": "personal_loan",
            "company_type": "govt",
            "age": 30,
        }
    }
    cr = requests.post(f"{BASE_URL}/api/leads/create", headers=headers, json=payload, timeout=30)
    assert cr.status_code in (200, 201), cr.text
    lead_id = cr.json().get("lead_id") or cr.json().get("id")
    assert lead_id, f"could not extract lead id: {cr.json()}"
    try:
        er = requests.post(f"{BASE_URL}/api/bank-policies/check-eligibility/{lead_id}",
                           headers=headers, timeout=60)
        assert er.status_code == 200, er.text
        data = er.json()
        assert float(data["profile"]["existing_emi"]) == 5000.0, \
            f"Priority broken: expected 5000, got {data['profile']['existing_emi']}"
        assert data["profile"].get("emi_source", "CRM Data") == "CRM Data"
    finally:
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers, timeout=10)
