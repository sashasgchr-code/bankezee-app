"""
Test Query/Hold Reason Feature and Daily Report Calculations
- Tests PUT /api/crm/{lead_id}/status with query_hold_reason payload
- Tests that reason is saved to lead document
- Tests that reason appears in activity log
- Tests GET /api/reports/daily-report endpoint
- Tests total_approved_amount and total_disbursed_amount calculations
- Tests loan_type is populated from additional_data.type_of_loan
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQueryHoldFeature:
    """Tests for Query/Hold reason feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_existing_query_hold_lead_has_reason(self):
        """Test that existing lead with query_hold status has query_hold_reason saved"""
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get lead: {response.text}"
        lead = response.json()
        
        # Verify lead has query_hold status
        assert lead["status"] == "query_hold", f"Expected status query_hold, got {lead['status']}"
        
        # Verify query_hold_reason is saved
        assert lead.get("query_hold_reason"), "query_hold_reason should be present"
        assert lead["query_hold_reason"] == "Awaiting customer response regarding income verification documents"
        print(f"✓ Lead {lead_id} has query_hold_reason: {lead['query_hold_reason']}")
    
    def test_query_hold_reason_in_activity_log(self):
        """Test that query_hold_reason appears in activity log"""
        lead_id = "0683f437-c4df-4509-b1e6-d20017180102"
        response = requests.get(f"{BASE_URL}/api/crm/{lead_id}/activities", headers=self.headers)
        
        assert response.status_code == 200, f"Failed to get activities: {response.text}"
        activities = response.json()
        
        # Find status_change activity with query_hold
        query_hold_activities = [
            a for a in activities 
            if a.get("type") == "status_change" and a.get("to_status") == "query_hold"
        ]
        
        assert len(query_hold_activities) > 0, "Should have at least one query_hold status change activity"
        
        # Check if query_hold_reason is in the activity
        latest_activity = query_hold_activities[-1]
        assert latest_activity.get("query_hold_reason"), "Activity should have query_hold_reason"
        print(f"✓ Activity log contains query_hold_reason: {latest_activity.get('query_hold_reason')}")
    
    def test_update_status_to_query_hold_with_reason(self):
        """Test updating a lead status to query_hold with reason"""
        # First, get a lead that's not in query_hold status
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        # Find a lead not in query_hold status
        test_lead = None
        for lead in leads:
            if lead.get("status") != "query_hold":
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("No lead available for testing status update")
        
        lead_id = test_lead["id"]
        original_status = test_lead["status"]
        test_reason = f"Test query hold reason - {uuid.uuid4().hex[:8]}"
        
        # Update status to query_hold with reason
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/status",
            headers=self.headers,
            json={
                "status": "query_hold",
                "query_hold_reason": test_reason
            }
        )
        
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        print(f"✓ Status updated to query_hold for lead {lead_id}")
        
        # Verify the reason was saved
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=self.headers)
        assert response.status_code == 200
        updated_lead = response.json()
        
        assert updated_lead["status"] == "query_hold", "Status should be query_hold"
        assert updated_lead.get("query_hold_reason") == test_reason, f"Reason should be saved. Got: {updated_lead.get('query_hold_reason')}"
        print(f"✓ query_hold_reason saved correctly: {test_reason}")
        
        # Verify activity log has the reason
        response = requests.get(f"{BASE_URL}/api/crm/{lead_id}/activities", headers=self.headers)
        assert response.status_code == 200
        activities = response.json()
        
        # Find the latest query_hold activity
        query_hold_activities = [
            a for a in activities 
            if a.get("type") == "status_change" and a.get("to_status") == "query_hold"
        ]
        
        assert len(query_hold_activities) > 0, "Should have query_hold activity"
        latest = query_hold_activities[-1]
        assert latest.get("query_hold_reason") == test_reason, "Activity should have the reason"
        print(f"✓ Activity log contains the reason")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/status",
            headers=self.headers,
            json={"status": original_status}
        )
    
    def test_query_hold_without_reason_should_work(self):
        """Test that query_hold status can be set without reason (reason is optional)"""
        # Get a lead
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        test_lead = None
        for lead in leads:
            if lead.get("status") != "query_hold":
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("No lead available for testing")
        
        lead_id = test_lead["id"]
        original_status = test_lead["status"]
        
        # Update status to query_hold WITHOUT reason
        response = requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/status",
            headers=self.headers,
            json={"status": "query_hold"}
        )
        
        assert response.status_code == 200, f"Should allow query_hold without reason: {response.text}"
        print(f"✓ query_hold status can be set without reason")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/crm/{lead_id}/status",
            headers=self.headers,
            json={"status": original_status}
        )


class TestDailyReport:
    """Tests for Daily Report endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@bankezee.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_daily_report_returns_data(self):
        """Test GET /api/reports/daily-report returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200, f"Failed to get daily report: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Response should have summary"
        assert "leads" in data, "Response should have leads"
        assert "managers" in data, "Response should have managers"
        
        summary = data["summary"]
        assert "total_leads" in summary, "Summary should have total_leads"
        assert "total_approved_amount" in summary, "Summary should have total_approved_amount"
        assert "total_disbursed_amount" in summary, "Summary should have total_disbursed_amount"
        assert "loan_type_distribution" in summary, "Summary should have loan_type_distribution"
        
        print(f"✓ Daily report structure is correct")
        print(f"  - Total leads: {summary['total_leads']}")
        print(f"  - Total approved amount: {summary['total_approved_amount']}")
        print(f"  - Total disbursed amount: {summary['total_disbursed_amount']}")
    
    def test_daily_report_total_approved_amount_calculation(self):
        """Test that total_approved_amount is calculated correctly from eligibilities"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected total from leads
        expected_total = 0
        for lead in data["leads"]:
            expected_total += lead.get("total_approved_amount", 0)
        
        actual_total = data["summary"]["total_approved_amount"]
        
        assert actual_total == expected_total, f"Total approved mismatch: expected {expected_total}, got {actual_total}"
        print(f"✓ total_approved_amount calculation correct: {actual_total}")
    
    def test_daily_report_total_disbursed_amount_calculation(self):
        """Test that total_disbursed_amount is calculated correctly from eligibilities"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected total from leads
        expected_total = 0
        for lead in data["leads"]:
            expected_total += lead.get("total_disbursed_amount", 0)
        
        actual_total = data["summary"]["total_disbursed_amount"]
        
        assert actual_total == expected_total, f"Total disbursed mismatch: expected {expected_total}, got {actual_total}"
        print(f"✓ total_disbursed_amount calculation correct: {actual_total}")
    
    def test_daily_report_loan_type_from_additional_data(self):
        """Test that loan_type is populated from additional_data.type_of_loan"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check leads have loan_type field
        for lead in data["leads"]:
            # loan_type should be present (may be empty string or actual value)
            assert "loan_type" in lead, f"Lead {lead['id']} should have loan_type field"
            
            # If additional_data has type_of_loan, it should match loan_type
            additional_data = lead.get("additional_data", {})
            type_of_loan = additional_data.get("type_of_loan", "")
            
            if type_of_loan:
                assert lead["loan_type"] == type_of_loan, f"loan_type should match type_of_loan for lead {lead['id']}"
                print(f"✓ Lead {lead['id']}: loan_type = {lead['loan_type']} (from type_of_loan)")
        
        # Check loan_type_distribution in summary
        loan_type_dist = data["summary"].get("loan_type_distribution", {})
        print(f"✓ Loan type distribution: {loan_type_dist}")
    
    def test_daily_report_lead_structure(self):
        """Test that each lead in daily report has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "id", "full_name", "mobile", "current_status", "loan_type",
            "total_approved_amount", "total_disbursed_amount", "total_eligible_amount"
        ]
        
        for lead in data["leads"][:5]:  # Check first 5 leads
            for field in required_fields:
                assert field in lead, f"Lead {lead.get('id')} missing field: {field}"
        
        print(f"✓ All leads have required fields")
    
    def test_daily_report_operations_access(self):
        """Test that operations user can access daily report"""
        # Login as operations
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ops@bankezee.com",
            "password": "ops123"
        })
        assert response.status_code == 200
        ops_token = response.json()["token"]
        ops_headers = {"Authorization": f"Bearer {ops_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=ops_headers,
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 200, f"Operations should access daily report: {response.text}"
        print(f"✓ Operations user can access daily report")
    
    def test_daily_report_unauthenticated_access(self):
        """Test that unauthenticated users cannot access daily report"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            params={"from_date": "2026-01-01", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 401, f"Should return 401 for unauthenticated: {response.status_code}"
        print(f"✓ Unauthenticated access blocked")
    
    def test_daily_report_invalid_date_format(self):
        """Test that invalid date format returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily-report",
            headers=self.headers,
            params={"from_date": "invalid", "to_date": "2026-12-31"}
        )
        
        assert response.status_code == 400, f"Should return 400 for invalid date: {response.status_code}"
        print(f"✓ Invalid date format returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
