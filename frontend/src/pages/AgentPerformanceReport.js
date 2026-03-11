import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, Download, ArrowLeft, Calendar, Filter, BarChart3, TrendingUp, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AgentPerformanceReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [managers, setManagers] = useState([]);
  const reportRef = useRef(null);
  
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

    // Build headers dynamically based on visible columns
    const headers = [
      'Agent Name', 'Agent Code', 'Phone', 'Manager', 'Total Leads',
      ...visibleStatusColumns.map(col => col.label),
      'Total Approved Amount', 'Total Disbursed Amount'
    ];

    const rows = reportData.agents.map(agent => [
      agent.agent_name,
      agent.agent_code,
      agent.phone,
      agent.manager_name || '-',
      agent.total_leads,
      ...visibleStatusColumns.map(col => agent[col.key] || 0),
      agent.total_approved_amount,
      agent.total_disbursed_amount
    ]);

    // Add totals row
    const totals = reportData.totals || {};
    rows.push([
      'TOTAL', '', '', '',
      totals.total_leads || 0,
      ...visibleStatusColumns.map(col => totals[col.key] || 0),
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

  const exportToPDF = async () => {
    if (!reportData?.agents?.length || !reportRef.current) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    toast.info('Generating PDF...');

    try {
      // Capture the report section
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions (landscape for wide tables)
      const pdfWidth = imgWidth > imgHeight ? 297 : 210; // A4 landscape or portrait
      const pdfHeight = imgWidth > imgHeight ? 210 : 297;
      
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add title
      pdf.setFontSize(16);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Agent Performance Report', 14, 15);
      
      // Add date range
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const dateRange = getDateRange();
      pdf.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 22);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 27);

      // Calculate image dimensions to fit on page
      const pageWidth = pdfWidth - 28; // margins
      const pageHeight = pdfHeight - 40; // margins + header
      const ratio = Math.min(pageWidth / (imgWidth * 0.264583), pageHeight / (imgHeight * 0.264583));
      
      const scaledWidth = imgWidth * 0.264583 * ratio;
      const scaledHeight = imgHeight * 0.264583 * ratio;

      // Add the captured image
      pdf.addImage(imgData, 'PNG', 14, 32, scaledWidth, scaledHeight);

      // Save the PDF
      pdf.save(`Agent_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  // Define all status columns with their properties
  const allStatusColumns = [
    { key: 'new', label: 'New', headerBg: 'bg-blue-50', cellBg: 'bg-blue-50/50' },
    { key: 'contacted', label: 'Contacted', headerBg: 'bg-yellow-50', cellBg: 'bg-yellow-50/50' },
    { key: 'documents_collected', label: 'Docs Coll', headerBg: 'bg-indigo-50', cellBg: 'bg-indigo-50/50' },
    { key: 'documents_pending', label: 'Docs Pend', headerBg: 'bg-orange-50', cellBg: 'bg-orange-50/50' },
    { key: 'sent_for_eligibility', label: 'Snt Elig', headerBg: 'bg-cyan-50', cellBg: 'bg-cyan-50/50' },
    { key: 'sent_for_login', label: 'Snt Login', headerBg: 'bg-cyan-100', cellBg: 'bg-cyan-50/50' },
    { key: 'login', label: 'Login', headerBg: 'bg-green-50', cellBg: 'bg-green-50/50' },
    { key: 'sent_for_approval', label: 'Snt Appr', headerBg: 'bg-green-100', cellBg: 'bg-green-50/50' },
    { key: 'underwriting', label: 'UW', headerBg: 'bg-purple-50', cellBg: 'bg-purple-50/50' },
    { key: 'fi', label: 'FI', headerBg: 'bg-purple-100', cellBg: 'bg-purple-50/50' },
    { key: 'fi_negative', label: 'FI -ve', headerBg: 'bg-red-100', cellBg: 'bg-red-50/50' },
    { key: 'fi_reinitiated', label: 'FI Reinit', headerBg: 'bg-amber-50', cellBg: 'bg-amber-50/50' },
    { key: 'query_hold', label: 'Q.Hold', headerBg: 'bg-amber-100', cellBg: 'bg-amber-50/50' },
    { key: 'customer_not_interested', label: 'Cust Not Int', headerBg: 'bg-pink-50', cellBg: 'bg-pink-50/50' },
    { key: 'customer_not_supporting', label: 'Cust Not Supp', headerBg: 'bg-pink-100', cellBg: 'bg-pink-50/50' },
    { key: 'approved', label: 'Approved', headerBg: 'bg-emerald-100', cellBg: 'bg-emerald-50/50', textClass: 'text-emerald-700 font-medium' },
    { key: 'disbursed', label: 'Disbursed', headerBg: 'bg-teal-100', cellBg: 'bg-teal-50/50', textClass: 'text-teal-700 font-bold' },
    { key: 'not_eligible', label: 'Not Elig', headerBg: 'bg-red-50', cellBg: 'bg-red-50/50', textClass: 'text-red-600' },
    { key: 'not_login', label: 'Not Login', headerBg: 'bg-red-100', cellBg: 'bg-red-50/50', textClass: 'text-red-600' },
    { key: 'declined', label: 'Declined', headerBg: 'bg-red-200', cellBg: 'bg-red-50/50', textClass: 'text-red-600' },
    { key: 'not_disbursed', label: 'Not Disb', headerBg: 'bg-red-300', cellBg: 'bg-red-50/50', textClass: 'text-red-600' },
    { key: 'rejected', label: 'Rejected', headerBg: 'bg-red-400 text-white', cellBg: 'bg-red-100/50', textClass: 'text-red-700 font-medium' },
  ];

  // Get visible status columns (only those with at least one non-zero value)
  const getVisibleStatusColumns = () => {
    if (!reportData?.agents?.length) return [];
    return allStatusColumns.filter(col => {
      return reportData.agents.some(agent => (agent[col.key] || 0) > 0);
    });
  };

  const visibleStatusColumns = reportData ? getVisibleStatusColumns() : [];

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
                <>
                  <Button onClick={exportToPDF} variant="outline" className="gap-2" disabled={exporting}>
                    <FileText className="h-4 w-4" />
                    {exporting ? 'Exporting...' : 'Export PDF'}
                  </Button>
                  <Button onClick={exportToCSV} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </>
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

        {/* Summary Cards and Table - wrapped for PDF export */}
        <div ref={reportRef}>
          {/* Summary Cards */}
          {reportData && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold border-b whitespace-nowrap">Agent</th>
                      <th className="px-2 py-2 text-left font-semibold border-b whitespace-nowrap">Code</th>
                      <th className="px-2 py-2 text-left font-semibold border-b whitespace-nowrap">Manager</th>
                      <th className="px-2 py-2 text-center font-semibold border-b bg-slate-200 whitespace-nowrap">Total</th>
                      {visibleStatusColumns.map(col => (
                        <th key={col.key} className={`px-2 py-2 text-center font-semibold border-b whitespace-nowrap ${col.headerBg}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-right font-semibold border-b bg-emerald-200 whitespace-nowrap">Appr.₹</th>
                      <th className="px-2 py-2 text-right font-semibold border-b bg-teal-200 whitespace-nowrap">Disb.₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.agents.map((agent, index) => (
                      <tr key={agent.agent_id || index} className="border-b hover:bg-slate-50">
                        <td className="px-2 py-1.5 font-medium whitespace-nowrap">{agent.agent_name}</td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{agent.agent_code || '-'}</td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{agent.manager_name || '-'}</td>
                        <td className="px-2 py-1.5 text-center font-bold bg-slate-50">{agent.total_leads}</td>
                        {visibleStatusColumns.map(col => (
                          <td key={col.key} className={`px-2 py-1.5 text-center ${col.cellBg} ${col.textClass || ''}`}>
                            {agent[col.key] || 0}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-right bg-emerald-50/50 text-emerald-800 whitespace-nowrap">{formatCurrency(agent.total_approved_amount)}</td>
                        <td className="px-2 py-1.5 text-right bg-teal-50/50 text-teal-800 font-bold whitespace-nowrap">{formatCurrency(agent.total_disbursed_amount)}</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-slate-200 font-bold border-t-2 border-slate-400">
                      <td className="px-2 py-2" colSpan={3}>TOTAL</td>
                      <td className="px-2 py-2 text-center">{reportData.totals?.total_leads || 0}</td>
                      {visibleStatusColumns.map(col => (
                        <td key={col.key} className={`px-2 py-2 text-center ${col.textClass || ''}`}>
                          {reportData.totals?.[col.key] || 0}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right text-emerald-800">{formatCurrency(reportData.totals?.total_approved_amount)}</td>
                      <td className="px-2 py-2 text-right text-teal-800">{formatCurrency(reportData.totals?.total_disbursed_amount)}</td>
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
