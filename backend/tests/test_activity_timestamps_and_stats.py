"""
Test suite for:
1. Backend: Eligibility update saves timestamps - login_done_at, approved_at, disbursed_at, rejected_at
2. Backend: calculateDashboardStatsWithActivityDates function support
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestActivityTimestamps:
    """Test eligibility timestamp tracking on status changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Use existing test lead
        self.test_lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
    
    def test_existing_lead_has_timestamps(self):
        """Test that existing lead has timestamp fields in eligibilities"""
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Check eligibilities have timestamp fields
        eligibilities = lead.get("eligibilities", [])
        assert len(eligibilities) > 0, "Lead should have eligibilities"
        
        for elig in eligibilities:
            # Check timestamp fields exist (may be None if not set)
            assert "login_done_at" in elig or elig.get("login_done") != "yes", \
                "login_done_at should exist when login_done=yes"
            assert "approved_at" in elig or elig.get("approval_status") != "approved", \
                "approved_at should exist when approval_status=approved"
            assert "disbursed_at" in elig or elig.get("disbursed") != "yes", \
                "disbursed_at should exist when disbursed=yes"
            
            # If login_done=yes, login_done_at should have a value
            if elig.get("login_done") == "yes":
                assert elig.get("login_done_at") is not None, \
                    f"login_done_at should be set when login_done=yes, got: {elig}"
            
            # If approval_status=approved, approved_at should have a value
            if elig.get("approval_status") == "approved":
                assert elig.get("approved_at") is not None, \
                    f"approved_at should be set when approval_status=approved, got: {elig}"
            
            # If disbursed=yes, disbursed_at should have a value
            if elig.get("disbursed") == "yes":
                assert elig.get("disbursed_at") is not None, \
                    f"disbursed_at should be set when disbursed=yes, got: {elig}"
        
        print(f"PASS: Lead {self.test_lead_id} has proper timestamp fields")
    
    def test_timestamp_set_on_login_done(self):
        """Test that login_done_at is set when login_done changes to 'yes'"""
        # First, get current eligibilities
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Create a new eligibility with login_done=yes
        test_bank = f"TEST_Bank_{uuid.uuid4().hex[:8]}"
        new_eligibilities = lead.get("eligibilities", []).copy()
        new_eligibilities.append({
            "bank_name": test_bank,
            "is_eligible": "yes",
            "eligible_amount": 100000,
            "login_done": "yes"
        })
        
        # Update eligibilities
        response = requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": new_eligibilities}
        )
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        
        # Verify login_done_at was set
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_lead = response.json()
        
        test_elig = next((e for e in updated_lead.get("eligibilities", []) 
                         if e.get("bank_name") == test_bank), None)
        assert test_elig is not None, f"Test bank {test_bank} not found in eligibilities"
        assert test_elig.get("login_done_at") is not None, \
            f"login_done_at should be set, got: {test_elig}"
        
        # Verify it's a valid ISO timestamp
        try:
            datetime.fromisoformat(test_elig["login_done_at"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"login_done_at is not a valid ISO timestamp: {test_elig['login_done_at']}")
        
        print(f"PASS: login_done_at set correctly: {test_elig['login_done_at']}")
        
        # Cleanup - remove test bank
        cleanup_eligibilities = [e for e in updated_lead.get("eligibilities", []) 
                                if e.get("bank_name") != test_bank]
        requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": cleanup_eligibilities}
        )
    
    def test_timestamp_set_on_approval(self):
        """Test that approved_at is set when approval_status changes to 'approved'"""
        # Get current eligibilities
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Create a new eligibility with approval_status=approved
        test_bank = f"TEST_Approval_{uuid.uuid4().hex[:8]}"
        new_eligibilities = lead.get("eligibilities", []).copy()
        new_eligibilities.append({
            "bank_name": test_bank,
            "is_eligible": "yes",
            "eligible_amount": 200000,
            "login_done": "yes",
            "approval_status": "approved",
            "approved_amount": 180000
        })
        
        # Update eligibilities
        response = requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": new_eligibilities}
        )
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        
        # Verify approved_at was set
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_lead = response.json()
        
        test_elig = next((e for e in updated_lead.get("eligibilities", []) 
                         if e.get("bank_name") == test_bank), None)
        assert test_elig is not None, f"Test bank {test_bank} not found"
        assert test_elig.get("approved_at") is not None, \
            f"approved_at should be set, got: {test_elig}"
        assert test_elig.get("login_done_at") is not None, \
            f"login_done_at should also be set, got: {test_elig}"
        
        print(f"PASS: approved_at set correctly: {test_elig['approved_at']}")
        
        # Cleanup
        cleanup_eligibilities = [e for e in updated_lead.get("eligibilities", []) 
                                if e.get("bank_name") != test_bank]
        requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": cleanup_eligibilities}
        )
    
    def test_timestamp_set_on_disbursement(self):
        """Test that disbursed_at is set when disbursed changes to 'yes'"""
        # Get current eligibilities
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Create a new eligibility with disbursed=yes
        test_bank = f"TEST_Disbursed_{uuid.uuid4().hex[:8]}"
        new_eligibilities = lead.get("eligibilities", []).copy()
        new_eligibilities.append({
            "bank_name": test_bank,
            "is_eligible": "yes",
            "eligible_amount": 300000,
            "login_done": "yes",
            "approval_status": "approved",
            "approved_amount": 280000,
            "disbursed": "yes",
            "disbursed_amount": 280000
        })
        
        # Update eligibilities
        response = requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": new_eligibilities}
        )
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        
        # Verify disbursed_at was set
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_lead = response.json()
        
        test_elig = next((e for e in updated_lead.get("eligibilities", []) 
                         if e.get("bank_name") == test_bank), None)
        assert test_elig is not None, f"Test bank {test_bank} not found"
        assert test_elig.get("disbursed_at") is not None, \
            f"disbursed_at should be set, got: {test_elig}"
        
        print(f"PASS: disbursed_at set correctly: {test_elig['disbursed_at']}")
        
        # Cleanup
        cleanup_eligibilities = [e for e in updated_lead.get("eligibilities", []) 
                                if e.get("bank_name") != test_bank]
        requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": cleanup_eligibilities}
        )
    
    def test_timestamp_set_on_rejection(self):
        """Test that rejected_at is set when approval_status changes to 'declined'"""
        # Get current eligibilities
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Create a new eligibility with approval_status=declined
        test_bank = f"TEST_Rejected_{uuid.uuid4().hex[:8]}"
        new_eligibilities = lead.get("eligibilities", []).copy()
        new_eligibilities.append({
            "bank_name": test_bank,
            "is_eligible": "yes",
            "eligible_amount": 150000,
            "login_done": "yes",
            "approval_status": "declined",
            "declined_reason": "Test rejection"
        })
        
        # Update eligibilities
        response = requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": new_eligibilities}
        )
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        
        # Verify rejected_at was set
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_lead = response.json()
        
        test_elig = next((e for e in updated_lead.get("eligibilities", []) 
                         if e.get("bank_name") == test_bank), None)
        assert test_elig is not None, f"Test bank {test_bank} not found"
        assert test_elig.get("rejected_at") is not None, \
            f"rejected_at should be set, got: {test_elig}"
        
        print(f"PASS: rejected_at set correctly: {test_elig['rejected_at']}")
        
        # Cleanup
        cleanup_eligibilities = [e for e in updated_lead.get("eligibilities", []) 
                                if e.get("bank_name") != test_bank]
        requests.put(
            f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
            headers=self.headers,
            json={"eligibilities": cleanup_eligibilities}
        )
    
    def test_timestamp_preserved_on_update(self):
        """Test that existing timestamps are preserved when updating other fields"""
        # Get current eligibilities
        response = requests.get(
            f"{BASE_URL}/api/leads/{self.test_lead_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        lead = response.json()
        
        # Find an eligibility with login_done_at set
        existing_elig = next((e for e in lead.get("eligibilities", []) 
                             if e.get("login_done_at")), None)
        
        if existing_elig:
            original_timestamp = existing_elig.get("login_done_at")
            bank_name = existing_elig.get("bank_name")
            
            # Update the eligibility without changing login_done
            updated_eligibilities = lead.get("eligibilities", []).copy()
            for e in updated_eligibilities:
                if e.get("bank_name") == bank_name:
                    e["eligible_amount"] = (e.get("eligible_amount") or 100000) + 1000
            
            response = requests.put(
                f"{BASE_URL}/api/crm/{self.test_lead_id}/eligibilities",
                headers=self.headers,
                json={"eligibilities": updated_eligibilities}
            )
            assert response.status_code == 200
            
            # Verify timestamp was preserved
            response = requests.get(
                f"{BASE_URL}/api/leads/{self.test_lead_id}",
                headers=self.headers
            )
            assert response.status_code == 200
            updated_lead = response.json()
            
            updated_elig = next((e for e in updated_lead.get("eligibilities", []) 
                                if e.get("bank_name") == bank_name), None)
            assert updated_elig is not None
            assert updated_elig.get("login_done_at") == original_timestamp, \
                f"Timestamp should be preserved. Original: {original_timestamp}, Got: {updated_elig.get('login_done_at')}"
            
            print(f"PASS: Timestamp preserved correctly: {original_timestamp}")
        else:
            pytest.skip("No eligibility with login_done_at found to test preservation")


class TestDailyReportAPI:
    """Test Daily Report API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_daily_report_endpoint_exists(self):
        """Test that daily report endpoint exists and returns data"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report?from_date={today}&to_date={today}",
            headers=self.headers
        )
        # Should return 200 even if no data
        assert response.status_code == 200, f"Daily report endpoint failed: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should have summary"
        assert "leads" in data, "Response should have leads"
        
        print(f"PASS: Daily report endpoint works, found {len(data.get('leads', []))} leads")
    
    def test_daily_report_summary_fields(self):
        """Test that daily report summary has required fields"""
        # Use a wider date range to get data
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report?from_date=2020-01-01&to_date=2030-12-31",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("summary", {})
        
        # Check required summary fields
        required_fields = [
            "total_leads",
            "total_eligible_amount",
            "total_approved_amount",
            "total_disbursed_amount"
        ]
        
        for field in required_fields:
            assert field in summary, f"Summary should have {field}"
        
        print(f"PASS: Daily report summary has all required fields")
        print(f"  - total_leads: {summary.get('total_leads')}")
        print(f"  - total_eligible_amount: {summary.get('total_eligible_amount')}")
        print(f"  - total_approved_amount: {summary.get('total_approved_amount')}")
        print(f"  - total_disbursed_amount: {summary.get('total_disbursed_amount')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
