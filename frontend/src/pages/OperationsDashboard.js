import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, LogOut, LayoutDashboard, Eye, Download } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, calculateDashboardStats } from '@/utils/constants';

const OperationsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0 });
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAssignedLeads();
  }, []);

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

  // Apply filters
  let filteredLeads = filterByTimePeriod(leads, timeFilter);
  filteredLeads = filterByLoanType(filteredLeads, loanTypeFilter);
  if (statusFilter !== 'all') {
    filteredLeads = filteredLeads.filter(l => l.status === statusFilter);
  }

  const stats = calculateDashboardStats(filteredLeads);

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => setShowExportModal(true)}
            variant="outline"
            disabled={exporting}
            data-testid="export-leads-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Disbursed
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="text-slate-600" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Export Modal */}
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

      <div className="px-6 md:px-12 lg:px-24 py-8">
        {/* Filters */}
        <DashboardFilters
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          loanTypeFilter={loanTypeFilter}
          onLoanTypeFilterChange={setLoanTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Stats Cards */}
        <DashboardStats stats={stats} earnings={earnings} />

        {/* Performance Overview */}
        <PerformanceOverview leads={filteredLeads} stats={stats} />

        {/* Leads List */}
        <Card data-testid="assigned-leads-card">
          <CardHeader>
            <CardTitle>My Assigned Leads ({filteredLeads.length})</CardTitle>
            <CardDescription>Leads assigned to you for processing</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Inline Filters */}
            <div className="mb-4">
              <DashboardFilters
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                loanTypeFilter={loanTypeFilter}
                onLoanTypeFilterChange={setLoanTypeFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                showStatusFilter={true}
              />
            </div>
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
