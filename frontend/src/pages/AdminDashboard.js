import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Users, FileText, DollarSign, TrendingUp, LogOut, LayoutDashboard, Eye } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
    fetchLeads();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/admin');
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads/');
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/crm')}
            variant="outline"
            className="border-slate-200"
            data-testid="nav-crm-btn"
          >
            CRM
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-slate-600"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="hover-lift" data-testid="stat-total-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.total_leads || 0}</div>
              <p className="text-xs text-slate-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.conversion_rate || 0}%</div>
              <p className="text-xs text-slate-600 mt-1">Lead to disbursed</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-total-agents">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.agents?.total || 0}</div>
              <p className="text-xs text-slate-600 mt-1">{dashboard?.agents?.pending || 0} pending approval</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-total-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboard?.revenue?.total_revenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Commission: ₹{dashboard?.revenue?.total_commissions?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="leads-by-status-card">
            <CardHeader>
              <CardTitle>Leads by Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.leads_by_status && Object.entries(dashboard.leads_by_status).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm capitalize text-slate-600">{status.replace('_', ' ')}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="top-agents-card">
            <CardHeader>
              <CardTitle>Top Agents</CardTitle>
              <CardDescription>Based on converted leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.top_agents?.slice(0, 5).map((agent, idx) => (
                  <div key={agent.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{agent.full_name}</p>
                      <p className="text-xs text-slate-500">{agent.agent_code}</p>
                    </div>
                    <span className="font-semibold text-primary">{agent.performance?.converted_leads || 0} leads</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6" data-testid="recent-leads-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>All leads in the system</CardDescription>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="documents_collected">Documents Collected</SelectItem>
                  <SelectItem value="not_eligible">Not Eligible</SelectItem>
                  <SelectItem value="sent_to_bank">Sent to Bank</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="not_login">Not Login</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="not_disbursed">Not Disbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-40" data-testid="month-filter">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const filteredLeads = leads.filter(lead => {
                  const statusMatch = statusFilter === 'all' || lead.status === statusFilter;
                  const leadDate = new Date(lead.created_at);
                  const monthMatch = monthFilter === 'all' || 
                    (monthFilter === 'this_month' && leadDate.getMonth() === new Date().getMonth() && leadDate.getFullYear() === new Date().getFullYear()) ||
                    (monthFilter === 'last_month' && leadDate.getMonth() === new Date().getMonth() - 1) ||
                    (monthFilter === 'last_3_months' && leadDate >= new Date(new Date().setMonth(new Date().getMonth() - 3)));
                  return statusMatch && monthMatch;
                });
                return filteredLeads.length > 0 ? (
                  filteredLeads.slice(0, 10).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/crm/lead/${lead.id}`)}
                      data-testid={`lead-item-${lead.id}`}
                    >
                      <div>
                        <p className="font-medium">{lead.full_name}</p>
                        <p className="text-sm text-slate-600">{lead.mobile} | {lead.city}</p>
                        <p className="text-xs text-slate-500 mt-1">Created: {new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-3 py-1 rounded-full capitalize ${
                          lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                          lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;