# BankEzee CRM — Statistics Calculation Rules
## Complete Reference for Rebuilding the Stats Engine

---

## 1. DATA MODEL (Key Fields)

### Lead Document
```
{
  id, full_name, mobile, city, status, source, source_id, assigned_to,
  created_at,           // ISO timestamp — when lead was created
  updated_at,           // ISO timestamp — last modification
  requirement,          // loan type enum
  additional_data: {
    net_salary, cibil_score, company_type, obligations_emi,
    existing_loan_1, existing_loan_2, existing_loan_3,
    type_of_loan, loan_amount_required, company_name, ...
  },
  activities: [         // ACTIVITY LOG — array of events
    {
      type,             // "status_change", "assignment", "note", "eligibility_update", etc.
      message,          // human-readable description
      by,               // user ID who performed action
      by_name,          // user display name
      timestamp,        // ISO timestamp — WHEN the action happened (ACTIVITY DATE)
      old_status,       // previous status (for status_change type)
      new_status,       // new status (for status_change type, also "to_status")
    }
  ],
  eligibilities: [      // BANK ELIGIBILITY ENTRIES — one per bank
    {
      bank_name,
      is_eligible,        // "yes" / "no"
      not_eligible_reason,
      eligible_amount,    // number
      login_done,         // "yes" / "no"
      login_done_at,      // ISO timestamp — WHEN login happened
      application_id,     // filled after login
      approval_status,    // "approved" / "declined"
      approved_amount,    // number
      approved_at,        // ISO timestamp — WHEN approval happened
      disbursed,          // "yes" / "no"
      disbursed_amount,   // number
      disbursed_at,       // ISO timestamp — WHEN disbursal happened
      declined_reason,
      roi,
      updated_at,
    }
  ],
  documents: [...],
  star_rating, star_score,
}
```

---

## 2. STATUS CATEGORIES

```
NEW:              [new]
IN PROGRESS:      [contacted, documents_collected, documents_pending, sent_for_eligibility,
                   sent_for_login, login, sent_for_approval, underwriting, fi, fi_reinitiated, query_hold]
LOGIN & BEYOND:   [login, sent_for_approval, underwriting, fi, fi_negative, fi_reinitiated,
                   query_hold, approved, disbursed, declined, not_disbursed]
INTERIM REJECTS:  [fi_negative, declined, customer_not_interested, customer_not_supporting]
FINAL REJECTIONS: [rejected, not_eligible, not_login, not_disbursed]
APPROVED:         [approved]
DISBURSED:        [disbursed]
```

---

## 3. THE GOLDEN RULE: created_at vs activity timestamp

### ⚡ This is the most critical distinction in the entire stats system.

| Stat | Date Used for Filtering | Explanation |
|------|------------------------|-------------|
| **Total Leads / Files Generated** | `lead.created_at` | Count of leads CREATED in the date range |
| **In Progress** | `lead.created_at` | Count of leads CREATED in the date range whose CURRENT status is in IN_PROGRESS list. **No spillover** — only counts leads born in the range |
| **Login / Files Logged** | `activities[].timestamp` | Count of leads that have ANY activity in the date range AND whose current status is in LOGIN_AND_BEYOND. Also includes `rejected` leads IF they were previously in login stage (check activity log for to_status in LOGIN_AND_BEYOND) |
| **Approvals** | `eligibilities[].approved_at` | Count of leads where ANY eligibility has `approval_status="approved"` AND `approved_at` falls within the date range |
| **Disbursals** | `eligibilities[].disbursed_at` | Count of leads where ANY eligibility has `disbursed="yes"` AND `disbursed_at` falls within the date range |
| **Interim Rejects** | `activities[].timestamp` | Count of leads whose current status is in INTERIM_REJECTS AND that have any activity in the date range |
| **Final Rejections** | `activities[].timestamp` | Count of leads whose current status is in FINAL_REJECTIONS AND that have any activity in the date range |
| **Amt in Pipeline** | No date filter (always current snapshot) | Sum of `eligible_amount` where `login_done=yes` AND `application_id` is not blank AND `disbursed≠yes` AND `approval_status≠declined` AND lead status NOT IN [rejected, not_eligible, not_login, not_disbursed, declined, disbursed] |
| **Approved Amount** | `eligibilities[].approved_at` | Sum of `approved_amount` where `approval_status="approved"` AND `approved_at` in range |
| **Disbursed Amount** | `eligibilities[].disbursed_at` | Sum of `disbursed_amount` where `disbursed="yes"` AND `disbursed_at` in range |

---

## 4. CURRENT vs SPILLOVER SPLIT

Every activity-date-based stat is split into **Current (C)** and **Spillover (S)**:

- **Current**: Lead was CREATED within the selected date range (`created_at` in range)
- **Spillover**: Lead was CREATED BEFORE the selected date range, but had ACTIVITY within the range

### How it works in the Sales & Operations Report:

```
Step 1: Query "current leads" = leads WHERE created_at is within [start_date, end_date]
Step 2: Query "spillover leads" = leads WHERE created_at < start_date
Step 3: For spillover leads, ONLY include those that have at least one:
        - eligibilities[].login_done_at in range, OR
        - eligibilities[].approved_at in range, OR
        - eligibilities[].disbursed_at in range, OR
        - activities[].timestamp in range
Step 4: Calculate stats separately for current and spillover sets
Step 5: Display as "Total (C + S)" e.g., "5 (3C + 2S)"
```

### Special rule for In Progress:
**In Progress does NOT have spillover.** It only counts leads CREATED in the date range with current status in IN_PROGRESS. A spillover lead cannot be "in progress" because its file was generated before the period.

### Special rule for Files Generated:
**Files Generated = count of leads created in date range.** Spillover leads that have activity in range are ALSO counted as "files" in the spillover context (they appear in the report), but the "Files Generated" metric itself is current-only.

---

## 5. DATE FILTER BEHAVIOR (Time Period Filters)

All date comparisons use **UTC**. Available filters:

| Filter | Date Range |
|--------|-----------|
| Today | UTC today 00:00:00 to 23:59:59 |
| This Week | UTC Sunday 00:00:00 to now |
| This Month | 1st of current month to now |
| Last Month | 1st to last day of previous month |
| Last 3 Months | 3 months ago to now |
| Last 6 Months | 6 months ago to now |
| This Year | Jan 1 to now |
| Custom | User-selected from/to dates |
| **All Time** | No filter — count everything |

### Critical: "All Time" behavior
When "All Time" is selected:
- `created_at` filter: returns ALL leads (no filtering)
- Activity date filter: ALL activities match (no filtering)
- There is NO current/spillover split — everything is "current"
- All stats are simply: count leads matching the status condition

---

## 6. DETAILED STAT CALCULATIONS

### 6.1 Total Leads / Files Generated
```
COUNT leads WHERE created_at IN date_range
```
- Always uses `created_at`
- "All Time" = total count of all leads

### 6.2 In Progress
```
COUNT leads WHERE
  created_at IN date_range
  AND status IN [contacted, documents_collected, documents_pending,
                 sent_for_eligibility, sent_for_login, login,
                 sent_for_approval, underwriting, fi, fi_reinitiated, query_hold]
```
- Uses `created_at` ONLY
- NO spillover component
- These are leads currently being worked on

### 6.3 Login / Files Logged
```
COUNT leads WHERE
  (status IN LOGIN_AND_BEYOND OR (status = 'rejected' AND was_previously_logged))
  AND has_any_activity_in_date_range

was_previously_logged = activities[].to_status IN LOGIN_AND_BEYOND for any entry
has_any_activity = activities[].timestamp IN date_range for any entry
```
- Uses `activities[].timestamp` for date filtering
- Includes rejected leads that passed through login stage
- Split into Current (C) and Spillover (S)

### 6.4 Approvals
```
COUNT leads WHERE
  ANY eligibilities[] has approval_status = "approved"
  AND eligibilities[].approved_at IN date_range

SUM approved_amount from matching eligibilities
```
- Uses `eligibilities[].approved_at` timestamp
- One count per LEAD (not per eligibility — even if 2 banks approved, count = 1)
- Split into Current (C) and Spillover (S)

### 6.5 Disbursals
```
COUNT leads WHERE
  ANY eligibilities[] has disbursed = "yes"
  AND eligibilities[].disbursed_at IN date_range

SUM disbursed_amount from matching eligibilities
```
- Uses `eligibilities[].disbursed_at` timestamp
- One count per LEAD
- Split into Current (C) and Spillover (S)

### 6.6 Interim Rejects
```
COUNT leads WHERE
  status IN [fi_negative, declined, customer_not_interested, customer_not_supporting]
  AND has_any_activity_in_date_range
```
- Uses `activities[].timestamp`
- Split into Current (C) and Spillover (S)

### 6.7 Final Rejections
```
COUNT leads WHERE
  status IN [rejected, not_eligible, not_login, not_disbursed]
  AND has_any_activity_in_date_range
```
- Uses `activities[].timestamp`
- Split into Current (C) and Spillover (S)

### 6.8 Amount in Pipeline
```
SUM eligibilities[].eligible_amount WHERE
  login_done = "yes"
  AND application_id IS NOT BLANK
  AND disbursed ≠ "yes"
  AND approval_status ≠ "declined"
  AND lead.status NOT IN [rejected, not_eligible, not_login, not_disbursed, declined, disbursed]
```
- **NO date filter** — always a current snapshot of active pipeline
- Represents money currently being processed

### 6.9 TAT (Turnaround Time)
```
Lead-to-Login:       login_done_at - created_at (in days)
Login-to-Approval:   approved_at - login_done_at (in days)
Approval-to-Disbursal: disbursed_at - approved_at (in days)
Lead-to-Disbursal:   disbursed_at - created_at (in days)
```
- Calculated per-eligibility (bank level)
- Aggregated as: Mode (most frequent), Average, distribution buckets (1d, 2d, 3d, etc.)

---

## 7. BANK PERFORMANCE TABLE

For each bank across all leads:
```
Logins:    COUNT eligibilities where login_done="yes" OR approval_status IN (approved, declined) OR disbursed="yes"
Approvals: COUNT eligibilities where approval_status="approved" AND approved_at IN date_range
Disbursals: COUNT eligibilities where disbursed="yes" AND disbursed_at IN date_range
Disbursal Amount: SUM disbursed_amount for above
```

---

## 8. GROWTH PARTNER REPORT

Per agent/partner:
```
Files Generated:  COUNT leads WHERE source_id = agent_id AND created_at IN date_range
Logins:           (same login logic as above, filtered by agent)
Approvals:        (same approval logic, filtered by agent)
Disbursals:       (same disbursal logic, filtered by agent)
```

---

## 9. STAR RATING SYSTEM

Lead star rating (1-5 stars) based on scoring:
```
Income Score:     salary < 25K → 0 | 25K-50K → 15 | 50K-75K → 20 | 75K-1L → 25 | > 1L → 30
CIBIL Score:      < 650 → 0 | 650-699 → 10 | 700-749 → 15 | 750-799 → 25 | ≥ 800 → 30
FOIR Score:       > 65% → 0 | 56-65% → 5 | 46-55% → 10 | 36-45% → 15 | ≤ 35% → 20
Company Score:    (based on company_type: govt=20, listed=15, mnc=15, etc.)

Total = Income + CIBIL + FOIR + Company (max 100)
Stars: 0-20 → 1★ | 21-40 → 2★ | 41-60 → 3★ | 61-80 → 4★ | 81-100 → 5★
```
- Auto-calculated on lead create/update
- Admin can manually override

---

## 10. SUMMARY CHEAT SHEET

```
┌─────────────────────┬──────────────────────┬────────────┐
│ Stat                │ Date Field Used      │ Spillover? │
├─────────────────────┼──────────────────────┼────────────┤
│ Total Leads/Files   │ created_at           │ No         │
│ In Progress         │ created_at           │ No         │
│ Login/Files Logged  │ activities.timestamp │ Yes (C+S)  │
│ Approvals           │ elig.approved_at     │ Yes (C+S)  │
│ Disbursals          │ elig.disbursed_at    │ Yes (C+S)  │
│ Interim Rejects     │ activities.timestamp │ Yes (C+S)  │
│ Final Rejections    │ activities.timestamp │ Yes (C+S)  │
│ Amt in Pipeline     │ (no date filter)     │ No         │
│ Approved Amount     │ elig.approved_at     │ Yes        │
│ Disbursed Amount    │ elig.disbursed_at    │ Yes        │
│ TAT                 │ elig timestamps      │ N/A        │
└─────────────────────┴──────────────────────┴────────────┘
```
