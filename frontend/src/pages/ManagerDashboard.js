import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, LogOut, LayoutDashboard, Eye, Key, TrendingUp, UserCheck, Briefcase, Search, Phone, MapPin } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, filterBySource, calculateDashboardStats } from '@/utils/constants';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState({ agents: [], partners: [], team_leaders: [] });
  const [timeFilter, setTimeFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sourceIdFilter, setSourceIdFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0 });
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
    fetchEarnings();
  }, []);

  const fetchData = async () => {
    try {
      const [leadsRes, teamRes] = await Promise.all([
        api.get('/hierarchy/my-leads'),
        api.get('/hierarchy/my-team')
      ]);
      setLeads(leadsRes.data);
      setTeam(teamRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await api.get('/crm/system-earnings');
      setEarnings(response.data);
    } catch (error) {
      console.error('Failed to fetch earnings');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
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
      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Manager Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => setShowPasswordModal(true)}
            variant="outline"
            size="sm"
            data-testid="change-password-btn"
          >
            <Key className="w-4 h-4 mr-1" />
            Change Password
          </Button>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-600" data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-8">
        {/* Team Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{team.team_leaders.length}</p>
              <p className="text-sm text-blue-600">Team Leaders</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <UserCheck className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{team.agents.length}</p>
              <p className="text-sm text-green-600">Agents</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Briefcase className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{team.partners.length}</p>
              <p className="text-sm text-purple-600">Partners</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold text-orange-700">{leads.length}</p>
              <p className="text-sm text-orange-600">Total Leads</p>
            </CardContent>
          </Card>
        </div>

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
          agents={team.agents}
          partners={team.partners}
          showSourceFilter={true}
        />

        {/* Stats Cards */}
        <DashboardStats stats={stats} earnings={earnings} />

        {/* Performance Overview */}
        <PerformanceOverview leads={filteredLeads} stats={stats} />

        {/* Leads List - Similar to Agent Dashboard */}
        <Card data-testid="leads-list-card">
          <CardHeader>
            <CardTitle>Team Leads ({filteredLeads.length})</CardTitle>
            <CardDescription>View leads from your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const agent = team.agents.find(a => a.id === lead.source_id);
                  const partner = team.partners.find(p => p.id === lead.source_id);
                  const sourceName = agent?.full_name || partner?.name || 'Unknown';
                  
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                      onClick={() => navigate(`/crm/lead/${lead.id}`)}
                      data-testid={`lead-item-${lead.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{lead.full_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                            lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {lead.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.mobile}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lead.city}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>Loan: {lead.loan_type}</span>
                          <span>Amount: ₹{(lead.loan_amount || 0).toLocaleString()}</span>
                          <span>Source: {sourceName}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Created: {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-primary">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">No leads found</p>
                  <p className="text-sm">Leads from your team members will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;
