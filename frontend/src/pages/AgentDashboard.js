import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText, LogOut, LayoutDashboard, Eye, QrCode, Copy, Search } from 'lucide-react';
import { DashboardStats, PerformanceOverview, DashboardFilters } from '@/components/dashboard';
import { filterByTimePeriod, filterByLoanType, calculateDashboardStats } from '@/utils/constants';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState(null);
  const [leads, setLeads] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      const agentResponse = await api.get(`/agents/by-user/${user.id}`);
      const agentData = agentResponse.data;
      setAgent(agentData);
      
      const qrResponse = await api.get(`/qr/data/${agentData.id}`);
      setQrData(qrResponse.data);
      
      const leadsResponse = await api.get('/leads/');
      const agentLeads = leadsResponse.data.filter(l => l.source_id === agentData.id);
      setLeads(agentLeads || []);
      
      try {
        const earningsResponse = await api.get(`/crm/earnings/${agentData.id}`);
        setEarnings(earningsResponse.data);
      } catch (err) {
        console.log('Earnings not available yet');
      }
    } catch (error) {
      console.error('Failed to load agent data:', error);
      if (error.response?.status === 404) {
        toast.error('Agent profile not found');
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

  const copyReferralLink = () => {
    if (qrData?.qr_url) {
      navigator.clipboard.writeText(qrData.qr_url);
      toast.success('Referral link copied!');
    }
  };

  // Apply filters
  let filteredLeads = filterByTimePeriod(leads, timeFilter);
  filteredLeads = filterByLoanType(filteredLeads, loanTypeFilter);
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
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Agent Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button onClick={() => navigate('/agent/create-lead')} className="bg-primary text-primary-foreground">
            + New Lead
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="text-slate-600">
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
        <DashboardStats stats={stats} earnings={earnings} />

        {/* Performance Overview */}
        <PerformanceOverview leads={filteredLeads} stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Your QR Code
              </CardTitle>
              <CardDescription>Share to generate leads</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {qrData?.qr_image_base64 ? (
                <>
                  <img src={qrData.qr_image_base64} alt="QR Code" className="w-40 h-40 mb-4" />
                  <p className="text-sm text-slate-600 mb-2">Code: <span className="font-mono font-bold text-primary">{agent?.agent_code || qrData?.agent_code}</span></p>
                  <Button variant="outline" size="sm" onClick={copyReferralLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </>
              ) : (
                <p className="text-slate-500">QR Code not available</p>
              )}
            </CardContent>
          </Card>

          {/* Leads List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Leads ({filteredLeads.length})</CardTitle>
              <CardDescription>Filter and view your leads</CardDescription>
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
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredLeads.length > 0 ? (
                  filteredLeads.slice(0, 20).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                      onClick={() => navigate(`/crm/lead/${lead.id}`)}
                    >
                      <div>
                        <p className="font-medium">{lead.full_name}</p>
                        <p className="text-xs text-slate-500">{new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                          lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100'
                        }`}>{lead.status.replace(/_/g, ' ')}</span>
                        <Eye className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-slate-500">No leads yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
