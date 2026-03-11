import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, LogOut, LayoutDashboard, Eye, Download, BarChart3, Search, FileDown } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, filterBySource, calculateDashboardStats, calculateTotalEligible, calculateDashboardStatsWithActivityDates, calculateTotalEligibleWithActivityDate } from '@/utils/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const OperationsDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  // New filter states
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sourceIdFilter, setSourceIdFilter] = useState('all');
  const [allAgents, setAllAgents] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState('all');
  // Activity Time Filter (for Approved, Disbursed, Eligible stats)
  const [activityTimeFilter, setActivityTimeFilter] = useState('all');
  const [activityFromDate, setActivityFromDate] = useState('');
  const [activityToDate, setActivityToDate] = useState('');
  const [showStatsExportModal, setShowStatsExportModal] = useState(false);
  const [statsExportFromDate, setStatsExportFromDate] = useState('');
  const [statsExportToDate, setStatsExportToDate] = useState('');
  const [exportingStats, setExportingStats] = useState(false);
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  // PDF Export
  const [exportingPDF, setExportingPDF] = useState(false);
  const dashboardRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAssignedLeads();
    fetchAllUsers();
    fetchManagers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/auth/admin/all-users');
      setAllAgents(response.data.agents || []);
      setAllPartners(response.data.partners || []);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await api.get('/hierarchy/managers');
      setAllManagers(response.data);
    } catch (error) {
      console.error('Failed to fetch managers');
    }
  };

  const fetchAssignedLeads = async () => {
    try {
      const response = await api.get('/leads/');
      // Filter leads assigned to current user
      const myLeads = response.data.filter(l => l.assigned_to === user.id);
      setLeads(myLeads);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleExportLeads = async () => {
    setExporting(true);
    try {
      let apiUrl = '/leads/export/disbursed';
      const params = new URLSearchParams();
      if (exportFromDate) params.append('from_date', exportFromDate);
      if (exportToDate) params.append('to_date', exportToDate);
      if (params.toString()) apiUrl += '?' + params.toString();
      
      const response = await api.get(apiUrl);
      const data = response.data;
      
      if (data.leads.length === 0) {
        toast.error('No disbursed leads found for the selected date range');
        setExporting(false);
        return;
      }
      
      const headers = [
        'Lead ID', 'Full Name', 'Mobile', 'Email', 'City', 'Loan Type', 'Created At',
        'Source Type', 'Source Name', 'Source Code', 'Source Phone', 'Source Email', 'Source PAN',
        'Source Bank Name', 'Source Account Holder', 'Source Account Number', 'Source IFSC',
        'Disbursed Bank', 'Disbursed Amount (₹)', 'ROI (%)', 'Commission (%)', 'Commission Amount (₹)',
        'Assigned To'
      ];
      
      const csvRows = [headers.join(',')];
      
      for (const lead of data.leads) {
        const sourceDetails = lead.source_details || {};
        const assignedDetails = lead.assigned_to_details || {};
        const bankDetails = sourceDetails.bank_details || {};
        const disbursement = lead.disbursement_info || {};
        
        const row = [
          lead.id,
          `"${(lead.full_name || '').replace(/"/g, '""')}"`,
          lead.mobile || '',
          lead.email || '',
          `"${(lead.city || '').replace(/"/g, '""')}"`,
          lead.loan_type || lead.requirement || '',
          lead.created_at || '',
          lead.source || '',
          `"${(sourceDetails.full_name || sourceDetails.name || '').replace(/"/g, '""')}"`,
          sourceDetails.agent_code || sourceDetails.referral_code || '',
          sourceDetails.phone || sourceDetails.mobile || '',
          sourceDetails.email || '',
          sourceDetails.pan_number || '',
          `"${(bankDetails.bank_name || '').replace(/"/g, '""')}"`,
          `"${(bankDetails.account_holder_name || '').replace(/"/g, '""')}"`,
          bankDetails.account_number || '',
          bankDetails.ifsc_code || '',
          `"${(disbursement.disbursed_bank || '').replace(/"/g, '""')}"`,
          disbursement.disbursed_amount || 0,
          disbursement.disbursed_roi || '',
          disbursement.commission_percentage || 0,
          disbursement.commission_amount || 0,
          `"${(assignedDetails.full_name || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }
      
      csvRows.push('');
      csvRows.push(`"SUMMARY",,,,,,,,,,,,,,,,,"Total Disbursed:",${data.total_disbursed_amount},"Total Commission:",${data.total_commission},`);
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateRange = exportFromDate && exportToDate ? `_${exportFromDate}_to_${exportToDate}` : '';
      a.download = `bankezee_disbursed_leads${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Exported ${data.leads.length} disbursed leads | Total: ₹${data.total_disbursed_amount.toLocaleString()} | Commission: ₹${data.total_commission.toLocaleString()}`);
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  // Export Agent/Partner Stats
  const handleExportStats = async () => {
    setExportingStats(true);
    try {
      const response = await api.get('/leads/');
      let allLeads = response.data.filter(l => l.assigned_to === user.id);
      
      if (statsExportFromDate || statsExportToDate) {
        allLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          if (statsExportFromDate && leadDate < new Date(statsExportFromDate)) return false;
          if (statsExportToDate) {
            const toDate = new Date(statsExportToDate);
            toDate.setHours(23, 59, 59, 999);
            if (leadDate > toDate) return false;
          }
          return true;
        });
      }

      const agentStats = {};
      const partnerStats = {};

      for (const lead of allLeads) {
        if (lead.source === 'agent' && lead.source_id) {
          if (!agentStats[lead.source_id]) {
            const agent = allAgents.find(a => a.id === lead.source_id);
            agentStats[lead.source_id] = {
              name: agent?.full_name || 'Unknown',
              code: agent?.agent_code || '',
              totalLeads: 0,
              new: 0, contacted: 0, documents_collected: 0, documents_pending: 0, sent_for_eligibility: 0,
              sent_for_login: 0, login: 0, sent_for_approval: 0, underwriting: 0,
              fi: 0, fi_negative: 0, fi_reinitiated: 0, query_hold: 0,
              customer_not_interested: 0, customer_not_supporting: 0,
              approved: 0, disbursed: 0,
              not_eligible: 0, not_login: 0, declined: 0, not_disbursed: 0, rejected: 0,
              totalDisbursedAmount: 0, totalCommission: 0
            };
          }
          const stats = agentStats[lead.source_id];
          stats.totalLeads++;
          if (stats[lead.status] !== undefined) stats[lead.status]++;
          if (lead.status === 'disbursed') {
            const disbursedElig = lead.eligibilities?.find(e => e.disbursed === 'yes' || e.disbursed === true);
            stats.totalDisbursedAmount += disbursedElig?.disbursed_amount || 0;
            stats.totalCommission += disbursedElig?.commission_amount || 0;
          }
        }

        if (lead.source === 'partner' && lead.source_id) {
          if (!partnerStats[lead.source_id]) {
            const partner = allPartners.find(p => p.id === lead.source_id);
            partnerStats[lead.source_id] = {
              name: partner?.name || partner?.full_name || 'Unknown',
              code: partner?.referral_code || '',
              totalLeads: 0,
              new: 0, contacted: 0, documents_collected: 0, documents_pending: 0, sent_for_eligibility: 0,
              sent_for_login: 0, login: 0, sent_for_approval: 0, underwriting: 0,
              fi: 0, fi_negative: 0, fi_reinitiated: 0, query_hold: 0,
              customer_not_interested: 0, customer_not_supporting: 0,
              approved: 0, disbursed: 0,
              not_eligible: 0, not_login: 0, declined: 0, not_disbursed: 0, rejected: 0,
              totalDisbursedAmount: 0, totalCommission: 0
            };
          }
          const stats = partnerStats[lead.source_id];
          stats.totalLeads++;
          if (stats[lead.status] !== undefined) stats[lead.status]++;
          if (lead.status === 'disbursed') {
            const disbursedElig = lead.eligibilities?.find(e => e.disbursed === 'yes' || e.disbursed === true);
            stats.totalDisbursedAmount += disbursedElig?.disbursed_amount || 0;
            stats.totalCommission += disbursedElig?.commission_amount || 0;
          }
        }
      }

      const headers = [
        'Type', 'Name', 'Code', 'Total Leads',
        'New', 'Contacted', 'Docs Collected', 'Docs Pending', 'Sent for Eligibility', 'Sent for Login', 'Login',
        'Sent for Approval', 'Underwriting', 'FI', 'FI Negative', 'FI Reinitiated', 'Query/Hold',
        'Cust Not Interested', 'Cust Not Supporting',
        'Approved', 'Disbursed',
        'Not Eligible', 'Not Login', 'Declined', 'Not Disbursed', 'Rejected',
        'Disbursed Amount (₹)', 'Commission (₹)'
      ];
      const csvRows = [headers.join(',')];

      Object.values(agentStats).forEach(stats => {
        csvRows.push([
          'Agent', `"${stats.name}"`, stats.code, stats.totalLeads,
          stats.new, stats.contacted, stats.documents_collected, stats.documents_pending, stats.sent_for_eligibility,
          stats.sent_for_login, stats.login, stats.sent_for_approval, stats.underwriting,
          stats.fi, stats.fi_negative, stats.fi_reinitiated, stats.query_hold,
          stats.customer_not_interested, stats.customer_not_supporting,
          stats.approved, stats.disbursed,
          stats.not_eligible, stats.not_login, stats.declined, stats.not_disbursed, stats.rejected,
          stats.totalDisbursedAmount, stats.totalCommission
        ].join(','));
      });

      Object.values(partnerStats).forEach(stats => {
        csvRows.push([
          'Partner', `"${stats.name}"`, stats.code, stats.totalLeads,
          stats.new, stats.contacted, stats.documents_collected, stats.documents_pending, stats.sent_for_eligibility,
          stats.sent_for_login, stats.login, stats.sent_for_approval, stats.underwriting,
          stats.fi, stats.fi_negative, stats.fi_reinitiated, stats.query_hold,
          stats.customer_not_interested, stats.customer_not_supporting,
          stats.approved, stats.disbursed,
          stats.not_eligible, stats.not_login, stats.declined, stats.not_disbursed, stats.rejected,
          stats.totalDisbursedAmount, stats.totalCommission
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateRange = statsExportFromDate && statsExportToDate ? `_${statsExportFromDate}_to_${statsExportToDate}` : '';
      a.download = `bankezee_my_agent_partner_stats${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported stats for ${Object.keys(agentStats).length} agents and ${Object.keys(partnerStats).length} partners`);
      setShowStatsExportModal(false);
    } catch (error) {
      toast.error('Failed to export stats');
    } finally {
      setExportingStats(false);
    }
  };

  // Apply filters
  // Apply non-time filters to get base filtered leads
  let baseFilteredLeads = filterByLoanType(leads, loanTypeFilter);
  baseFilteredLeads = filterBySource(baseFilteredLeads, sourceFilter, sourceIdFilter === 'all' ? null : sourceIdFilter);
  if (statusFilter !== 'all') {
    baseFilteredLeads = baseFilteredLeads.filter(l => l.status === statusFilter);
  }
  // Apply manager filter
  if (managerFilter !== 'all') {
    const usersUnderManager = [...allAgents, ...allPartners].filter(u => u.manager_id === managerFilter).map(u => u.id);
    baseFilteredLeads = baseFilteredLeads.filter(l => usersUnderManager.includes(l.source_id));
  }
  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    baseFilteredLeads = baseFilteredLeads.filter(l => 
      (l.full_name && l.full_name.toLowerCase().includes(query)) ||
      (l.mobile && l.mobile.includes(query))
    );
  }

  // Calculate activity-based stats using ACTIVITY TIME FILTER (Approved, Disbursed, Rejected, Total Eligible)
  const stats = calculateDashboardStatsWithActivityDates(baseFilteredLeads, activityTimeFilter, activityFromDate, activityToDate);
  // Calculate total eligible based on when login was done (activity date)
  const filteredTotalEligible = calculateTotalEligibleWithActivityDate(baseFilteredLeads, activityTimeFilter, activityFromDate, activityToDate);
  
  // For the leads list & "Total Leads"/"New" stats, apply LEAD TIME FILTER (based on lead creation date)
  let filteredLeads = filterByTimePeriod(baseFilteredLeads, timeFilter, filterFromDate, filterToDate);
  
  // Override total and newLeads in stats to use lead creation date filter
  const leadsStats = {
    ...stats,
    total: filteredLeads.length,
    newLeads: filteredLeads.filter(l => ['new', 'fresh'].includes(l.status)).length
  };

  // Export Dashboard to PDF
  const handleExportDashboardPDF = async () => {
    if (!dashboardRef.current) return;
    
    setExportingPDF(true);
    toast.info('Generating PDF...');
    
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add title
      pdf.setFontSize(18);
      pdf.setTextColor(34, 175, 71);
      pdf.text('Bankezee Operations Dashboard Report', pdfWidth / 2, 15, { align: 'center' });
      
      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pdfWidth / 2, 22, { align: 'center' });
      
      // Add stats summary
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      let yPos = 35;
      pdf.text('Summary Statistics:', 15, yPos);
      yPos += 8;
      pdf.setFontSize(10);
      pdf.text(`Total Leads: ${stats.total}`, 20, yPos);
      yPos += 6;
      pdf.text(`New: ${stats.newLeads} | In Progress: ${stats.inProgress} | Approved: ${stats.approved}`, 20, yPos);
      yPos += 6;
      pdf.text(`Disbursed: ${stats.disbursed} | Rejected: ${stats.rejected}`, 20, yPos);
      yPos += 6;
      pdf.text(`Total Disbursed Amount: ₹${(stats.totalDisbursedAmount || 0).toLocaleString()}`, 20, yPos);
      yPos += 6;
      pdf.text(`Total Eligible (Login=Yes): ₹${(filteredTotalEligible || 0).toLocaleString()}`, 20, yPos);
      
      // Add charts image
      const chartStartY = yPos + 15;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const chartImgWidth = pdfWidth - 20;
      const chartImgHeight = (imgHeight * chartImgWidth) / imgWidth;
      
      if (chartStartY + chartImgHeight > pdfHeight - 10) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, chartImgWidth, Math.min(chartImgHeight, pdfHeight - 20));
      } else {
        pdf.addImage(imgData, 'PNG', 10, chartStartY, chartImgWidth, Math.min(chartImgHeight, pdfHeight - chartStartY - 10));
      }
      
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`bankezee_ops_dashboard_${dateStr}.pdf`);
      toast.success('Dashboard PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Operations Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/reports/daily')}
            variant="outline"
            size="sm"
            data-testid="daily-report-btn"
          >
            <FileText className="w-4 h-4 mr-1" />
            Daily Report
          </Button>
          <Button
            onClick={() => setShowExportModal(true)}
            variant="outline"
            size="sm"
            disabled={exporting}
            data-testid="export-leads-btn"
          >
            <Download className="w-4 h-4 mr-1" />
            Export Disbursed
          </Button>
          <Button
            onClick={() => setShowStatsExportModal(true)}
            variant="outline"
            size="sm"
            disabled={exportingStats}
            data-testid="export-stats-btn"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Export Stats
          </Button>
          <Button
            onClick={handleExportDashboardPDF}
            variant="outline"
            size="sm"
            disabled={exportingPDF}
            data-testid="export-pdf-btn"
          >
            <FileDown className="w-4 h-4 mr-1" />
            {exportingPDF ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-600" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Export Disbursed Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Disbursed Leads
              </CardTitle>
              <CardDescription>Export disbursed leads with commission details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">From Date</label>
                  <Input
                    type="date"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
                    className="w-full"
                    data-testid="export-from-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">To Date</label>
                  <Input
                    type="date"
                    value={exportToDate}
                    onChange={(e) => setExportToDate(e.target.value)}
                    className="w-full"
                    data-testid="export-to-date"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Leave dates empty to export all disbursed leads</p>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setShowExportModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExportLeads} 
                  className="flex-1 bg-primary"
                  disabled={exporting}
                  data-testid="confirm-export-btn"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Stats Modal */}
      {showStatsExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Export Agent/Partner Stats
              </CardTitle>
              <CardDescription>Export performance stats for my assigned leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">From Date</label>
                  <Input
                    type="date"
                    value={statsExportFromDate}
                    onChange={(e) => setStatsExportFromDate(e.target.value)}
                    className="w-full"
                    data-testid="stats-from-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">To Date</label>
                  <Input
                    type="date"
                    value={statsExportToDate}
                    onChange={(e) => setStatsExportToDate(e.target.value)}
                    className="w-full"
                    data-testid="stats-to-date"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Leave dates empty to export all-time stats</p>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setShowStatsExportModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExportStats} 
                  className="flex-1 bg-primary"
                  disabled={exportingStats}
                  data-testid="confirm-stats-export-btn"
                >
                  {exportingStats ? 'Exporting...' : 'Export Stats CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-6 md:px-12 lg:px-24 py-8">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="lead-search-input"
            />
          </div>
        </div>

        {/* Filters */}
        <DashboardFilters
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          loanTypeFilter={loanTypeFilter}
          onLoanTypeFilterChange={setLoanTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          fromDate={filterFromDate}
          toDate={filterToDate}
          onFromDateChange={setFilterFromDate}
          onToDateChange={setFilterToDate}
          sourceFilter={sourceFilter}
          onSourceFilterChange={(v) => { setSourceFilter(v); setSourceIdFilter('all'); }}
          sourceIdFilter={sourceIdFilter}
          onSourceIdFilterChange={setSourceIdFilter}
          agents={allAgents}
          partners={allPartners}
          showSourceFilter={true}
          managerFilter={managerFilter}
          onManagerFilterChange={setManagerFilter}
          managers={allManagers}
          showManagerFilter={true}
          activityTimeFilter={activityTimeFilter}
          onActivityTimeFilterChange={setActivityTimeFilter}
          activityFromDate={activityFromDate}
          activityToDate={activityToDate}
          onActivityFromDateChange={setActivityFromDate}
          onActivityToDateChange={setActivityToDate}
          showActivityTimeFilter={true}
        />

        {/* Stats Cards */}
        <div ref={dashboardRef}>
          <DashboardStats stats={leadsStats} showEarnings={false} totalEligible={filteredTotalEligible} />

          {/* Performance Overview */}
          <PerformanceOverview leads={filteredLeads} stats={leadsStats} />
        </div>

        {/* Leads List */}
        <Card data-testid="assigned-leads-card">
          <CardHeader>
            <CardTitle>My Assigned Leads ({filteredLeads.length})</CardTitle>
            <CardDescription>Leads assigned to you for processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    data-testid={`lead-item-${lead.id}`}
                  >
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-sm text-slate-600">{lead.mobile} | {lead.city}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                        lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                        lead.status === 'rejected' || lead.status === 'declined' || lead.status === 'not_eligible' ? 'bg-red-100 text-red-800' :
                        lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No leads found</p>
                  <p className="text-sm">Adjust your filters or wait for leads to be assigned</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationsDashboard;
