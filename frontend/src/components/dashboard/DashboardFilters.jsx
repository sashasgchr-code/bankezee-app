import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LOAN_TYPES, TIME_FILTERS } from '@/utils/constants';

const DashboardFilters = ({ 
  timeFilter, 
  onTimeFilterChange, 
  loanTypeFilter, 
  onLoanTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  showStatusFilter = true
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Time Period Filter */}
      <Select value={timeFilter} onValueChange={onTimeFilterChange}>
        <SelectTrigger className="w-40" data-testid="time-filter">
          <SelectValue placeholder="Time Period" />
        </SelectTrigger>
        <SelectContent>
          {TIME_FILTERS.map(filter => (
            <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loan Type Filter */}
      <Select value={loanTypeFilter} onValueChange={onLoanTypeFilterChange}>
        <SelectTrigger className="w-48" data-testid="loan-type-filter">
          <SelectValue placeholder="Loan Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Loan Types</SelectItem>
          {LOAN_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      {showStatusFilter && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-40" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="documents_collected">Documents Collected</SelectItem>
            <SelectItem value="sent_to_bank">Sent to Bank</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="not_eligible">Not Eligible</SelectItem>
            <SelectItem value="not_login">Not Login</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="not_disbursed">Not Disbursed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default DashboardFilters;
