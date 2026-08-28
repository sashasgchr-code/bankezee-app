"""Tests for Bank Policy Master + Eligibility Engine + History (Phase 1-3)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lead-gen-platform-13.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@bankezee.com", "password": "admin123"}
OPS = {"email": "ops@bankezee.com", "password": "ops123"}
TEST_LEAD_ID = "f3a38ad7-eb68-4145-897b-0a17e022a81d"


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {_login(ADMIN)}"}


@pytest.fixture(scope="module")
def ops_headers():
    return {"Authorization": f"Bearer {_login(OPS)}"}


# ---------- Policy CRUD ----------
class TestPolicyCRUD:
    def test_list_all_policies(self, admin_headers):
        r = requests.get(f"{API}/bank-policies/policies", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        policies = r.json()
        assert isinstance(policies, list)
        assert len(policies) >= 27, f"Expected >=27 policies, got {len(policies)}"
        # verify richtext fields exist on at least one
        for p in policies:
            assert "bank_name" in p
            assert "id" in p
            assert "_id" not in p

    def test_list_active_only(self, admin_headers):
        r = requests.get(f"{API}/bank-policies/policies?active_only=true", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        for p in r.json():
            assert p.get("is_active") is True

    def test_create_update_delete_policy(self, admin_headers):
        payload = {
            "bank_name": "TEST_BANK_XYZ",
            "min_salary": 25000,
            "min_cibil": 700,
            "max_foir": 60,
            "min_age": 21,
            "max_age": 60,
            "min_loan_amount": 50000,
            "max_loan_amount": 2000000,
            "max_tenure": 60,
            "roi_min": 11.5,
            "salary_text": "Min net salary 25k",
        }
        c = requests.post(f"{API}/bank-policies/policies", json=payload, headers=admin_headers, timeout=30)
        assert c.status_code == 200, c.text
        pid = c.json()["id"]

        # GET by id
        g = requests.get(f"{API}/bank-policies/policies/{pid}", headers=admin_headers, timeout=30)
        assert g.status_code == 200
        assert g.json()["bank_name"] == "TEST_BANK_XYZ"
        assert g.json()["min_salary"] == 25000

        # UPDATE
        u = requests.put(f"{API}/bank-policies/policies/{pid}", json={"min_salary": 30000, "special_notes": "updated"},
                         headers=admin_headers, timeout=30)
        assert u.status_code == 200
        g2 = requests.get(f"{API}/bank-policies/policies/{pid}", headers=admin_headers, timeout=30)
        assert g2.json()["min_salary"] == 30000
        assert g2.json()["special_notes"] == "updated"

        # DELETE
        d = requests.delete(f"{API}/bank-policies/policies/{pid}", headers=admin_headers, timeout=30)
        assert d.status_code == 200
        g3 = requests.get(f"{API}/bank-policies/policies/{pid}", headers=admin_headers, timeout=30)
        assert g3.status_code == 404

    def test_non_admin_cannot_create(self, ops_headers):
        r = requests.post(f"{API}/bank-policies/policies", json={"bank_name": "TEST_NO"},
                          headers=ops_headers, timeout=30)
        assert r.status_code == 403


# ---------- Eligibility Engine ----------
class TestEligibility:
    def test_check_eligibility_good_lead(self, admin_headers):
        r = requests.post(f"{API}/bank-policies/check-eligibility/{TEST_LEAD_ID}",
                          headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        snap = r.json()
        assert "results" in snap
        assert "profile" in snap
        assert snap["total_policies"] >= 27
        assert len(snap["results"]) >= 27
        # profile has key fields
        assert snap["profile"]["net_salary"] is not None
        assert snap["profile"]["cibil_score"] is not None
        # sort order: eligible first
        order_map = {"eligible": 0, "possibly_eligible": 1, "not_eligible": 2}
        prev = -1
        for res in snap["results"]:
            assert res["eligibility"] in order_map
            cur = order_map[res["eligibility"]]
            assert cur >= prev
            prev = cur
        # each result has enriched fields
        r0 = snap["results"][0]
        for f in ["bank_name", "eligibility", "confidence", "bt_info",
                  "reasons_pass", "reasons_fail", "reasons_warning"]:
            assert f in r0
        # counts add up
        assert (snap["eligible_count"] + snap["possibly_eligible_count"]
                + snap["not_eligible_count"]) == len(snap["results"])
        # _id should not be present
        assert "_id" not in snap

    def test_check_eligibility_invalid_lead(self, admin_headers):
        r = requests.post(f"{API}/bank-policies/check-eligibility/does-not-exist-123",
                          headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_eligibility_history(self, admin_headers):
        # ensure there is at least one snapshot
        requests.post(f"{API}/bank-policies/check-eligibility/{TEST_LEAD_ID}",
                      headers=admin_headers, timeout=60)
        r = requests.get(f"{API}/bank-policies/eligibility-history/{TEST_LEAD_ID}",
                         headers=admin_headers, timeout=30)
        assert r.status_code == 200
        history = r.json()
        assert isinstance(history, list)
        assert len(history) >= 1
        assert "_id" not in history[0]
        assert history[0]["lead_id"] == TEST_LEAD_ID
        assert "results" in history[0]

    def test_unauthenticated_blocked(self):
        r = requests.get(f"{API}/bank-policies/policies", timeout=30)
        assert r.status_code in (401, 403)
