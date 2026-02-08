# Bankezee CRM Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for a fintech company called BankEzee. The platform should function as a Lead Generation + Sales CRM + Partner Management system.

## Brand Colors
- **Primary Green:** #22af47
- **Secondary Gray:** #535353

## User Roles
1. **Admin** - Full system access, user approvals, analytics, lead assignment
2. **Operations Team** - Process assigned leads, update statuses, manage workflow
3. **Sales Agent** - Generate leads, track commission, unique QR code
4. **Retail Partner** - Generate leads, track earnings, unique QR code

## Core Features

### Authentication
- [x] Admin email/password login
- [x] Operations Team email/password login
- [x] Agent/Partner OTP-based login (mocked with code 123456)
- [x] JWT token-based authentication
- [x] Role-based access control

### User Management
- [x] Agent registration with KYC and bank details
- [x] Partner registration with KYC and bank details
- [x] Admin approval workflow for agents/partners
- [x] Operations Team user creation

### Lead Generation
- [x] Public lead form at /lead-form
- [x] Agent lead creation form (detailed)
- [x] Partner lead creation form (simple)
- [x] QR code-based lead tracking with referral codes

### QR Code System
- [x] Unique QR codes for each Agent (AGT prefix)
- [x] Unique QR codes for each Partner (PTR prefix)
- [x] QR codes link to lead form with referral tracking
- [x] Download and copy link functionality

### CRM Features
- [x] Lead listing with filters
- [x] Lead status management (New → Contacted → Documents Collected → Sent to Bank → Approved → Disbursed/Rejected)
- [x] Lead assignment to Operations Team
- [x] Activity logging and notes
- [x] Document upload (mocked)

### Dashboards
- [x] Admin Dashboard - Analytics, lead stats, top agents
- [x] Agent Dashboard - QR code, leads, commission, performance
- [x] Partner Dashboard - QR code, leads, earnings, wallet balance
- [x] Operations Dashboard - Assigned leads, status filters

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Axios
- **Backend:** FastAPI, MongoDB (motor async driver)
- **Authentication:** JWT tokens
- **Deployment:** Containerized with supervisor

## API Endpoints

### Authentication
- POST /api/auth/register - User registration
- POST /api/auth/login - Email/password login
- POST /api/auth/send-otp - Send OTP
- POST /api/auth/verify-otp - Verify OTP and login
- GET /api/auth/me - Get current user

### Leads
- POST /api/leads/create - Create new lead
- GET /api/leads/ - List leads
- GET /api/leads/{lead_id} - Get lead details

### CRM
- PUT /api/crm/{lead_id}/status - Update lead status
- PUT /api/crm/{lead_id}/assign - Assign lead to operations
- POST /api/crm/{lead_id}/notes - Add note
- GET /api/crm/operations-team - Get operations team list

### QR System
- GET /api/qr/data/{id} - Get QR code data (base64)
- GET /api/qr/generate/{id} - Generate QR code image

## Test Credentials
- **Admin:** admin@bankezee.com / admin123
- **Operations:** ops@bankezee.com / ops123
- **Mock OTP:** 123456

## Mocked Features
- SMS OTP via Twilio (use code 123456)
- Email notifications via Resend
- Document upload to Google Drive

## What's Implemented (as of Feb 8, 2026)

### Session 3 Highlights (Current)
1. **Bulk Lead Assignment (P1) ✅ NEW**
   - Checkboxes on each lead in Admin Dashboard
   - "Select All" checkbox for bulk selection
   - Bulk assign controls appear when leads are selected
   - Assign multiple leads at once to an Ops team member
   - New API: `PUT /api/crm/bulk-assign`

2. **Add Ops User Feature ✅ NEW**
   - "Add Ops User" button in Admin Dashboard nav bar
   - Modal form with Full Name, Email, Password, Phone fields
   - Admin creates Ops accounts directly (no self-registration)
   - New Ops users can login immediately
   - New API: `POST /api/auth/create-ops-user`

3. **Agent/Partner Info on Lead Detail ✅ NEW**
   - "Lead Source & Status" section shows referring Agent/Partner details
   - Displays Name, Code, and Contact for Ops/Admin users

4. **Commission & Incentive Tracking (P1) ✅**
   - Ops team can enter commission % when marking a bank eligibility as "Disbursed"
   - System auto-calculates commission amount
   - Commission automatically credited to Agent/Partner
   - Agent & Partner Dashboards show Total Earnings and This Month cards

5. **Input Focus Bug Fixed (P0)**
   - All input fields in edit mode work correctly without losing focus

6. **All Reason Fields Implemented (P1)**
   - "Not Eligible Reason", "Login Rejection Reason", "Decline Reason", etc.

### Session 2 Highlights
1. **Agent Lead Form Simplified** - Customer Info, Employment, Existing Loans, Loan Requirements
2. **Enhanced Lead Details Display** - Shows ALL form data
3. **Bank Eligibility Tracking System** - Up to 7 banks with conditional fields

### Session 1 Highlights
1. **Fixed QR Code Generation** - Agent/Partner records properly linked
2. **Lead Assignment** - Admins can assign leads to Operations Team
3. **Operations Dashboard** - New role with dedicated dashboard

## Remaining/Backlog Tasks

### P2 (Low Priority)
- [ ] Activate Notifications System (SMS/Email via Twilio/Resend) - MOCKED
- [ ] Document Upload to Google Drive - MOCKED
- [ ] Server-side filtering for large lead lists
- [ ] Refactor LeadDetailPage.js into smaller components (currently 900+ lines)

## Database Schema

### users
```json
{
  "id": "string",
  "email": "string",
  "password": "hashed",
  "full_name": "string",
  "phone": "string",
  "role": "admin|operations|sales_agent|partner",
  "is_active": true,
  "is_approved": true/false
}
```

### agents
```json
{
  "id": "string (same as user.id)",
  "agent_code": "AGT...",
  "email": "string",
  "performance": { "total_leads": 0, "converted_leads": 0 }
}
```

### partners
```json
{
  "id": "string (same as user.id)",
  "referral_code": "PTR...",
  "mobile": "string",
  "wallet_balance": 0
}
```

### leads
```json
{
  "id": "string",
  "full_name": "string",
  "mobile": "string",
  "status": "new|contacted|...|disbursed|rejected",
  "source_id": "agent/partner id",
  "assigned_to": "operations user id",
  "activities": []
}
```
