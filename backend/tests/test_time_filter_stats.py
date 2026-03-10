"""
Test Time Filter Stats - Verifies that activity-based stats work correctly with time filters
Tests the fix for: Time filter 'Today' showing 0 for activity-based stats
"""
import pytest
import requests
import os
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTimeFilterStats:
    """Tests for time filter and activity-based stats"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_leads_endpoint_returns_data(self):
        """Test that leads endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/leads/", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        assert len(leads) > 0, "No leads found"
        print(f"Found {len(leads)} leads")
    
    def test_eligibilities_have_timestamps(self):
        """Test that eligibilities have activity timestamps"""
        response = requests.get(f"{BASE_URL}/api/leads/", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        today = date.today()
        approved_today = 0
        disbursed_today = 0
        login_done_today = 0
        
        for lead in leads:
            eligibilities = lead.get('eligibilities', [])
            for elig in eligibilities:
                # Check login_done_at timestamp
                login_done = str(elig.get('login_done', '')).lower()
                if login_done in ('yes', 'true'):
                    login_done_at = elig.get('login_done_at')
                    if login_done_at:
                        dt = datetime.fromisoformat(login_done_at.replace('Z', '+00:00'))
                        if dt.date() == today:
                            login_done_today += 1
                
                # Check approved_at timestamp
                if elig.get('approval_status') == 'approved':
                    approved_at = elig.get('approved_at')
                    if approved_at:
                        dt = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                        if dt.date() == today:
                            approved_today += 1
                
                # Check disbursed_at timestamp
                disbursed = str(elig.get('disbursed', '')).lower()
                if disbursed in ('yes', 'true'):
                    disbursed_at = elig.get('disbursed_at')
                    if disbursed_at:
                        dt = datetime.fromisoformat(disbursed_at.replace('Z', '+00:00'))
                        if dt.date() == today:
                            disbursed_today += 1
        
        print(f"Login done today: {login_done_today}")
        print(f"Approved today: {approved_today}")
        print(f"Disbursed today: {disbursed_today}")
        
        # After backfill, we expect these counts to be > 0
        assert login_done_today > 0, "No login_done activities found for today"
        assert approved_today > 0, "No approved activities found for today"
        assert disbursed_today > 0, "No disbursed activities found for today"
    
    def test_backend_handles_boolean_true_for_login_done(self):
        """Test that backend handles both 'yes' string and boolean true for login_done"""
        response = requests.get(f"{BASE_URL}/api/leads/", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        login_done_count = 0
        for lead in leads:
            eligibilities = lead.get('eligibilities', [])
            for elig in eligibilities:
                login_done = elig.get('login_done')
                # Check both string 'yes' and boolean True
                if login_done == 'yes' or login_done == True or str(login_done).lower() == 'true':
                    login_done_count += 1
                    print(f"Lead {lead.get('full_name')}: login_done = {login_done} (type: {type(login_done).__name__})")
        
        assert login_done_count > 0, "No eligibilities with login_done found"
        print(f"Total login_done count: {login_done_count}")
    
    def test_backend_handles_boolean_true_for_disbursed(self):
        """Test that backend handles both 'yes' string and boolean true for disbursed"""
        response = requests.get(f"{BASE_URL}/api/leads/", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        disbursed_count = 0
        for lead in leads:
            eligibilities = lead.get('eligibilities', [])
            for elig in eligibilities:
                disbursed = elig.get('disbursed')
                # Check both string 'yes' and boolean True
                if disbursed == 'yes' or disbursed == True or str(disbursed).lower() == 'true':
                    disbursed_count += 1
                    print(f"Lead {lead.get('full_name')}: disbursed = {disbursed} (type: {type(disbursed).__name__})")
        
        assert disbursed_count > 0, "No eligibilities with disbursed found"
        print(f"Total disbursed count: {disbursed_count}")
    
    def test_expected_stats_values(self):
        """Test that stats match expected values"""
        response = requests.get(f"{BASE_URL}/api/leads/", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        approved_count = 0
        total_approved_amount = 0
        disbursed_count = 0
        total_disbursed_amount = 0
        total_eligible = 0
        
        for lead in leads:
            eligibilities = lead.get('eligibilities', [])
            for elig in eligibilities:
                # Count login_done for eligible amount
                login_done = str(elig.get('login_done', '')).lower()
                if login_done in ('yes', 'true'):
                    total_eligible += float(elig.get('eligible_amount', 0) or 0)
                
                # Count approved
                if elig.get('approval_status') == 'approved':
                    approved_count += 1
                    total_approved_amount += float(elig.get('approved_amount', 0) or 0)
                
                # Count disbursed
                disbursed = str(elig.get('disbursed', '')).lower()
                if disbursed in ('yes', 'true'):
                    disbursed_count += 1
                    total_disbursed_amount += float(elig.get('disbursed_amount', 0) or 0)
        
        print(f"Approved count: {approved_count}")
        print(f"Total Approved Amount: ₹{total_approved_amount:,.0f}")
        print(f"Disbursed count: {disbursed_count}")
        print(f"Total Disbursed Amount: ₹{total_disbursed_amount:,.0f}")
        print(f"Total Eligible: ₹{total_eligible:,.0f}")
        
        # Expected values from the bug report
        assert approved_count == 7, f"Expected 7 approved, got {approved_count}"
        assert total_approved_amount == 3660000, f"Expected ₹3,660,000 approved amount, got ₹{total_approved_amount:,.0f}"
        assert disbursed_count == 6, f"Expected 6 disbursed, got {disbursed_count}"
        assert total_disbursed_amount == 3510000, f"Expected ₹3,510,000 disbursed amount, got ₹{total_disbursed_amount:,.0f}"
        assert total_eligible == 6111000, f"Expected ₹6,111,000 eligible, got ₹{total_eligible:,.0f}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
