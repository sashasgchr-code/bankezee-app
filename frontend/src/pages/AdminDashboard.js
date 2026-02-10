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
import { Users, LogOut, LayoutDashboard, Eye, UserPlus, CheckSquare, X, Trash2, UserCog, Building, Briefcase } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, calculateDashboardStats, LOAN_TYPES, TIME_FILTERS } from '@/utils/constants';

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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchLeads();
    fetchOpsTeam();
  }, []);

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
      </div>
    </div>
  );
};

export default AdminDashboard;
