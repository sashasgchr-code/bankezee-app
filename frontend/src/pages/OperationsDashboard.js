import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, TrendingUp, LogOut, LayoutDashboard, Eye, Clock } from 'lucide-react';

const OperationsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredLeads = statusFilter === 'all' 
    ? leads 
    : leads.filter(l => l.status === statusFilter);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    inProgress: leads.filter(l => ['contacted', 'documents_collected', 'sent_to_bank'].includes(l.status)).length,
    completed: leads.filter(l => ['approved', 'disbursed'].includes(l.status)).length,
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
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/crm')}
            variant="outline"
            className="border-slate-200"
            data-testid="nav-crm-btn"
          >
            All Leads
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
          <Card className="hover-lift" data-testid="stat-assigned">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-slate-600 mt-1">Total leads</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-new">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.new}</div>
              <p className="text-xs text-slate-600 mt-1">Pending action</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-in-progress">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <p className="text-xs text-slate-600 mt-1">Being processed</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-completed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-slate-600 mt-1">Approved/Disbursed</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="assigned-leads-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Assigned Leads</CardTitle>
              <CardDescription>Leads assigned to you for processing</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="status-filter">
                <SelectValue />
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                        {lead.requirement?.replace('_', ' ')} • Created: {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm px-3 py-1 rounded-full capitalize ${
                        lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                        lead.status === 'rejected' || lead.status === 'declined' || lead.status === 'not_eligible' ? 'bg-red-100 text-red-800' :
                        lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'login' ? 'bg-cyan-100 text-cyan-800' :
                        lead.status === 'not_login' || lead.status === 'not_disbursed' ? 'bg-orange-100 text-orange-800' :
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
                  <p className="text-lg font-medium mb-2">No leads assigned yet</p>
                  <p className="text-sm">Leads will appear here once they are assigned to you</p>
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
