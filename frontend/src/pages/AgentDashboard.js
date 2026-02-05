import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, DollarSign, TrendingUp, LogOut, LayoutDashboard } from 'lucide-react';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/agent');
      setDashboard(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Agent Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          {dashboard?.agent_code && (
            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {dashboard.agent_code}
            </span>
          )}
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/crm')}
            variant="outline"
            className="border-slate-200"
            data-testid="nav-crm-btn"
          >
            My Leads
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
              <p className="text-xs text-slate-600 mt-1">Assigned to you</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-converted-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.converted_leads || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Disbursed loans</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-pending-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.pending_leads || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Needs attention</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-commission">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboard?.total_commission?.toLocaleString() || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Pending: ₹{dashboard?.pending_commission?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="recent-leads-card">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Your latest assigned leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.recent_leads?.length > 0 ? (
                dashboard.recent_leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    data-testid={`lead-item-${lead.id}`}
                  >
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-sm text-slate-600">{lead.mobile} | {lead.requirement}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full capitalize">
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No leads assigned yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;