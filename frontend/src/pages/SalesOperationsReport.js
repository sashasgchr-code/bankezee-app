import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Printer, FileText, Users, Building2, AlertTriangle, BarChart3, ChevronDown } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import { LOAN_TYPES } from '@/utils/constants';
import { Checkbox } from '@/components/ui/checkbox';

const formatCurrency = (value) => {
  if (!value) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  return value.toLocaleString('en-IN');
};

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
        className="flex h-9 w-52 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        data-testid="loan-type-filter"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-white shadow-lg max-h-72 overflow-y-auto">
          <div className="p-2 border-b flex gap-2">
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => onChange([])}>Clear All</button>
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => onChange(LOAN_TYPES.map(t => t.value))}>Select All</button>
          </div>
          {LOAN_TYPES.map(type => (
            <label key={type.value} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <Checkbox checked={selected.includes(type.value)} onCheckedChange={() => toggleType(type.value)} />
              {type.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SalesOperationsReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [managers, setManagers] = useState([]);
  const [agents, setAgents] = useState([]);

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [selectedManager, setSelectedManager] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedLoanType, setSelectedLoanType] = useState([]);

  useEffect(() => { fetchFiltersData(); }, []);

  const fetchFiltersData = async () => {
    try {
      const res = await api.get('/auth/admin/all-users').catch(() => ({ data: {} }));
      const data = res.data || {};
      // Flatten all user types into managers and agents lists
      const mgrs = data.managers || [];
      const agts = [
        ...(data.sales_agents || []),
        ...(data.team_leaders || []),
        ...(data.freelance_partners || []),
        ...(data.retail_partners || []),
        ...(data.operations || []),
      ];
      setManagers(mgrs);
      setAgents(agts);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (selectedManager !== 'all') params.append('manager_id', selectedManager);
      if (selectedAgent !== 'all') params.append('agent_id', selectedAgent);
      if (selectedLoanType.length > 0) params.append('loan_type', selectedLoanType.join(','));
      const res = await api.get(`/reports/sales-operations?${params}`);
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  // Split metric display component
  const SplitMetric = ({ label, data, prefix = '', isCurrency = false, highlight = false }) => {
    const fmt = (v) => isCurrency ? `${prefix}${formatCurrency(v)}` : `${prefix}${v}`;
    return (
      <div className={`p-3 rounded-lg border ${highlight ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
        <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
        <p className={`text-xl font-bold ${highlight ? 'text-green-700' : 'text-slate-800'}`}>{fmt(data.total)}</p>
        <div className="flex gap-3 mt-1">
          <span className="text-xs text-blue-600">Current: <b>{fmt(data.current)}</b></span>
          {data.spillover > 0 && <span className="text-xs text-amber-600">Spillover: <b>{fmt(data.spillover)}</b></span>}
        </div>
      </div>
    );
  };

  const MetricBox = ({ label, value, highlight }) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-green-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );

  const TatCell = ({ stat }) => {
    if (!stat || !stat.count) return <span className="text-slate-400">-</span>;
    return (
      <div className="text-xs leading-relaxed">
        <div><span className="text-slate-500">Mode:</span> <span className="font-semibold">{stat.mode}d</span> <span className="text-slate-400">({stat.mode_count})</span></div>
        <div><span className="text-green-600">Low:</span> {stat.min}d <span className="text-red-600 ml-1">High:</span> {stat.max}d</div>
      </div>
    );
  };

  const r = report;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 print:static">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="print:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800" data-testid="report-title">Sales & Operations Report</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Filters */}
        <Card className="mb-4 print:hidden" data-testid="report-filters">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-slate-500 mb-1">From</p>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 h-9" data-testid="from-date" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">To</p>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 h-9" data-testid="to-date" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Manager</p>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger className="w-44 h-9" data-testid="manager-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Agent</p>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-44 h-9" data-testid="agent-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Loan Type</p>
                <LoanTypeMultiSelect selected={selectedLoanType} onChange={setSelectedLoanType} />
              </div>
              <Button onClick={fetchReport} disabled={loading} className="h-9" data-testid="generate-report-btn">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!report && !loading && (
          <div className="text-center py-20 text-slate-400">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select filters and click Generate Report</p>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="text-center py-2 print:py-4">
              <h2 className="text-xl font-bold text-slate-800">BANKEZEE - SALES & OPERATIONS REPORT</h2>
              <p className="text-sm text-slate-500">{fromDate} to {toDate}</p>
              {r.spillover_count > 0 && (
                <p className="text-xs text-amber-600 mt-1">Includes {r.spillover_count} spillover cases from previous period</p>
              )}
            </div>

            {/* Section 1: Business Volume */}
            <Card data-testid="business-volume-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  1. Business Volume Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                  <MetricBox label="Total Files Generated" value={r.business_volume.total_files_generated} />
                  <SplitMetric label="In Progress" data={r.business_volume.in_progress} />
                  <SplitMetric label="Files Logged (Login)" data={r.business_volume.files_logged} />
                  <SplitMetric label="Total Approvals" data={r.business_volume.approvals} />
                  <SplitMetric label="Total Disbursals" data={r.business_volume.disbursals} highlight />
                  <SplitMetric label="Disbursal Value" data={r.business_volume.disbursal_value} prefix="₹" isCurrency highlight />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                  <MetricBox label="Avg Loan Value" value={`₹${formatCurrency(r.business_volume.avg_loan_value)}`} />
                  <SplitMetric label="Interim Rejects" data={r.business_volume.interim_rejects} />
                  <SplitMetric label="Final Rejections" data={r.business_volume.final_rejections} />
                  <MetricBox label="Amt in Pipeline" value={`₹${formatCurrency(r.business_volume.amt_in_pipeline)}`} highlight />
                </div>
                <div className="mt-2 px-1 text-[10px] text-slate-400 leading-relaxed flex flex-wrap gap-x-4 gap-y-0.5">
                  <span><b className="text-slate-500">In Progress:</b> Contacted to Query/Hold (created date)</span>
                  <span><b className="text-slate-500">Login:</b> Login + Approved + Declined + Not Disbursed + Rejected-after-login</span>
                  <span><b className="text-slate-500">Interim Rejects:</b> FI Negative + Declined + Cust. Not Interested/Supporting</span>
                  <span><b className="text-slate-500">Final Rejections:</b> Rejected + Not Eligible + Not Login + Not Disbursed</span>
                  <span><b className="text-slate-500">Amt in Pipeline:</b> Eligible Amt where Login=Yes & App ID filled, excl. disbursed/declined/rejected</span>
                </div>

                <p className="text-xs font-semibold text-slate-600 mb-2 mt-4">CONVERSION METRICS (Current Month Only)</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <MetricBox label="Lead → Login %" value={`${r.conversion_metrics.lead_to_login}%`} />
                  <MetricBox label="Login → Approval %" value={`${r.conversion_metrics.login_to_approval}%`} />
                  <MetricBox label="Approval → Disbursal %" value={`${r.conversion_metrics.approval_to_disbursal}%`} />
                  <MetricBox label="Logged → Disbursal %" value={`${r.conversion_metrics.logged_to_disbursal}%`} />
                  <MetricBox label="Lead → Disbursal (E2E) %" value={`${r.conversion_metrics.lead_to_disbursal_e2e}%`} highlight />
                </div>

                <p className="text-xs font-semibold text-slate-600 mb-2 mt-4">TAT ANALYSIS (in days)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse" data-testid="tat-analysis-table">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left p-2 border text-xs font-semibold">Stage</th>
                        <th className="text-center p-2 border text-xs font-semibold">Mode (days)</th>
                        <th className="text-center p-2 border text-xs font-semibold">Lowest TAT</th>
                        <th className="text-center p-2 border text-xs font-semibold">Highest TAT</th>
                        <th className="text-center p-2 border text-xs font-semibold">Avg TAT</th>
                        <th className="text-center p-2 border text-xs font-semibold">Sample Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Lead → Login', data: r.tat_analysis.lead_to_login },
                        { label: 'Login → Approval', data: r.tat_analysis.login_to_approval },
                        { label: 'Approval → Disbursal', data: r.tat_analysis.approval_to_disbursal },
                        { label: 'Lead → Disbursal (E2E)', data: r.tat_analysis.lead_to_disbursal_e2e },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-slate-50">
                          <td className="p-2 border font-medium">{row.label}</td>
                          <td className="p-2 border text-center font-bold text-blue-700">{row.data.mode !== null ? <>{row.data.mode}d <span className="font-normal text-slate-400 text-xs">({row.data.mode_count})</span></> : '-'}</td>
                          <td className="p-2 border text-center text-green-600 font-medium">{row.data.min !== null ? `${row.data.min}d` : '-'}</td>
                          <td className="p-2 border text-center text-red-600 font-medium">{row.data.max !== null ? `${row.data.max}d` : '-'}</td>
                          <td className="p-2 border text-center">{row.data.avg !== null ? `${row.data.avg}d` : '-'}</td>
                          <td className="p-2 border text-center text-slate-400">{row.data.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* TAT Distribution Table */}
            {r.tat_distribution && (
            <Card data-testid="tat-distribution-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  TAT Distribution (Number of forms per day)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stages = [
                    { label: 'Lead → Login', data: r.tat_distribution.lead_to_login },
                    { label: 'Login → Approval', data: r.tat_distribution.login_to_approval },
                    { label: 'Approval → Disbursal', data: r.tat_distribution.approval_to_disbursal },
                    { label: 'Lead → Disbursal (E2E)', data: r.tat_distribution.lead_to_disbursal_e2e },
                  ];
                  // Find max day across all stages
                  let maxDay = 0;
                  stages.forEach(s => {
                    Object.keys(s.data || {}).forEach(d => {
                      const day = parseInt(d);
                      if (day > maxDay) maxDay = day;
                    });
                  });
                  if (maxDay === 0) return <p className="text-center text-slate-400 py-4">No TAT data available</p>;
                  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse" data-testid="tat-distribution-table">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="text-left p-2 border text-xs font-semibold whitespace-nowrap">Stage</th>
                            <th className="text-center p-2 border text-xs font-semibold">Total</th>
                            {days.map(d => (
                              <th key={d} className="text-center p-2 border text-xs font-semibold whitespace-nowrap">{d}d</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage, i) => {
                            const total = Object.values(stage.data || {}).reduce((s, v) => s + v, 0);
                            return (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 border font-medium whitespace-nowrap">{stage.label}</td>
                                <td className="p-2 border text-center font-semibold">{total || '-'}</td>
                                {days.map(d => {
                                  const count = (stage.data || {})[String(d)] || 0;
                                  return (
                                    <td key={d} className={`p-2 border text-center ${count > 0 ? 'font-semibold text-blue-700' : 'text-slate-300'}`}>
                                      {count || '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            )}

            {/* Section 2: Team Productivity */}
            <Card data-testid="team-productivity-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  2. Team Productivity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricBox label="Active Agents" value={r.team_productivity.num_agents} />
                  <MetricBox label="Files per Agent" value={r.team_productivity.files_per_agent} />
                  <MetricBox label="Disbursals per Agent" value={r.team_productivity.disbursals_per_agent} />
                </div>
                {r.team_productivity.agent_breakdown.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" data-testid="agent-breakdown-table">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-2 border text-xs font-semibold">Agent</th>
                          <th className="text-center p-2 border text-xs font-semibold">Files</th>
                          <th className="text-center p-2 border text-xs font-semibold">Logins</th>
                          <th className="text-center p-2 border text-xs font-semibold">Approvals</th>
                          <th className="text-center p-2 border text-xs font-semibold">Disbursals</th>
                          <th className="text-center p-2 border text-xs font-semibold">Conversion %</th>
                          <th className="text-right p-2 border text-xs font-semibold">Disbursal Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.team_productivity.agent_breakdown.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 border font-medium">{a.name}</td>
                            <td className="p-2 border text-center">{a.files}</td>
                            <td className="p-2 border text-center">{a.logins}</td>
                            <td className="p-2 border text-center">{a.approvals}</td>
                            <td className="p-2 border text-center font-semibold text-green-700">{a.disbursals}</td>
                            <td className="p-2 border text-center">{a.files > 0 ? ((a.disbursals / a.files) * 100).toFixed(1) : 0}%</td>
                            <td className="p-2 border text-right">₹{formatCurrency(a.disbursal_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Bank Performance */}
            <Card data-testid="bank-performance-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  3. Bank / Lender Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {r.bank_performance.length > 0 ? (
                  <div>
                    <table className="w-full text-sm border-collapse" data-testid="bank-performance-table">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-2 border text-xs font-semibold">Bank</th>
                          <th className="text-center p-2 border text-xs font-semibold">Logins</th>
                          <th className="text-center p-2 border text-xs font-semibold">Approvals</th>
                          <th className="text-center p-2 border text-xs font-semibold">Disbursals</th>
                          <th className="text-center p-2 border text-xs font-semibold">Disbursal Amt</th>
                          <th className="text-center p-2 border text-xs font-semibold">TAT: Lead→Login</th>
                          <th className="text-center p-2 border text-xs font-semibold">TAT: Login→Approval</th>
                          <th className="text-center p-2 border text-xs font-semibold">TAT: Approval→Disbursal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.bank_performance.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 border font-semibold">{b.bank}</td>
                            <td className="p-2 border text-center">{b.logins}</td>
                            <td className="p-2 border text-center">{b.approvals}</td>
                            <td className="p-2 border text-center font-semibold text-green-700">{b.disbursals}</td>
                            <td className="p-2 border text-center font-semibold text-green-700">{b.disbursal_amount ? `₹${(b.disbursal_amount / 100000).toFixed(2)}L` : '-'}</td>
                            <td className="p-2 border text-center"><TatCell stat={b.tat?.lead_to_login} /></td>
                            <td className="p-2 border text-center"><TatCell stat={b.tat?.login_to_approval} /></td>
                            <td className="p-2 border text-center"><TatCell stat={b.tat?.approval_to_disbursal} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No bank data available</p>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Rejection Analysis */}
            <Card data-testid="rejection-analysis-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  4. Rejection & Drop Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
                  <MetricBox label="Total Rejections" value={r.rejection_analysis.total_rejections} />
                  <MetricBox label="Login→Approval Rejection %" value={`${r.rejection_analysis.total_rejection_pct}%`} />
                </div>
                <p className="text-xs font-semibold text-slate-600 mb-2">TOP REJECTION REASONS</p>
                <table className="w-full text-sm border-collapse max-w-lg" data-testid="rejection-reasons-table">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-2 border text-xs font-semibold">Reason</th>
                      <th className="text-center p-2 border text-xs font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(r.rejection_analysis.reasons)
                      .filter(([, count]) => count > 0)
                      .sort(([,a], [,b]) => b - a)
                      .map(([reason, count]) => (
                        <tr key={reason} className="hover:bg-slate-50">
                          <td className="p-2 border">{reason}</td>
                          <td className="p-2 border text-center font-medium">{count}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
