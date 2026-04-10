import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Printer, FileText, TrendingUp, Users, Building2, AlertTriangle, BarChart3 } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import { LOAN_TYPES } from '@/utils/constants';

const formatCurrency = (value) => {
  if (!value) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  return value.toLocaleString('en-IN');
};

export default function SalesOperationsReport() {
  const navigate = useNavigate();
  const printRef = useRef();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [managers, setManagers] = useState([]);
  const [agents, setAgents] = useState([]);

  // Filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [selectedManager, setSelectedManager] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedLoanType, setSelectedLoanType] = useState('all');

  useEffect(() => {
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    try {
      const [mgrs, agts] = await Promise.all([
        api.get('/auth/managers').catch(() => ({ data: [] })),
        api.get('/auth/agents').catch(() => ({ data: [] })),
      ]);
      setManagers(mgrs.data || []);
      setAgents(agts.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (selectedManager !== 'all') params.append('manager_id', selectedManager);
      if (selectedAgent !== 'all') params.append('agent_id', selectedAgent);
      if (selectedLoanType !== 'all') params.append('loan_type', selectedLoanType);
      const res = await api.get(`/reports/sales-operations?${params}`);
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const MetricBox = ({ label, value, sub, highlight }) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-green-700' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

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
            <h1 className="text-lg font-bold text-slate-800" data-testid="report-title">
              Sales & Operations Report
            </h1>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4" ref={printRef}>
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
                <Select value={selectedLoanType} onValueChange={setSelectedLoanType}>
                  <SelectTrigger className="w-48 h-9" data-testid="loan-type-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Loan Types</SelectItem>
                    {LOAN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
            {/* Report Header */}
            <div className="text-center py-2 print:py-4">
              <h2 className="text-xl font-bold text-slate-800">BANKEZEE - SALES & OPERATIONS REPORT</h2>
              <p className="text-sm text-slate-500">{fromDate} to {toDate}</p>
            </div>

            {/* Section 1: Business Volume Metrics */}
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
                  <MetricBox label="Total Files Logged" value={r.business_volume.total_files_logged} />
                  <MetricBox label="Total Approvals" value={r.business_volume.total_approvals} />
                  <MetricBox label="Total Disbursals" value={r.business_volume.total_disbursals} highlight />
                  <MetricBox label="Total Disbursal Value" value={`₹${formatCurrency(r.business_volume.total_disbursal_value)}`} highlight />
                  <MetricBox label="Avg Loan Value" value={`₹${formatCurrency(r.business_volume.avg_loan_value)}`} />
                </div>
                {/* Conversion Metrics */}
                <p className="text-xs font-semibold text-slate-600 mb-2 mt-4">CONVERSION METRICS</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricBox label="Lead → Login %" value={`${r.conversion_metrics.lead_to_login}%`} />
                  <MetricBox label="Login → Approval %" value={`${r.conversion_metrics.login_to_approval}%`} />
                  <MetricBox label="Approval → Disbursal %" value={`${r.conversion_metrics.approval_to_disbursal}%`} />
                  <MetricBox label="Lead → Disbursal (E2E) %" value={`${r.conversion_metrics.lead_to_disbursal_e2e}%`} highlight />
                </div>
              </CardContent>
            </Card>

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

            {/* Section 3: Bank/Lender Performance */}
            <Card data-testid="bank-performance-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  3. Bank / Lender Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {r.bank_performance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" data-testid="bank-performance-table">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-2 border text-xs font-semibold">Metric</th>
                          {r.bank_performance.map((b, i) => (
                            <th key={i} className="text-center p-2 border text-xs font-semibold">{b.bank}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 border font-medium">Logins</td>
                          {r.bank_performance.map((b, i) => <td key={i} className="p-2 border text-center">{b.logins}</td>)}
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 border font-medium">Approvals</td>
                          {r.bank_performance.map((b, i) => <td key={i} className="p-2 border text-center">{b.approvals}</td>)}
                        </tr>
                        <tr className="hover:bg-slate-50 bg-green-50">
                          <td className="p-2 border font-semibold text-green-700">Disbursals</td>
                          {r.bank_performance.map((b, i) => <td key={i} className="p-2 border text-center font-semibold text-green-700">{b.disbursals}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No bank data available for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Pipeline Health */}
            <Card data-testid="pipeline-health-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  4. Pipeline Health Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm border-collapse max-w-lg" data-testid="pipeline-table">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-2 border text-xs font-semibold">Stage</th>
                      <th className="text-center p-2 border text-xs font-semibold">Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border">Pre-Login</td><td className="p-2 border text-center">{r.pipeline_health.pre_login}</td></tr>
                    <tr><td className="p-2 border">Login</td><td className="p-2 border text-center">{r.pipeline_health.login}</td></tr>
                    <tr><td className="p-2 border">Approved</td><td className="p-2 border text-center">{r.pipeline_health.approved}</td></tr>
                    <tr className="bg-slate-100 font-bold"><td className="p-2 border">TOTAL</td><td className="p-2 border text-center">{r.pipeline_health.total}</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Section 5: Rejection & Drop Analysis */}
            <Card data-testid="rejection-analysis-section">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  5. Rejection & Drop Analysis
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
