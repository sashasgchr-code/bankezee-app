"""
Test Admin Edit User Feature
Tests PUT /api/auth/admin/users/{user_id}?user_type={type} endpoint
Tests editing all user types: operations, managers, team_leaders, agents, partners
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminEditUser:
    """Test Admin Edit User functionality for all user types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        self.admin_email = "admin@bankezee.com"
        self.admin_password = "admin123"
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get all users
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        assert response.status_code == 200, f"Failed to get all users: {response.text}"
        self.all_users = response.json()
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_get_all_users_returns_all_types(self):
        """Test that all-users endpoint returns all user types"""
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all user types are present in response
        assert "operations" in data, "Missing 'operations' in response"
        assert "managers" in data, "Missing 'managers' in response"
        assert "team_leaders" in data, "Missing 'team_leaders' in response"
        assert "agents" in data, "Missing 'agents' in response"
        assert "partners" in data, "Missing 'partners' in response"
        
        print(f"PASS: All user types returned - Ops: {len(data['operations'])}, Managers: {len(data['managers'])}, TLs: {len(data['team_leaders'])}, Agents: {len(data['agents'])}, Partners: {len(data['partners'])}")
    
    def test_edit_operations_user_basic_info(self):
        """Test editing operations user basic info"""
        ops_users = self.all_users.get("operations", [])
        if not ops_users:
            pytest.skip("No operations users to test")
        
        ops_user = ops_users[0]
        user_id = ops_user["id"]
        original_name = ops_user.get("full_name", "")
        
        # Update with new name
        new_name = f"TEST_Ops_Updated_{uuid.uuid4().hex[:6]}"
        payload = {
            "full_name": new_name,
            "email": ops_user.get("email"),
            "phone": ops_user.get("phone") or "+1234567890"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=operations",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update ops user: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_ops = next((u for u in response.json()["operations"] if u["id"] == user_id), None)
        assert updated_ops is not None
        assert updated_ops["full_name"] == new_name
        
        # Restore original name
        payload["full_name"] = original_name or "Operations Manager"
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=operations", headers=self.headers, json=payload)
        
        print(f"PASS: Operations user edit successful - updated name to '{new_name}'")
    
    def test_edit_manager_basic_info(self):
        """Test editing manager basic info"""
        managers = self.all_users.get("managers", [])
        if not managers:
            pytest.skip("No managers to test")
        
        manager = managers[0]
        user_id = manager["id"]
        original_name = manager.get("full_name", "")
        
        # Update with new name
        new_name = f"TEST_Manager_Updated_{uuid.uuid4().hex[:6]}"
        payload = {
            "full_name": new_name,
            "email": manager.get("email"),
            "phone": manager.get("phone") or "+1234567890"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=manager",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update manager: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_manager = next((u for u in response.json()["managers"] if u["id"] == user_id), None)
        assert updated_manager is not None
        assert updated_manager["full_name"] == new_name
        
        # Restore original name
        payload["full_name"] = original_name or "Test Manager"
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=manager", headers=self.headers, json=payload)
        
        print(f"PASS: Manager edit successful - updated name to '{new_name}'")
    
    def test_edit_team_leader_basic_info(self):
        """Test editing team leader basic info"""
        team_leaders = self.all_users.get("team_leaders", [])
        if not team_leaders:
            pytest.skip("No team leaders to test")
        
        tl = team_leaders[0]
        user_id = tl["id"]
        original_name = tl.get("full_name", "")
        
        # Update with new name
        new_name = f"TEST_TL_Updated_{uuid.uuid4().hex[:6]}"
        payload = {
            "full_name": new_name,
            "email": tl.get("email"),
            "phone": tl.get("phone") or "+1234567890"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=team_leader",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update team leader: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_tl = next((u for u in response.json()["team_leaders"] if u["id"] == user_id), None)
        assert updated_tl is not None
        assert updated_tl["full_name"] == new_name
        
        # Restore original name
        payload["full_name"] = original_name or "Test Team Leader"
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=team_leader", headers=self.headers, json=payload)
        
        print(f"PASS: Team Leader edit successful - updated name to '{new_name}'")
    
    def test_edit_agent_basic_info_and_bank_details(self):
        """Test editing agent basic info and bank details"""
        agents = self.all_users.get("agents", [])
        if not agents:
            pytest.skip("No agents to test")
        
        agent = agents[0]
        user_id = agent["id"]
        original_name = agent.get("full_name", "")
        original_bank = agent.get("bank_details", {})
        
        # Update with new name and bank details
        new_name = f"TEST_Agent_Updated_{uuid.uuid4().hex[:6]}"
        new_bank = {
            "bank_name": "Test Bank Updated",
            "account_holder_name": new_name,
            "account_number": "9999888877776666",
            "ifsc_code": "TEST0001234"
        }
        payload = {
            "full_name": new_name,
            "email": agent.get("email"),
            "phone": agent.get("phone") or "+1234567890",
            "city": agent.get("city") or "Mumbai",
            "pan_number": agent.get("pan_number") or "TESTPAN123",
            "bank_details": new_bank
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=agent",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update agent: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_agent = next((u for u in response.json()["agents"] if u["id"] == user_id), None)
        assert updated_agent is not None
        assert updated_agent["full_name"] == new_name
        assert updated_agent.get("bank_details", {}).get("bank_name") == "Test Bank Updated"
        
        # Restore original
        payload["full_name"] = original_name or "Test Agent"
        payload["bank_details"] = original_bank if original_bank else None
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=agent", headers=self.headers, json=payload)
        
        print(f"PASS: Agent edit successful - updated name to '{new_name}' and bank details")
    
    def test_edit_partner_basic_info_and_bank_details(self):
        """Test editing partner basic info and bank details"""
        partners = self.all_users.get("partners", [])
        if not partners:
            pytest.skip("No partners to test")
        
        partner = partners[0]
        user_id = partner["id"]
        original_name = partner.get("name") or partner.get("full_name", "")
        original_bank = partner.get("bank_details", {})
        
        # Update with new name and bank details
        new_name = f"TEST_Partner_Updated_{uuid.uuid4().hex[:6]}"
        new_bank = {
            "bank_name": "Partner Bank Updated",
            "account_holder_name": new_name,
            "account_number": "1111222233334444",
            "ifsc_code": "PART0001234"
        }
        payload = {
            "full_name": new_name,
            "email": partner.get("email"),
            "phone": partner.get("mobile") or partner.get("phone") or "+1234567890",
            "city": partner.get("city") or "Delhi",
            "pan_number": partner.get("pan_number") or "PARTPAN123",
            "occupation": partner.get("occupation") or "Business",
            "bank_details": new_bank
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=partner",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update partner: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_partner = next((u for u in response.json()["partners"] if u["id"] == user_id), None)
        assert updated_partner is not None
        # Partners use 'name' field
        assert updated_partner.get("name") == new_name or updated_partner.get("full_name") == new_name
        assert updated_partner.get("bank_details", {}).get("bank_name") == "Partner Bank Updated"
        
        # Restore original
        payload["full_name"] = original_name or "Test Partner"
        payload["bank_details"] = original_bank if original_bank else None
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=partner", headers=self.headers, json=payload)
        
        print(f"PASS: Partner edit successful - updated name to '{new_name}' and bank details")
    
    def test_edit_agent_role_mapping(self):
        """Test editing agent's manager and team leader mapping"""
        agents = self.all_users.get("agents", [])
        managers = self.all_users.get("managers", [])
        team_leaders = self.all_users.get("team_leaders", [])
        
        if not agents:
            pytest.skip("No agents to test")
        if not managers:
            pytest.skip("No managers to test role mapping")
        
        agent = agents[0]
        user_id = agent["id"]
        original_manager_id = agent.get("manager_id")
        original_tl_id = agent.get("team_leader_id")
        
        # Update with manager mapping
        new_manager_id = managers[0]["id"]
        new_tl_id = team_leaders[0]["id"] if team_leaders else None
        
        payload = {
            "full_name": agent.get("full_name"),
            "email": agent.get("email"),
            "phone": agent.get("phone") or "+1234567890",
            "manager_id": new_manager_id,
            "team_leader_id": new_tl_id
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=agent",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update agent mapping: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_agent = next((u for u in response.json()["agents"] if u["id"] == user_id), None)
        assert updated_agent is not None
        assert updated_agent.get("manager_id") == new_manager_id
        
        # Restore original
        payload["manager_id"] = original_manager_id
        payload["team_leader_id"] = original_tl_id
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=agent", headers=self.headers, json=payload)
        
        print(f"PASS: Agent role mapping edit successful - assigned to manager {new_manager_id}")
    
    def test_edit_team_leader_manager_mapping(self):
        """Test editing team leader's manager mapping"""
        team_leaders = self.all_users.get("team_leaders", [])
        managers = self.all_users.get("managers", [])
        
        if not team_leaders:
            pytest.skip("No team leaders to test")
        if not managers:
            pytest.skip("No managers to test role mapping")
        
        tl = team_leaders[0]
        user_id = tl["id"]
        original_manager_id = tl.get("manager_id")
        
        # Update with manager mapping
        new_manager_id = managers[0]["id"]
        
        payload = {
            "full_name": tl.get("full_name"),
            "email": tl.get("email"),
            "phone": tl.get("phone") or "+1234567890",
            "manager_id": new_manager_id
        }
        
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=team_leader",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to update TL mapping: {response.text}"
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/auth/admin/all-users", headers=self.headers)
        updated_tl = next((u for u in response.json()["team_leaders"] if u["id"] == user_id), None)
        assert updated_tl is not None
        assert updated_tl.get("manager_id") == new_manager_id
        
        # Restore original
        payload["manager_id"] = original_manager_id
        requests.put(f"{BASE_URL}/api/auth/admin/users/{user_id}?user_type=team_leader", headers=self.headers, json=payload)
        
        print(f"PASS: Team Leader manager mapping edit successful - assigned to manager {new_manager_id}")
    
    def test_edit_user_invalid_type_returns_400(self):
        """Test that invalid user_type returns 400 error"""
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/some-id?user_type=invalid_type",
            headers=self.headers,
            json={"full_name": "Test", "email": "test@test.com", "phone": "1234567890"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid user_type, got {response.status_code}"
        print("PASS: Invalid user_type returns 400 error")
    
    def test_edit_user_not_found_returns_404(self):
        """Test that non-existent user returns 404 error"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{fake_id}?user_type=operations",
            headers=self.headers,
            json={"full_name": "Test", "email": "test@test.com", "phone": "1234567890"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        print("PASS: Non-existent user returns 404 error")
    
    def test_non_admin_cannot_edit_users(self):
        """Test that non-admin users cannot edit users"""
        # Login as operations user
        ops_users = self.all_users.get("operations", [])
        if not ops_users:
            pytest.skip("No operations users to test")
        
        # Try to login as ops user (need to know password or skip)
        # For now, we'll test by using a non-admin token simulation
        # Actually, let's test the endpoint returns 403 for non-admin
        
        # Create a test by logging in as ops user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"  # Assuming this is the password
        })
        
        if response.status_code != 200:
            pytest.skip("Cannot login as ops user to test permission")
        
        ops_token = response.json()["token"]
        ops_headers = {
            "Authorization": f"Bearer {ops_token}",
            "Content-Type": "application/json"
        }
        
        # Try to edit a user as ops - should fail with 403
        agents = self.all_users.get("agents", [])
        if agents:
            response = requests.put(
                f"{BASE_URL}/api/auth/admin/users/{agents[0]['id']}?user_type=agent",
                headers=ops_headers,
                json={"full_name": "Hacked Name", "email": agents[0]["email"], "phone": "+1234567890"}
            )
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
            print("PASS: Non-admin (operations) cannot edit users - returns 403")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
