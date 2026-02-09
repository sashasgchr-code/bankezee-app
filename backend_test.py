import requests
import sys
import json
from datetime import datetime

class BankezeeCRMTester:
    def __init__(self, base_url="https://finance-dash-166.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.agent_id = None
        self.partner_id = None
        self.lead_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_health(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@bankezee.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user = response['user']
            print(f"   Admin user role: {self.admin_user.get('role')}")
            return True
        return False

    def test_otp_flow(self):
        """Test OTP send and verify flow"""
        # Test send OTP
        success1, response1 = self.run_test(
            "Send OTP",
            "POST",
            "auth/send-otp",
            200,
            data={"phone": "+1234567890"}
        )
        
        # Test verify OTP with mocked code
        success2, response2 = self.run_test(
            "Verify OTP",
            "POST",
            "auth/verify-otp",
            200,
            data={"phone": "+1234567890", "code": "123456"}
        )
        
        return success1 and success2

    def test_agent_registration(self):
        """Test agent registration"""
        agent_data = {
            "full_name": "Test Agent",
            "phone": "+1234567891",
            "email": "testagent@example.com",
            "city": "Mumbai",
            "bank_details": {"account": "123456789", "ifsc": "TEST0001"}
        }
        
        success, response = self.run_test(
            "Agent Registration",
            "POST",
            "agents/register",
            200,
            data=agent_data
        )
        
        if success and 'agent_id' in response:
            self.agent_id = response['agent_id']
            print(f"   Agent ID: {self.agent_id}")
            return True
        return False

    def test_partner_registration(self):
        """Test partner registration"""
        partner_data = {
            "name": "Test Partner",
            "mobile": "+1234567892",
            "city": "Delhi",
            "occupation": "Business",
            "upi_id": "testpartner@upi"
        }
        
        success, response = self.run_test(
            "Partner Registration",
            "POST",
            "partners/register",
            200,
            data=partner_data
        )
        
        if success and 'partner_id' in response:
            self.partner_id = response['partner_id']
            print(f"   Partner ID: {self.partner_id}")
            print(f"   Referral Code: {response.get('referral_code')}")
            return True
        return False

    def test_lead_creation(self):
        """Test lead creation"""
        lead_data = {
            "full_name": "Test Customer",
            "mobile": "+1234567893",
            "city": "Bangalore",
            "employment_type": "salaried",
            "requirement": "new_home",
            "source": "digital"
        }
        
        success, response = self.run_test(
            "Lead Creation",
            "POST",
            "leads/create",
            200,
            data=lead_data
        )
        
        if success and 'lead_id' in response:
            self.lead_id = response['lead_id']
            print(f"   Lead ID: {self.lead_id}")
            return True
        return False

    def test_admin_dashboard(self):
        """Test admin dashboard"""
        success, response = self.run_test(
            "Admin Dashboard",
            "GET",
            "dashboard/admin",
            200
        )
        
        if success:
            print(f"   Total Leads: {response.get('total_leads', 0)}")
            print(f"   Conversion Rate: {response.get('conversion_rate', 0)}%")
            print(f"   Total Agents: {response.get('agents', {}).get('total', 0)}")
            return True
        return False

    def test_crm_functionality(self):
        """Test CRM lead management"""
        if not self.lead_id:
            print("❌ No lead ID available for CRM testing")
            return False
        
        # Test get leads
        success1, response1 = self.run_test(
            "Get All Leads",
            "GET",
            "leads/",
            200
        )
        
        # Test get specific lead
        success2, response2 = self.run_test(
            "Get Specific Lead",
            "GET",
            f"leads/{self.lead_id}",
            200
        )
        
        # Test update lead status
        success3, response3 = self.run_test(
            "Update Lead Status",
            "PUT",
            f"crm/{self.lead_id}/status",
            200,
            data={"status": "contacted"}
        )
        
        # Test add note
        success4, response4 = self.run_test(
            "Add Lead Note",
            "POST",
            f"crm/{self.lead_id}/notes",
            200,
            data={"note": "Test note added via API"}
        )
        
        return success1 and success2 and success3 and success4

    def test_role_based_access(self):
        """Test role-based access control"""
        # Test agents endpoint (should work for admin)
        success1, response1 = self.run_test(
            "Get Agents (Admin Access)",
            "GET",
            "agents/",
            200
        )
        
        # Test partners endpoint (should work for admin)
        success2, response2 = self.run_test(
            "Get Partners (Admin Access)",
            "GET",
            "partners/",
            200
        )
        
        return success1 and success2

def main():
    print("🚀 Starting Bankezee CRM API Testing...")
    print("=" * 50)
    
    tester = BankezeeCRMTester()
    
    # Test sequence
    tests = [
        ("API Health Check", tester.test_api_health),
        ("Admin Login", tester.test_admin_login),
        ("OTP Flow", tester.test_otp_flow),
        ("Agent Registration", tester.test_agent_registration),
        ("Partner Registration", tester.test_partner_registration),
        ("Lead Creation", tester.test_lead_creation),
        ("Admin Dashboard", tester.test_admin_dashboard),
        ("CRM Functionality", tester.test_crm_functionality),
        ("Role-based Access", tester.test_role_based_access),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())