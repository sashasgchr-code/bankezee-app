"""
Backend tests for Bankezee CRM - QR Code and Authentication
Tests: QR code generation, OTP login, Agent/Partner registration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        print(f"✓ API health check passed: {data}")


class TestOTPAuthentication:
    """OTP login flow tests"""
    
    def test_send_otp_agent(self):
        """Test sending OTP to agent phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "+919390066837"
        })
        assert response.status_code == 200
        data = response.json()
        # Mocked Twilio returns status: mocked
        assert "status" in data or "message" in data
        print(f"✓ Send OTP to agent: {data}")
    
    def test_send_otp_partner(self):
        """Test sending OTP to partner phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "+919876543211"
        })
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Send OTP to partner: {data}")
    
    def test_verify_otp_agent_success(self):
        """Test OTP verification for agent with mock code 123456"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919390066837",
            "code": "123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True, f"OTP verification failed: {data}"
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        print(f"✓ Agent OTP verification passed, user role: {data['user'].get('role')}")
        return data
    
    def test_verify_otp_partner_success(self):
        """Test OTP verification for partner with mock code 123456"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919876543211",
            "code": "123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True, f"OTP verification failed: {data}"
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        print(f"✓ Partner OTP verification passed, user role: {data['user'].get('role')}")
        return data
    
    def test_verify_otp_invalid_code(self):
        """Test OTP verification with wrong code"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919390066837",
            "code": "000000"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False, "Invalid OTP should not be valid"
        print(f"✓ Invalid OTP correctly rejected: {data}")


class TestQRCodeGeneration:
    """QR code generation and data tests"""
    
    @pytest.fixture
    def agent_user_id(self):
        """Get agent user ID via OTP login"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919390066837",
            "code": "123456"
        })
        if response.status_code == 200 and response.json().get("valid"):
            return response.json()["user"]["id"]
        pytest.skip("Could not get agent user ID")
    
    @pytest.fixture
    def partner_user_id(self):
        """Get partner user ID via OTP login"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919876543211",
            "code": "123456"
        })
        if response.status_code == 200 and response.json().get("valid"):
            return response.json()["user"]["id"]
        pytest.skip("Could not get partner user ID")
    
    def test_qr_data_for_agent(self, agent_user_id):
        """Test QR data endpoint for agent"""
        response = requests.get(f"{BASE_URL}/api/qr/data/{agent_user_id}")
        assert response.status_code == 200, f"QR data failed: {response.text}"
        data = response.json()
        
        # Validate QR data structure
        assert "qr_url" in data, "qr_url missing"
        assert "qr_image_base64" in data, "qr_image_base64 missing"
        assert "agent_code" in data, "agent_code missing"
        assert data["type"] == "agent", f"Expected type 'agent', got {data.get('type')}"
        
        # Validate QR URL contains correct public URL (not localhost)
        qr_url = data["qr_url"]
        assert "localhost" not in qr_url, f"QR URL contains localhost: {qr_url}"
        assert "sales-pipeline-81.preview.emergentagent.com" in qr_url, f"QR URL doesn't contain public URL: {qr_url}"
        assert "/lead-form?ref=" in qr_url, f"QR URL missing lead-form path: {qr_url}"
        
        print(f"✓ Agent QR data valid:")
        print(f"  - Agent Code: {data['agent_code']}")
        print(f"  - QR URL: {qr_url}")
        print(f"  - Has base64 image: {data['qr_image_base64'][:50]}...")
    
    def test_qr_data_for_partner(self, partner_user_id):
        """Test QR data endpoint for partner"""
        response = requests.get(f"{BASE_URL}/api/qr/data/{partner_user_id}")
        assert response.status_code == 200, f"QR data failed: {response.text}"
        data = response.json()
        
        # Validate QR data structure
        assert "qr_url" in data, "qr_url missing"
        assert "qr_image_base64" in data, "qr_image_base64 missing"
        assert "referral_code" in data, "referral_code missing"
        assert data["type"] == "partner", f"Expected type 'partner', got {data.get('type')}"
        
        # Validate QR URL contains correct public URL (not localhost)
        qr_url = data["qr_url"]
        assert "localhost" not in qr_url, f"QR URL contains localhost: {qr_url}"
        assert "sales-pipeline-81.preview.emergentagent.com" in qr_url, f"QR URL doesn't contain public URL: {qr_url}"
        assert "/lead-form?ref=" in qr_url, f"QR URL missing lead-form path: {qr_url}"
        
        print(f"✓ Partner QR data valid:")
        print(f"  - Referral Code: {data['referral_code']}")
        print(f"  - QR URL: {qr_url}")
        print(f"  - Has base64 image: {data['qr_image_base64'][:50]}...")
    
    def test_qr_generate_image_for_agent(self, agent_user_id):
        """Test QR image generation endpoint for agent"""
        response = requests.get(f"{BASE_URL}/api/qr/generate/{agent_user_id}")
        assert response.status_code == 200, f"QR generate failed: {response.text}"
        assert response.headers.get("content-type") == "image/png", "Response should be PNG image"
        assert len(response.content) > 100, "Image content too small"
        print(f"✓ Agent QR image generated, size: {len(response.content)} bytes")
    
    def test_qr_generate_image_for_partner(self, partner_user_id):
        """Test QR image generation endpoint for partner"""
        response = requests.get(f"{BASE_URL}/api/qr/generate/{partner_user_id}")
        assert response.status_code == 200, f"QR generate failed: {response.text}"
        assert response.headers.get("content-type") == "image/png", "Response should be PNG image"
        assert len(response.content) > 100, "Image content too small"
        print(f"✓ Partner QR image generated, size: {len(response.content)} bytes")
    
    def test_qr_data_invalid_id(self):
        """Test QR data with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/qr/data/invalid-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid ID correctly returns 404")


class TestAgentEndpoints:
    """Agent-specific endpoint tests"""
    
    @pytest.fixture
    def agent_auth(self):
        """Get agent authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919390066837",
            "code": "123456"
        })
        if response.status_code == 200 and response.json().get("valid"):
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "headers": {"Authorization": f"Bearer {data['token']}"}
            }
        pytest.skip("Could not authenticate agent")
    
    def test_get_agent_by_user_id(self, agent_auth):
        """Test getting agent record by user ID"""
        user_id = agent_auth["user"]["id"]
        response = requests.get(
            f"{BASE_URL}/api/agents/by-user/{user_id}",
            headers=agent_auth["headers"]
        )
        assert response.status_code == 200, f"Get agent failed: {response.text}"
        data = response.json()
        
        # Validate agent record structure
        assert "id" in data, "Agent ID missing"
        assert "agent_code" in data, "Agent code missing"
        assert "full_name" in data, "Full name missing"
        assert "phone" in data, "Phone missing"
        
        print(f"✓ Agent record found:")
        print(f"  - ID: {data['id']}")
        print(f"  - Agent Code: {data['agent_code']}")
        print(f"  - Name: {data['full_name']}")


class TestPartnerEndpoints:
    """Partner-specific endpoint tests"""
    
    @pytest.fixture
    def partner_auth(self):
        """Get partner authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "+919876543211",
            "code": "123456"
        })
        if response.status_code == 200 and response.json().get("valid"):
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "headers": {"Authorization": f"Bearer {data['token']}"}
            }
        pytest.skip("Could not authenticate partner")
    
    def test_get_partner_dashboard(self, partner_auth):
        """Test getting partner dashboard data"""
        user_id = partner_auth["user"]["id"]
        response = requests.get(
            f"{BASE_URL}/api/dashboard/partner/{user_id}",
            headers=partner_auth["headers"]
        )
        assert response.status_code == 200, f"Get partner dashboard failed: {response.text}"
        data = response.json()
        
        # Validate dashboard structure
        assert "total_leads" in data or "partner_code" in data, "Dashboard data incomplete"
        print(f"✓ Partner dashboard data retrieved: {data}")


class TestRegistrationFlow:
    """Test registration creates correct records"""
    
    def test_agent_registration_creates_agent_record(self):
        """Test that agent registration creates both user and agent records"""
        import uuid
        test_email = f"test_agent_{uuid.uuid4().hex[:8]}@test.com"
        test_phone = f"+91{uuid.uuid4().int % 10000000000:010d}"
        
        # Register as sales_agent
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "full_name": "Test Agent",
            "phone": test_phone,
            "role": "sales_agent",
            "city": "Mumbai"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "user_id" in data, "User ID not returned"
        user_id = data["user_id"]
        
        print(f"✓ Agent registration successful, user_id: {user_id}")
        
        # Verify agent record was created by checking QR endpoint
        qr_response = requests.get(f"{BASE_URL}/api/qr/data/{user_id}")
        assert qr_response.status_code == 200, f"Agent record not created - QR data failed: {qr_response.text}"
        qr_data = qr_response.json()
        assert qr_data["type"] == "agent", "QR data type should be agent"
        assert "agent_code" in qr_data, "Agent code missing"
        
        print(f"✓ Agent record created with code: {qr_data['agent_code']}")
        print(f"✓ QR URL: {qr_data['qr_url']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
