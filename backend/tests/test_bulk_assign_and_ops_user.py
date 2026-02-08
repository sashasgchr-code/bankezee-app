"""
Test cases for Bulk Lead Assignment and Add Ops User features
- POST /api/auth/create-ops-user - Admin creates new Operations user
- PUT /api/crm/bulk-assign - Admin bulk assigns leads to Ops team member
- GET /api/crm/operations-team - Get list of Ops team members
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCreateOpsUser:
    """Test cases for creating Operations team members"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_create_ops_user_success(self):
        """Admin can create a new Operations user"""
        unique_email = f"testops_{int(time.time())}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/create-ops-user",
            headers=self.headers,
            json={
                "email": unique_email,
                "password": "testpass123",
                "full_name": "Test Ops User",
                "phone": "+1234567890"
            }
        )
        assert response.status_code == 200, f"Create ops user failed: {response.text}"
        data = response.json()
        assert data["message"] == "Operations user created successfully"
        assert "user_id" in data
        assert data["email"] == unique_email
        assert data["full_name"] == "Test Ops User"
        
        # Store for cleanup
        self.created_user_id = data["user_id"]
        self.created_email = unique_email
    
    def test_new_ops_user_can_login(self):
        """Newly created Ops user can login immediately"""
        # First create a user
        unique_email = f"testops_login_{int(time.time())}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/auth/create-ops-user",
            headers=self.headers,
            json={
                "email": unique_email,
                "password": "testpass123",
                "full_name": "Test Ops Login User"
            }
        )
        assert create_response.status_code == 200
        
        # Now try to login with the new user
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": unique_email,
                "password": "testpass123"
            }
        )
        assert login_response.status_code == 200, f"New ops user login failed: {login_response.text}"
        data = login_response.json()
        assert "token" in data
        assert data["user"]["role"] == "operations"
        assert data["user"]["is_approved"] == True
    
    def test_create_ops_user_duplicate_email(self):
        """Cannot create ops user with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/create-ops-user",
            headers=self.headers,
            json={
                "email": "ops@bankezee.com",  # Existing ops user
                "password": "testpass123",
                "full_name": "Duplicate User"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_non_admin_cannot_create_ops_user(self):
        """Non-admin users cannot create ops users"""
        # Login as ops user
        ops_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert ops_login.status_code == 200
        ops_token = ops_login.json()["token"]
        
        response = requests.post(
            f"{BASE_URL}/api/auth/create-ops-user",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "email": "another@test.com",
                "password": "test123",
                "full_name": "Another User"
            }
        )
        assert response.status_code == 403
        assert "Only admins" in response.json()["detail"]
    
    def test_create_ops_user_without_auth(self):
        """Cannot create ops user without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/create-ops-user",
            json={
                "email": "noauth@test.com",
                "password": "test123",
                "full_name": "No Auth User"
            }
        )
        assert response.status_code == 401


class TestBulkLeadAssignment:
    """Test cases for bulk lead assignment feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get test data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Get ops team
        ops_response = requests.get(
            f"{BASE_URL}/api/crm/operations-team",
            headers=self.headers
        )
        assert ops_response.status_code == 200
        self.ops_team = ops_response.json()
        
        # Get leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers=self.headers
        )
        assert leads_response.status_code == 200
        self.leads = leads_response.json()
    
    def test_bulk_assign_success(self):
        """Admin can bulk assign multiple leads"""
        if len(self.leads) < 2:
            pytest.skip("Not enough leads for bulk assign test")
        if len(self.ops_team) < 1:
            pytest.skip("No ops team members available")
        
        lead_ids = [self.leads[0]["id"], self.leads[1]["id"]]
        ops_user_id = self.ops_team[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/bulk-assign",
            headers=self.headers,
            json={
                "lead_ids": lead_ids,
                "assigned_to": ops_user_id
            }
        )
        assert response.status_code == 200, f"Bulk assign failed: {response.text}"
        data = response.json()
        assert "assigned_count" in data
        assert data["assigned_count"] >= 0  # May be 0 if already assigned
        assert data["assigned_to"] == ops_user_id
    
    def test_bulk_assign_empty_leads(self):
        """Cannot bulk assign with empty lead list"""
        if len(self.ops_team) < 1:
            pytest.skip("No ops team members available")
        
        response = requests.put(
            f"{BASE_URL}/api/crm/bulk-assign",
            headers=self.headers,
            json={
                "lead_ids": [],
                "assigned_to": self.ops_team[0]["id"]
            }
        )
        assert response.status_code == 400
        assert "No leads selected" in response.json()["detail"]
    
    def test_bulk_assign_invalid_assignee(self):
        """Cannot bulk assign to non-existent user"""
        if len(self.leads) < 1:
            pytest.skip("No leads available")
        
        response = requests.put(
            f"{BASE_URL}/api/crm/bulk-assign",
            headers=self.headers,
            json={
                "lead_ids": [self.leads[0]["id"]],
                "assigned_to": "non-existent-user-id"
            }
        )
        assert response.status_code == 404
        assert "Assignee not found" in response.json()["detail"]
    
    def test_bulk_assign_to_non_ops_user(self):
        """Cannot bulk assign to non-operations user"""
        if len(self.leads) < 1:
            pytest.skip("No leads available")
        
        # Get admin user ID (not ops)
        admin_id = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        ).json()["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/crm/bulk-assign",
            headers=self.headers,
            json={
                "lead_ids": [self.leads[0]["id"]],
                "assigned_to": admin_id
            }
        )
        assert response.status_code == 400
        assert "Can only assign to operations" in response.json()["detail"]
    
    def test_non_admin_cannot_bulk_assign(self):
        """Non-admin users cannot bulk assign"""
        # Login as ops user
        ops_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert ops_login.status_code == 200
        ops_token = ops_login.json()["token"]
        
        if len(self.leads) < 1 or len(self.ops_team) < 1:
            pytest.skip("Not enough test data")
        
        response = requests.put(
            f"{BASE_URL}/api/crm/bulk-assign",
            headers={"Authorization": f"Bearer {ops_token}"},
            json={
                "lead_ids": [self.leads[0]["id"]],
                "assigned_to": self.ops_team[0]["id"]
            }
        )
        assert response.status_code == 403
        assert "Only admin" in response.json()["detail"]


class TestOperationsTeamEndpoint:
    """Test cases for operations team list endpoint"""
    
    def test_get_ops_team_as_admin(self):
        """Admin can get operations team list"""
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert login.status_code == 200
        
        response = requests.get(
            f"{BASE_URL}/api/crm/operations-team",
            headers={"Authorization": f"Bearer {login.json()['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify structure
        if len(data) > 0:
            assert "id" in data[0]
            assert "full_name" in data[0]
            assert "email" in data[0]
    
    def test_get_ops_team_as_ops(self):
        """Ops user can get operations team list"""
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert login.status_code == 200
        
        response = requests.get(
            f"{BASE_URL}/api/crm/operations-team",
            headers={"Authorization": f"Bearer {login.json()['token']}"}
        )
        assert response.status_code == 200
    
    def test_get_ops_team_without_auth(self):
        """Cannot get ops team without authentication"""
        response = requests.get(f"{BASE_URL}/api/crm/operations-team")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
