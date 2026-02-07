"""
Backend tests for Bankezee CRM - Lead Assignment and Operations Dashboard
Tests: Lead assignment API, Operations team endpoint, Admin/Operations login
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@bankezee.com"
ADMIN_PASSWORD = "admin123"
OPS_EMAIL = "ops@bankezee.com"
OPS_PASSWORD = "ops123"
OPS_USER_ID = "d4dad061-7403-4e38-bb06-b3cdf277237b"


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["email"] == ADMIN_EMAIL
        
        print(f"✓ Admin login successful: {data['user']['full_name']}")
        return data
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid admin password correctly rejected")


class TestOperationsLogin:
    """Operations team authentication tests"""
    
    def test_operations_login_success(self):
        """Test operations user login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPS_EMAIL,
            "password": OPS_PASSWORD
        })
        assert response.status_code == 200, f"Operations login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        assert data["user"]["role"] == "operations", f"Expected operations role, got {data['user']['role']}"
        assert data["user"]["email"] == OPS_EMAIL
        assert data["user"]["id"] == OPS_USER_ID, f"User ID mismatch"
        
        print(f"✓ Operations login successful: {data['user']['full_name']}")
        return data
    
    def test_operations_login_invalid_password(self):
        """Test operations login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPS_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid operations password correctly rejected")


class TestOperationsTeamEndpoint:
    """Operations team list endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def ops_token(self):
        """Get operations authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPS_EMAIL,
            "password": OPS_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Operations authentication failed")
    
    def test_get_operations_team_as_admin(self, admin_token):
        """Test getting operations team list as admin"""
        response = requests.get(
            f"{BASE_URL}/api/crm/operations-team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get ops team failed: {response.text}"
        data = response.json()
        
        # Validate response is a list
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Operations team should have at least one member"
        
        # Validate team member structure
        for member in data:
            assert "id" in member, "Member ID missing"
            assert "full_name" in member, "Member full_name missing"
            assert "email" in member, "Member email missing"
        
        # Verify our ops user is in the list
        ops_ids = [m["id"] for m in data]
        assert OPS_USER_ID in ops_ids, f"Operations user {OPS_USER_ID} not in team list"
        
        print(f"✓ Operations team retrieved: {len(data)} members")
        for m in data:
            print(f"  - {m['full_name']} ({m['email']})")
    
    def test_get_operations_team_as_operations(self, ops_token):
        """Test getting operations team list as operations user"""
        response = requests.get(
            f"{BASE_URL}/api/crm/operations-team",
            headers={"Authorization": f"Bearer {ops_token}"}
        )
        assert response.status_code == 200, f"Get ops team failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Operations user can access team list: {len(data)} members")
    
    def test_get_operations_team_unauthorized(self):
        """Test getting operations team without auth"""
        response = requests.get(f"{BASE_URL}/api/crm/operations-team")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")


class TestLeadAssignment:
    """Lead assignment endpoint tests"""
    
    @pytest.fixture
    def admin_auth(self):
        """Get admin authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "headers": {"Authorization": f"Bearer {data['token']}"}
            }
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def ops_auth(self):
        """Get operations authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPS_EMAIL,
            "password": OPS_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "headers": {"Authorization": f"Bearer {data['token']}"}
            }
        pytest.skip("Operations authentication failed")
    
    @pytest.fixture
    def test_lead_id(self, admin_auth):
        """Get or create a test lead for assignment"""
        # First try to find an existing unassigned lead
        response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers=admin_auth["headers"]
        )
        if response.status_code == 200:
            leads = response.json()
            # Find an unassigned lead or any lead
            for lead in leads:
                if not lead.get("assigned_to"):
                    return lead["id"]
            # If all assigned, use the first one
            if leads:
                return leads[0]["id"]
        
        # Create a new test lead
        import uuid
        response = requests.post(
            f"{BASE_URL}/api/leads/",
            headers=admin_auth["headers"],
            json={
                "full_name": f"TEST_Assignment_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91{uuid.uuid4().int % 10000000000:010d}",
                "city": "Mumbai",
                "employment_type": "salaried",
                "requirement": "home_loan"
            }
        )
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Could not get or create test lead")
    
    def test_assign_lead_as_admin(self, admin_auth, test_lead_id):
        """Test assigning a lead as admin"""
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/assign",
            headers=admin_auth["headers"],
            json={"assigned_to": OPS_USER_ID}
        )
        assert response.status_code == 200, f"Lead assignment failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "message" in data, "Message missing in response"
        assert "assigned_to" in data, "assigned_to missing in response"
        assert data["assigned_to"] == OPS_USER_ID
        
        print(f"✓ Lead assigned successfully: {data['message']}")
        
        # Verify assignment persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/leads/{test_lead_id}",
            headers=admin_auth["headers"]
        )
        assert verify_response.status_code == 200
        lead_data = verify_response.json()
        assert lead_data["assigned_to"] == OPS_USER_ID, "Assignment not persisted"
        
        # Verify activity was logged
        assert len(lead_data.get("activities", [])) > 0, "Activity not logged"
        latest_activity = lead_data["activities"][-1]
        assert latest_activity["type"] == "assignment", "Activity type should be assignment"
        
        print(f"✓ Assignment verified and activity logged")
    
    def test_assign_lead_as_operations(self, ops_auth, test_lead_id):
        """Test assigning a lead as operations user"""
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/assign",
            headers=ops_auth["headers"],
            json={"assigned_to": OPS_USER_ID}
        )
        assert response.status_code == 200, f"Lead assignment failed: {response.text}"
        print("✓ Operations user can assign leads")
    
    def test_assign_lead_invalid_assignee(self, admin_auth, test_lead_id):
        """Test assigning lead to non-existent user"""
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/assign",
            headers=admin_auth["headers"],
            json={"assigned_to": "invalid-user-id-12345"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid assignee correctly rejected")
    
    def test_assign_lead_to_non_operations(self, admin_auth, test_lead_id):
        """Test assigning lead to non-operations user (should fail)"""
        # Try to assign to admin user (not operations role)
        admin_id = admin_auth["user"]["id"]
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/assign",
            headers=admin_auth["headers"],
            json={"assigned_to": admin_id}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Assignment to non-operations user correctly rejected")
    
    def test_assign_lead_invalid_lead_id(self, admin_auth):
        """Test assigning non-existent lead"""
        response = requests.put(
            f"{BASE_URL}/api/crm/invalid-lead-id-12345/assign",
            headers=admin_auth["headers"],
            json={"assigned_to": OPS_USER_ID}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid lead ID correctly rejected")
    
    def test_assign_lead_unauthorized(self, test_lead_id):
        """Test assigning lead without auth"""
        response = requests.put(
            f"{BASE_URL}/api/crm/{test_lead_id}/assign",
            json={"assigned_to": OPS_USER_ID}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized assignment correctly rejected")


class TestOperationsDashboardData:
    """Tests for operations dashboard data retrieval"""
    
    @pytest.fixture
    def ops_auth(self):
        """Get operations authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPS_EMAIL,
            "password": OPS_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "headers": {"Authorization": f"Bearer {data['token']}"}
            }
        pytest.skip("Operations authentication failed")
    
    def test_operations_can_view_leads(self, ops_auth):
        """Test operations user can view leads"""
        response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers=ops_auth["headers"]
        )
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        leads = response.json()
        assert isinstance(leads, list), "Response should be a list"
        print(f"✓ Operations user can view leads: {len(leads)} total")
        
        # Check for assigned leads
        assigned_to_ops = [l for l in leads if l.get("assigned_to") == OPS_USER_ID]
        print(f"✓ Leads assigned to operations user: {len(assigned_to_ops)}")
    
    def test_operations_can_view_lead_detail(self, ops_auth):
        """Test operations user can view lead details"""
        # First get leads
        response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers=ops_auth["headers"]
        )
        if response.status_code == 200 and response.json():
            lead_id = response.json()[0]["id"]
            
            # Get lead detail
            detail_response = requests.get(
                f"{BASE_URL}/api/leads/{lead_id}",
                headers=ops_auth["headers"]
            )
            assert detail_response.status_code == 200, f"Get lead detail failed: {detail_response.text}"
            lead = detail_response.json()
            
            # Validate lead structure
            assert "id" in lead
            assert "full_name" in lead
            assert "status" in lead
            
            print(f"✓ Operations user can view lead detail: {lead['full_name']}")
        else:
            pytest.skip("No leads available to test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
