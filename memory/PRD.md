# Bankezee CRM Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for a fintech company called BankEzee. The platform should function as a Lead Generation + Sales CRM + Partner Management system.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Axios
- **Backend:** FastAPI, MongoDB (motor async driver)
- **Authentication:** JWT tokens
- **AI/LLM:** Gemini 2.5 Flash via emergentintegrations (Emergent LLM Key)

## Automated Loan Eligibility Engine — ALL 5 PHASES COMPLETE

### Phase 1: Bank Policy Master ✅
- 27 bank/NBFC policies imported from user's spreadsheet
- Auto-seed on server startup if collection empty

### Phase 2: Eligibility Check Engine ✅
- Evaluates leads against ALL 27 active policies
- Smart critical vs non-critical field handling
- FOIR auto-calculation from EMI/Salary
- EMI resolution from obligations_emi/existing_emi/current_emi

### Phase 3: Consolidation Analysis ✅
- Side-by-side Bank Comparison Table, Print Report, History

### Phase 4: AI Document Parsing ✅
- Gemini 2.5 Flash parses CRIF/CIBIL, salary slips, bank statements, Form 16
- Auto-parse on eligibility check page load

### Phase 5: Historical Case Learning ✅
- Past approval/disbursal data per bank
- Similarity matching within 30% salary + 50 CIBIL points
- Smart Profile Strength: Strong/Moderate/Fair/Weak/Not Eligible

### Rules Engine Enhancements ✅ (Aug 28, 2026)
- **Smart EMI Resolution**: When obligations_emi=0 but existing_loan_1/2/3 have data, sums individual loan EMIs via regex parsing
- **FOIR Priority**: Manual entry > auto-calculated from EMI/salary
- **Loan Type Awareness**: BT requests check if bank supports BT; non-BT banks correctly marked NOT ELIGIBLE
- **Shared resolve_emi_and_foir() helper**: Eliminates duplication between profile summary and engine
- **EMI number cap**: Only considers amounts 100-100,000 to avoid matching account numbers

## Pending/Future Tasks

### P1 - High Priority
- Commission Payout Reports
- Bulk User Approval

### P2 - Medium Priority
- Bulk Agent Mapping

### P3 - Deferred
- Google Drive, Twilio SMS, Resend Email
- Refactor AdminDashboard.js and reports.py
- Cache historical stats for performance
