# Bankezee CRM Platform - Product Requirements Document

## Original Problem Statement
Build a full-stack web application for a fintech company called BankEzee. The platform should function as a Lead Generation + Sales CRM + Partner Management system.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Axios
- **Backend:** FastAPI, MongoDB (motor async driver)
- **Authentication:** JWT tokens
- **AI/LLM:** Gemini 2.5 Flash via emergentintegrations (Emergent LLM Key)

## Automated Loan Eligibility Engine — ALL PHASES COMPLETE

### Phase 1: Bank Policy Master ✅
- 27 bank/NBFC policies imported from user's spreadsheet
- Auto-seed on server startup if collection empty

### Phase 2: Eligibility Check Engine ✅
- Evaluates leads against ALL 27 active policies
- Smart critical vs non-critical field handling (employment/age = warning only)
- FOIR auto-calculation from EMI/Salary
- EMI resolution from obligations_emi/existing_emi/current_emi

### Phase 3: Consolidation Analysis ✅
- Side-by-side Bank Comparison Table (Top 8)
- Print Report, Eligibility History

### Phase 4: AI Document Parsing ✅
- Gemini 2.5 Flash parses CRIF/CIBIL, salary slips, bank statements, Form 16
- Auto-parse on eligibility check page load (filename keyword detection)
- Auto-fills lead profile and re-runs eligibility

### Phase 5: Historical Case Learning ✅ (Aug 28, 2026)
- Aggregates past approved/disbursed cases per bank
- Similarity matching: finds cases within 30% salary + 50 CIBIL points
- Shows on bank cards: "X similar cases approved (Y% rate)", "Z disbursed (avg ₹NL)"
- Expanded view shows full historical stats grid
- Smart Profile Strength: Strong (20+ eligible), Moderate (10+), Fair (5+), Weak, Not Eligible

## Pending/Future Tasks

### P1 - High Priority
- Commission Payout Reports
- Bulk User Approval

### P2 - Medium Priority
- Bulk Agent Mapping

### P3 - Deferred
- Google Drive Integration, Twilio SMS, Resend Email
- Refactor AdminDashboard.js and reports.py
- Cache historical stats (currently re-aggregates per request)
