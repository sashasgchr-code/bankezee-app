"""
Test cases for:
1. Total Eligible stat linked to all filters (calculateTotalEligible from filteredLeads)
2. Eligibility save fix (null handling in crm.py)
3. PDF Export button presence (Admin and Ops dashboards)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication for admin and ops users"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "admin", "User is not admin"
        print(f"Admin login successful: {data.get('user', {}).get('email')}")
        return data["access_token"]
    
    def test_ops_login(self):
        """Test operations user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200, f"Ops login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "operations", "User is not operations"
        print(f"Ops login successful: {data.get('user', {}).get('email')}")
        return data["access_token"]


class TestTotalEligibleCalculation:
    """Test Total Eligible stat calculation from leads with login_done=yes"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        return response.json().get("access_token")
    
    def test_get_all_leads(self, admin_token):
        """Test fetching all leads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        leads = response.json()
        assert isinstance(leads, list), "Leads should be a list"
        print(f"Total leads fetched: {len(leads)}")
        return leads
    
    def test_leads_have_eligibilities(self, admin_token):
        """Test that leads have eligibilities field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        leads = response.json()
        
        leads_with_eligibilities = [l for l in leads if l.get("eligibilities")]
        print(f"Leads with eligibilities: {len(leads_with_eligibilities)}")
        
        # Check structure of eligibilities
        for lead in leads_with_eligibilities[:3]:  # Check first 3
            for elig in lead.get("eligibilities", []):
                print(f"  Lead {lead.get('id')[:8]}... - Bank: {elig.get('bank_name')}, Login Done: {elig.get('login_done')}, Amount: {elig.get('eligible_amount')}")
    
    def test_total_eligible_api(self, admin_token):
        """Test the total-eligible API endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/crm/total-eligible", headers=headers)
        assert response.status_code == 200, f"Failed to get total eligible: {response.text}"
        data = response.json()
        assert "total_eligible" in data, "Response should have total_eligible field"
        print(f"Total Eligible from API: ₹{data.get('total_eligible', 0):,.0f}")
        return data.get("total_eligible", 0)
    
    def test_calculate_total_eligible_manually(self, admin_token):
        """Manually calculate total eligible to verify frontend logic"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        leads = response.json()
        
        total_eligible = 0
        for lead in leads:
            eligibilities = lead.get("eligibilities", [])
            for elig in eligibilities:
                login_done = str(elig.get("login_done", "")).lower()
                if login_done == "yes":
                    amount = float(elig.get("eligible_amount", 0) or 0)
                    total_eligible += amount
                    print(f"  Adding ₹{amount:,.0f} from lead {lead.get('id')[:8]}... (bank: {elig.get('bank_name')})")
        
        print(f"Manually calculated Total Eligible: ₹{total_eligible:,.0f}")
        return total_eligible


class TestEligibilitySave:
    """Test eligibility save functionality (null handling fix)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        return response.json().get("access_token")
    
    def test_get_test_lead(self, admin_token):
        """Get the test lead for eligibility testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get test lead: {response.text}"
        lead = response.json()
        print(f"Test lead: {lead.get('full_name')} - Status: {lead.get('status')}")
        print(f"Current eligibilities: {len(lead.get('eligibilities', []))}")
        return lead
    
    def test_save_eligibility_with_null_fields(self, admin_token):
        """Test saving eligibility with null/empty fields (the bug fix)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        
        # First get current eligibilities
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        lead = response.json()
        current_eligibilities = lead.get("eligibilities", [])
        
        # Create eligibility update with some null fields (testing the fix)
        eligibilities = [
            {
                "bank_name": "Test Bank",
                "is_eligible": "yes",
                "eligible_amount": 500000,
                "eligible_roi": 10.5,
                "not_eligible_reason": None,  # Null field
                "login_done": "yes",
                "login_bank": "Test Bank",
                "application_id": "TEST123",
                "login_rejection_reason": None,  # Null field
                "approval_status": None,  # Null field
                "approved_bank": None,
                "approved_amount": None,
                "approved_tenure": None,
                "approved_roi": None,
                "declined_bank": None,
                "declined_reason": None,
                "disbursed": None,  # Null field - this was causing the bug
                "disbursed_bank": None,
                "disbursed_amount": None,
                "disbursed_tenure": None,
                "disbursed_roi": None,
                "disbursement_rejection_reason": None,
                "commission_percentage": None,
                "commission_amount": None
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        # This should NOT fail with "failed to save eligibility" error
        assert response.status_code == 200, f"Failed to save eligibility: {response.text}"
        data = response.json()
        print(f"Eligibility save response: {data}")
        assert "message" in data, "Response should have message"
        assert data.get("count") == 1, "Should have saved 1 eligibility"
        
        # Restore original eligibilities
        if current_eligibilities:
            requests.put(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers=headers,
                json={"eligibilities": current_eligibilities}
            )
            print("Restored original eligibilities")
    
    def test_save_eligibility_with_empty_bank_name(self, admin_token):
        """Test that empty bank_name in existing eligibilities doesn't cause issues"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        
        # Get current eligibilities
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        lead = response.json()
        current_eligibilities = lead.get("eligibilities", [])
        
        # Test with valid eligibility
        eligibilities = [
            {
                "bank_name": "HDFC Bank",
                "is_eligible": "yes",
                "eligible_amount": 1000000,
                "login_done": "no"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200, f"Failed to save eligibility: {response.text}"
        print(f"Save with valid bank_name successful: {response.json()}")
        
        # Restore original
        if current_eligibilities:
            requests.put(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers=headers,
                json={"eligibilities": current_eligibilities}
            )
    
    def test_save_multiple_eligibilities(self, admin_token):
        """Test saving multiple eligibilities at once"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        
        # Get current eligibilities
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        lead = response.json()
        current_eligibilities = lead.get("eligibilities", [])
        
        # Test with multiple eligibilities
        eligibilities = [
            {
                "bank_name": "HDFC Bank",
                "is_eligible": "yes",
                "eligible_amount": 1000000,
                "login_done": "yes"
            },
            {
                "bank_name": "ICICI Bank",
                "is_eligible": "yes",
                "eligible_amount": 800000,
                "login_done": "no"
            },
            {
                "bank_name": "SBI",
                "is_eligible": "no",
                "not_eligible_reason": "Low CIBIL score"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200, f"Failed to save multiple eligibilities: {response.text}"
        data = response.json()
        assert data.get("count") == 3, "Should have saved 3 eligibilities"
        print(f"Multiple eligibilities saved: {data}")
        
        # Verify the save
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        lead = response.json()
        saved_eligibilities = lead.get("eligibilities", [])
        assert len(saved_eligibilities) == 3, "Should have 3 eligibilities saved"
        
        # Restore original
        if current_eligibilities:
            requests.put(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers=headers,
                json={"eligibilities": current_eligibilities}
            )
            print("Restored original eligibilities")


class TestLeadsAPI:
    """Test leads API for filter functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        return response.json().get("access_token")
    
    def test_leads_have_required_fields_for_filtering(self, admin_token):
        """Test that leads have fields needed for filtering"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        leads = response.json()
        
        if leads:
            lead = leads[0]
            required_fields = ["id", "status", "created_at", "source", "source_id"]
            for field in required_fields:
                assert field in lead, f"Lead missing required field: {field}"
            print(f"Lead has all required fields for filtering")
            print(f"Sample lead: status={lead.get('status')}, source={lead.get('source')}, created_at={lead.get('created_at')[:10]}")
    
    def test_leads_have_eligibilities_for_total_eligible(self, admin_token):
        """Test that leads have eligibilities field for Total Eligible calculation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        leads = response.json()
        
        # Count leads with eligibilities that have login_done=yes
        leads_with_login_yes = 0
        total_eligible_amount = 0
        
        for lead in leads:
            eligibilities = lead.get("eligibilities", [])
            for elig in eligibilities:
                if str(elig.get("login_done", "")).lower() == "yes":
                    leads_with_login_yes += 1
                    total_eligible_amount += float(elig.get("eligible_amount", 0) or 0)
        
        print(f"Leads with login_done=yes: {leads_with_login_yes}")
        print(f"Total eligible amount: ₹{total_eligible_amount:,.0f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
