import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, Download, ArrowLeft, Calendar, Filter, BarChart3, TrendingUp } from 'lucide-react';

const AgentPerformanceReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [managers, setManagers] = useState([]);
  
  // Filters
  const [timeFilter, setTimeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [managerId, setManagerId] = useState('all');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/reports/managers-list');
      setManagers(response.data);
    } catch (error) {
      console.error('Failed to fetch managers');
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let start, end;
    
    switch (timeFilter) {
      case 'today':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'yesterday':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));
        break;
      case 'this_week':
        const dayOfWeek = now.getUTCDay();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'last_week':
        const lastWeekDay = now.getUTCDay();
        const lastWeekStart = now.getUTCDate() - lastWeekDay - 7;
        const lastWeekEnd = now.getUTCDate() - lastWeekDay - 1;
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), lastWeekStart));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), lastWeekEnd, 23, 59, 59));
        break;
      case 'this_month':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        break;
      case 'last_month':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
        break;
      case 'custom':
        if (fromDate && toDate) {
          start = new Date(fromDate + 'T00:00:00Z');
          end = new Date(toDate + 'T23:59:59Z');
        } else {
          start = new Date('2020-01-01T00:00:00Z');
          end = now;
        }
        break;
      default: // 'all'
        start = new Date('2020-01-01T00:00:00Z');
        end = now;
    }
    
    // Format as YYYY-MM-DD
    const formatDate = (d) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      from: formatDate(start),
      to: formatDate(end)
    };
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to
      });
      
      if (managerId !== 'all') {
        params.append('manager_id', managerId);
      }
      
      const response = await api.get(`/reports/agent-performance?${params.toString()}`);
      setReportData(response.data);
      toast.success(`Found ${response.data.agents?.length || 0} agents with leads`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData?.agents?.length) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Agent Name', 'Agent Code', 'Phone', 'Manager',
      'Total Leads', 'New', 'Contacted', 'In Progress', 'Query Hold',
      'Login', 'Docs Collected', 'Approved', 'Disbursed', 'Rejected', 'Other',
      'Total Approved Amount', 'Total Disbursed Amount'
    ];

    const rows = reportData.agents.map(agent => [
      agent.agent_name,
      agent.agent_code,
      agent.phone,
      agent.manager_name || '-',
      agent.total_leads,
      agent.new || 0,
      agent.contacted || 0,
      agent.in_progress || 0,
      agent.query_hold || 0,
      agent.login || 0,
      agent.documents_collected || 0,
      agent.approved || 0,
      agent.disbursed || 0,
      agent.rejected || 0,
      agent.other || 0,
      agent.total_approved_amount,
      agent.total_disbursed_amount
    ]);

    // Add totals row
    const totals = reportData.totals || {};
    rows.push([
      'TOTAL', '', '', '',
      totals.total_leads || 0,
      totals.new || 0,
      totals.contacted || 0,
      totals.in_progress || 0,
      totals.query_hold || 0,
      totals.login || 0,
      totals.documents_collected || 0,
      totals.approved || 0,
      totals.disbursed || 0,
      totals.rejected || 0,
      totals.other || 0,
      totals.total_approved_amount || 0,
      totals.total_disbursed_amount || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Agent_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Report exported successfully');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-800">Agent Performance Report</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reportData?.agents?.length > 0 && (
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Time Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Time Period
                </Label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger data-testid="time-filter">
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {timeFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      data-testid="from-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      data-testid="to-date-input"
                    />
                  </div>
                </>
              )}

              {/* Manager Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manager
                </Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger data-testid="manager-filter">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <Button
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  data-testid="generate-report-btn"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{reportData.totals?.total_agents || 0}</p>
                <p className="text-sm text-blue-800">Total Agents</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-slate-600">{reportData.totals?.total_leads || 0}</p>
                <p className="text-sm text-slate-800">Total Leads</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{reportData.totals?.approved || 0}</p>
                <p className="text-sm text-emerald-800">Approved</p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-teal-600">{reportData.totals?.disbursed || 0}</p>
                <p className="text-sm text-teal-800">Disbursed</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-600">{reportData.totals?.rejected || 0}</p>
                <p className="text-sm text-red-800">Rejected</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(reportData.totals?.total_disbursed_amount)}</p>
                <p className="text-sm text-amber-800">Total Disbursed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent Performance Table */}
        {reportData?.agents?.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Agent-wise Performance ({reportData.agents.length} agents)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold border-b">Agent Name</th>
                      <th className="px-3 py-3 text-left font-semibold border-b">Code</th>
                      <th className="px-3 py-3 text-left font-semibold border-b">Manager</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-slate-200">Leads</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-blue-50">New</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-yellow-50">Contacted</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-orange-50">In Prog</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-purple-50">Q.Hold</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-cyan-50">Login</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-indigo-50">Docs</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-emerald-50">Appr</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-teal-50">Disb</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-red-50">Rej</th>
                      <th className="px-3 py-3 text-center font-semibold border-b bg-gray-50">Other</th>
                      <th className="px-3 py-3 text-right font-semibold border-b bg-emerald-100">Appr. Amt</th>
                      <th className="px-3 py-3 text-right font-semibold border-b bg-teal-100">Disb. Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.agents.map((agent, index) => (
                      <tr key={agent.agent_id || index} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{agent.agent_name}</td>
                        <td className="px-3 py-2 text-slate-600 text-xs">{agent.agent_code || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{agent.manager_name || '-'}</td>
                        <td className="px-3 py-2 text-center font-bold bg-slate-50">{agent.total_leads}</td>
                        <td className="px-3 py-2 text-center bg-blue-50/50">{agent.new || 0}</td>
                        <td className="px-3 py-2 text-center bg-yellow-50/50">{agent.contacted || 0}</td>
                        <td className="px-3 py-2 text-center bg-orange-50/50">{agent.in_progress || 0}</td>
                        <td className="px-3 py-2 text-center bg-purple-50/50">{agent.query_hold || 0}</td>
                        <td className="px-3 py-2 text-center bg-cyan-50/50">{agent.login || 0}</td>
                        <td className="px-3 py-2 text-center bg-indigo-50/50">{agent.documents_collected || 0}</td>
                        <td className="px-3 py-2 text-center bg-emerald-50/50 text-emerald-700 font-medium">{agent.approved || 0}</td>
                        <td className="px-3 py-2 text-center bg-teal-50/50 text-teal-700 font-bold">{agent.disbursed || 0}</td>
                        <td className="px-3 py-2 text-center bg-red-50/50 text-red-700">{agent.rejected || 0}</td>
                        <td className="px-3 py-2 text-center bg-gray-50/50">{agent.other || 0}</td>
                        <td className="px-3 py-2 text-right bg-emerald-50/50 text-emerald-800">{formatCurrency(agent.total_approved_amount)}</td>
                        <td className="px-3 py-2 text-right bg-teal-50/50 text-teal-800 font-bold">{formatCurrency(agent.total_disbursed_amount)}</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-slate-200 font-bold border-t-2 border-slate-400">
                      <td className="px-3 py-3" colSpan={3}>TOTAL</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.total_leads || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.new || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.contacted || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.in_progress || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.query_hold || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.login || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.documents_collected || 0}</td>
                      <td className="px-3 py-3 text-center text-emerald-700">{reportData.totals?.approved || 0}</td>
                      <td className="px-3 py-3 text-center text-teal-700">{reportData.totals?.disbursed || 0}</td>
                      <td className="px-3 py-3 text-center text-red-700">{reportData.totals?.rejected || 0}</td>
                      <td className="px-3 py-3 text-center">{reportData.totals?.other || 0}</td>
                      <td className="px-3 py-3 text-right text-emerald-800">{formatCurrency(reportData.totals?.total_approved_amount)}</td>
                      <td className="px-3 py-3 text-right text-teal-800">{formatCurrency(reportData.totals?.total_disbursed_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : reportData && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No agent data found for the selected filters</p>
                <p className="text-sm mt-2">Try adjusting your date range or manager filter</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!reportData && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select filters and click "Generate Report"</p>
                <p className="text-sm mt-2">This report shows agent-wise lead statistics and performance metrics</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AgentPerformanceReport;
