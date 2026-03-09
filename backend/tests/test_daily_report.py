"""
Test Daily Report Feature
- Tests /api/reports/daily-report endpoint
- Tests /api/reports/managers-list endpoint
- Tests access control (admin and operations only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDailyReportEndpoints:
    """Tests for Daily Report API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.ops_token = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
        
        # Login as operations
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        if response.status_code == 200:
            self.ops_token = response.json().get("token")
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_ops_login_success(self):
        """Test operations user can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "operations"
        print("PASS: Operations login successful")
    
    def test_daily_report_admin_access(self):
        """Test admin can access daily report endpoint"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-01-01", "to_date": "2026-03-31"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "summary" in data
        assert "leads" in data
        assert "managers" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_leads" in summary
        assert "status_distribution" in summary
        assert "loan_type_distribution" in summary
        assert "daily_activity" in summary
        assert "total_eligible_amount" in summary
        assert "total_approved_amount" in summary
        assert "total_disbursed_amount" in summary
        assert "date_range" in summary
        
        print(f"PASS: Admin can access daily report - {summary['total_leads']} leads found")
    
    def test_daily_report_ops_access(self):
        """Test operations user can access daily report endpoint"""
        if not self.ops_token:
            pytest.skip("Operations token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-01-01", "to_date": "2026-03-31"},
            headers={"Authorization": f"Bearer {self.ops_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "leads" in data
        assert data["summary"]["total_leads"] >= 0
        
        print(f"PASS: Operations can access daily report - {data['summary']['total_leads']} leads found")
    
    def test_daily_report_unauthorized_access(self):
        """Test unauthorized access returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-01-01", "to_date": "2026-03-31"}
        )
        assert response.status_code == 401
        print("PASS: Unauthorized access returns 401")
    
    def test_daily_report_invalid_date_format(self):
        """Test invalid date format returns 400"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "invalid-date", "to_date": "2026-03-31"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 400
        print("PASS: Invalid date format returns 400")
    
    def test_daily_report_lead_structure(self):
        """Test lead data structure in daily report"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-01-01", "to_date": "2026-03-31"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["leads"]) > 0:
            lead = data["leads"][0]
            # Verify lead structure
            assert "id" in lead
            assert "full_name" in lead
            assert "mobile" in lead
            assert "current_status" in lead
            assert "activities_in_period" in lead
            assert "total_eligible_amount" in lead
            assert "total_approved_amount" in lead
            assert "total_disbursed_amount" in lead
            print(f"PASS: Lead structure verified - {lead['full_name']}")
        else:
            print("PASS: No leads found but structure is valid")
    
    def test_managers_list_admin_access(self):
        """Test admin can access managers list endpoint"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/managers-list",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        
        # If managers exist, verify structure
        if len(data) > 0:
            manager = data[0]
            assert "id" in manager
            assert "name" in manager
            print(f"PASS: Managers list accessible - {len(data)} managers found")
        else:
            print("PASS: Managers list accessible - no managers found")
    
    def test_managers_list_ops_access(self):
        """Test operations user can access managers list endpoint"""
        if not self.ops_token:
            pytest.skip("Operations token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/managers-list",
            headers={"Authorization": f"Bearer {self.ops_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Operations can access managers list - {len(data)} managers found")
    
    def test_managers_list_unauthorized_access(self):
        """Test unauthorized access to managers list returns 401"""
        response = requests.get(f"{BASE_URL}/api/reports/managers-list")
        assert response.status_code == 401
        print("PASS: Unauthorized access to managers list returns 401")
    
    def test_daily_report_with_manager_filter(self):
        """Test daily report with manager filter"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # First get managers list
        managers_response = requests.get(
            f"{BASE_URL}/api/reports/managers-list",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if managers_response.status_code == 200 and len(managers_response.json()) > 0:
            manager_id = managers_response.json()[0]["id"]
            
            # Test with manager filter
            response = requests.get(
                f"{BASE_URL}/api/reports/daily-report",
                params={
                    "from_date": "2026-01-01",
                    "to_date": "2026-03-31",
                    "manager_id": manager_id
                },
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "summary" in data
            assert "leads" in data
            print(f"PASS: Daily report with manager filter - {data['summary']['total_leads']} leads found")
        else:
            print("SKIP: No managers available for filter test")
    
    def test_daily_report_date_range_filtering(self):
        """Test that date range filtering works correctly"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Test with narrow date range
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-02-08", "to_date": "2026-02-08"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify date range in response
        assert data["summary"]["date_range"]["from"] == "2026-02-08"
        assert data["summary"]["date_range"]["to"] == "2026-02-08"
        print(f"PASS: Date range filtering works - {data['summary']['total_leads']} leads for single day")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
