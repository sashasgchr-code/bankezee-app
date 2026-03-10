import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LOAN_TYPES, TIME_FILTERS, LEAD_STATUSES } from '@/utils/constants';

const DashboardFilters = ({ 
  timeFilter, 
  onTimeFilterChange, 
  loanTypeFilter, 
  onLoanTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  showStatusFilter = true,
  // Custom date range for leads
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  // Activity time filter (for Approved, Disbursed, Eligible stats)
  activityTimeFilter,
  onActivityTimeFilterChange,
  activityFromDate,
  activityToDate,
  onActivityFromDateChange,
  onActivityToDateChange,
  showActivityTimeFilter = false,
  // Agent/Partner filter
  sourceFilter,
  onSourceFilterChange,
  sourceIdFilter,
  onSourceIdFilterChange,
  agents = [],
  partners = [],
  showSourceFilter = false,
  // Manager filter
  managerFilter,
  onManagerFilterChange,
  managers = [],
  showManagerFilter = false
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6 items-end">
      {/* Lead Time Period Filter - for Total Leads & New */}
      <div>
        <label className="text-xs text-slate-500 block mb-1">Lead Created</label>
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
      </div>

      {/* Custom Date Range for Leads - shown when 'custom' is selected */}
      {timeFilter === 'custom' && (
        <>
          <div>
            <label className="text-xs text-slate-500 block mb-1">From</label>
            <Input
              type="date"
              value={fromDate || ''}
              onChange={(e) => onFromDateChange?.(e.target.value)}
              className="w-36 h-9"
              data-testid="from-date-filter"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">To</label>
            <Input
              type="date"
              value={toDate || ''}
              onChange={(e) => onToDateChange?.(e.target.value)}
              className="w-36 h-9"
              data-testid="to-date-filter"
            />
          </div>
        </>
      )}

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
          <SelectTrigger className="w-44" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {LEAD_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Manager Filter */}
      {showManagerFilter && managers.length > 0 && (
        <Select value={managerFilter || 'all'} onValueChange={onManagerFilterChange}>
          <SelectTrigger className="w-44" data-testid="manager-filter">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {managers.map(manager => (
              <SelectItem key={manager.id} value={manager.id}>
                {manager.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Source (Agent/Partner) Filter */}
      {showSourceFilter && (
        <>
          <Select value={sourceFilter || 'all'} onValueChange={onSourceFilterChange}>
            <SelectTrigger className="w-36" data-testid="source-filter">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="agent">Agents</SelectItem>
              <SelectItem value="partner">Partners</SelectItem>
              <SelectItem value="digital">Digital/Direct</SelectItem>
            </SelectContent>
          </Select>

          {/* Specific Agent/Partner Selection */}
          {sourceFilter === 'agent' && agents.length > 0 && (
            <Select value={sourceIdFilter || 'all'} onValueChange={onSourceIdFilterChange}>
              <SelectTrigger className="w-48" data-testid="agent-select-filter">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.agent_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {sourceFilter === 'partner' && partners.length > 0 && (
            <Select value={sourceIdFilter || 'all'} onValueChange={onSourceIdFilterChange}>
              <SelectTrigger className="w-48" data-testid="partner-select-filter">
                <SelectValue placeholder="Select Partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {partners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name || partner.full_name} ({partner.referral_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardFilters;
