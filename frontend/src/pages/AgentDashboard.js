import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, DollarSign, TrendingUp, LogOut, LayoutDashboard, QrCode, UserPlus } from 'lucide-react';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState(null);
  const [leads, setLeads] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0 });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      console.log('Fetching agent data for user ID:', user.id);
      
      // Get agent by user ID (agent_id and user_id are now the same)
      const agentResponse = await api.get(`/agents/by-user/${user.id}`);
      console.log('Agent response:', agentResponse.data);
      
      const agentData = agentResponse.data;
      setAgent(agentData);
      
      // Fetch QR code data using user ID (which is same as agent ID)
      console.log('Fetching QR for agent ID:', agentData.id);
      const qrResponse = await api.get(`/qr/data/${agentData.id}`);
      console.log('QR response:', qrResponse.data);
      setQrData(qrResponse.data);
      
      // Fetch all leads created by this agent
      const leadsResponse = await api.get('/leads/');
      const agentLeads = leadsResponse.data.filter(l => l.source_id === agentData.id);
      setLeads(agentLeads || []);
      
      // Fetch earnings data
      try {
        const earningsResponse = await api.get(`/crm/earnings/${agentData.id}`);
        setEarnings(earningsResponse.data);
      } catch (err) {
        console.log('Earnings not available yet:', err);
      }
    } catch (error) {
      console.error('Failed to load agent data:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 404) {
        toast.error('Agent profile not found. Please contact admin to link your account.');
      } else {
        toast.error('Failed to load dashboard');
      }
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

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'disbursed').length;
  const pendingLeads = leads.filter(l => ['new', 'contacted'].includes(l.status)).length;
  const totalCommission = earnings.total_earnings || agent?.performance?.total_commission || 0;
  const monthlyCommission = earnings.monthly_earnings || 0;

  // Filter leads based on selected filters
  const filteredLeads = leads.filter(lead => {
    const statusMatch = statusFilter === 'all' || lead.status === statusFilter;
    const leadDate = new Date(lead.created_at);
    const monthMatch = monthFilter === 'all' || 
      (monthFilter === 'this_month' && leadDate.getMonth() === new Date().getMonth() && leadDate.getFullYear() === new Date().getFullYear()) ||
      (monthFilter === 'last_month' && leadDate.getMonth() === new Date().getMonth() - 1) ||
      (monthFilter === 'last_3_months' && leadDate >= new Date(new Date().setMonth(new Date().getMonth() - 3)));
    return statusMatch && monthMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Agent Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          {agent?.agent_code && (
            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {agent.agent_code}
            </span>
          )}
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/agent/create-lead')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="create-lead-btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Lead
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <Card className="hover-lift" data-testid="stat-total-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-slate-600 mt-1">Generated by you</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-converted-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{convertedLeads}</div>
              <p className="text-xs text-slate-600 mt-1">Disbursed loans</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-pending-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingLeads}</div>
              <p className="text-xs text-slate-600 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-commission">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalCommission.toLocaleString()}</div>
              <p className="text-xs text-slate-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-monthly-commission">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{monthlyCommission.toLocaleString()}</div>
              <p className="text-xs text-slate-600 mt-1">Monthly earnings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {qrData && (
            <Card data-testid="qr-code-card">
              <CardHeader>
                <CardTitle>Your QR Code</CardTitle>
                <CardDescription>Share this to generate leads</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <img
                  src={qrData.qr_image_base64}
                  alt="Agent QR Code"
                  className="w-48 h-48 border-2 border-slate-200 rounded-lg"
                  data-testid="qr-code-image"
                />
                <p className="mt-4 text-sm text-slate-600 text-center">
                  Agent Code: <span className="font-bold text-primary">{qrData.agent_code}</span>
                </p>
                <div className="mt-4 w-full space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(qrData.qr_url);
                        toast.success('Link copied!');
                      }}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => window.open(`/api/qr/generate/${agent.id}`, '_blank')}
                      className="flex-1 bg-primary text-primary-foreground"
                      size="sm"
                    >
                      <QrCode className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2" data-testid="quick-stats-card">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Your lead generation statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Conversion Rate</span>
                  <span className="font-semibold">
                    {totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Active Leads</span>
                  <span className="font-semibold">{leads.filter(l => !['disbursed', 'rejected'].includes(l.status)).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Rejected Leads</span>
                  <span className="font-semibold text-red-600">{leads.filter(l => l.status === 'rejected').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="all-leads-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Your Leads ({filteredLeads.length})</CardTitle>
              <CardDescription>Track all leads you've generated</CardDescription>
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
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/lead/${lead.id}`)}
                    data-testid={`lead-item-${lead.id}`}
                  >
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-sm text-slate-600">{lead.mobile} | {(lead.additional_data?.type_of_loan || lead.requirement || '').replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {lead.additional_data?.company_name && <span>{lead.additional_data.company_name} • </span>}
                        {lead.additional_data?.loan_amount_required && <span>₹{Number(lead.additional_data.loan_amount_required).toLocaleString()} • </span>}
                        Created: {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm px-3 py-1 rounded-full capitalize ${
                        lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                        lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lead.status.replace('_', ' ')}
                      </span>
                      {lead.eligibilities && lead.eligibilities.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">{lead.eligibilities.length} bank(s) checked</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No leads yet</p>
                  <p className="text-sm mb-4">Start by creating your first lead or sharing your QR code</p>
                  <Button
                    onClick={() => navigate('/agent/create-lead')}
                    className="bg-primary text-primary-foreground"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Your First Lead
                  </Button>
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
