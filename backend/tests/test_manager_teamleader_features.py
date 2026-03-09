"""
Test Manager and Team Leader Dashboard Features
- System earnings endpoint access for manager and team_leader roles
- Lead detail page access for manager and team_leader roles
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MANAGER_CREDS = {"email": "test.manager@bankezee.com", "password": "manager123"}
TEAM_LEADER_CREDS = {"email": "test.teamlead@bankezee.com", "password": "teamlead123"}
ADMIN_CREDS = {"email": "admin@bankezee.com", "password": "admin123"}

# Test lead ID (existing lead in system)
TEST_LEAD_ID = "0683f437-c4df-4509-b1e6-d20017180102"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def manager_token(api_client):
    """Get Manager authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Manager authentication failed")


@pytest.fixture
def team_leader_token(api_client):
    """Get Team Leader authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEAM_LEADER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Team Leader authentication failed")


@pytest.fixture
def admin_token(api_client):
    """Get Admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


class TestManagerLogin:
    """Test Manager login and role verification"""
    
    def test_manager_login_success(self, api_client):
        """Manager can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "manager"
        assert data["user"]["email"] == MANAGER_CREDS["email"]
        print("PASS: Manager login successful")


class TestTeamLeaderLogin:
    """Test Team Leader login and role verification"""
    
    def test_team_leader_login_success(self, api_client):
        """Team Leader can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEAM_LEADER_CREDS)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "team_leader"
        assert data["user"]["email"] == TEAM_LEADER_CREDS["email"]
        print("PASS: Team Leader login successful")


class TestSystemEarningsEndpoint:
    """Test /api/crm/system-earnings endpoint access for different roles"""
    
    def test_manager_can_access_system_earnings(self, api_client, manager_token):
        """Manager can access system-earnings endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/crm/system-earnings",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_earnings" in data
        assert "monthly_earnings" in data
        assert "commission_count" in data
        assert isinstance(data["total_earnings"], (int, float))
        assert isinstance(data["monthly_earnings"], (int, float))
        print(f"PASS: Manager can access system-earnings - Total: {data['total_earnings']}, Monthly: {data['monthly_earnings']}")
    
    def test_team_leader_can_access_system_earnings(self, api_client, team_leader_token):
        """Team Leader can access system-earnings endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/crm/system-earnings",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_earnings" in data
        assert "monthly_earnings" in data
        assert "commission_count" in data
        assert isinstance(data["total_earnings"], (int, float))
        assert isinstance(data["monthly_earnings"], (int, float))
        print(f"PASS: Team Leader can access system-earnings - Total: {data['total_earnings']}, Monthly: {data['monthly_earnings']}")
    
    def test_unauthenticated_cannot_access_system_earnings(self, api_client):
        """Unauthenticated user cannot access system-earnings"""
        response = api_client.get(f"{BASE_URL}/api/crm/system-earnings")
        assert response.status_code == 401
        print("PASS: Unauthenticated user blocked from system-earnings")


class TestLeadDetailAccess:
    """Test lead detail page access for Manager and Team Leader"""
    
    def test_manager_can_access_lead_detail(self, api_client, manager_token):
        """Manager can access lead detail endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["id"] == TEST_LEAD_ID
        assert "full_name" in data
        assert "status" in data
        print(f"PASS: Manager can access lead detail - Lead: {data['full_name']}")
    
    def test_team_leader_can_access_lead_detail(self, api_client, team_leader_token):
        """Team Leader can access lead detail endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["id"] == TEST_LEAD_ID
        assert "full_name" in data
        assert "status" in data
        print(f"PASS: Team Leader can access lead detail - Lead: {data['full_name']}")


class TestHierarchyEndpoints:
    """Test hierarchy endpoints for Manager and Team Leader"""
    
    def test_manager_can_access_my_team(self, api_client, manager_token):
        """Manager can access /hierarchy/my-team endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/hierarchy/my-team",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "agents" in data
        assert "partners" in data
        assert "team_leaders" in data
        print(f"PASS: Manager can access my-team - TLs: {len(data['team_leaders'])}, Agents: {len(data['agents'])}, Partners: {len(data['partners'])}")
    
    def test_team_leader_can_access_my_team(self, api_client, team_leader_token):
        """Team Leader can access /hierarchy/my-team endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/hierarchy/my-team",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "agents" in data
        assert "partners" in data
        print(f"PASS: Team Leader can access my-team - Agents: {len(data['agents'])}, Partners: {len(data['partners'])}")
    
    def test_manager_can_access_my_leads(self, api_client, manager_token):
        """Manager can access /hierarchy/my-leads endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/hierarchy/my-leads",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Manager can access my-leads - Count: {len(data)}")
    
    def test_team_leader_can_access_my_leads(self, api_client, team_leader_token):
        """Team Leader can access /hierarchy/my-leads endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/hierarchy/my-leads",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Team Leader can access my-leads - Count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
