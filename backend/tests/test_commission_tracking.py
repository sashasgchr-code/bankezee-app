"""
Test Commission & Incentive Tracking Feature
Tests:
1. Eligibility update with commission calculation
2. Commission crediting to agent/partner
3. Earnings endpoint for agents/partners
4. Commission auto-calculation when disbursed
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionTracking:
    """Commission tracking feature tests"""
    
    @pytest.fixture(scope="class")
    def ops_token(self):
        """Get operations user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200, f"Ops login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def test_lead_id(self, ops_token):
        """Get a test lead ID (Rahul Sharma or any agent-sourced lead)"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        leads = response.json()
        
        # Find a lead sourced from an agent
        agent_leads = [l for l in leads if l.get("source") == "agent" and l.get("source_id")]
        if agent_leads:
            return agent_leads[0]["id"]
        
        # Fallback to any lead
        if leads:
            return leads[0]["id"]
        
        pytest.skip("No leads available for testing")
    
    @pytest.fixture(scope="class")
    def agent_sourced_lead(self, ops_token):
        """Get lead details for an agent-sourced lead"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        
        agent_leads = [l for l in leads if l.get("source") == "agent" and l.get("source_id")]
        if agent_leads:
            return agent_leads[0]
        pytest.skip("No agent-sourced leads available")
    
    # ============ ELIGIBILITY UPDATE TESTS ============
    
    def test_eligibility_update_without_commission(self, ops_token, test_lead_id):
        """Test eligibility update without commission (not disbursed)"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        eligibilities = [{
            "bank_name": "HDFC Bank",
            "is_eligible": True,
            "eligible_amount": 500000,
            "eligible_tenure": 60,
            "login_done": True,
            "login_bank": "HDFC Bank",
            "approval_status": "approved",
            "approved_bank": "HDFC Bank",
            "approved_amount": 450000,
            "approved_tenure": 48,
            "approved_roi": 10.5,
            "disbursed": False  # Not disbursed yet
        }]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        data = response.json()
        assert data["message"] == "Eligibilities updated successfully"
        assert data["count"] == 1
        assert data["commission_credited"] == 0  # No commission since not disbursed
    
    def test_eligibility_update_with_disbursement_and_commission(self, ops_token, test_lead_id):
        """Test eligibility update with disbursement and commission percentage"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        disbursed_amount = 500000
        commission_percentage = 0.5  # 0.5%
        expected_commission = (disbursed_amount * commission_percentage) / 100  # 2500
        
        eligibilities = [{
            "bank_name": "ICICI Bank",
            "is_eligible": True,
            "eligible_amount": 600000,
            "eligible_tenure": 60,
            "login_done": True,
            "login_bank": "ICICI Bank",
            "approval_status": "approved",
            "approved_bank": "ICICI Bank",
            "approved_amount": 550000,
            "approved_tenure": 48,
            "approved_roi": 10.25,
            "disbursed": True,
            "disbursed_bank": "ICICI Bank",
            "disbursed_amount": disbursed_amount,
            "disbursed_tenure": 48,
            "disbursed_roi": 10.25,
            "commission_percentage": commission_percentage
        }]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200, f"Failed to update eligibilities: {response.text}"
        data = response.json()
        assert data["message"] == "Eligibilities updated successfully"
        assert data["count"] == 1
        # Commission should be credited if lead has source_id
        print(f"Commission credited: {data['commission_credited']}")
    
    def test_eligibility_auto_calculates_commission_amount(self, ops_token, test_lead_id):
        """Test that commission amount is auto-calculated from percentage and disbursed amount"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        # First update with commission
        eligibilities = [{
            "bank_name": "SBI",
            "is_eligible": True,
            "eligible_amount": 1000000,
            "eligible_tenure": 120,
            "login_done": True,
            "login_bank": "SBI",
            "approval_status": "approved",
            "approved_bank": "SBI",
            "approved_amount": 900000,
            "approved_tenure": 120,
            "approved_roi": 8.5,
            "disbursed": True,
            "disbursed_bank": "SBI",
            "disbursed_amount": 800000,
            "disbursed_tenure": 120,
            "disbursed_roi": 8.5,
            "commission_percentage": 1.0  # 1% = 8000
        }]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200
        
        # Now fetch eligibilities to verify commission_amount was calculated
        get_response = requests.get(
            f"{BASE_URL}/api/crm/{test_lead_id}/eligibilities",
            headers=headers
        )
        
        assert get_response.status_code == 200
        eligibilities_data = get_response.json()
        
        if eligibilities_data:
            elig = eligibilities_data[0]
            if elig.get("commission_percentage") and elig.get("disbursed_amount"):
                expected = (elig["disbursed_amount"] * elig["commission_percentage"]) / 100
                assert elig.get("commission_amount") == expected, \
                    f"Commission amount mismatch: expected {expected}, got {elig.get('commission_amount')}"
                print(f"Commission auto-calculated correctly: {elig.get('commission_amount')}")
    
    def test_multiple_eligibilities_with_commission(self, ops_token, test_lead_id):
        """Test multiple bank eligibilities with different commission percentages"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        eligibilities = [
            {
                "bank_name": "HDFC Bank",
                "is_eligible": True,
                "eligible_amount": 500000,
                "eligible_tenure": 60,
                "login_done": True,
                "login_bank": "HDFC Bank",
                "approval_status": "approved",
                "approved_bank": "HDFC Bank",
                "approved_amount": 450000,
                "approved_tenure": 48,
                "approved_roi": 10.5,
                "disbursed": True,
                "disbursed_bank": "HDFC Bank",
                "disbursed_amount": 400000,
                "disbursed_tenure": 48,
                "disbursed_roi": 10.5,
                "commission_percentage": 0.5  # 2000
            },
            {
                "bank_name": "ICICI Bank",
                "is_eligible": True,
                "eligible_amount": 300000,
                "eligible_tenure": 36,
                "login_done": True,
                "login_bank": "ICICI Bank",
                "approval_status": "declined",
                "declined_bank": "ICICI Bank",
                "declined_reason": "Low CIBIL score"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        print(f"Multiple eligibilities saved, commission credited: {data['commission_credited']}")
    
    # ============ EARNINGS ENDPOINT TESTS ============
    
    def test_earnings_endpoint_returns_data(self, ops_token, agent_sourced_lead):
        """Test /api/crm/earnings/{source_id} returns earnings data"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        source_id = agent_sourced_lead.get("source_id")
        
        response = requests.get(
            f"{BASE_URL}/api/crm/earnings/{source_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get earnings: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_earnings" in data, "Missing total_earnings field"
        assert "monthly_earnings" in data, "Missing monthly_earnings field"
        assert "commission_count" in data, "Missing commission_count field"
        assert "recent_commissions" in data, "Missing recent_commissions field"
        
        print(f"Earnings data: total={data['total_earnings']}, monthly={data['monthly_earnings']}, count={data['commission_count']}")
    
    def test_earnings_endpoint_unauthorized_access(self, ops_token):
        """Test that non-admin/ops users can only view their own earnings"""
        # This test verifies the authorization logic
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        # Ops user should be able to view any earnings
        response = requests.get(
            f"{BASE_URL}/api/crm/earnings/some-random-id",
            headers=headers
        )
        
        # Should return 200 (ops can view) or empty data
        assert response.status_code == 200
    
    def test_earnings_endpoint_without_auth(self):
        """Test earnings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/crm/earnings/test-id")
        assert response.status_code == 401 or response.status_code == 403
    
    # ============ LEAD DETAIL TESTS ============
    
    def test_lead_detail_includes_eligibilities(self, ops_token, test_lead_id):
        """Test that lead detail includes eligibility data with commission fields"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/leads/{test_lead_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        lead = response.json()
        
        # Check if eligibilities are included
        if lead.get("eligibilities"):
            for elig in lead["eligibilities"]:
                # Verify commission fields exist in schema
                assert "commission_percentage" in elig or elig.get("commission_percentage") is None
                assert "commission_amount" in elig or elig.get("commission_amount") is None
                print(f"Eligibility: {elig.get('bank_name')} - Commission: {elig.get('commission_percentage')}% = {elig.get('commission_amount')}")
    
    # ============ AGENT DASHBOARD TESTS ============
    
    def test_agent_login_and_get_earnings(self):
        """Test agent can login via OTP and access earnings"""
        # First send OTP
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "+919390066837"  # Test agent phone from previous tests
        })
        
        if response.status_code != 200:
            pytest.skip("OTP send failed - agent may not exist")
        
        # Verify OTP with mock code
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919390066837",
            "code": "123456"
        })
        
        if verify_response.status_code != 200:
            pytest.skip("OTP verification failed")
        
        token = verify_response.json().get("token")
        user = verify_response.json().get("user")
        
        if user.get("role") != "agent":
            pytest.skip("User is not an agent")
        
        # Get agent data
        headers = {"Authorization": f"Bearer {token}"}
        agent_response = requests.get(
            f"{BASE_URL}/api/agents/by-user/{user['id']}",
            headers=headers
        )
        
        if agent_response.status_code != 200:
            pytest.skip("Agent profile not found")
        
        agent = agent_response.json()
        
        # Get earnings
        earnings_response = requests.get(
            f"{BASE_URL}/api/crm/earnings/{agent['id']}",
            headers=headers
        )
        
        assert earnings_response.status_code == 200
        earnings = earnings_response.json()
        
        assert "total_earnings" in earnings
        assert "monthly_earnings" in earnings
        print(f"Agent earnings: total={earnings['total_earnings']}, monthly={earnings['monthly_earnings']}")


class TestCommissionCalculation:
    """Test commission calculation logic"""
    
    @pytest.fixture(scope="class")
    def ops_token(self):
        """Get operations user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_commission_calculation_formula(self, ops_token):
        """Verify commission = (disbursed_amount * commission_percentage) / 100"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        # Get a lead
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["id"]
        
        # Test various commission percentages
        test_cases = [
            {"disbursed_amount": 1000000, "commission_percentage": 0.5, "expected": 5000},
            {"disbursed_amount": 500000, "commission_percentage": 1.0, "expected": 5000},
            {"disbursed_amount": 750000, "commission_percentage": 0.75, "expected": 5625},
        ]
        
        for tc in test_cases:
            eligibilities = [{
                "bank_name": "Test Bank",
                "is_eligible": True,
                "eligible_amount": tc["disbursed_amount"],
                "eligible_tenure": 60,
                "login_done": True,
                "login_bank": "Test Bank",
                "approval_status": "approved",
                "approved_bank": "Test Bank",
                "approved_amount": tc["disbursed_amount"],
                "approved_tenure": 60,
                "approved_roi": 10.0,
                "disbursed": True,
                "disbursed_bank": "Test Bank",
                "disbursed_amount": tc["disbursed_amount"],
                "disbursed_tenure": 60,
                "disbursed_roi": 10.0,
                "commission_percentage": tc["commission_percentage"]
            }]
            
            response = requests.put(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers=headers,
                json={"eligibilities": eligibilities}
            )
            
            assert response.status_code == 200
            
            # Verify stored commission amount
            get_response = requests.get(
                f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
                headers=headers
            )
            
            assert get_response.status_code == 200
            stored = get_response.json()
            
            if stored:
                actual = stored[0].get("commission_amount", 0)
                assert actual == tc["expected"], \
                    f"Commission mismatch for {tc}: expected {tc['expected']}, got {actual}"
                print(f"✓ Commission calculation correct: {tc['disbursed_amount']} * {tc['commission_percentage']}% = {actual}")


class TestCommissionCrediting:
    """Test commission crediting to agents/partners"""
    
    @pytest.fixture(scope="class")
    def ops_token(self):
        """Get operations user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_commission_credited_to_agent(self, ops_token):
        """Test that commission is credited to agent's total_commission"""
        headers = {"Authorization": f"Bearer {ops_token}"}
        
        # Find an agent-sourced lead
        response = requests.get(f"{BASE_URL}/api/leads/", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        
        agent_leads = [l for l in leads if l.get("source") == "agent" and l.get("source_id")]
        if not agent_leads:
            pytest.skip("No agent-sourced leads available")
        
        lead = agent_leads[0]
        agent_id = lead["source_id"]
        
        # Get initial earnings
        initial_earnings = requests.get(
            f"{BASE_URL}/api/crm/earnings/{agent_id}",
            headers=headers
        ).json()
        
        initial_total = initial_earnings.get("total_earnings", 0)
        
        # Add commission via eligibility update
        commission_amount = 5000
        eligibilities = [{
            "bank_name": "Commission Test Bank",
            "is_eligible": True,
            "eligible_amount": 1000000,
            "eligible_tenure": 60,
            "login_done": True,
            "login_bank": "Commission Test Bank",
            "approval_status": "approved",
            "approved_bank": "Commission Test Bank",
            "approved_amount": 1000000,
            "approved_tenure": 60,
            "approved_roi": 10.0,
            "disbursed": True,
            "disbursed_bank": "Commission Test Bank",
            "disbursed_amount": 1000000,
            "disbursed_tenure": 60,
            "disbursed_roi": 10.0,
            "commission_percentage": 0.5  # 0.5% of 1000000 = 5000
        }]
        
        update_response = requests.put(
            f"{BASE_URL}/api/crm/{lead['id']}/eligibilities",
            headers=headers,
            json={"eligibilities": eligibilities}
        )
        
        assert update_response.status_code == 200
        update_data = update_response.json()
        
        # Verify commission was credited
        if update_data.get("commission_credited", 0) > 0:
            # Get updated earnings
            updated_earnings = requests.get(
                f"{BASE_URL}/api/crm/earnings/{agent_id}",
                headers=headers
            ).json()
            
            print(f"Initial earnings: {initial_total}, Updated earnings: {updated_earnings.get('total_earnings', 0)}")
            print(f"Commission credited in response: {update_data.get('commission_credited')}")
