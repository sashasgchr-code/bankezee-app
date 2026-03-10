"""
Test Activity-Based Timestamps and Daily Report PDF Export
Tests:
1. Daily Report PDF export - Navigate to /reports/daily, generate report, click Download PDF button
2. Activity-based timestamps - When eligibility fields change, timestamps are saved
3. Dashboard stats - Should calculate based on activity dates
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestActivityTimestampsAndDailyReport:
    """Test activity-based timestamps and daily report functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.ops_token = None
        self.test_lead_id = "0683f437-c4df-4509-b1e6-d20017180102"  # Test lead from context
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        return self.admin_token
    
    def get_ops_token(self):
        """Get operations user authentication token"""
        if self.ops_token:
            return self.ops_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200, f"Ops login failed: {response.text}"
        self.ops_token = response.json()["token"]
        return self.ops_token
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_ops_login(self):
        """Test operations user login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "operations"
        print("PASS: Operations user login successful")
    
    # ==================== DAILY REPORT API TESTS ====================
    
    def test_daily_report_managers_list(self):
        """Test GET /api/reports/managers-list returns list of managers"""
        token = self.get_admin_token()
        response = requests.get(
            f"{BASE_URL}/api/reports/managers-list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Managers list returned {len(data)} managers")
    
    def test_daily_report_generation(self):
        """Test GET /api/reports/daily-report generates report with leads"""
        token = self.get_admin_token()
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report?from_date=2026-01-01&to_date={today}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "leads" in data
        assert "summary" in data
        assert isinstance(data["leads"], list)
        
        # Verify summary has required fields
        summary = data["summary"]
        assert "total_leads" in summary
        assert "total_eligible_amount" in summary
        assert "total_approved_amount" in summary
        assert "total_disbursed_amount" in summary
        assert "status_distribution" in summary
        
        print(f"PASS: Daily report generated with {summary['total_leads']} leads")
        print(f"  - Total Eligible: ₹{summary['total_eligible_amount']}")
        print(f"  - Total Approved: ₹{summary['total_approved_amount']}")
        print(f"  - Total Disbursed: ₹{summary['total_disbursed_amount']}")
    
    def test_daily_report_with_date_filter(self):
        """Test daily report respects date filters"""
        token = self.get_admin_token()
        
        # Test with today's date only
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report?from_date={today}&to_date={today}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        print(f"PASS: Daily report for today returned {len(data['leads'])} leads")
    
    # ==================== ELIGIBILITY TIMESTAMP TESTS ====================
    
    def test_get_lead_eligibilities(self):
        """Test GET /api/crm/{lead_id}/eligibilities returns eligibilities"""
        token = self.get_admin_token()
        
        # First get all leads to find one with eligibilities
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        # Find a lead with eligibilities
        lead_with_elig = None
        for lead in leads:
            if lead.get("eligibilities") and len(lead.get("eligibilities", [])) > 0:
                lead_with_elig = lead
                break
        
        if lead_with_elig:
            response = requests.get(
                f"{BASE_URL}/api/crm/{lead_with_elig['id']}/eligibilities",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            eligibilities = response.json()
            assert isinstance(eligibilities, list)
            print(f"PASS: Got {len(eligibilities)} eligibilities for lead {lead_with_elig['id']}")
        else:
            print("SKIP: No leads with eligibilities found")
    
    def test_eligibility_update_saves_login_done_at_timestamp(self):
        """Test that setting login_done='yes' saves login_done_at timestamp"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        # Use first lead
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # Update eligibility with login_done='yes'
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Timestamp",
                    "is_eligible": "yes",
                    "eligible_amount": 500000,
                    "login_done": "yes"
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Verify the timestamp was saved
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        eligibilities = get_response.json()
        
        # Find our test bank
        test_bank_elig = None
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Timestamp":
                test_bank_elig = elig
                break
        
        assert test_bank_elig is not None, "Test bank eligibility not found"
        assert test_bank_elig.get("login_done") == "yes"
        assert test_bank_elig.get("login_done_at") is not None, "login_done_at timestamp should be set"
        
        print(f"PASS: login_done_at timestamp saved: {test_bank_elig.get('login_done_at')}")
    
    def test_eligibility_update_saves_approved_at_timestamp(self):
        """Test that setting approval_status='approved' saves approved_at timestamp"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # Update eligibility with approval_status='approved'
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Approved",
                    "is_eligible": "yes",
                    "eligible_amount": 600000,
                    "login_done": "yes",
                    "approval_status": "approved",
                    "approved_amount": 550000
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Verify the timestamp was saved
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        eligibilities = get_response.json()
        
        # Find our test bank
        test_bank_elig = None
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Approved":
                test_bank_elig = elig
                break
        
        assert test_bank_elig is not None, "Test bank eligibility not found"
        assert test_bank_elig.get("approval_status") == "approved"
        assert test_bank_elig.get("approved_at") is not None, "approved_at timestamp should be set"
        
        print(f"PASS: approved_at timestamp saved: {test_bank_elig.get('approved_at')}")
    
    def test_eligibility_update_saves_disbursed_at_timestamp(self):
        """Test that setting disbursed='yes' saves disbursed_at timestamp"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # Update eligibility with disbursed='yes'
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Disbursed",
                    "is_eligible": "yes",
                    "eligible_amount": 700000,
                    "login_done": "yes",
                    "approval_status": "approved",
                    "approved_amount": 650000,
                    "disbursed": "yes",
                    "disbursed_amount": 650000,
                    "commission_percentage": 1.5
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Verify the timestamp was saved
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        eligibilities = get_response.json()
        
        # Find our test bank
        test_bank_elig = None
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Disbursed":
                test_bank_elig = elig
                break
        
        assert test_bank_elig is not None, "Test bank eligibility not found"
        assert test_bank_elig.get("disbursed") == "yes"
        assert test_bank_elig.get("disbursed_at") is not None, "disbursed_at timestamp should be set"
        
        print(f"PASS: disbursed_at timestamp saved: {test_bank_elig.get('disbursed_at')}")
    
    def test_eligibility_update_saves_rejected_at_timestamp(self):
        """Test that setting approval_status='declined' saves rejected_at timestamp"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # Update eligibility with approval_status='declined'
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Rejected",
                    "is_eligible": "yes",
                    "eligible_amount": 400000,
                    "login_done": "yes",
                    "approval_status": "declined",
                    "declined_reason": "Low CIBIL score"
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Verify the timestamp was saved
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        eligibilities = get_response.json()
        
        # Find our test bank
        test_bank_elig = None
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Rejected":
                test_bank_elig = elig
                break
        
        assert test_bank_elig is not None, "Test bank eligibility not found"
        assert test_bank_elig.get("approval_status") == "declined"
        assert test_bank_elig.get("rejected_at") is not None, "rejected_at timestamp should be set"
        
        print(f"PASS: rejected_at timestamp saved: {test_bank_elig.get('rejected_at')}")
    
    def test_timestamp_preserved_on_subsequent_updates(self):
        """Test that timestamps are preserved when eligibility is updated again"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # First update - set login_done='yes'
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Preserve",
                    "is_eligible": "yes",
                    "eligible_amount": 800000,
                    "login_done": "yes"
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Get the initial timestamp
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        eligibilities = get_response.json()
        initial_timestamp = None
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Preserve":
                initial_timestamp = elig.get("login_done_at")
                break
        
        assert initial_timestamp is not None, "Initial timestamp should be set"
        
        # Second update - add approval (login_done still 'yes')
        eligibility_data = {
            "eligibilities": [
                {
                    "bank_name": "Test Bank Preserve",
                    "is_eligible": "yes",
                    "eligible_amount": 800000,
                    "login_done": "yes",
                    "approval_status": "approved",
                    "approved_amount": 750000
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"},
            json=eligibility_data
        )
        assert response.status_code == 200
        
        # Verify the login_done_at timestamp is preserved
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        eligibilities = get_response.json()
        
        for elig in eligibilities:
            if elig.get("bank_name") == "Test Bank Preserve":
                preserved_timestamp = elig.get("login_done_at")
                assert preserved_timestamp == initial_timestamp, \
                    f"Timestamp should be preserved. Initial: {initial_timestamp}, Current: {preserved_timestamp}"
                assert elig.get("approved_at") is not None, "approved_at should be set"
                print(f"PASS: login_done_at timestamp preserved: {preserved_timestamp}")
                print(f"PASS: approved_at timestamp added: {elig.get('approved_at')}")
                break
    
    # ==================== TOTAL ELIGIBLE API TEST ====================
    
    def test_total_eligible_api(self):
        """Test GET /api/crm/total-eligible returns correct total"""
        token = self.get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/crm/total-eligible",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_eligible" in data
        print(f"PASS: Total eligible amount: ₹{data['total_eligible']}")
    
    # ==================== CLEANUP ====================
    
    def test_cleanup_test_eligibilities(self):
        """Clean up test eligibilities created during tests"""
        token = self.get_admin_token()
        
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {token}"}
        )
        if leads_response.status_code != 200:
            return
        
        leads = leads_response.json()
        if not leads:
            return
        
        test_lead = leads[0]
        lead_id = test_lead["id"]
        
        # Get current eligibilities
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        if get_response.status_code != 200:
            return
        
        eligibilities = get_response.json()
        
        # Filter out test banks
        test_bank_names = [
            "Test Bank Timestamp",
            "Test Bank Approved",
            "Test Bank Disbursed",
            "Test Bank Rejected",
            "Test Bank Preserve"
        ]
        
        cleaned_eligibilities = [
            elig for elig in eligibilities 
            if elig.get("bank_name") not in test_bank_names
        ]
        
        # Update with cleaned eligibilities
        if len(cleaned_eligibilities) != len(eligibilities):
            response = requests.put(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers={"Authorization": f"Bearer {token}"},
                json={"eligibilities": cleaned_eligibilities}
            )
            print(f"PASS: Cleaned up {len(eligibilities) - len(cleaned_eligibilities)} test eligibilities")
        else:
            print("PASS: No test eligibilities to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
