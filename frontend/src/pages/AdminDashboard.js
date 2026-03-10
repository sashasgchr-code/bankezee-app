import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, LogOut, LayoutDashboard, Eye, UserPlus, CheckSquare, X, Trash2, UserCog, Building, Briefcase, Download, FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, CreditCard, User, MapPin, Phone, Mail, Hash, Building2, BarChart3, Key, Copy, Search } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, filterBySource, calculateDashboardStats, LOAN_TYPES, TIME_FILTERS } from '@/utils/constants';

// Detail Card Component for showing all user info
const UserDetailCard = ({ user, type, onClose, onPasswordSet }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const bankDetails = user.bank_details || {};
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  const getIdCardUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/api') ? `${backendUrl}${url}` : url;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSettingPassword(true);
    try {
      await api.post('/auth/admin/set-password', {
        user_id: user.user_id || user.id,
        new_password: newPassword
      });
      toast.success('Password set successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      if (onPasswordSet) onPasswordSet();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
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

        {/* Account / Login Details */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-600 flex items-center gap-1">
            <Key className="w-4 h-4" /> Account Details
          </h5>
          <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">User ID:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs bg-white px-2 py-1 rounded border">{user.user_id || user.id}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(user.user_id || user.id)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email (Login):</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{user.email}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(user.email)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowPasswordModal(true)}
              >
                <Key className="w-4 h-4 mr-2" />
                Set/Reset Password
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Set Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password for {user.full_name || user.name}</DialogTitle>
            <DialogDescription>
              Enter a new password for this user. They will use their email ({user.email}) and this password to login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-slate-500">Password is shown in plain text for your reference. Share it securely with the user.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={handleSetPassword} disabled={settingPassword || newPassword.length < 6}>
              {settingPassword ? 'Setting...' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [approvingUser, setApprovingUser] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  // New filter states
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sourceIdFilter, setSourceIdFilter] = useState('all');
  // Stats export modal
  const [showStatsExportModal, setShowStatsExportModal] = useState(false);
  const [statsExportFromDate, setStatsExportFromDate] = useState('');
  const [statsExportToDate, setStatsExportToDate] = useState('');
  const [exportingStats, setExportingStats] = useState(false);
  // Hierarchy states
  const [allManagers, setAllManagers] = useState([]);
  const [allTeamLeaders, setAllTeamLeaders] = useState([]);
  const [statsExportManagerFilter, setStatsExportManagerFilter] = useState('all');
  const [statsExportTeamLeaderFilter, setStatsExportTeamLeaderFilter] = useState('all');
  // User mapping modal
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingUser, setMappingUser] = useState(null);
  const [mappingUserType, setMappingUserType] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState('');
  const [savingMapping, setSavingMapping] = useState(false);
  // Team Leader mapping modal
  const [showTLMappingModal, setShowTLMappingModal] = useState(false);
  const [mappingTeamLeader, setMappingTeamLeader] = useState(null);
  const [selectedTLManagerId, setSelectedTLManagerId] = useState('');
  const [savingTLMapping, setSavingTLMapping] = useState(false);
  // Create Manager/Team Leader modals
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);
  const [showCreateTLModal, setShowCreateTLModal] = useState(false);
  const [newManager, setNewManager] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [newTeamLeader, setNewTeamLeader] = useState({ email: '', password: '', full_name: '', phone: '', manager_id: '' });
  const [creatingManager, setCreatingManager] = useState(false);
  const [creatingTL, setCreatingTL] = useState(false);
  // Password reset for managers/team leaders
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  // Total Eligible (Login=Yes)
  const [totalEligible, setTotalEligible] = useState(0);
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  useEffect(() => {
    fetchLeads();
    fetchOpsTeam();
    fetchPendingApprovals();
    fetchAllUsers();
    fetchTotalEligible();
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
      setAllManagers(response.data.managers || []);
      setAllTeamLeaders(response.data.team_leaders || []);
    } catch (error) {
      console.error('Failed to fetch all users');
    }
  };

  const fetchSystemEarnings = async () => {
    try {
      const response = await api.get('/crm/system-earnings');
      setSystemEarnings(response.data);
    } catch (error) {
      console.error('Failed to fetch system earnings');
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
      // Build query params for date filter
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
      
      // Convert to CSV with disbursement-focused headers
      const headers = [
        // Lead Basic Info
        'Lead ID', 'Full Name', 'Mobile', 'Email', 'City', 'Loan Type', 'Created At',
        // Source (Agent/Partner) Info
        'Source Type', 'Source Name', 'Source Code', 'Source Phone', 'Source Email', 'Source PAN',
        // Source Bank Details
        'Source Bank Name', 'Source Account Holder', 'Source Account Number', 'Source IFSC',
        // Disbursement Details
        'Disbursed Bank', 'Disbursed Amount (₹)', 'ROI (%)', 'Commission (%)', 'Commission Amount (₹)',
        // Assignment
        'Assigned To'
      ];
      
      const csvRows = [headers.join(',')];
      
      for (const lead of data.leads) {
        const sourceDetails = lead.source_details || {};
        const assignedDetails = lead.assigned_to_details || {};
        const bankDetails = sourceDetails.bank_details || {};
        const disbursement = lead.disbursement_info || {};
        
        const row = [
          // Lead Basic Info
          lead.id,
          `"${(lead.full_name || '').replace(/"/g, '""')}"`,
          lead.mobile || '',
          lead.email || '',
          `"${(lead.city || '').replace(/"/g, '""')}"`,
          lead.loan_type || lead.requirement || '',
          lead.created_at || '',
          // Source Info
          lead.source || '',
          `"${(sourceDetails.full_name || sourceDetails.name || '').replace(/"/g, '""')}"`,
          sourceDetails.agent_code || sourceDetails.referral_code || '',
          sourceDetails.phone || sourceDetails.mobile || '',
          sourceDetails.email || '',
          sourceDetails.pan_number || '',
          // Source Bank Details
          `"${(bankDetails.bank_name || '').replace(/"/g, '""')}"`,
          `"${(bankDetails.account_holder_name || '').replace(/"/g, '""')}"`,
          bankDetails.account_number || '',
          bankDetails.ifsc_code || '',
          // Disbursement Details
          `"${(disbursement.disbursed_bank || '').replace(/"/g, '""')}"`,
          disbursement.disbursed_amount || 0,
          disbursement.disbursed_roi || '',
          disbursement.commission_percentage || 0,
          disbursement.commission_amount || 0,
          // Assignment
          `"${(assignedDetails.full_name || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }
      
      // Add summary row
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
      // Fetch all leads and filter by date
      const response = await api.get('/leads/');
      let allLeads = response.data;
      
      // Apply date filter if set
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

      // Filter agents/partners by manager/team leader
      let filteredAgents = [...allAgents];
      let filteredPartners = [...allPartners];
      
      if (statsExportTeamLeaderFilter !== 'all') {
        // Filter by team leader
        filteredAgents = allAgents.filter(a => a.team_leader_id === statsExportTeamLeaderFilter);
        filteredPartners = allPartners.filter(p => p.team_leader_id === statsExportTeamLeaderFilter);
      } else if (statsExportManagerFilter !== 'all') {
        // Filter by manager (includes direct reports + team leader's reports)
        const tlIds = allTeamLeaders.filter(tl => tl.manager_id === statsExportManagerFilter).map(tl => tl.id);
        filteredAgents = allAgents.filter(a => 
          a.manager_id === statsExportManagerFilter || tlIds.includes(a.team_leader_id)
        );
        filteredPartners = allPartners.filter(p => 
          p.manager_id === statsExportManagerFilter || tlIds.includes(p.team_leader_id)
        );
      }
      
      const filteredAgentIds = new Set(filteredAgents.map(a => a.id));
      const filteredPartnerIds = new Set(filteredPartners.map(p => p.id));

      // Calculate stats per agent
      const agentStats = {};
      const partnerStats = {};

      for (const lead of allLeads) {
        if (lead.source === 'agent' && lead.source_id && filteredAgentIds.has(lead.source_id)) {
          if (!agentStats[lead.source_id]) {
            const agent = filteredAgents.find(a => a.id === lead.source_id);
            const manager = allManagers.find(m => m.id === agent?.manager_id);
            const teamLeader = allTeamLeaders.find(tl => tl.id === agent?.team_leader_id);
            agentStats[lead.source_id] = {
              name: agent?.full_name || 'Unknown',
              code: agent?.agent_code || '',
              phone: agent?.phone || '',
              email: agent?.email || '',
              manager: manager?.full_name || 'Unassigned',
              teamLeader: teamLeader?.full_name || 'N/A',
              totalLeads: 0,
              new: 0,
              contacted: 0,
              documents_collected: 0,
              documents_pending: 0,
              sent_for_eligibility: 0,
              sent_for_login: 0,
              login: 0,
              sent_for_approval: 0,
              underwriting: 0,
              fi: 0,
              fi_negative: 0,
              fi_reinitiated: 0,
              query_hold: 0,
              customer_not_interested: 0,
              customer_not_supporting: 0,
              approved: 0,
              disbursed: 0,
              not_eligible: 0,
              not_login: 0,
              declined: 0,
              not_disbursed: 0,
              rejected: 0,
              totalDisbursedAmount: 0,
              totalCommission: 0
            };
          }
          const stats = agentStats[lead.source_id];
          stats.totalLeads++;
          if (stats[lead.status] !== undefined) {
            stats[lead.status]++;
          }
          if (lead.status === 'disbursed') {
            const disbursedElig = lead.eligibilities?.find(e => e.disbursed === 'yes' || e.disbursed === true);
            stats.totalDisbursedAmount += disbursedElig?.disbursed_amount || 0;
            stats.totalCommission += disbursedElig?.commission_amount || 0;
          }
        }

        if (lead.source === 'partner' && lead.source_id && filteredPartnerIds.has(lead.source_id)) {
          if (!partnerStats[lead.source_id]) {
            const partner = filteredPartners.find(p => p.id === lead.source_id);
            const manager = allManagers.find(m => m.id === partner?.manager_id);
            const teamLeader = allTeamLeaders.find(tl => tl.id === partner?.team_leader_id);
            partnerStats[lead.source_id] = {
              name: partner?.name || partner?.full_name || 'Unknown',
              code: partner?.referral_code || '',
              phone: partner?.mobile || partner?.phone || '',
              email: partner?.email || '',
              manager: manager?.full_name || 'Unassigned',
              teamLeader: teamLeader?.full_name || 'N/A',
              totalLeads: 0,
              new: 0,
              contacted: 0,
              documents_collected: 0,
              documents_pending: 0,
              sent_for_eligibility: 0,
              sent_for_login: 0,
              login: 0,
              sent_for_approval: 0,
              underwriting: 0,
              fi: 0,
              fi_negative: 0,
              fi_reinitiated: 0,
              query_hold: 0,
              customer_not_interested: 0,
              customer_not_supporting: 0,
              approved: 0,
              disbursed: 0,
              not_eligible: 0,
              not_login: 0,
              declined: 0,
              not_disbursed: 0,
              rejected: 0,
              totalDisbursedAmount: 0,
              totalCommission: 0
            };
          }
          const stats = partnerStats[lead.source_id];
          stats.totalLeads++;
          if (stats[lead.status] !== undefined) {
            stats[lead.status]++;
          }
          if (lead.status === 'disbursed') {
            const disbursedElig = lead.eligibilities?.find(e => e.disbursed === 'yes' || e.disbursed === true);
            stats.totalDisbursedAmount += disbursedElig?.disbursed_amount || 0;
            stats.totalCommission += disbursedElig?.commission_amount || 0;
          }
        }
      }

      // Build CSV with all status columns
      const headers = [
        'Type', 'Name', 'Code', 'Phone', 'Email', 'Manager', 'Team Leader', 'Total Leads',
        'New', 'Contacted', 'Docs Collected', 'Docs Pending', 'Sent for Eligibility', 'Sent for Login', 'Login',
        'Sent for Approval', 'Underwriting', 'FI', 'FI Negative', 'FI Reinitiated', 'Query/Hold',
        'Cust Not Interested', 'Cust Not Supporting',
        'Approved', 'Disbursed',
        'Not Eligible', 'Not Login', 'Declined', 'Not Disbursed', 'Rejected',
        'Disbursed Amount (₹)', 'Commission (₹)'
      ];
      const csvRows = [headers.join(',')];

      // Add agent stats
      Object.values(agentStats).forEach(stats => {
        csvRows.push([
          'Agent',
          `"${stats.name}"`,
          stats.code,
          stats.phone,
          stats.email,
          `"${stats.manager}"`,
          `"${stats.teamLeader}"`,
          stats.totalLeads,
          stats.new,
          stats.contacted,
          stats.documents_collected,
          stats.documents_pending,
          stats.sent_for_eligibility,
          stats.sent_for_login,
          stats.login,
          stats.sent_for_approval,
          stats.underwriting,
          stats.fi,
          stats.fi_negative,
          stats.fi_reinitiated,
          stats.query_hold,
          stats.customer_not_interested,
          stats.customer_not_supporting,
          stats.approved,
          stats.disbursed,
          stats.not_eligible,
          stats.not_login,
          stats.declined,
          stats.not_disbursed,
          stats.rejected,
          stats.totalDisbursedAmount,
          stats.totalCommission
        ].join(','));
      });

      // Add partner stats
      // Add partner stats
      Object.values(partnerStats).forEach(stats => {
        csvRows.push([
          'Partner',
          `"${stats.name}"`,
          stats.code,
          stats.phone,
          stats.email,
          `"${stats.manager}"`,
          `"${stats.teamLeader}"`,
          stats.totalLeads,
          stats.new,
          stats.contacted,
          stats.documents_collected,
          stats.documents_pending,
          stats.sent_for_eligibility,
          stats.sent_for_login,
          stats.login,
          stats.sent_for_approval,
          stats.underwriting,
          stats.fi,
          stats.fi_negative,
          stats.fi_reinitiated,
          stats.query_hold,
          stats.customer_not_interested,
          stats.customer_not_supporting,
          stats.approved,
          stats.disbursed,
          stats.not_eligible,
          stats.not_login,
          stats.declined,
          stats.not_disbursed,
          stats.rejected,
          stats.totalDisbursedAmount,
          stats.totalCommission
        ].join(','));
      });

      // Add totals
      const totalAgents = Object.values(agentStats);
      const totalPartners = Object.values(partnerStats);
      const agentTotals = totalAgents.reduce((acc, s) => ({
        totalLeads: acc.totalLeads + s.totalLeads,
        disbursed: acc.disbursed + s.disbursed,
        totalDisbursedAmount: acc.totalDisbursedAmount + s.totalDisbursedAmount,
        totalCommission: acc.totalCommission + s.totalCommission
      }), { totalLeads: 0, disbursed: 0, totalDisbursedAmount: 0, totalCommission: 0 });
      const partnerTotals = totalPartners.reduce((acc, s) => ({
        totalLeads: acc.totalLeads + s.totalLeads,
        disbursed: acc.disbursed + s.disbursed,
        totalDisbursedAmount: acc.totalDisbursedAmount + s.totalDisbursedAmount,
        totalCommission: acc.totalCommission + s.totalCommission
      }), { totalLeads: 0, disbursed: 0, totalDisbursedAmount: 0, totalCommission: 0 });

      csvRows.push('');
      csvRows.push(`"AGENT TOTALS",,,,,,${agentTotals.totalLeads},,,,,${agentTotals.disbursed},,${agentTotals.totalDisbursedAmount},${agentTotals.totalCommission}`);
      csvRows.push(`"PARTNER TOTALS",,,,,,${partnerTotals.totalLeads},,,,,${partnerTotals.disbursed},,${partnerTotals.totalDisbursedAmount},${partnerTotals.totalCommission}`);

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateRange = statsExportFromDate && statsExportToDate ? `_${statsExportFromDate}_to_${statsExportToDate}` : '';
      a.download = `bankezee_agent_partner_stats${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported stats for ${totalAgents.length} agents and ${totalPartners.length} partners`);
      setShowStatsExportModal(false);
    } catch (error) {
      toast.error('Failed to export stats');
    } finally {
      setExportingStats(false);
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

  const openMappingModal = (user, type) => {
    setMappingUser(user);
    setMappingUserType(type);
    setSelectedManagerId(user.manager_id || '');
    setSelectedTeamLeaderId(user.team_leader_id || '');
    setShowMappingModal(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedManagerId) {
      toast.error('Manager is required');
      return;
    }
    setSavingMapping(true);
    try {
      await api.post('/hierarchy/map-user', {
        user_id: mappingUser.id,
        user_type: mappingUserType,
        manager_id: selectedManagerId,
        team_leader_id: selectedTeamLeaderId === 'none' ? null : (selectedTeamLeaderId || null)
      });
      toast.success(`${mappingUserType.charAt(0).toUpperCase() + mappingUserType.slice(1)} mapped successfully`);
      setShowMappingModal(false);
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to map user');
    } finally {
      setSavingMapping(false);
    }
  };

  // Get team leaders for a specific manager (for cascading dropdown)
  const getTeamLeadersForManager = (managerId) => {
    return allTeamLeaders.filter(tl => tl.manager_id === managerId);
  };

  const openTLMappingModal = (teamLeader) => {
    setMappingTeamLeader(teamLeader);
    setSelectedTLManagerId(teamLeader.manager_id || '');
    setShowTLMappingModal(true);
  };

  const handleSaveTLMapping = async () => {
    if (!selectedTLManagerId) {
      toast.error('Manager is required');
      return;
    }
    setSavingTLMapping(true);
    try {
      await api.post('/hierarchy/map-team-leader', {
        team_leader_id: mappingTeamLeader.id,
        manager_id: selectedTLManagerId
      });
      toast.success('Team leader mapped to manager successfully');
      setShowTLMappingModal(false);
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to map team leader');
    } finally {
      setSavingTLMapping(false);
    }
  };

  const handleCreateManager = async () => {
    if (!newManager.email || !newManager.password || !newManager.full_name) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreatingManager(true);
    try {
      await api.post('/auth/admin/create-manager', newManager);
      toast.success('Manager created successfully');
      setShowCreateManagerModal(false);
      setNewManager({ email: '', password: '', full_name: '', phone: '' });
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create manager');
    } finally {
      setCreatingManager(false);
    }
  };

  const handleCreateTeamLeader = async () => {
    if (!newTeamLeader.email || !newTeamLeader.password || !newTeamLeader.full_name) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreatingTL(true);
    try {
      const payload = {
        ...newTeamLeader,
        manager_id: newTeamLeader.manager_id === 'none' ? null : (newTeamLeader.manager_id || null)
      };
      await api.post('/auth/admin/create-team-leader', payload);
      toast.success('Team Leader created successfully');
      setShowCreateTLModal(false);
      setNewTeamLeader({ email: '', password: '', full_name: '', phone: '', manager_id: '' });
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team leader');
    } finally {
      setCreatingTL(false);
    }
  };

  const handleSetPasswordForUser = async () => {
    if (!newPasswordForUser || newPasswordForUser.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSettingPassword(true);
    try {
      await api.post('/auth/admin/set-password', {
        user_id: selectedUserForPassword.id,
        new_password: newPasswordForUser
      });
      toast.success(`Password reset successfully for ${selectedUserForPassword.full_name}`);
      setShowSetPasswordModal(false);
      setSelectedUserForPassword(null);
      setNewPasswordForUser('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSettingPassword(false);
    }
  };

  // Apply filters
  let filteredLeads = filterByTimePeriod(leads, timeFilter, filterFromDate, filterToDate);
  filteredLeads = filterByLoanType(filteredLeads, loanTypeFilter);
  filteredLeads = filterBySource(filteredLeads, sourceFilter, sourceIdFilter === 'all' ? null : sourceIdFilter);
  if (statusFilter !== 'all') {
    filteredLeads = filteredLeads.filter(l => l.status === statusFilter);
  }
  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredLeads = filteredLeads.filter(l => 
      (l.full_name && l.full_name.toLowerCase().includes(query)) ||
      (l.mobile && l.mobile.includes(query))
    );
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
            onClick={() => setShowAddOpsModal(true)}
            className="bg-primary text-primary-foreground"
            size="sm"
            data-testid="add-ops-btn"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Ops
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
              <CardDescription>Export performance stats by agent and partner</CardDescription>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Manager</label>
                  <Select 
                    value={statsExportManagerFilter} 
                    onValueChange={(v) => { setStatsExportManagerFilter(v); setStatsExportTeamLeaderFilter('all'); }}
                  >
                    <SelectTrigger data-testid="stats-manager-filter">
                      <SelectValue placeholder="All Managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Managers</SelectItem>
                      {allManagers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Team Leader</label>
                  <Select 
                    value={statsExportTeamLeaderFilter} 
                    onValueChange={setStatsExportTeamLeaderFilter}
                  >
                    <SelectTrigger data-testid="stats-tl-filter">
                      <SelectValue placeholder="All Team Leaders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Leaders</SelectItem>
                      {(statsExportManagerFilter !== 'all' 
                        ? allTeamLeaders.filter(tl => tl.manager_id === statsExportManagerFilter)
                        : allTeamLeaders
                      ).map(tl => (
                        <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-slate-500">Leave filters empty to export all stats</p>
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

      {/* User Mapping Modal */}
      {showMappingModal && mappingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Assign {mappingUserType === 'agent' ? 'Agent' : 'Partner'} to Hierarchy
              </CardTitle>
              <CardDescription>
                Map {mappingUser.full_name || mappingUser.name} to a Manager and optionally a Team Leader
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Manager <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={selectedManagerId} 
                  onValueChange={(v) => { setSelectedManagerId(v); setSelectedTeamLeaderId(''); }}
                >
                  <SelectTrigger data-testid="mapping-manager-select">
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {allManagers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Team Leader <span className="text-slate-400">(Optional)</span>
                </label>
                <Select 
                  value={selectedTeamLeaderId} 
                  onValueChange={setSelectedTeamLeaderId}
                  disabled={!selectedManagerId}
                >
                  <SelectTrigger data-testid="mapping-tl-select">
                    <SelectValue placeholder={selectedManagerId ? "Select Team Leader" : "Select Manager first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Direct under Manager)</SelectItem>
                    {getTeamLeadersForManager(selectedManagerId).map(tl => (
                      <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Only shows team leaders assigned to the selected manager
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setShowMappingModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveMapping} 
                  className="flex-1 bg-primary"
                  disabled={savingMapping || !selectedManagerId}
                  data-testid="save-mapping-btn"
                >
                  {savingMapping ? 'Saving...' : 'Save Mapping'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Leader Mapping Modal */}
      {showTLMappingModal && mappingTeamLeader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-purple-600" />
                Assign Team Leader to Manager
              </CardTitle>
              <CardDescription>
                Assign {mappingTeamLeader.full_name} to a Manager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Manager <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={selectedTLManagerId} 
                  onValueChange={setSelectedTLManagerId}
                >
                  <SelectTrigger data-testid="tl-mapping-manager-select">
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {allManagers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => setShowTLMappingModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTLMapping} 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={savingTLMapping || !selectedTLManagerId}
                  data-testid="save-tl-mapping-btn"
                >
                  {savingTLMapping ? 'Saving...' : 'Save Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Manager Modal */}
      {showCreateManagerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-600" />
                Create New Manager
              </CardTitle>
              <CardDescription>Add a new manager to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Enter full name"
                  value={newManager.full_name}
                  onChange={(e) => setNewManager({ ...newManager, full_name: e.target.value })}
                  data-testid="manager-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Email <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  placeholder="manager@bankezee.com"
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  data-testid="manager-email-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Password <span className="text-red-500">*</span></label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newManager.password}
                  onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                  data-testid="manager-password-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
                <Input
                  placeholder="Phone number (optional)"
                  value={newManager.phone}
                  onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowCreateManagerModal(false)} variant="outline" className="flex-1">Cancel</Button>
                <Button 
                  onClick={handleCreateManager} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={creatingManager}
                  data-testid="create-manager-btn"
                >
                  {creatingManager ? 'Creating...' : 'Create Manager'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Team Leader Modal */}
      {showCreateTLModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Create New Team Leader
              </CardTitle>
              <CardDescription>Add a new team leader to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Enter full name"
                  value={newTeamLeader.full_name}
                  onChange={(e) => setNewTeamLeader({ ...newTeamLeader, full_name: e.target.value })}
                  data-testid="tl-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Email <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  placeholder="teamleader@bankezee.com"
                  value={newTeamLeader.email}
                  onChange={(e) => setNewTeamLeader({ ...newTeamLeader, email: e.target.value })}
                  data-testid="tl-email-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Password <span className="text-red-500">*</span></label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newTeamLeader.password}
                  onChange={(e) => setNewTeamLeader({ ...newTeamLeader, password: e.target.value })}
                  data-testid="tl-password-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
                <Input
                  placeholder="Phone number (optional)"
                  value={newTeamLeader.phone}
                  onChange={(e) => setNewTeamLeader({ ...newTeamLeader, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Assign to Manager</label>
                <Select 
                  value={newTeamLeader.manager_id} 
                  onValueChange={(v) => setNewTeamLeader({ ...newTeamLeader, manager_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Assign later)</SelectItem>
                    {allManagers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowCreateTLModal(false)} variant="outline" className="flex-1">Cancel</Button>
                <Button 
                  onClick={handleCreateTeamLeader} 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={creatingTL}
                  data-testid="create-tl-btn"
                >
                  {creatingTL ? 'Creating...' : 'Create Team Leader'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Password Modal for Manager/Team Leader */}
      {showSetPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Set a new password for {selectedUserForPassword.full_name} ({selectedUserForPassword.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">New Password <span className="text-red-500">*</span></label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPasswordForUser}
                  onChange={(e) => setNewPasswordForUser(e.target.value)}
                  data-testid="new-password-input"
                />
              </div>
              <p className="text-xs text-slate-500">The user will need to use this password to log in. Share it securely.</p>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowSetPasswordModal(false)} variant="outline" className="flex-1">Cancel</Button>
                <Button 
                  onClick={handleSetPasswordForUser} 
                  className="flex-1 bg-primary"
                  disabled={settingPassword}
                  data-testid="confirm-set-password-btn"
                >
                  {settingPassword ? 'Setting...' : 'Set Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            />

            {/* Stats Cards */}
            <DashboardStats stats={stats} earnings={systemEarnings} />

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

            {/* Managers List */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-blue-500" />
                    Managers ({allManagers.length})
                  </CardTitle>
                  <CardDescription>View and manage all managers in the system</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateManagerModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                  data-testid="add-manager-btn"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Manager
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allManagers.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No managers found</p>
                  ) : (
                    allManagers.map((manager) => (
                      <div key={manager.id} className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-800">{manager.full_name}</p>
                            <p className="text-sm text-slate-600">{manager.email}</p>
                            <p className="text-xs text-slate-500">ID: {manager.id}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-700">
                                {allTeamLeaders.filter(tl => tl.manager_id === manager.id).length} Team Leaders
                              </p>
                              <p className="text-xs text-blue-600">
                                {allAgents.filter(a => a.manager_id === manager.id).length} Agents | {allPartners.filter(p => p.manager_id === manager.id).length} Partners
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 border-blue-200 hover:bg-blue-100"
                                onClick={() => {
                                  setSelectedUserForPassword(manager);
                                  setNewPasswordForUser('');
                                  setShowSetPasswordModal(true);
                                }}
                                data-testid={`reset-pwd-manager-${manager.id}`}
                              >
                                <Key className="w-4 h-4 mr-1" />
                                Reset Password
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteUser(manager.id, 'manager')}
                                disabled={deletingUser === manager.id}
                                data-testid={`delete-manager-${manager.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Leaders List */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Team Leaders ({allTeamLeaders.length})
                  </CardTitle>
                  <CardDescription>View all team leaders and their manager assignments</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateTLModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                  data-testid="add-tl-btn"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Team Leader
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allTeamLeaders.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No team leaders found</p>
                  ) : (
                    allTeamLeaders.map((tl) => {
                      const manager = allManagers.find(m => m.id === tl.manager_id);
                      return (
                        <div key={tl.id} className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-slate-800">{tl.full_name}</p>
                              <p className="text-sm text-slate-600">{tl.email}</p>
                              <p className="text-xs text-slate-500">
                                Manager: {manager?.full_name || <span className="text-orange-600">Not Assigned</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-purple-700">
                                  {allAgents.filter(a => a.team_leader_id === tl.id).length} Agents
                                </p>
                                <p className="text-xs text-purple-600">
                                  {allPartners.filter(p => p.team_leader_id === tl.id).length} Partners
                                </p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-purple-600 border-purple-200 hover:bg-purple-100"
                                onClick={() => openTLMappingModal(tl)}
                                data-testid={`map-tl-${tl.id}`}
                              >
                                <UserCog className="w-4 h-4 mr-1" />
                                {manager ? 'Reassign' : 'Assign Manager'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-purple-600 border-purple-200 hover:bg-purple-100"
                                onClick={() => {
                                  setSelectedUserForPassword(tl);
                                  setNewPasswordForUser('');
                                  setShowSetPasswordModal(true);
                                }}
                                data-testid={`reset-pwd-tl-${tl.id}`}
                              >
                                <Key className="w-4 h-4 mr-1" />
                                Reset Password
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteUser(tl.id, 'team_leader')}
                                disabled={deletingUser === tl.id}
                                data-testid={`delete-tl-${tl.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                <CardDescription>Manage sales agents - Click "View Details" to see all registration information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {allAgents.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No agents found</p>
                  ) : (
                    allAgents.map((agent) => {
                      const manager = allManagers.find(m => m.id === agent.manager_id);
                      const teamLeader = allTeamLeaders.find(tl => tl.id === agent.team_leader_id);
                      return (
                      <div key={agent.id} className="bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{agent.full_name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${agent.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {agent.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{agent.phone} | Code: {agent.agent_code}</p>
                            <p className="text-xs text-slate-500">{agent.email}</p>
                            <p className="text-xs mt-1">
                              <span className="text-blue-600">Manager: {manager?.full_name || 'Unassigned'}</span>
                              {teamLeader && <span className="text-purple-600 ml-2">| TL: {teamLeader.full_name}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => openMappingModal(agent, 'agent')}
                              data-testid={`map-agent-${agent.id}`}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Map
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-600"
                              onClick={() => toggleUserDetails(`agent-${agent.id}`)}
                              data-testid={`view-details-agent-${agent.id}`}
                            >
                              {expandedUser === `agent-${agent.id}` ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                              {expandedUser === `agent-${agent.id}` ? 'Hide' : 'View'} Details
                            </Button>
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
                        {expandedUser === `agent-${agent.id}` && (
                          <UserDetailCard user={agent} type="agent" onClose={() => setExpandedUser(null)} />
                        )}
                      </div>
                      );
                    })
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
                <CardDescription>Manage partners - Click "View Details" to see all registration information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {allPartners.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No partners found</p>
                  ) : (
                    allPartners.map((partner) => {
                      const manager = allManagers.find(m => m.id === partner.manager_id);
                      const teamLeader = allTeamLeaders.find(tl => tl.id === partner.team_leader_id);
                      return (
                      <div key={partner.id} className="bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{partner.name || partner.full_name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${partner.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {partner.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">{partner.mobile || partner.phone} | Code: {partner.referral_code}</p>
                            <p className="text-xs text-slate-500">{partner.email} | {partner.occupation || 'N/A'}</p>
                            <p className="text-xs mt-1">
                              <span className="text-blue-600">Manager: {manager?.full_name || 'Unassigned'}</span>
                              {teamLeader && <span className="text-purple-600 ml-2">| TL: {teamLeader.full_name}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => openMappingModal(partner, 'partner')}
                              data-testid={`map-partner-${partner.id}`}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Map
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-slate-600"
                              onClick={() => toggleUserDetails(`partner-${partner.id}`)}
                              data-testid={`view-details-partner-${partner.id}`}
                            >
                              {expandedUser === `partner-${partner.id}` ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                              {expandedUser === `partner-${partner.id}` ? 'Hide' : 'View'} Details
                            </Button>
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
                        {expandedUser === `partner-${partner.id}` && (
                          <UserDetailCard user={partner} type="partner" onClose={() => setExpandedUser(null)} />
                        )}
                      </div>
                      );
                    })
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
