// Loan Types - used across forms and dashboards
export const LOAN_TYPES = [
  { value: 'reduce_home_loan_emi', label: 'Reduce Home Loan EMI' },
  { value: 'merge_multiple_loans', label: 'Merge Multiple Loans' },
  { value: 'top_up_loan', label: 'Top-Up Loan' },
  { value: 'new_personal_loan', label: 'New Personal Loan' },
  { value: 'new_home_loan', label: 'New Home Loan' },
  { value: 'business_loan', label: 'Business Loan' },
  { value: 'vehicle_loan', label: 'Vehicle Loan' },
  { value: 'balance_transfer', label: 'Balance Transfer' }
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
  { value: 'sent_for_eligibility', label: 'Sent for Eligibility' },
  { value: 'sent_for_login', label: 'Sent for Login' },
  { value: 'login', label: 'Login Done' },
  { value: 'sent_for_approval', label: 'Sent for Approval' },
  { value: 'underwriting', label: 'Underwriting' },
  { value: 'fi', label: 'FI (Field Investigation)' },
  { value: 'query_hold', label: 'Query/Hold' },
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
  in_progress: ['contacted', 'documents_collected', 'sent_for_eligibility', 'sent_for_login', 'login', 'sent_for_approval', 'underwriting', 'fi', 'query_hold'],
  rejected: ['not_eligible', 'not_login', 'declined', 'not_disbursed', 'rejected']
};

// Filter leads by time period
export const filterByTimePeriod = (leads, filter, fromDate = null, toDate = null) => {
  if (filter === 'all') return leads;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    const leadYear = leadDate.getFullYear();
    const leadMonth = leadDate.getMonth();
    const leadDay = new Date(leadYear, leadMonth, leadDate.getDate());
    
    switch (filter) {
      case 'today':
        return leadDay.getTime() === today.getTime();
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return leadDate >= weekStart;
      case 'this_month':
        return leadYear === currentYear && leadMonth === currentMonth;
      case 'last_month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return leadYear === lastMonthYear && leadMonth === lastMonth;
      case 'last_3_months':
        const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
        return leadDate >= threeMonthsAgo;
      case 'last_6_months':
        const sixMonthsAgo = new Date(currentYear, currentMonth - 6, 1);
        return leadDate >= sixMonthsAgo;
      case 'this_year':
        return leadYear === currentYear;
      case 'custom':
        if (fromDate && toDate) {
          const from = new Date(fromDate);
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
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
export const filterByLoanType = (leads, loanType) => {
  if (loanType === 'all') return leads;
  return leads.filter(lead => {
    const type = lead.additional_data?.type_of_loan || lead.requirement;
    return type === loanType;
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
  const totalDisbursedAmount = leads.reduce((sum, lead) => {
    if (lead.status === 'disbursed' && lead.eligibilities) {
      const disbursedElig = lead.eligibilities.find(e => e.disbursed === true);
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
  const type = LOAN_TYPES.find(t => t.value === value);
  return type ? type.label : value || '-';
};
