# Bankezee CRM Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for a fintech company called BankEzee. The platform should function as a Lead Generation + Sales CRM + Partner Management system.

## Brand Colors
- **Primary Green:** #22af47
- **Secondary Gray:** #535353

## User Roles
1. **Admin** - Full system access, user approvals, analytics, lead assignment
2. **Operations Team** - Process assigned leads, update statuses, manage workflow
3. **Manager** - View-only access to leads from their team
4. **Team Leader** - View-only access to leads from direct reports
5. **Sales Agent (Growth Partner)** - Generate leads, track commission, unique QR code
6. **Retail Partner** - Generate leads, track earnings, unique QR code

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Axios
- **Backend:** FastAPI, MongoDB (motor async driver)
- **Authentication:** JWT tokens
- **Deployment:** Containerized with supervisor

## Test Credentials
- **Admin:** admin@bankezee.com / admin123
- **Operations:** ops@bankezee.com / ops123
- **Manager:** saikrishna@bankezee.com / manager123
- **Team Leader:** anusha@bankezee.com / teamlead123
- **Mock OTP:** 123456

## Key Routes
- `/login` - Login page
- `/admin/dashboard` - Admin dashboard
- `/operations/dashboard` - Operations dashboard
- `/manager/dashboard` - Manager dashboard
- `/team-leader/dashboard` - Team Leader dashboard
- `/bank-policy-master` - Bank Policy Master (Admin only)
- `/eligibility-check/:leadId` - Eligibility Check for a lead
- `/reports/sales-operations` - Sales & Operations Report
- `/reports/quality` - Quality Report (Star Rating distribution)

## Mocked Features
- SMS OTP via Twilio (use code 123456)
- Email notifications via Resend

## Code Architecture
```
/app/
├── backend/
│   ├── server.py              # FastAPI main app
│   ├── auth.py                # Authentication
│   ├── leads.py               # Lead CRUD
│   ├── crm.py                 # CRM operations, eligibility, star ratings
│   ├── reports.py             # Complex reporting (TAT, Quality, Performance)
│   ├── bank_policies.py       # Bank Policy Master + Eligibility Engine
│   ├── hierarchy.py           # User hierarchy management
│   ├── file_storage.py        # File storage + ZIP download
│   ├── seed_policies.py       # Policy data seed script
│   └── tests/
│       └── test_bank_policies_eligibility.py
└── frontend/
    └── src/
        ├── components/
        │   ├── StarRating.jsx
        │   └── dashboard/
        │       └── DashboardStats.jsx
        ├── pages/
        │   ├── BankPolicyMaster.js     # Bank policy CRUD UI
        │   ├── EligibilityCheck.js     # Eligibility analysis UI
        │   ├── QualityReport.js
        │   ├── SalesOperationsReport.js
        │   ├── AgentPerformanceReport.js
        │   ├── AdminDashboard.js
        │   └── OperationsDashboard.js
        └── utils/
            └── constants.js
```

## Automated Loan Eligibility Engine

### Phase 1: Bank Policy Master ✅ COMPLETE
- 27 bank/NBFC policies imported from user's spreadsheet
- Banks: HDFC, ICICI, Axis Bank, YES Bank, IDFC, Tata Capital, InCred, Finnable, IndusInd, Fullerton, Kotak Mahindra, Poonawalla, Prefr, Aditya Birla, Axis Finance, AU Small Finance, Bajaj Finserv, Bandhan Bank, Cholamandalam, DMI Finance, Early Salary (Fibe), Fatak Pay, L&T Finance, Piramal Capital, South Indian Bank, Utkarsh Small Finance Bank
- Each policy stores: numeric thresholds (min_salary, min_cibil, max_foir, etc.) AND rich text fields (salary_text, cibil_text, roi_text, foir_text, tenure_text, eligible_employees, company_requirement_text, bt_text, topup_text, etc.)
- Full CRUD via Admin UI at `/bank-policy-master`
- API: GET/POST/PUT/DELETE `/api/bank-policies/policies`

### Phase 2: Eligibility Check Engine ✅ COMPLETE
- Evaluates a lead against ALL active bank policies
- Checks: Net Salary, CIBIL Score, Age, FOIR, Company Category, Present/Total Employment, CIBIL Issues
- Calculates eligible loan amount using PV of annuity formula
- Classifies as: ELIGIBLE / POSSIBLY ELIGIBLE / NOT ELIGIBLE
- Confidence levels: HIGH / MEDIUM / LOW based on data completeness
- Ranks top 3 eligible banks
- Saves snapshots for history
- API: POST `/api/bank-policies/check-eligibility/{lead_id}`

### Phase 3: Consolidation Analysis ✅ COMPLETE
- Side-by-side Bank Comparison Table (Top 8 banks) with: Bank, Status, Eligible Amt, ROI, Tenure, Min Salary, CIBIL, BT, Top-up, Bachelor, Hostel
- Print Report: Opens formatted HTML in new window with profile summary, comparison table, and per-bank detailed analysis
- Eligibility History: View previous check snapshots with date, counts, profile strength
- API: GET `/api/bank-policies/eligibility-history/{lead_id}`

### Phase 4: AI Document Parsing — NOT STARTED
- OpenAI GPT integration to extract data from uploaded PDFs (Salary Slips, CIBIL Reports, Bank Statements, Form 16)
- User chose GPT (OpenAI) for document understanding
- Will use Emergent LLM Key

### Phase 5: Historical Case Learning — NOT STARTED
- Learn from past approved/rejected cases to improve recommendations

## Statistics Engine Rules
- **Total Leads**: Based on Lead Created date
- **In Progress**: Based on Lead Created date, specific statuses
- **Login**: Current status is login or beyond + rejected leads previously in login stage
- **Approved**: Based on Activity Date (eligibility approved_at)
- **Disbursed**: Based on Activity Date (eligibility disbursed_at)
- **Interim Rejects**: fi_negative, declined, customer_not_interested, customer_not_supporting — activity date
- **Final Rejections**: rejected, not_eligible, not_login, not_disbursed — activity date
- **Amt in Pipeline**: Sum of eligible_amount where login_done=yes AND application_id filled

## Pending/Future Tasks

### P0 - Critical
- None

### P1 - High Priority
- Commission Payout Reports
- Bulk User Approval
- Phase 4: AI Document Parsing (OpenAI GPT for PDFs)

### P2 - Medium Priority
- Bulk Agent Mapping
- Phase 5: Historical Case Learning

### P3 - Deferred
- Google Drive Integration for documents
- Twilio SMS for real OTP
- Resend Email notifications
- Refactor AdminDashboard.js and reports.py (very large files)
