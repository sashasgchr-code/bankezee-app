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

## What's Implemented (as of Feb 7, 2026)

### Session Highlights
1. **Fixed QR Code Generation (P0)**
   - Root cause: Old agent users didn't have agent records
   - Ran migration to create missing agent records
   - Fixed FRONTEND_URL for correct QR links

2. **Implemented Lead Assignment (P1)**
   - Created /api/crm/{lead_id}/assign endpoint
   - Created /api/crm/operations-team endpoint
   - Added Assign Lead UI on Lead Detail page
   - Created Operations Dashboard

3. **Created Operations Team Role**
   - Dedicated dashboard at /operations/dashboard
   - Shows assigned leads with status filters
   - Can view and manage assigned leads

## Remaining/Backlog Tasks

### P0 (High Priority)
- [ ] Complete the detailed Agent Lead Form fields as specified by user

### P1 (Medium Priority)
- [ ] Commission & Incentive Tracking - Calculate earnings when leads are disbursed
- [ ] Multiple Operations Team members support

### P2 (Low Priority)
- [ ] Activate Notifications System (SMS/Email)
- [ ] Document Upload to Google Drive
- [ ] Server-side filtering for Operations Dashboard (performance)

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
