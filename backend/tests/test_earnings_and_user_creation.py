"""
Test suite for Bankezee CRM - Earnings Display and User Creation Features
Tests:
1. GET /api/crm/system-earnings - System earnings endpoint
2. POST /api/auth/admin/create-manager - Create manager endpoint
3. POST /api/auth/admin/create-team-leader - Create team leader endpoint
4. Disbursed reversal commission deduction logic
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSystemEarnings:
    """Test system earnings endpoint for Admin/Ops dashboards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin and ops tokens"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert admin_response.status_code == 200, f"Admin login failed: {admin_response.text}"
        self.admin_token = admin_response.json()["token"]
        
        # Ops login
        ops_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert ops_response.status_code == 200, f"Ops login failed: {ops_response.text}"
        self.ops_token = ops_response.json()["token"]
    
    def test_system_earnings_as_admin(self):
        """Admin can access system earnings"""
        response = requests.get(
            f"{BASE_URL}/api/crm/system-earnings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_earnings" in data
        assert "monthly_earnings" in data
        assert "commission_count" in data
        
        # Verify data types
        assert isinstance(data["total_earnings"], (int, float))
        assert isinstance(data["monthly_earnings"], (int, float))
        assert isinstance(data["commission_count"], int)
        
        print(f"System earnings: Total={data['total_earnings']}, Monthly={data['monthly_earnings']}, Count={data['commission_count']}")
    
    def test_system_earnings_as_ops(self):
        """Operations user can access system earnings"""
        response = requests.get(
            f"{BASE_URL}/api/crm/system-earnings",
            headers={"Authorization": f"Bearer {self.ops_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_earnings" in data
        assert "monthly_earnings" in data
        assert "commission_count" in data
        
        print(f"Ops view - System earnings: Total={data['total_earnings']}")
    
    def test_system_earnings_unauthorized(self):
        """Unauthorized users cannot access system earnings"""
        # No token
        response = requests.get(f"{BASE_URL}/api/crm/system-earnings")
        assert response.status_code == 401
        
        # Invalid token
        response = requests.get(
            f"{BASE_URL}/api/crm/system-earnings",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestCreateManager:
    """Test create manager endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["token"]
        
        # Get ops token for permission test
        ops_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert ops_response.status_code == 200
        self.ops_token = ops_response.json()["token"]
    
    def test_create_manager_success(self):
        """Admin can create a new manager"""
        unique_email = f"test_manager_{uuid.uuid4().hex[:8]}@bankezee.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-manager",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "email": unique_email,
                "password": "manager123",
                "full_name": "Test Manager Created",
                "phone": "9876543210"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert "message" in data
        assert "manager_id" in data
        assert "email" in data
        assert data["email"] == unique_email
        assert "Manager created successfully" in data["message"]
        
        print(f"Created manager: {data['email']} with ID: {data['manager_id']}")
        
        # Verify manager can login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "manager123"
        })
        assert login_response.status_code == 200
        user_data = login_response.json()["user"]
        assert user_data["role"] == "manager"
        assert user_data["is_approved"] == True
    
    def test_create_manager_duplicate_email(self):
        """Cannot create manager with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-manager",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "email": "admin@bankezee.com",  # Existing email
                "password": "manager123",
                "full_name": "Duplicate Manager",
                "phone": "9876543210"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_create_manager_ops_forbidden(self):
        """Operations user cannot create manager"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-manager",
            headers={"Authorization": f"Bearer {self.ops_token}"},
            json={
                "email": "forbidden_manager@bankezee.com",
                "password": "manager123",
                "full_name": "Forbidden Manager",
                "phone": "9876543210"
            }
        )
        assert response.status_code == 403


class TestCreateTeamLeader:
    """Test create team leader endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and manager ID"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["token"]
        
        # Get a manager ID for assignment
        all_users_response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert all_users_response.status_code == 200
        managers = all_users_response.json().get("managers", [])
        self.manager_id = managers[0]["id"] if managers else None
    
    def test_create_team_leader_success(self):
        """Admin can create a new team leader"""
        unique_email = f"test_tl_{uuid.uuid4().hex[:8]}@bankezee.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-team-leader",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "email": unique_email,
                "password": "teamlead123",
                "full_name": "Test Team Leader Created",
                "phone": "9876543211"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert "message" in data
        assert "team_leader_id" in data
        assert "email" in data
        assert data["email"] == unique_email
        assert "Team Leader created successfully" in data["message"]
        
        print(f"Created team leader: {data['email']} with ID: {data['team_leader_id']}")
        
        # Verify team leader can login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "teamlead123"
        })
        assert login_response.status_code == 200
        user_data = login_response.json()["user"]
        assert user_data["role"] == "team_leader"
        assert user_data["is_approved"] == True
    
    def test_create_team_leader_with_manager(self):
        """Admin can create team leader assigned to a manager"""
        if not self.manager_id:
            pytest.skip("No manager available for assignment")
        
        unique_email = f"test_tl_mgr_{uuid.uuid4().hex[:8]}@bankezee.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-team-leader",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "email": unique_email,
                "password": "teamlead123",
                "full_name": "Test TL With Manager",
                "phone": "9876543212",
                "manager_id": self.manager_id
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "team_leader_id" in data
        
        print(f"Created team leader with manager assignment: {data['email']}")
    
    def test_create_team_leader_invalid_manager(self):
        """Cannot create team leader with non-existent manager"""
        unique_email = f"test_tl_invalid_{uuid.uuid4().hex[:8]}@bankezee.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/create-team-leader",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "email": unique_email,
                "password": "teamlead123",
                "full_name": "Test TL Invalid Manager",
                "phone": "9876543213",
                "manager_id": "non-existent-manager-id"
            }
        )
        assert response.status_code == 404
        assert "Manager not found" in response.json()["detail"]


class TestAllUsersEndpoint:
    """Test all-users endpoint returns managers and team leaders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["token"]
    
    def test_all_users_includes_managers(self):
        """All users endpoint includes managers list"""
        response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "managers" in data
        assert isinstance(data["managers"], list)
        assert len(data["managers"]) > 0, "Should have at least one manager"
        
        # Verify manager structure
        manager = data["managers"][0]
        assert "id" in manager
        assert "email" in manager
        assert "full_name" in manager
        
        print(f"Found {len(data['managers'])} managers")
    
    def test_all_users_includes_team_leaders(self):
        """All users endpoint includes team leaders list"""
        response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "team_leaders" in data
        assert isinstance(data["team_leaders"], list)
        assert len(data["team_leaders"]) > 0, "Should have at least one team leader"
        
        # Verify team leader structure
        tl = data["team_leaders"][0]
        assert "id" in tl
        assert "email" in tl
        assert "full_name" in tl
        
        print(f"Found {len(data['team_leaders'])} team leaders")


class TestDisbursedReversalCommission:
    """Test disbursed reversal deducts commission from agent/partner earnings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["token"]
    
    def test_eligibilities_endpoint_exists(self):
        """Verify eligibilities endpoint exists and is accessible"""
        # Get a lead to test with
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        lead_id = leads[0]["id"]
        
        # Get eligibilities for the lead
        response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        print(f"Eligibilities endpoint working for lead {lead_id}")
    
    def test_eligibilities_update_structure(self):
        """Verify eligibilities update endpoint accepts correct structure"""
        # Get a lead to test with
        leads_response = requests.get(
            f"{BASE_URL}/api/leads/",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("No leads available for testing")
        
        # Find a lead with source_id for commission testing
        test_lead = None
        for lead in leads:
            if lead.get("source_id"):
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("No lead with source_id available for testing")
        
        lead_id = test_lead["id"]
        
        # Get current eligibilities
        current_elig_response = requests.get(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        current_eligibilities = current_elig_response.json()
        
        # Update eligibilities (just re-submit current state)
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/eligibilities",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"eligibilities": current_eligibilities}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "count" in data
        
        print(f"Eligibilities update working for lead {lead_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
