"""
Test suite for Hierarchical User Management System
Tests Manager/Team Leader roles, user mapping, dashboards, and password change
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@bankezee.com"
ADMIN_PASSWORD = "admin123"
MANAGER_EMAIL = "saikrishna@bankezee.com"
MANAGER_PASSWORD = "manager123"
TEAM_LEADER_EMAIL = "anusha@bankezee.com"
TEAM_LEADER_PASSWORD = "teamlead123"


class TestAuthenticationFlows:
    """Test login flows for Manager and Team Leader roles"""
    
    def test_manager_login_success(self):
        """Manager can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "manager"
        assert data["user"]["email"] == MANAGER_EMAIL
        assert data["user"]["full_name"] == "Saikrishna"
    
    def test_team_leader_login_success(self):
        """Team Leader can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEADER_EMAIL,
            "password": TEAM_LEADER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "team_leader"
        assert data["user"]["email"] == TEAM_LEADER_EMAIL
        assert data["user"]["full_name"] == "Anusha"
    
    def test_other_managers_login(self):
        """Other pre-created managers can login"""
        managers = [
            ("manmith@bankezee.com", "Manmith"),
            ("saikiran@bankezee.com", "Saikiran")
        ]
        for email, name in managers:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": MANAGER_PASSWORD
            })
            assert response.status_code == 200, f"Manager {name} login failed"
            assert response.json()["user"]["full_name"] == name
    
    def test_other_team_leaders_login(self):
        """Other pre-created team leaders can login"""
        team_leaders = [
            ("sravan@bankezee.com", "Sravan"),
            ("shivasai@bankezee.com", "Shiva Sai"),
            ("pinky@bankezee.com", "Pinky")
        ]
        for email, name in team_leaders:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": TEAM_LEADER_PASSWORD
            })
            assert response.status_code == 200, f"Team Leader {name} login failed"
            assert response.json()["user"]["full_name"] == name


class TestHierarchyEndpoints:
    """Test hierarchy management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def team_leader_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEADER_EMAIL,
            "password": TEAM_LEADER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_managers_list(self, admin_token):
        """Admin can get list of all managers"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/managers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        managers = response.json()
        assert isinstance(managers, list)
        assert len(managers) >= 3  # Saikrishna, Manmith, Saikiran
        
        # Verify manager data structure
        manager_names = [m["full_name"] for m in managers]
        assert "Saikrishna" in manager_names
        assert "Manmith" in manager_names
        assert "Saikiran" in manager_names
    
    def test_get_team_leaders_list(self, admin_token):
        """Admin can get list of all team leaders"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        team_leaders = response.json()
        assert isinstance(team_leaders, list)
        assert len(team_leaders) >= 4  # Anusha, Sravan, Shiva Sai, Pinky
        
        # Verify team leader data structure
        tl_names = [tl["full_name"] for tl in team_leaders]
        assert "Anusha" in tl_names
        assert "Sravan" in tl_names
        assert "Shiva Sai" in tl_names
        assert "Pinky" in tl_names
    
    def test_get_team_leaders_filtered_by_manager(self, admin_token):
        """Can filter team leaders by manager_id"""
        # First get Saikrishna's ID
        managers_response = requests.get(
            f"{BASE_URL}/api/hierarchy/managers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        saikrishna = next(m for m in managers_response.json() if m["full_name"] == "Saikrishna")
        
        # Get team leaders under Saikrishna
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders?manager_id={saikrishna['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        team_leaders = response.json()
        
        # Anusha should be under Saikrishna
        tl_names = [tl["full_name"] for tl in team_leaders]
        assert "Anusha" in tl_names
    
    def test_admin_all_users_includes_managers_and_team_leaders(self, admin_token):
        """Admin all-users endpoint returns managers and team leaders"""
        response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "managers" in data
        assert "team_leaders" in data
        assert len(data["managers"]) >= 3
        assert len(data["team_leaders"]) >= 4


class TestTeamLeaderMapping:
    """Test mapping Team Leaders to Managers"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_map_team_leader_to_manager(self, admin_token):
        """Admin can map a team leader to a manager"""
        # Get Sravan (unassigned TL) and Manmith (manager)
        managers_response = requests.get(
            f"{BASE_URL}/api/hierarchy/managers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        tl_response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        manmith = next(m for m in managers_response.json() if m["full_name"] == "Manmith")
        sravan = next(tl for tl in tl_response.json() if tl["full_name"] == "Sravan")
        
        # Map Sravan to Manmith
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-team-leader",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "team_leader_id": sravan["id"],
                "manager_id": manmith["id"]
            }
        )
        assert response.status_code == 200
        assert "successfully" in response.json()["message"].lower()
        
        # Verify mapping
        tl_response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders?manager_id={manmith['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        tl_names = [tl["full_name"] for tl in tl_response.json()]
        assert "Sravan" in tl_names
    
    def test_map_team_leader_invalid_manager(self, admin_token):
        """Mapping to non-existent manager fails"""
        tl_response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sravan = next(tl for tl in tl_response.json() if tl["full_name"] == "Sravan")
        
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-team-leader",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "team_leader_id": sravan["id"],
                "manager_id": "invalid-manager-id"
            }
        )
        assert response.status_code == 404
        assert "manager not found" in response.json()["detail"].lower()


class TestUserMapping:
    """Test mapping Agents/Partners to Manager and Team Leader"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_map_agent_to_manager(self, admin_token):
        """Admin can map an agent to a manager"""
        # Get all users to find an agent
        users_response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        agents = users_response.json()["agents"]
        managers = users_response.json()["managers"]
        
        if not agents:
            pytest.skip("No agents available for testing")
        
        agent = agents[0]
        saikrishna = next(m for m in managers if m["full_name"] == "Saikrishna")
        
        # Map agent to Saikrishna
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-user",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": agent["id"],
                "user_type": "agent",
                "manager_id": saikrishna["id"],
                "team_leader_id": None
            }
        )
        assert response.status_code == 200
        assert "successfully" in response.json()["message"].lower()
    
    def test_map_agent_to_manager_and_team_leader(self, admin_token):
        """Admin can map an agent to both manager and team leader"""
        users_response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        agents = users_response.json()["agents"]
        managers = users_response.json()["managers"]
        team_leaders = users_response.json()["team_leaders"]
        
        if not agents:
            pytest.skip("No agents available for testing")
        
        agent = agents[0]
        saikrishna = next(m for m in managers if m["full_name"] == "Saikrishna")
        anusha = next(tl for tl in team_leaders if tl["full_name"] == "Anusha")
        
        # Map agent to Saikrishna and Anusha
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-user",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": agent["id"],
                "user_type": "agent",
                "manager_id": saikrishna["id"],
                "team_leader_id": anusha["id"]
            }
        )
        assert response.status_code == 200
    
    def test_map_user_team_leader_must_be_under_manager(self, admin_token):
        """Team leader must be under the same manager when mapping"""
        users_response = requests.get(
            f"{BASE_URL}/api/auth/admin/all-users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        agents = users_response.json()["agents"]
        managers = users_response.json()["managers"]
        team_leaders = users_response.json()["team_leaders"]
        
        if not agents:
            pytest.skip("No agents available for testing")
        
        agent = agents[0]
        # Get a manager and a TL not under that manager
        saikiran = next(m for m in managers if m["full_name"] == "Saikiran")
        anusha = next(tl for tl in team_leaders if tl["full_name"] == "Anusha")  # Under Saikrishna
        
        # Try to map agent to Saikiran with Anusha (who is under Saikrishna)
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-user",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": agent["id"],
                "user_type": "agent",
                "manager_id": saikiran["id"],
                "team_leader_id": anusha["id"]
            }
        )
        assert response.status_code == 400
        assert "not under this manager" in response.json()["detail"].lower()


class TestManagerDashboard:
    """Test Manager dashboard endpoints"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        return response.json()["token"]
    
    def test_manager_my_team(self, manager_token):
        """Manager can see their team members"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/my-team",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "agents" in data
        assert "partners" in data
        assert "team_leaders" in data
        
        # Anusha should be in team leaders
        tl_names = [tl["full_name"] for tl in data["team_leaders"]]
        assert "Anusha" in tl_names
    
    def test_manager_my_leads(self, manager_token):
        """Manager can see leads from their team"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/my-leads",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestTeamLeaderDashboard:
    """Test Team Leader dashboard endpoints"""
    
    @pytest.fixture
    def team_leader_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEADER_EMAIL,
            "password": TEAM_LEADER_PASSWORD
        })
        return response.json()["token"]
    
    def test_team_leader_my_team(self, team_leader_token):
        """Team Leader can see their direct reports"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/my-team",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "agents" in data
        assert "partners" in data
        # Team leaders don't have team_leaders under them
        assert "team_leaders" not in data or len(data.get("team_leaders", [])) == 0
    
    def test_team_leader_my_leads(self, team_leader_token):
        """Team Leader can see leads from their direct reports"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/my-leads",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestPasswordChange:
    """Test password change functionality"""
    
    def test_manager_change_password_wrong_current(self):
        """Manager cannot change password with wrong current password"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Try to change with wrong current password
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "wrongpassword",
                "new_password": "newpass123"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_team_leader_change_password_wrong_current(self):
        """Team Leader cannot change password with wrong current password"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEADER_EMAIL,
            "password": TEAM_LEADER_PASSWORD
        })
        token = login_response.json()["token"]
        
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "wrongpassword",
                "new_password": "newpass123"
            }
        )
        assert response.status_code == 401


class TestHierarchyStats:
    """Test hierarchy stats endpoint for export"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_stats_no_filter(self, admin_token):
        """Admin can get stats without filter"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert "partners" in data
        assert "leads" in data
    
    def test_stats_filtered_by_manager(self, admin_token):
        """Admin can get stats filtered by manager"""
        # Get Saikrishna's ID
        managers_response = requests.get(
            f"{BASE_URL}/api/hierarchy/managers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        saikrishna = next(m for m in managers_response.json() if m["full_name"] == "Saikrishna")
        
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/stats?manager_id={saikrishna['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert "partners" in data
        assert "leads" in data
    
    def test_stats_filtered_by_team_leader(self, admin_token):
        """Admin can get stats filtered by team leader"""
        # Get Anusha's ID
        tl_response = requests.get(
            f"{BASE_URL}/api/hierarchy/team-leaders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        anusha = next(tl for tl in tl_response.json() if tl["full_name"] == "Anusha")
        
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/stats?team_leader_id={anusha['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert "partners" in data
        assert "leads" in data


class TestAccessControl:
    """Test access control for hierarchy endpoints"""
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def team_leader_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEAM_LEADER_EMAIL,
            "password": TEAM_LEADER_PASSWORD
        })
        return response.json()["token"]
    
    def test_manager_cannot_map_users(self, manager_token):
        """Manager cannot map users (admin only)"""
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-user",
            headers={"Authorization": f"Bearer {manager_token}"},
            json={
                "user_id": "test-id",
                "user_type": "agent",
                "manager_id": "test-manager-id"
            }
        )
        assert response.status_code == 403
    
    def test_team_leader_cannot_map_users(self, team_leader_token):
        """Team Leader cannot map users (admin only)"""
        response = requests.post(
            f"{BASE_URL}/api/hierarchy/map-user",
            headers={"Authorization": f"Bearer {team_leader_token}"},
            json={
                "user_id": "test-id",
                "user_type": "agent",
                "manager_id": "test-manager-id"
            }
        )
        assert response.status_code == 403
    
    def test_manager_cannot_access_stats(self, manager_token):
        """Manager cannot access hierarchy stats (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/hierarchy/stats",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 403
