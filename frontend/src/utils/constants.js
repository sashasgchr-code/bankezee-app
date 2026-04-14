// Loan Types - used across forms and dashboards
export const LOAN_TYPES = [
  { value: 'reduce_home_loan_emi', label: 'Reduce Home Loan EMI' },
  { value: 'merge_multiple_loans', label: 'Merge Multiple Loans' },
  { value: 'top_up_pl', label: 'Top Up PL' },
  { value: 'top_up_hl', label: 'Top Up HL' },
  { value: 'new_personal_loan', label: 'New Personal Loan' },
  { value: 'new_home_loan', label: 'New Home Loan' },
  { value: 'business_loan', label: 'Business Loan' },
  { value: 'new_vehicle_loan', label: 'New Vehicle Loan' },
  { value: 'used_vehicle_loan_fresh', label: 'Used Vehicle Loan - Fresh' },
  { value: 'used_vehicle_loan_bt', label: 'Used Vehicle Loan - BT' },
  { value: 'balance_transfer_pl', label: 'Balance Transfer-PL' },
  { value: 'balance_transfer_hl', label: 'Balance Transfer-HL' },
  { value: 'balance_transfer_topup_pl', label: 'Balance Transfer+Top Up PL' },
  { value: 'balance_transfer_topup_hl', label: 'Balance Transfer+Top Up HL' },
  { value: 'education_loan', label: 'Education Loan' }
];

// Time period filters
export const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' }
];

// Lead statuses - all available statuses
export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'documents_collected', label: 'Documents Collected' },
  { value: 'documents_pending', label: 'Documents Pending' },
  { value: 'sent_for_eligibility', label: 'Sent for Eligibility' },
  { value: 'sent_for_login', label: 'Sent for Login' },
  { value: 'login', label: 'Login Done' },
  { value: 'sent_for_approval', label: 'Sent for Approval' },
  { value: 'underwriting', label: 'Underwriting' },
  { value: 'fi', label: 'FI (Field Investigation)' },
  { value: 'fi_negative', label: 'FI Negative' },
  { value: 'fi_reinitiated', label: 'FI Reinitiated' },
  { value: 'query_hold', label: 'Query/Hold' },
  { value: 'customer_not_interested', label: 'Customer Not Interested - Need Help from MIT & Manager' },
  { value: 'customer_not_supporting', label: 'Customer Not Supporting - Need Help from MIT & Manager' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'not_eligible', label: 'Not Eligible' },
  { value: 'not_login', label: 'Not Login' },
  { value: 'declined', label: 'Declined' },
  { value: 'not_disbursed', label: 'Not Disbursed' },
  { value: 'rejected', label: 'Rejected' }
];

// Lead status categories
export const STATUS_CATEGORIES = {
  new: ['new'],
  approved: ['approved'],
  disbursed: ['disbursed'],
  in_progress: ['contacted', 'documents_collected', 'documents_pending', 'sent_for_eligibility', 'sent_for_login', 'login', 'sent_for_approval', 'underwriting', 'fi', 'fi_negative', 'fi_reinitiated', 'query_hold'],
  rejected: ['rejected', 'not_eligible', 'customer_not_interested', 'customer_not_supporting', 'not_login']
};

// Filter leads by time period (uses UTC to match backend)
export const filterByTimePeriod = (leads, filter, fromDate = null, toDate = null) => {
  if (filter === 'all') return leads;
  
  const now = new Date();
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();
  const nowDay = now.getUTCDate();
  const todayUTC = new Date(Date.UTC(nowYear, nowMonth, nowDay));
  
  return leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    const leadYear = leadDate.getUTCFullYear();
    const leadMonth = leadDate.getUTCMonth();
    const leadDay = leadDate.getUTCDate();
    const leadDayUTC = new Date(Date.UTC(leadYear, leadMonth, leadDay));
    
    switch (filter) {
      case 'today':
        return leadDayUTC.getTime() === todayUTC.getTime();
      case 'this_week':
        const dayOfWeek = todayUTC.getUTCDay();
        const weekStartUTC = new Date(Date.UTC(nowYear, nowMonth, nowDay - dayOfWeek));
        return leadDayUTC >= weekStartUTC;
      case 'this_month':
        return leadYear === nowYear && leadMonth === nowMonth;
      case 'last_month':
        const lastMonth = nowMonth === 0 ? 11 : nowMonth - 1;
        const lastMonthYear = nowMonth === 0 ? nowYear - 1 : nowYear;
        return leadYear === lastMonthYear && leadMonth === lastMonth;
      case 'last_3_months':
        const threeMonthsAgoUTC = new Date(Date.UTC(nowYear, nowMonth - 3, 1));
        return leadDate >= threeMonthsAgoUTC;
      case 'last_6_months':
        const sixMonthsAgoUTC = new Date(Date.UTC(nowYear, nowMonth - 6, 1));
        return leadDate >= sixMonthsAgoUTC;
      case 'this_year':
        return leadYear === nowYear;
      case 'custom':
        if (fromDate && toDate) {
          const fromParts = fromDate.split('-').map(Number);
          const toParts = toDate.split('-').map(Number);
          const from = new Date(Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0));
          const to = new Date(Date.UTC(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59, 999));
          return leadDate >= from && leadDate <= to;
        }
        return true;
      default:
        return true;
    }
  });
};

// Filter leads by agent or partner
export const filterBySource = (leads, sourceType, sourceId) => {
  if (!sourceType || sourceType === 'all') return leads;
  
  return leads.filter(lead => {
    if (sourceType === 'agent') {
      return lead.source === 'agent' && (!sourceId || lead.source_id === sourceId);
    }
    if (sourceType === 'partner') {
      return lead.source === 'partner' && (!sourceId || lead.source_id === sourceId);
    }
    return true;
  });
};

// Filter leads by loan type
export const filterByLoanType = (leads, loanTypes) => {
  // Handle both old string format and new array format
  if (!loanTypes || loanTypes === 'all' || (Array.isArray(loanTypes) && loanTypes.length === 0)) return leads;
  const typesArray = Array.isArray(loanTypes) ? loanTypes : [loanTypes];
  return leads.filter(lead => {
    const type = lead.additional_data?.type_of_loan || lead.requirement;
    return typesArray.includes(type);
  });
};

// Calculate dashboard statistics from leads
export const calculateDashboardStats = (leads) => {
  const total = leads.length;
  const newLeads = leads.filter(l => STATUS_CATEGORIES.new.includes(l.status)).length;
  const approved = leads.filter(l => STATUS_CATEGORIES.approved.includes(l.status)).length;
  const disbursed = leads.filter(l => STATUS_CATEGORIES.disbursed.includes(l.status)).length;
  const inProgress = leads.filter(l => STATUS_CATEGORIES.in_progress.includes(l.status)).length;
  const rejected = leads.filter(l => STATUS_CATEGORIES.rejected.includes(l.status)).length;
  
  // Calculate total disbursed amount from eligibilities
  // Check for both string 'yes' and boolean true for backward compatibility
  const totalDisbursedAmount = leads.reduce((sum, lead) => {
    if (lead.status === 'disbursed' && lead.eligibilities) {
      const disbursedElig = lead.eligibilities.find(e => e.disbursed === 'yes' || e.disbursed === true);
      return sum + (disbursedElig?.disbursed_amount || 0);
    }
    return sum;
  }, 0);
  
  return {
    total,
    newLeads,
    approved,
    disbursed,
    inProgress,
    rejected,
    totalDisbursedAmount
  };
};

// Get loan type label from value
export const getLoanTypeLabel = (value) => {
  // Map old values to new
  const legacyMap = {
    'used_vehicle_loan': 'Used Vehicle Loan - BT',
    'vehicle_loan': 'Vehicle Loan',
    'Used Vehicle Loan': 'Used Vehicle Loan - BT',
  };
  const mapped = legacyMap[value] || value;
  const type = LOAN_TYPES.find(t => t.value === mapped || t.label === mapped);
  return type ? type.label : mapped || '-';
};

// Helper to check if a date falls within a filter period
// Uses UTC dates to match backend Daily Report behavior
const isDateInRange = (dateStr, filter, fromDate, toDate) => {
  if (!dateStr) return false;
  
  const date = new Date(dateStr);
  const now = new Date();
  
  // Use UTC methods to avoid timezone issues
  const dateYear = date.getUTCFullYear();
  const dateMonth = date.getUTCMonth();
  const dateDay = date.getUTCDate();
  
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();
  const nowDay = now.getUTCDate();
  
  // Today in UTC
  const todayUTC = new Date(Date.UTC(nowYear, nowMonth, nowDay));
  const dateOnlyUTC = new Date(Date.UTC(dateYear, dateMonth, dateDay));
  
  switch (filter) {
    case 'today':
      return dateOnlyUTC.getTime() === todayUTC.getTime();
    case 'this_week':
      const dayOfWeek = todayUTC.getUTCDay();
      const weekStartUTC = new Date(Date.UTC(nowYear, nowMonth, nowDay - dayOfWeek));
      return dateOnlyUTC >= weekStartUTC;
    case 'this_month':
      return dateYear === nowYear && dateMonth === nowMonth;
    case 'last_month':
      const lastMonth = nowMonth === 0 ? 11 : nowMonth - 1;
      const lastMonthYear = nowMonth === 0 ? nowYear - 1 : nowYear;
      return dateYear === lastMonthYear && dateMonth === lastMonth;
    case 'last_3_months':
      const threeMonthsAgoUTC = new Date(Date.UTC(nowYear, nowMonth - 3, 1));
      return date >= threeMonthsAgoUTC;
    case 'last_6_months':
      const sixMonthsAgoUTC = new Date(Date.UTC(nowYear, nowMonth - 6, 1));
      return date >= sixMonthsAgoUTC;
    case 'this_year':
      return dateYear === nowYear;
    case 'custom':
      if (fromDate && toDate) {
        // Parse custom dates as local dates at start/end of day in UTC
        const fromParts = fromDate.split('-').map(Number);
        const toParts = toDate.split('-').map(Number);
        const from = new Date(Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0));
        const to = new Date(Date.UTC(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59, 999));
        return date >= from && date <= to;
      }
      return true;
    default:
      return true;
  }
};

// Calculate dashboard statistics based on activity dates (when status/action happened)
// This matches the Daily Report logic: filter LEADS by activity date, then count/sum based on that filtered set
export const calculateDashboardStatsWithActivityDates = (leads, timeFilter = 'all', fromDate = null, toDate = null) => {
  const total = leads.length;
  const newLeads = leads.filter(l => STATUS_CATEGORIES.new.includes(l.status)).length;
  
  // Helper: check if a timestamp string falls in the selected activity date range
  const tsInRange = (tsStr) => {
    if (!tsStr) return false;
    if (timeFilter === 'all') return true;
    return isDateInRange(tsStr, timeFilter, fromDate, toDate);
  };

  // Helper: check if a lead was created within the activity date range (current) or before (spillover)
  const isLeadCurrent = (lead) => {
    if (timeFilter === 'all') return true;
    return isDateInRange(lead.created_at, timeFilter, fromDate, toDate);
  };

  // For in-progress, check if lead has any activity in range
  let inProgressLeads = leads;
  if (timeFilter !== 'all') {
    inProgressLeads = leads.filter(lead => {
      const activities = lead.activities || [];
      return activities.some(a => isDateInRange(a.timestamp, timeFilter, fromDate, toDate));
    });
  }
  const inProgress = inProgressLeads.filter(l => STATUS_CATEGORIES.in_progress.includes(l.status)).length;

  // For approved/disbursed: check eligibility-level timestamps
  // For login: check login_done_at timestamps
  // For rejected: check lead-level status + activity in range
  // Track current vs spillover for each
  let approved = 0, approvedCurrent = 0, approvedSpillover = 0;
  let disbursed = 0, disbursedCurrent = 0, disbursedSpillover = 0;
  let rejected = 0, rejectedCurrent = 0, rejectedSpillover = 0;
  let loginCount = 0, loginCurrent = 0, loginSpillover = 0;
  let totalDisbursedAmount = 0;
  let totalApprovedAmount = 0;

  leads.forEach(lead => {
    const eligibilities = lead.eligibilities || [];
    const isCurrent = isLeadCurrent(lead);

    // Track per-lead flags (one count per file)
    let leadHasLoginInRange = false;
    let leadHasApprovalInRange = false;
    let leadHasDisbursalInRange = false;

    eligibilities.forEach(elig => {
      // Approved: check approved_at timestamp in range — sum amounts always, count per lead
      if (elig.approval_status === 'approved' && tsInRange(elig.approved_at)) {
        totalApprovedAmount += parseFloat(elig.approved_amount) || 0;
        leadHasApprovalInRange = true;
      }

      // Disbursed: check disbursed_at timestamp in range — sum amounts always, count per lead
      const disbursedValue = String(elig.disbursed || '').toLowerCase();
      if ((disbursedValue === 'yes' || disbursedValue === 'true') && tsInRange(elig.disbursed_at)) {
        totalDisbursedAmount += parseFloat(elig.disbursed_amount) || 0;
        leadHasDisbursalInRange = true;
      }

      // Login: check login_done_at timestamp in range (count per lead, not per eligibility)
      const loginDone = String(elig.login_done || '').toLowerCase();
      if ((loginDone === 'yes' || loginDone === 'true') && tsInRange(elig.login_done_at)) {
        leadHasLoginInRange = true;
      }
    });

    if (leadHasLoginInRange) {
      loginCount++;
      if (isCurrent) loginCurrent++; else loginSpillover++;
    }
    if (leadHasApprovalInRange) {
      approved++;
      if (isCurrent) approvedCurrent++; else approvedSpillover++;
    }
    if (leadHasDisbursalInRange) {
      disbursed++;
      if (isCurrent) disbursedCurrent++; else disbursedSpillover++;
    }

    // Rejected: check LEAD-LEVEL status (not eligibility-level)
    // Only count leads with rejected statuses that have activity in the date range
    if (STATUS_CATEGORIES.rejected.includes(lead.status)) {
      const activities = lead.activities || [];
      const hasActivityInRange = timeFilter === 'all' || activities.some(a => 
        isDateInRange(a.timestamp, timeFilter, fromDate, toDate)
      );
      if (hasActivityInRange) {
        rejected++;
        if (isCurrent) rejectedCurrent++; else rejectedSpillover++;
      }
    }
  });

  return {
    total,
    newLeads,
    approved,
    approvedCurrent,
    approvedSpillover,
    disbursed,
    disbursedCurrent,
    disbursedSpillover,
    inProgress,
    rejected,
    rejectedCurrent,
    rejectedSpillover,
    loginCount,
    loginCurrent,
    loginSpillover,
    totalDisbursedAmount,
    totalApprovedAmount,
    leadsWithActivity: inProgressLeads.length
  };
};

// Calculate total eligible amount based on activity date
// This matches the Daily Report logic: filter LEADS by activity date, then sum ALL their eligible amounts where is_eligible=yes AND login_done=yes
export const calculateTotalEligibleWithActivityDate = (leads, timeFilter = 'all', fromDate = null, toDate = null) => {
  const tsInRange = (tsStr) => {
    if (!tsStr) return false;
    if (timeFilter === 'all') return true;
    return isDateInRange(tsStr, timeFilter, fromDate, toDate);
  };

  let total = 0;

  leads.forEach(lead => {
    if (!lead.eligibilities) return;

    lead.eligibilities.forEach(elig => {
      const isEligible = String(elig.is_eligible || '').toLowerCase();
      const loginDone = String(elig.login_done || '').toLowerCase();
      // Only count if BOTH is_eligible AND login_done are 'yes'
      // Check login_done_at timestamp for activity date filtering
      if ((isEligible === 'yes' || isEligible === 'true') && (loginDone === 'yes' || loginDone === 'true')) {
        // If filter active, check login_done_at timestamp; otherwise count all
        if (timeFilter === 'all' || tsInRange(elig.login_done_at)) {
          total += parseFloat(elig.eligible_amount) || 0;
        }
      }
    });
  });

  return total;
};

// Calculate total eligible amount (where is_eligible = yes AND login_done = yes) from leads
export const calculateTotalEligible = (leads) => {
  return leads.reduce((sum, lead) => {
    if (lead.eligibilities) {
      for (const elig of lead.eligibilities) {
        const isEligible = String(elig.is_eligible || '').toLowerCase();
        const loginDone = String(elig.login_done || '').toLowerCase();
        // Only count if BOTH is_eligible AND login_done are 'yes'
        if ((isEligible === 'yes' || isEligible === 'true') && (loginDone === 'yes' || loginDone === 'true')) {
          const amount = parseFloat(elig.eligible_amount) || 0;
          sum += amount;
        }
      }
    }
    return sum;
  }, 0);
};
