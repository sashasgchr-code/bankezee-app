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
- **AI/LLM:** Gemini 2.5 Flash via emergentintegrations (Emergent LLM Key)
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
│   ├── reports.py             # Complex reporting
│   ├── bank_policies.py       # Bank Policy Master + Eligibility Engine
│   ├── document_ai.py         # AI Document Parsing (Gemini)
│   ├── hierarchy.py           # User hierarchy management
│   ├── file_storage.py        # File storage + ZIP download
│   ├── seed_policies.py       # Policy data seed script (27 banks)
│   └── tests/
│       ├── test_bank_policies_eligibility.py
│       ├── test_emi_foir_bugfix.py
│       └── test_document_ai.py
└── frontend/
    └── src/
        ├── pages/
        │   ├── BankPolicyMaster.js     # Bank policy CRUD UI
        │   ├── EligibilityCheck.js     # Eligibility analysis + AI Parser UI
        │   ├── AdminDashboard.js
        │   └── OperationsDashboard.js
        └── utils/
            └── constants.js
```

## Automated Loan Eligibility Engine

### Phase 1: Bank Policy Master ✅ COMPLETE
- 27 bank/NBFC policies imported from user's spreadsheet
- Rich text fields (salary_text, cibil_text, roi_text, tenure_text, bt_text, topup_text, etc.)
- Full CRUD via Admin UI at `/bank-policy-master`
- Auto-seed on server startup if collection empty

### Phase 2: Eligibility Check Engine ✅ COMPLETE
- Evaluates leads against ALL 27 active bank policies
- Checks: Net Salary, CIBIL Score, Age, FOIR, Company Category, Present/Total Employment, CIBIL Issues
- Calculates eligible loan amount using PV of annuity formula
- FOIR auto-calculation from EMI/Salary when not explicitly set
- EMI resolution from multiple field names (existing_emi, current_emi, obligations_emi)
- Classifies as: ELIGIBLE / POSSIBLY ELIGIBLE / NOT ELIGIBLE with confidence levels

### Phase 3: Consolidation Analysis ✅ COMPLETE
- Side-by-side Bank Comparison Table (Top 8 banks)
- Print Report: Formatted HTML in new window
- Eligibility History: Previous check snapshots

### Phase 4: AI Document Parsing ✅ COMPLETE (Aug 28, 2026)
- Uses Gemini 2.5 Flash via emergentintegrations library
- Parses: CRIF/CIBIL reports, Salary slips, Bank statements, Form 16
- Extracts structured financial data (credit score, EMI, outstanding, active loans, etc.)
- Auto-fills lead profile from parsed data
- Re-runs eligibility with updated data
- UI: "AI Parse Docs" button in eligibility check header
- Endpoints: /api/document-ai/parse-document/{lead_id}, /api/document-ai/parse-external-document, /api/document-ai/auto-fill-from-parse/{lead_id}

### Phase 5: Historical Case Learning — NOT STARTED
- Learn from past approved/rejected cases to improve recommendations

## Pending/Future Tasks

### P1 - High Priority
- Commission Payout Reports
- Bulk User Approval
- Phase 5: Historical Case Learning

### P2 - Medium Priority
- Bulk Agent Mapping

### P3 - Deferred
- Google Drive Integration for documents
- Twilio SMS for real OTP
- Resend Email notifications
- Refactor AdminDashboard.js and reports.py
