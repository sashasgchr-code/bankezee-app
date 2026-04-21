import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LOAN_TYPES, TIME_FILTERS, LEAD_STATUSES } from '@/utils/constants';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const LoanTypeMultiSelect = ({ selected = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleType = (value) => {
    const next = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(next);
  };

  const label = selected.length === 0
    ? 'All Loan Types'
    : selected.length === 1
      ? LOAN_TYPES.find(t => t.value === selected[0])?.label || selected[0]
      : `${selected.length} Types`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-52 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        data-testid="loan-type-filter"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-white shadow-lg max-h-72 overflow-y-auto">
          <div className="p-2 border-b flex gap-2">
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onChange([])}
            >
              Clear All
            </button>
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onChange(LOAN_TYPES.map(t => t.value))}
            >
              Select All
            </button>
          </div>
          {LOAN_TYPES.map(type => (
            <label
              key={type.value}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
                data-testid={`loan-type-${type.value}`}
              />
              {type.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

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
  showManagerFilter = false,
  // Star rating filter
  starFilter,
  onStarFilterChange,
  showStarFilter = false
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

      {/* Activity Time Filter - for Approved, Disbursed, Eligible stats */}
      {showActivityTimeFilter && (
        <>
          <div className="border-l border-slate-300 pl-3">
            <label className="text-xs text-slate-500 block mb-1">Activity Date</label>
            <Select value={activityTimeFilter || 'all'} onValueChange={onActivityTimeFilterChange}>
              <SelectTrigger className="w-40" data-testid="activity-time-filter">
                <SelectValue placeholder="Activity Period" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range for Activity - shown when 'custom' is selected */}
          {activityTimeFilter === 'custom' && (
            <>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Activity From</label>
                <Input
                  type="date"
                  value={activityFromDate || ''}
                  onChange={(e) => onActivityFromDateChange?.(e.target.value)}
                  className="w-36 h-9"
                  data-testid="activity-from-date-filter"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Activity To</label>
                <Input
                  type="date"
                  value={activityToDate || ''}
                  onChange={(e) => onActivityToDateChange?.(e.target.value)}
                  className="w-36 h-9"
                  data-testid="activity-to-date-filter"
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Loan Type Filter - Multi-select with checkboxes */}
      <div>
        <LoanTypeMultiSelect
          selected={Array.isArray(loanTypeFilter) ? loanTypeFilter : (loanTypeFilter === 'all' ? [] : [loanTypeFilter])}
          onChange={onLoanTypeFilterChange}
        />
      </div>

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

      {/* Star Rating Filter */}
      {showStarFilter && (
        <Select value={starFilter || 'all'} onValueChange={onStarFilterChange}>
          <SelectTrigger className="w-32" data-testid="star-filter">
            <SelectValue placeholder="Stars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stars</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4+ Stars</SelectItem>
            <SelectItem value="3">3+ Stars</SelectItem>
            <SelectItem value="2">2+ Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default DashboardFilters;
