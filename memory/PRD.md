# Bankezee CRM Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for a fintech company called BankEzee. The platform should function as a Lead Generation + Sales CRM + Partner Management system.

## Brand Colors
- **Primary Green:** #22af47
- **Secondary Gray:** #535353

## User Roles
1. **Admin** - Full system access, user approvals, analytics, lead assignment
2. **Operations Team** - Process assigned leads, update statuses, manage workflow
3. **Manager** - View-only access to leads from their team (agents/partners + team leaders' reports)
4. **Team Leader** - View-only access to leads from direct reports (agents/partners under them)
5. **Sales Agent** - Generate leads, track commission, unique QR code
6. **Retail Partner** - Generate leads, track earnings, unique QR code

## Core Features

### Authentication
- [x] Admin email/password login
- [x] Operations Team email/password login
- [x] Manager email/password login
- [x] Team Leader email/password login
- [x] Agent/Partner OTP-based login (mocked with code 123456)
- [x] JWT token-based authentication
- [x] Role-based access control

### User Management
- [x] Agent registration with KYC and bank details
- [x] Partner registration with KYC and bank details
- [x] Admin approval workflow for agents/partners
- [x] Operations Team user creation
- [x] **NEW: Hierarchical User Mapping**
  - Admin can assign Team Leaders to Managers
  - Admin can map Agents/Partners to Manager (mandatory) and Team Leader (optional)
  - Team Leader can only be assigned Agents/Partners if they are under the same Manager

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
- [x] **Manager Dashboard** - Team overview, team leads (view-only), password change
- [x] **Team Leader Dashboard** - Direct reports overview, leads (view-only), password change

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
- **Manager (Test):** test.manager@bankezee.com / manager123
- **Team Leader (Test):** test.teamlead@bankezee.com / teamlead123
- **Manager (Saikrishna):** saikrishna@bankezee.com / manager123
- **Manager (Manmith):** manmith@bankezee.com / manager123
- **Manager (Saikiran):** saikiran@bankezee.com / manager123
- **Team Leader (Anusha):** anusha@bankezee.com / teamlead123
- **Team Leader (Sravan):** sravan@bankezee.com / teamlead123
- **Team Leader (Shiva Sai):** shivasai@bankezee.com / teamlead123
- **Team Leader (Pinky):** pinky@bankezee.com / teamlead123
- **Mock OTP:** 123456

## Mocked Features
- SMS OTP via Twilio (use code 123456)
- Email notifications via Resend
- Document upload to Google Drive

## What's Implemented (as of Dec 2025)

### Session 11 Highlights (December 2025)
1. **Activity Date-Based Dashboard Stats ✅**
   - Dashboard stats (Approved, Total Approved, Disbursed, Total Disbursed, Rejected, Total Eligible) now calculate based on when the action happened, not when the lead was created
   - Backend stores timestamps: `login_done_at`, `approved_at`, `disbursed_at`, `rejected_at` in eligibility records
   - Frontend uses `calculateDashboardStatsWithActivityDates` and `calculateTotalEligibleWithActivityDate` functions
   - Stats cards show "Based on activity date" subtitle
   - Files: `/app/backend/crm.py`, `/app/frontend/src/utils/constants.js`, `/app/frontend/src/components/dashboard/DashboardStats.jsx`

2. **Daily Report PDF Export Fix ✅**
   - Fixed PDF generation errors in Daily Report page
   - Improved error handling for `pdf.lastAutoTable` being undefined
   - Added better null checks and fallbacks in generatePDF function
   - File: `/app/frontend/src/pages/DailyReportPage.js`

3. **New "Total Approved Amount" Stat ✅**
   - Added new stat card to Admin and Ops dashboards
   - Shows sum of approved amounts based on activity date filter
   - Purple-themed card with ₹ currency format

4. **Manager Filter Bug Fix ✅**
   - Fixed undefined `allUsers` variable in AdminDashboard.js
   - Manager filter now correctly applies to BOTH stats AND lead list
   - Added: `const allUsers = [...allAgents, ...allPartners]` at line 1118
   - File: `/app/frontend/src/pages/AdminDashboard.js`

5. **Manager Filter Position Fix ✅**
   - Moved manager filter to top filter bar (above stats)
   - Manager filter now displays alongside Time, Loan Type, Status, Source filters
   - Removed duplicate filter from leads section
   - File: `/app/frontend/src/pages/AdminDashboard.js`

6. **Time Filter Fix for Activity-Based Stats ✅**
   - Fixed issue where "Today" filter showed 0 for Approved/Disbursed/Eligible stats
   - Root cause: Time filter was applied to leads by creation date BEFORE stats calculation
   - Fix: Stats now use `baseFilteredLeads` (without time filter) and calculate based on activity timestamps
   - Backend handles both `'yes'` string AND boolean `true` for `login_done`/`disbursed` fields
   - Added `/api/crm/backfill-timestamps` endpoint to migrate existing data
   - Files: `AdminDashboard.js`, `OperationsDashboard.js`, `/app/backend/crm.py`, `/app/frontend/src/utils/constants.js`

7. **Two Separate Time Filters ✅**
   - Added two independent time filter dropdowns:
     - **"Lead Created"** - Filters Total Leads and New stats (based on lead creation date)
     - **"Activity Date"** - Filters Approved, Total Approved, Disbursed, Total Disbursed, Rejected, Total Eligible stats (based on activity timestamps)
   - Both filters support custom date range (From/To inputs)
   - Stats cards show "Based on activity date" label where applicable
   - Files: `DashboardFilters.jsx`, `AdminDashboard.js`, `OperationsDashboard.js`

8. **Activity Date Filter Logic Fix ✅ (Matches Daily Report)**
   - **Old logic:** Filtered each eligibility by its individual timestamp (approved_at, disbursed_at)
   - **New logic:** Filters LEADS that have ANY activity in date range, then sums ALL their eligibility amounts
   - This now matches exactly how the Daily Report calculates values
   - When Activity Date = "Today", dashboard shows stats for leads with activity today
   - Files: `/app/frontend/src/utils/constants.js` (calculateDashboardStatsWithActivityDates, calculateTotalEligibleWithActivityDate)

### Session 10 Highlights (December 2025)
1. **Total Eligible Stat Linked to All Filters ✅**
   - Total Eligible (Login=Yes) now calculates from filtered leads instead of a separate API call
   - Updates dynamically when any filter (time, loan type, status, source, manager) is applied
   - Added `calculateTotalEligible` function to `/app/frontend/src/utils/constants.js`
   - Applied to both Admin and Operations dashboards

2. **Eligibility Save Bug Fix ✅**
   - Fixed "Failed to save eligibility" error caused by NoneType comparison
   - Modified `/app/backend/crm.py` to handle null `commission_amount` values
   - Eligibility saves now work correctly even with null/missing fields

3. **Dashboard PDF Export ✅**
   - Added "Export PDF" button to Admin and Ops dashboards
   - Exports stats summary and performance charts to PDF
   - Uses jspdf and html2canvas libraries
   - PDF includes: title, date, summary statistics, and chart screenshot
   - Files: AdminDashboard.js, OperationsDashboard.js

### Session 9 Highlights (December 2025)
1. **Query/Hold Reason Feature ✅ COMPLETED**
   - When lead status is changed to 'Query/Hold', a purple-styled text box appears
   - User must enter a reason before updating status
   - Reason is saved to lead document (`query_hold_reason` field)
   - Reason is recorded in activity log
   - Purple alert card displays the reason on lead detail page when status is 'query_hold'
   - Files modified: `/app/backend/crm.py`, `/app/frontend/src/pages/LeadDetailPage.js`
   - Testing: 100% backend and frontend tests passed

2. **Daily Report Calculations Verified ✅**
   - Total Approved Amount calculation working correctly (₹32,10,000)
   - Total Disbursed Amount calculation working correctly (₹32,10,000)
   - Loan Type populated correctly from `additional_data.type_of_loan`
   - Loan Type Distribution chart displays breakdown by loan type

### Session 5 Highlights (March 9, 2026)
1. **Manager/Team Leader Dashboard Earnings Fix ✅**
   - Fixed earnings stats not displaying on Manager and Team Leader dashboards
   - Added earnings state and fetchEarnings function to both dashboards
   - Updated backend /api/crm/system-earnings endpoint to allow manager and team_leader roles
   - Total Earnings and This Month now display correctly (₹37,500 verified)

2. **Lead Detail Navigation Fix ✅ NEW**
   - Fixed logout issue when Manager/Team Leader clicked "View" on a lead
   - Routes /crm/lead/:id and /lead/:leadId now include manager and team_leader in allowedRoles
   - Both roles can navigate to lead detail page without being logged out

3. **Daily Report Dashboard ✅ NEW**
   - New comprehensive daily report feature for Admin and Operations
   - Date range filter (from/to dates) and Manager filter dropdown
   - Summary stats: Total Leads with Activity, Eligible Amount, Approved Amount, Disbursed Amount
   - Three interactive charts: Status Distribution (pie), Daily Activity Trend (line), Leads by Loan Type (bar)
   - Detailed leads table with: Customer, Contact, Loan Type, Status, Agent/Partner, Manager, amounts, Pending Docs
   - Bank Eligibility Details section showing per-lead bank-wise eligibility breakdown
   - PDF Export with charts and tables (using jsPDF + html2canvas)
   - Accessible via "Daily Report" button in Admin and Operations dashboards

### Session 4 Highlights (Current)
1. **Loan Type Options Standardized ✅ NEW**
   - Updated all loan type dropdowns across the entire application
   - Now consistent 7 options: Reduce Home Loan EMI, Merge Multiple Loans, Top-Up Loan, New Personal Loan, New Home Loan, Business Loan, Vehicle Loan
   - Applied to: Public Lead Form, Agent Lead Form, Partner Lead Form, Dashboard Filters, Lead Detail Page

2. **QR Code Display Fix Verified ✅**
   - Confirmed QR code is now visible on Agent and Partner dashboards
   - Previous fix (qr_image_base64 key) working correctly

### Session 3 Highlights
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

### Ready for Production
- [x] ~~Activate Notifications System (SMS/Email)~~ - Requires Twilio/Resend API keys when ready
- [x] ~~Document Upload~~ - ✅ Local storage implemented (Google Drive ready when Workspace available)
- [x] ~~Refactor LeadDetailPage.js~~ - ✅ COMPLETED

### Pending (Requires External Setup)
- [ ] **SMS OTP via Twilio** - User will provide API keys later
- [ ] **Email via Resend** - User will provide API keys later  
- [ ] **Google Drive Storage** - User will get Google Workspace later (code ready)

## Code Architecture (After Refactor)


## Session 5 Highlights (December 12, 2025)

### Features Added
1. **Approval Queue Tab (Enhancement) ✅ NEW**
   - New "Approvals" tab on Admin Dashboard with pending count badge
   - Lists all pending agents and partners awaiting approval
   - One-click Approve/Reject buttons for fast workflow
   - Shows user details: name, email, phone, code, city, registration date
   - ID Card viewing button if uploaded
   - Real-time badge updates after approval/rejection

2. **View All Registration Details (Enhancement) ✅ NEW**
   - "View Details" button on each agent/partner in Approvals tab and Users tab
   - Expandable card showing complete registration info:
     - **Basic Information**: Name, Email, Phone, City, Code, Registration date
     - **KYC Details**: PAN Number, Approval Status, ID Card link
     - **Bank Details**: Bank Name, Account Holder, Account Number, IFSC Code
   - For approved users, also shows Performance metrics (Total Leads, Converted, Commission)

3. **Enhanced CSV Export with Agent/Partner Details (Enhancement) ✅ NEW**
   - Export now includes 25 columns with comprehensive data:
     - **Lead Info**: ID, Name, Mobile, Email, City, Loan Type, Ticket Size, Status, Created At
     - **Source (Agent/Partner)**: Type, Name, Code, Phone, Email, City, PAN
     - **Source Bank Details**: Bank Name, Account Holder, Account Number, IFSC Code
     - **Assignment**: Ops User Name, Email
     - **Status History**: All status changes with timestamps
     - **Bank Eligibilities**: Per-bank eligibility status

4. **Eligibility Field Update (Enhancement) ✅ NEW**
   - Changed "Eligible Tenure (months)" to "ROI (%)" in Bank Eligibility tracking
   - Updated field name, input type (now decimal), and placeholder
   - Updated data model from `eligible_tenure` to `eligible_roi`

5. **Added "Balance Transfer" Loan Type (Enhancement) ✅ NEW**
   - Added to all loan type dropdowns across the application:
     - Public Lead Form (`/lead-form`)
     - Agent Lead Create Form
     - Partner Lead Create Form
     - Lead Detail Page (Loan Requirements section)
     - Dashboard Filters (Admin, Ops, Agent, Partner)
   - Files updated: `constants.js`, `LoanRequirementsSection.jsx`, `LeadFormPage.js`, `AgentLeadCreate.js`, `PartnerLeadCreate.js`

6. **Export Disbursed Leads with Date Filter (Enhancement) ✅ NEW**
   - Changed export to only include disbursed leads (not all leads)
   - Added date range filter (From Date / To Date)
   - CSV now includes:
     - Lead details (ID, Name, Mobile, Email, City, Loan Type)
     - Agent/Partner details (Name, Code, Phone, Email, PAN, Bank Details)
     - **Disbursement Info**: Disbursed Bank, Disbursed Amount, ROI %, Commission %, Commission Amount
   - Summary row at bottom shows totals
   - Modal UI with date pickers for easy filtering

7. **Enhanced Dashboard Filters (Enhancement) ✅ NEW**
   - **Time Filter** now includes:
     - All Time, Today (NEW), This Week (NEW), This Month, Last Month, Last 3/6 Months, This Year
     - **Custom Range** (NEW) - shows From/To date pickers when selected
   - **Source Filter** (NEW):
     - Filter leads by Agent, Partner, or Digital/Direct
     - Select specific Agent or Partner from dropdown
   - Available on both Admin and Operations dashboards

8. **Export Agent/Partner Stats (Enhancement) ✅ VERIFIED**
   - New "Export Stats" button on Admin and Ops dashboards
   - Exports CSV with **25 columns** including **ALL 17 lead statuses**:
     - **Identity columns (6)**: Type, Name, Code, Phone, Email, Total Leads
     - **Status columns (17)**: New, Contacted, Docs Collected, Sent for Eligibility, Sent for Login, Login, Sent for Approval, Underwriting, FI, Query/Hold, Approved, Disbursed, Not Eligible, Not Login, Declined, Not Disbursed, Rejected
     - **Financial columns (2)**: Disbursed Amount (₹), Commission (₹)
   - Summary totals for agents and partners at bottom
   - Date range filter support
   - **Verified Feb 11, 2026**: CSV download tested successfully with proper data

9. **New Lead Status Options (Enhancement) ✅ NEW**
   - Added 6 new status options:
     - Sent for Eligibility
     - Sent for Login
     - Sent for Approval
     - Underwriting
     - FI (Field Investigation)
     - Query/Hold
   - Available in all status dropdowns (filters and status update)

10. **Application ID for Status Update (Enhancement) ✅ NEW**
    - When updating status to Login or later stages, ops can enter Application ID
    - Application ID is stored in lead record and activity log
    - Shows in status change activity: "Status changed to login (Application ID: ABC123)"

### Bugs Fixed
1. **Agent Registration Flow Fix (P0) ✅**
   - Fixed critical bug where agent user documents were missing `is_active` and `is_approved` fields
   - Agent approval now syncs both `agents` and `users` collections
   - Full registration → approval → login flow verified via testing agent

2. **ROI and Application ID Not Saving (P0) ✅ NEW**
   - **Issue:** ROI (%) and Application ID fields in Bank Eligibility section were not being saved
   - **Root Cause:** Frontend-backend type mismatch:
     - Frontend sent string values ('yes'/'no') but backend expected boolean (true/false)
     - Backend model was missing `eligible_roi` and `application_id` fields
   - **Fix Applied:**
     - Updated `backend/crm.py` EligibilityEntry model to accept strings for `is_eligible`, `login_done`, `disbursed`
     - Added `eligible_roi` and `application_id` fields to the model
     - Updated `frontend/LeadDetailPage.js` to handle both string and boolean values on load
     - Updated save logic to send strings instead of converting to booleans
   - **Verified:** Full save/load cycle tested and working correctly

3. **Multi-File Document Upload Enhancement (P1) ✅ NEW**
   - **Issue:** Ops/Admin could only upload one document at a time in lead detail
   - **Issue:** Agent lead form had no document upload capability
   - **Fixes Applied:**
     - Updated `ActivityLog.jsx` to support multiple file selection (`multiple` attribute)
     - Sequential upload of files with individual success/failure tracking
     - Updated `AgentLeadCreate.js` with mandatory document upload section:
       - File selection with preview list
       - Remove individual files before submit
       - Required documents checklist (Aadhaar, PAN, Payslips, Bank Statements, etc.)
       - Submit button disabled until at least one document is selected
       - Documents uploaded after lead creation with progress feedback
   - **Verified:** Both features tested and working correctly

4. **Database Query Optimization (P2) ✅ NEW**
   - **Issue:** Unoptimized database queries fetching more data than needed
   - **Fixes Applied:**
     - Added MongoDB projections to list endpoints:
       - `/api/leads/` - Returns 13 fields (down from 25+)
       - `/api/agents/` - Returns 9 fields (down from 15+)
       - `/api/partners/` - Returns 8 fields (down from 15+)
     - Optimized assignee lookup queries in CRM module
     - Created database indexes for frequently queried fields:
       - `leads`: status, source, source_id, assigned_to, created_at
       - `agents`: email, agent_code, user_id, is_approved
       - `partners`: email, referral_code, user_id, is_approved
       - `users`: email, role, is_active
       - `commissions`: lead_id, user_id
   - **Result:** Improved query performance and reduced data transfer

5. **Total Disbursed Amount Not Calculating (P0) ✅ NEW**
   - **Issue:** Total Disbursed showing ₹0 on Admin and Operations dashboards despite having 2 disbursed leads
   - **Root Causes:**
     1. List API projection didn't include `eligibilities` field needed for calculation
     2. Dashboard code checking `disbursed === true` but data had boolean `True` (Python)
   - **Fixes Applied:**
     - Updated leads list endpoint projection to include `eligibilities` field
     - Updated `calculateDashboardStats` in `constants.js` to check both `'yes'` and `true`
     - Updated `AdminDashboard.js` Export Stats calculation
     - Updated `OperationsDashboard.js` Export Stats calculation
   - **Result:** Total Disbursed now correctly shows ₹1,350,000 (1,200,000 + 150,000)

6. **Added Balance Transfer+Top-Up Loan Type (Enhancement) ✅ NEW**
   - Added new loan type option "Balance Transfer+Top-Up" across the application
   - Updated files:
     - `constants.js` - Added to LOAN_TYPES array
     - `AgentLeadCreate.js` - Added to loan type dropdown
     - `LeadFormPage.js` - Added to public lead form
     - `PartnerLeadCreate.js` - Added to partner lead form
   - Dashboard filters automatically use LOAN_TYPES constant
   - Total loan types now: 9 options

7. **Agent Document Upload Not Saving (P0) ✅ NEW**
   - **Issue:** Documents uploaded by agents weren't being saved/viewable, but admin/ops uploads worked fine
   - **Root Causes Found:**
     1. **Wrong response field**: Frontend used `response.data.id` but API returns `lead_id`
     2. **Permission mismatch**: `lead.source_id` stores agent's ID, but permission check compared with `user.id` (different IDs)
   - **Fixes Applied:**
     - `AgentLeadCreate.js`: Changed to use `leadResponse.data.lead_id || leadResponse.data.id`
     - `leads.py` (get_lead): Updated to lookup agent's ID from agents collection and compare both user_id and agent_id
     - `leads.py` (get_leads): Updated list endpoint with same agent/partner ID lookup logic
   - **Result:** Agents can now see their leads (2 leads found) and documents (1 document visible)

8. **Added 5 New Lead Status Options (Enhancement) ✅ NEW**
   - Added new status options to the lead lifecycle:
     1. **Documents Pending** - With special input field to enter list of pending documents
     2. **Customer Not Interested - Need Help from MIT & Manager**
     3. **Customer Not Supporting - Need Help from MIT & Manager**
     4. **FI Negative**
     5. **FI Reinitiated**
   - Updated files:
     - `constants.js` - Added new statuses to LEAD_STATUSES and STATUS_CATEGORIES
     - `StatusUpdateCard.jsx` - Added conditional textarea for pending documents
     - `LeadDetailPage.js` - Added state management and pending documents alert card
     - `crm.py` - Updated valid_statuses list and StatusUpdate model
     - `AdminDashboard.js` & `OperationsDashboard.js` - Updated export stats with new status columns
   - Pending documents are recorded in activity log
   - Total lead statuses now: 22 options

9. **DB_NAME Environment Variable Fix (P1) ✅**
   - Fixed deployment blocker by changing `os.environ['DB_NAME']` to `os.environ.get('DB_NAME', 'test_database')`
   - Updated in all 12 backend files (auth.py, leads.py, agents.py, partners.py, etc.)
   - Removed hardcoded DB_NAME from backend/.env
   - Application now works correctly in both preview and production environments

3. **Admin ID Card Viewing (P2) ✅**
   - ID Card buttons now properly construct full URLs with backend URL prefix
   - Handles both relative paths (`/api/storage/public/...`) and absolute URLs

4. **Real-time Dashboard Stats Update (P2) ✅**
   - Lead deletion now updates UI immediately via state update
   - No more full page refresh needed after deleting a lead

### Testing
- Testing agent ran 16 backend tests + frontend UI tests - all passed
- Test report: `/app/test_reports/iteration_6.json`

## Session 6 Highlights (February 13, 2026)

### Bugs Fixed
1. **Operations Dashboard Agent/Partner Filter Fix (P1) ✅**
   - Issue: Operations users couldn't see agent/partner name dropdown when filtering by source
   - Root cause: `/api/auth/admin/all-users` endpoint was restricted to admin role only
   - Fix: Modified endpoint to allow both `admin` and `operations` roles
   - Result: Ops dashboard now shows agent/partner selection dropdown matching Admin dashboard

## Session 7 Highlights (December 2025)

### Features Completed
1. **Admin Password Reset Feature (P0) ✅**
   - Admin can now view User ID and reset passwords for any user
   - **Implementation:**
     - User Details panel shows "Account Details" section with User ID and Email (with copy buttons)
     - "Set/Reset Password" button opens modal dialog
     - Modal validates password length (min 6 characters)
     - Backend endpoint `POST /api/auth/admin/set-password` securely hashes and updates password
   - **Security:** Passwords are never displayed; only reset functionality provided
   - **Files Modified:**
     - `AdminDashboard.js` - Added UserDetailCard with Account Details section and password modal
     - `auth.py` - Backend endpoint for secure password updates
   - **Testing Completed:**
     - ✅ Backend API tested with curl (password reset and re-login verified)
     - ✅ Frontend UI tested with screenshot (modal displays correctly)
     - ✅ Old password invalidated after reset
     - ✅ New password allows successful login

## Session 8 Highlights (December 2025)

### Features Completed
1. **Hierarchical User Management System (P0) ✅**
   - New user roles: **Manager** and **Team Leader**
   - Pre-created accounts:
     - Managers: Saikrishna, Manmith, Saikiran (password: manager123)
     - Team Leaders: Anusha, Sravan, Shiva Sai, Pinky (password: teamlead123)
   
   **Admin Features:**
   - Users tab now shows Managers and Team Leaders sections
   - "Assign Manager" button for Team Leaders to assign them under a Manager
   - "Map" button for Agents/Partners to assign Manager (mandatory) + Team Leader (optional)
   - Export Stats modal with Manager and Team Leader filter dropdowns
   
   **Manager Dashboard (/manager/dashboard):**
   - View-only access to all leads from team members
   - Shows Team Leaders under them
   - Shows Agents/Partners directly under them + those under their Team Leaders
   - Password change functionality
   
   **Team Leader Dashboard (/team-leader/dashboard):**
   - View-only access to leads from direct reports only
   - Shows only Agents/Partners directly mapped to them
   - Password change functionality
   
   **Files Created:**
   - `/app/backend/hierarchy.py` - New hierarchy management endpoints
   - `/app/frontend/src/pages/ManagerDashboard.js` - Manager dashboard
   - `/app/frontend/src/pages/TeamLeaderDashboard.js` - Team Leader dashboard
   
   **Files Modified:**
   - `AdminDashboard.js` - User mapping UI, TL assignment modal, Export Stats filters
   - `auth.py` - Added managers/team_leaders to all-users endpoint, password change endpoint
   - `App.js` - Added routes for manager and team leader dashboards
   - `LoginPage.js` - Routing for manager and team_leader roles
   
   **Testing Completed:**
   - ✅ 25/25 backend tests passed (100%)
   - ✅ All frontend UI tests passed
   - ✅ Manager login and dashboard verified
   - ✅ Team Leader login and dashboard verified
   - ✅ User mapping flow tested
   - ✅ Export Stats with filters tested

### Bug Fixes
1. **Total Earnings & This Month Stats Fix (P0) ✅**
   - Issue: Earnings stats were showing ₹0 on Admin and Ops dashboards
   - Root cause: DashboardStats component was receiving hardcoded `{ total_earnings: 0, monthly_earnings: 0 }`
   - Solution: Created `/api/crm/system-earnings` endpoint to calculate total system earnings from all commissions
   - Admin/Ops dashboards now correctly show Total Earnings (₹37,500) and monthly earnings
   
2. **Disbursed Reversal Logic (P0) ✅**
   - Issue: When disbursed was changed from 'yes' to 'no', commission was not being deducted
   - Solution: Updated `/api/crm/{lead_id}/eligibilities` endpoint to:
     - Track previous disbursed amounts and commissions
     - Deduct commission when disbursed is reversed
     - Log negative commission entry as "reversal" type
     - Decrement converted_leads/approved_cases count
   
3. **Manager/Team Leader Account Management (P0) ✅**
   - Issue: New Manager and Team Leader accounts not visible in Admin dashboard
   - Solution: 
     - Added Managers and Team Leaders sections to Users tab
     - Added "Add Manager" button with create modal (Full Name, Email, Password, Phone)
     - Added "Add Team Leader" button with create modal (Full Name, Email, Password, Phone, Manager selection)
     - Created `/api/auth/admin/create-manager` and `/api/auth/admin/create-team-leader` endpoints

## Pending/Future Tasks

### P0 - Critical
- None

### P1 - High Priority
- None

### P2 - Medium Priority  
- Database query optimization (11 queries flagged by health check)

### P3 - Deferred (Awaiting External Setup)
- **Google Drive Integration** - Document storage (user will provide Google Workspace account)
- **Twilio SMS** - Real OTP notifications (user will provide API keys)
- **Resend Email** - Email notifications (user will provide API keys)

## Test Credentials
- **Admin:** admin@bankezee.com / admin123
- **Operations:** ops@bankezee.com / ops123
- **New Agent/Partner:** Create via registration, then approve via admin, password set during registration

## API Endpoints Added/Modified

### Session 5
- `DELETE /api/leads/{lead_id}` - Delete lead (with cascade to commissions)
- `GET /api/leads/export/all` - Export all leads to CSV
- `DELETE /api/auth/admin/users/{user_id}` - Delete user (ops/agent/partner)
- `GET /api/auth/admin/all-users` - Get all users by role
- `POST /api/storage/upload-public` - Public file upload for ID cards (no auth)
- `GET /api/storage/public/{path}` - Serve public files (ID cards)

## Mocked Features
- **SMS OTP via Twilio** (use code 123456 for testing)
- **Email notifications via Resend**
- **Document Upload to Google Drive** (using local file storage instead)

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
