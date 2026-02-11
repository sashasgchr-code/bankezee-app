import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, LogOut, LayoutDashboard, Eye, UserPlus, CheckSquare, X, Trash2, UserCog, Building, Briefcase, Download, FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, CreditCard, User, MapPin, Phone, Mail, Hash, Building2 } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, calculateDashboardStats, LOAN_TYPES, TIME_FILTERS } from '@/utils/constants';

// Detail Card Component for showing all user info
const UserDetailCard = ({ user, type, onClose }) => {
  const bankDetails = user.bank_details || {};
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  const getIdCardUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/api') ? `${backendUrl}${url}` : url;
  };

  return (
    <div className="mt-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm" data-testid={`user-detail-${user.id}`}>
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-semibold text-slate-800">Complete Details</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <User className="w-4 h-4" /> Basic Information
          </h5>
          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
            <p><span className="text-slate-500">Name:</span> <span className="font-medium">{user.full_name || user.name}</span></p>
            <p><span className="text-slate-500">Email:</span> <span className="font-medium">{user.email}</span></p>
            <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{user.phone || user.mobile}</span></p>
            <p><span className="text-slate-500">City:</span> <span className="font-medium">{user.city || 'N/A'}</span></p>
            {type === 'partner' && user.occupation && (
              <p><span className="text-slate-500">Occupation:</span> <span className="font-medium">{user.occupation}</span></p>
            )}
            <p><span className="text-slate-500">Code:</span> <span className="font-medium text-primary">{user.agent_code || user.referral_code}</span></p>
            <p><span className="text-slate-500">Registered:</span> <span className="font-medium">{new Date(user.created_at).toLocaleString()}</span></p>
          </div>
        </div>

        {/* KYC Details */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <CreditCard className="w-4 h-4" /> KYC Details
          </h5>
          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
            <p><span className="text-slate-500">PAN Number:</span> <span className="font-medium">{user.pan_number || 'N/A'}</span></p>
            <p><span className="text-slate-500">Status:</span> 
              <span className={`ml-1 px-2 py-0.5 rounded text-xs ${user.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {user.is_approved ? 'Approved' : 'Pending'}
              </span>
            </p>
            {user.id_card_url && (
              <div className="pt-2">
                <a 
                  href={getIdCardUrl(user.id_card_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View ID Card / Document
                </a>
              </div>
            )}
            {!user.id_card_url && (
              <p className="text-slate-400 italic">No ID document uploaded</p>
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Bank Details
          </h5>
          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
            <p><span className="text-slate-500">Bank Name:</span> <span className="font-medium">{bankDetails.bank_name || 'N/A'}</span></p>
            <p><span className="text-slate-500">Account Holder:</span> <span className="font-medium">{bankDetails.account_holder_name || 'N/A'}</span></p>
            <p><span className="text-slate-500">Account Number:</span> <span className="font-medium">{bankDetails.account_number || 'N/A'}</span></p>
            <p><span className="text-slate-500">IFSC Code:</span> <span className="font-medium">{bankDetails.ifsc_code || 'N/A'}</span></p>
          </div>
        </div>
      </div>

      {/* Performance Stats for approved users */}
      {user.is_approved && (type === 'agent' ? user.performance : true) && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="text-sm font-medium text-slate-600 mb-2">Performance</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {type === 'agent' && user.performance && (
              <>
                <div className="bg-blue-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-blue-700">{user.performance.total_leads || 0}</p>
                  <p className="text-xs text-blue-600">Total Leads</p>
                </div>
                <div className="bg-green-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-green-700">{user.performance.converted_leads || 0}</p>
                  <p className="text-xs text-green-600">Converted</p>
                </div>
                <div className="bg-purple-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-purple-700">₹{(user.performance.total_commission || 0).toLocaleString()}</p>
                  <p className="text-xs text-purple-600">Commission</p>
                </div>
              </>
            )}
            {type === 'partner' && (
              <>
                <div className="bg-blue-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-blue-700">{user.total_leads || 0}</p>
                  <p className="text-xs text-blue-600">Total Leads</p>
                </div>
                <div className="bg-green-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-green-700">{user.approved_cases || 0}</p>
                  <p className="text-xs text-green-600">Approved Cases</p>
                </div>
                <div className="bg-purple-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-purple-700">₹{(user.total_earnings || 0).toLocaleString()}</p>
                  <p className="text-xs text-purple-600">Total Earnings</p>
                </div>
                <div className="bg-orange-50 p-2 rounded text-center">
                  <p className="text-lg font-bold text-orange-700">₹{(user.wallet_balance || 0).toLocaleString()}</p>
                  <p className="text-xs text-orange-600">Wallet Balance</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [opsTeam, setOpsTeam] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [showAddOpsModal, setShowAddOpsModal] = useState(false);
  const [newOpsUser, setNewOpsUser] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [creatingOps, setCreatingOps] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [opsUsersWithReports, setOpsUsersWithReports] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pendingAgents, setPendingAgents] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [approvingUser, setApprovingUser] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  useEffect(() => {
    fetchLeads();
    fetchOpsTeam();
    fetchPendingApprovals();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchOpsUsersWithReports();
      fetchAllUsers();
    }
    if (activeTab === 'approvals') {
      fetchPendingApprovals();
    }
  }, [activeTab]);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads/');
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsTeam = async () => {
    try {
      const response = await api.get('/crm/operations-team');
      setOpsTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch ops team');
    }
  };

  const fetchOpsUsersWithReports = async () => {
    try {
      const response = await api.get('/auth/admin/ops-users');
      setOpsUsersWithReports(response.data);
    } catch (error) {
      console.error('Failed to fetch ops reports');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/auth/admin/all-users');
      setAllAgents(response.data.agents || []);
      setAllPartners(response.data.partners || []);
    } catch (error) {
      console.error('Failed to fetch all users');
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const [agentsRes, partnersRes] = await Promise.all([
        api.get('/agents/?status=pending'),
        api.get('/partners/')
      ]);
      setPendingAgents(agentsRes.data.filter(a => !a.is_approved));
      setPendingPartners(partnersRes.data.filter(p => !p.is_approved));
    } catch (error) {
      console.error('Failed to fetch pending approvals');
    }
  };

  const handleApproveUser = async (userId, userType, approved) => {
    setApprovingUser(userId);
    try {
      if (userType === 'agent') {
        await api.post('/agents/approve', { agent_id: userId, approved });
      } else if (userType === 'partner') {
        await api.post(`/partners/approve/${userId}?approved=${approved}`);
      }
      toast.success(`${userType.charAt(0).toUpperCase() + userType.slice(1)} ${approved ? 'approved' : 'rejected'} successfully`);
      fetchPendingApprovals();
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${approved ? 'approve' : 'reject'} ${userType}`);
    } finally {
      setApprovingUser(null);
    }
  };

  const pendingCount = pendingAgents.length + pendingPartners.length;

  const handleDeleteUser = async (userId, userType) => {
    if (!window.confirm(`Are you sure you want to delete this ${userType}? This action cannot be undone.`)) {
      return;
    }
    setDeletingUser(userId);
    try {
      await api.delete(`/auth/admin/users/${userId}?user_type=${userType}`);
      toast.success(`${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully`);
      fetchOpsUsersWithReports();
      fetchAllUsers();
      fetchOpsTeam();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead? This will also delete all associated documents. This action cannot be undone.')) {
      return;
    }
    setDeletingLead(leadId);
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success('Lead deleted successfully');
      // Update state directly for immediate UI feedback
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      // Also remove from selected leads if present
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete lead');
    } finally {
      setDeletingLead(null);
    }
  };

  const handleExportLeads = async () => {
    setExporting(true);
    try {
      const response = await api.get('/leads/export/all');
      const data = response.data;
      
      // Convert to CSV
      const headers = ['ID', 'Full Name', 'Mobile', 'City', 'Email', 'Loan Type', 'Ticket Size', 'Status', 'Created At', 
                       'Source', 'Source Name', 'Source Code', 'Source Phone', 'Source Email',
                       'Assigned To', 'Assigned To Email', 'Bank Eligibilities', 'Activities Count'];
      
      const csvRows = [headers.join(',')];
      
      for (const lead of data.leads) {
        const sourceDetails = lead.source_details || {};
        const assignedDetails = lead.assigned_to_details || {};
        const eligibilities = (lead.eligibilities || []).map(e => `${e.bank_name}:${e.is_eligible}`).join('; ');
        
        const row = [
          lead.id,
          `"${lead.full_name || ''}"`,
          lead.mobile || '',
          `"${lead.city || ''}"`,
          lead.email || '',
          lead.loan_type || lead.requirement || '',
          lead.ticket_size || '',
          lead.status || '',
          lead.created_at || '',
          lead.source || '',
          `"${sourceDetails.full_name || sourceDetails.name || ''}"`,
          sourceDetails.agent_code || sourceDetails.referral_code || '',
          sourceDetails.phone || sourceDetails.mobile || '',
          sourceDetails.email || '',
          `"${assignedDetails.full_name || ''}"`,
          assignedDetails.email || '',
          `"${eligibilities}"`,
          (lead.activities || []).length
        ];
        csvRows.push(row.join(','));
      }
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.total_leads} leads`);
    } catch (error) {
      toast.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllFilteredLeads = () => {
    const allSelected = filteredLeads.every(lead => selectedLeads.includes(lead.id));
    if (allSelected) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignee || selectedLeads.length === 0) {
      toast.error('Please select leads and an assignee');
      return;
    }
    try {
      const response = await api.put('/crm/bulk-assign', {
        lead_ids: selectedLeads,
        assigned_to: bulkAssignee
      });
      toast.success(response.data.message);
      setSelectedLeads([]);
      setBulkAssignee('');
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign leads');
    }
  };

  const handleCreateOpsUser = async () => {
    if (!newOpsUser.email || !newOpsUser.password || !newOpsUser.full_name) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreatingOps(true);
    try {
      await api.post('/auth/create-ops-user', newOpsUser);
      toast.success('Operations user created successfully');
      setShowAddOpsModal(false);
      setNewOpsUser({ email: '', password: '', full_name: '', phone: '' });
      fetchOpsTeam();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreatingOps(false);
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
      {/* Add Ops User Modal */}
      {showAddOpsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Operations Team Member</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddOpsModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Full Name *</label>
                <Input 
                  placeholder="Enter full name" 
                  value={newOpsUser.full_name}
                  onChange={(e) => setNewOpsUser({...newOpsUser, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email *</label>
                <Input 
                  type="email"
                  placeholder="Enter email" 
                  value={newOpsUser.email}
                  onChange={(e) => setNewOpsUser({...newOpsUser, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Password *</label>
                <Input 
                  type="password"
                  placeholder="Enter password" 
                  value={newOpsUser.password}
                  onChange={(e) => setNewOpsUser({...newOpsUser, password: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Phone (optional)</label>
                <Input 
                  placeholder="Enter phone number" 
                  value={newOpsUser.phone}
                  onChange={(e) => setNewOpsUser({...newOpsUser, phone: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddOpsModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-primary text-primary-foreground" 
                  onClick={handleCreateOpsUser}
                  disabled={creatingOps}
                >
                  {creatingOps ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={handleExportLeads}
            variant="outline"
            disabled={exporting}
            data-testid="export-leads-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export All Leads'}
          </Button>
          <Button
            onClick={() => setShowAddOpsModal(true)}
            className="bg-primary text-primary-foreground"
            data-testid="add-ops-btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Ops User
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="text-slate-600" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2 relative">
              <Clock className="w-4 h-4" />
              Approvals
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
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
            <DashboardStats stats={stats} earnings={{ total_earnings: 0, monthly_earnings: 0 }} />

            {/* Performance Overview */}
            <PerformanceOverview leads={filteredLeads} stats={stats} />

        {/* Leads List */}
        <Card data-testid="recent-leads-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leads ({filteredLeads.length})</CardTitle>
              <CardDescription>
                {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : 'All leads in the system'}
              </CardDescription>
            </div>
            {/* Bulk Assignment Controls */}
            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{selectedLeads.length} selected</span>
                <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                  <SelectTrigger className="w-40 h-8 text-sm" data-testid="bulk-assignee-select">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {opsTeam.map((ops) => (
                      <SelectItem key={ops.id} value={ops.id}>{ops.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  className="h-8 bg-primary text-primary-foreground" 
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignee}
                  data-testid="bulk-assign-btn"
                >
                  Assign
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedLeads([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
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
            {/* Select All */}
            {filteredLeads.length > 0 && (
              <div className="flex items-center gap-3 pb-3 mb-3 border-b">
                <Checkbox 
                  checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.includes(lead.id))}
                  onCheckedChange={selectAllFilteredLeads}
                  data-testid="select-all-checkbox"
                />
                <span className="text-sm text-slate-600">Select all ({filteredLeads.length} leads)</span>
              </div>
            )}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredLeads.length > 0 ? (
                filteredLeads.slice(0, 50).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    data-testid={`lead-item-${lead.id}`}
                  >
                    <Checkbox 
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="flex-1 flex justify-between items-center cursor-pointer"
                      onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    >
                      <div>
                        <p className="font-medium">{lead.full_name}</p>
                        <p className="text-sm text-slate-600">{lead.mobile} | {lead.city}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(lead.created_at).toLocaleDateString()}
                          {lead.assigned_to && <span className="ml-2 text-primary">• Assigned</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                          lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {lead.status.replace(/_/g, ' ')}
                        </span>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                          disabled={deletingLead === lead.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No leads match your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="approvals">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Pending Approvals</h2>
              <p className="text-sm text-slate-500">Review and approve new agent and partner registrations</p>
            </div>

            {/* Pending Agents */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Pending Agents ({pendingAgents.length})
                </CardTitle>
                <CardDescription>Agents awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAgents.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
                    <p>No pending agent approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAgents.map((agent) => (
                      <div key={agent.id} className="bg-orange-50 border border-orange-100 rounded-lg" data-testid={`pending-agent-${agent.id}`}>
                        <div className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{agent.full_name}</p>
                            <p className="text-sm text-slate-600">{agent.email} • {agent.phone}</p>
                            <p className="text-xs text-slate-500">
                              Code: {agent.agent_code} • City: {agent.city} • Registered: {new Date(agent.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-600"
                              onClick={() => toggleUserDetails(agent.id)}
                              data-testid={`view-agent-${agent.id}`}
                            >
                              {expandedUser === agent.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                              {expandedUser === agent.id ? 'Hide' : 'View'} Details
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApproveUser(agent.id, 'agent', true)}
                              disabled={approvingUser === agent.id}
                              data-testid={`approve-agent-${agent.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {approvingUser === agent.id ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleApproveUser(agent.id, 'agent', false)}
                              disabled={approvingUser === agent.id}
                              data-testid={`reject-agent-${agent.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                        {expandedUser === agent.id && (
                          <UserDetailCard user={agent} type="agent" onClose={() => setExpandedUser(null)} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Partners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                  Pending Partners ({pendingPartners.length})
                </CardTitle>
                <CardDescription>Partners awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPartners.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
                    <p>No pending partner approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPartners.map((partner) => (
                      <div key={partner.id} className="bg-orange-50 border border-orange-100 rounded-lg" data-testid={`pending-partner-${partner.id}`}>
                        <div className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{partner.name || partner.full_name}</p>
                            <p className="text-sm text-slate-600">{partner.email} • {partner.mobile || partner.phone}</p>
                            <p className="text-xs text-slate-500">
                              Code: {partner.referral_code} • City: {partner.city} • Registered: {new Date(partner.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-600"
                              onClick={() => toggleUserDetails(partner.id)}
                              data-testid={`view-partner-${partner.id}`}
                            >
                              {expandedUser === partner.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                              {expandedUser === partner.id ? 'Hide' : 'View'} Details
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApproveUser(partner.id, 'partner', true)}
                              disabled={approvingUser === partner.id}
                              data-testid={`approve-partner-${partner.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {approvingUser === partner.id ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleApproveUser(partner.id, 'partner', false)}
                              disabled={approvingUser === partner.id}
                              data-testid={`reject-partner-${partner.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                        {expandedUser === partner.id && (
                          <UserDetailCard user={partner} type="partner" onClose={() => setExpandedUser(null)} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            {/* Operations Team Report */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Operations Team ({opsUsersWithReports.length})
                </CardTitle>
                <CardDescription>View performance reports and manage ops users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {opsUsersWithReports.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No operations users found</p>
                  ) : (
                    opsUsersWithReports.map((ops) => (
                      <div key={ops.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">{ops.full_name}</p>
                            <p className="text-sm text-slate-600">{ops.email}</p>
                            {ops.phone && <p className="text-sm text-slate-500">{ops.phone}</p>}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleDeleteUser(ops.id, 'operations')}
                            disabled={deletingUser === ops.id}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deletingUser === ops.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-xl font-bold text-slate-700">{ops.report?.total_assigned || 0}</p>
                            <p className="text-xs text-slate-500">Total</p>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded">
                            <p className="text-xl font-bold text-yellow-700">{ops.report?.new_leads || 0}</p>
                            <p className="text-xs text-yellow-600">New</p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-xl font-bold text-blue-700">{ops.report?.in_progress || 0}</p>
                            <p className="text-xs text-blue-600">In Progress</p>
                          </div>
                          <div className="bg-indigo-50 p-2 rounded">
                            <p className="text-xl font-bold text-indigo-700">{ops.report?.approved || 0}</p>
                            <p className="text-xs text-indigo-600">Approved</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <p className="text-xl font-bold text-green-700">{ops.report?.disbursed || 0}</p>
                            <p className="text-xs text-green-600">Disbursed</p>
                          </div>
                          <div className="bg-red-50 p-2 rounded">
                            <p className="text-xl font-bold text-red-700">{ops.report?.rejected || 0}</p>
                            <p className="text-xs text-red-600">Rejected</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agents List */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Sales Agents ({allAgents.length})
                </CardTitle>
                <CardDescription>Manage sales agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {allAgents.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No agents found</p>
                  ) : (
                    allAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{agent.full_name}</p>
                          <p className="text-sm text-slate-600">{agent.phone} | Code: {agent.agent_code}</p>
                          <p className="text-xs text-slate-500">{agent.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {agent.id_card_url && (
                            <a 
                              href={agent.id_card_url.startsWith('/api') 
                                ? `${process.env.REACT_APP_BACKEND_URL}${agent.id_card_url}` 
                                : agent.id_card_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-testid={`agent-id-card-${agent.id}`}
                            >
                              <Button variant="outline" size="sm" className="text-blue-600">
                                <FileText className="w-4 h-4 mr-1" />
                                ID Card
                              </Button>
                            </a>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUser(agent.id, 'agent')}
                            disabled={deletingUser === agent.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Partners List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Partners ({allPartners.length})
                </CardTitle>
                <CardDescription>Manage partners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {allPartners.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No partners found</p>
                  ) : (
                    allPartners.map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{partner.name || partner.full_name}</p>
                          <p className="text-sm text-slate-600">{partner.mobile || partner.phone} | Code: {partner.referral_code}</p>
                          <p className="text-xs text-slate-500">{partner.email} | {partner.company_name || 'Individual'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {partner.id_card_url && (
                            <a 
                              href={partner.id_card_url.startsWith('/api') 
                                ? `${process.env.REACT_APP_BACKEND_URL}${partner.id_card_url}` 
                                : partner.id_card_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-testid={`partner-id-card-${partner.id}`}
                            >
                              <Button variant="outline" size="sm" className="text-blue-600">
                                <FileText className="w-4 h-4 mr-1" />
                                ID Card
                              </Button>
                            </a>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUser(partner.id, 'partner')}
                            disabled={deletingUser === partner.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
