import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { QrCode, DollarSign, FileText, LogOut, LayoutDashboard } from 'lucide-react';

const PartnerDashboard = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
    fetchQRCode();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get(`/dashboard/partner/${partnerId}`);
      setDashboard(response.data);
      
      // Fetch partner's created leads
      const leadsResponse = await api.get('/leads/');
      const partnerLeads = leadsResponse.data.filter(l => l.source_id === partnerId);
      setDashboard(prev => ({ ...prev, all_leads: partnerLeads }));
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await api.get(`/qr/data/${partnerId}`);
      setQrData(response.data);
    } catch (error) {
      console.error('Failed to load QR code:', error);
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Partner Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          {dashboard?.partner_code && (
            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {dashboard.partner_code}
            </span>
          )}
          <span className="text-sm text-slate-600">Welcome, {user.full_name}</span>
          <Button
            onClick={() => navigate('/partner/create-lead')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="create-lead-btn"
          >
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

          <Card className="hover-lift" data-testid="stat-approved-cases">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Cases</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard?.approved_cases || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Successfully closed</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-wallet-balance">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboard?.wallet_balance?.toLocaleString() || 0}</div>
              <p className="text-xs text-slate-600 mt-1">Available</p>
            </CardContent>
          </Card>

          <Card className="hover-lift" data-testid="stat-total-earnings">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboard?.total_earnings?.toLocaleString() || 0}</div>
              <p className="text-xs text-slate-600 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {qrData && (
            <Card data-testid="qr-code-card">
              <CardHeader>
                <CardTitle>Your QR Code</CardTitle>
                <CardDescription>Share this QR code or link to generate leads</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <img
                  src={qrData.qr_image_base64}
                  alt="Partner QR Code"
                  className="w-64 h-64 border-2 border-slate-200 rounded-lg"
                  data-testid="qr-code-image"
                />
                <p className="mt-4 text-sm text-slate-600 text-center">
                  Referral Code: <span className="font-bold text-primary">{qrData.referral_code}</span>
                </p>
                <div className="mt-4 w-full space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Lead Generation Link:</p>
                    <p className="text-sm font-mono break-all">{qrData.qr_url}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(qrData.qr_url);
                        toast.success('Link copied to clipboard!');
                      }}
                      variant="outline"
                      className="flex-1"
                      data-testid="copy-link-btn"
                    >
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => window.open(`/api/qr/generate/${partnerId}`, '_blank')}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="download-qr-btn"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Download QR
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2" data-testid="all-leads-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Your Leads</CardTitle>
                <CardDescription>Leads you have entered with current status</CardDescription>
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
                    <SelectItem value="sent_to_bank">Sent to Bank</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="disbursed">Disbursed</SelectItem>
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
              {(() => {
                const allLeads = dashboard?.all_leads || dashboard?.recent_leads || [];
                const filteredLeads = allLeads.filter(lead => {
                  const statusMatch = statusFilter === 'all' || lead.status === statusFilter;
                  const leadDate = new Date(lead.created_at);
                  const monthMatch = monthFilter === 'all' || 
                    (monthFilter === 'this_month' && leadDate.getMonth() === new Date().getMonth() && leadDate.getFullYear() === new Date().getFullYear()) ||
                    (monthFilter === 'last_month' && leadDate.getMonth() === new Date().getMonth() - 1) ||
                    (monthFilter === 'last_3_months' && leadDate >= new Date(new Date().setMonth(new Date().getMonth() - 3)));
                  return statusMatch && monthMatch;
                });
                return (
                  <div className="space-y-3">
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/lead/${lead.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{lead.full_name}</p>
                        <p className="text-xs text-slate-500">{lead.mobile} | {(lead.requirement || '').replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400 mt-1">Created: {new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                          lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        {lead.eligibilities && lead.eligibilities.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">{lead.eligibilities.length} bank(s)</p>
                        )}
                      </div>
                    </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        {allLeads.length === 0 
                          ? "No leads generated yet. Start by creating a lead or sharing your QR code!"
                          : "No leads match your filters."}
                      </div>
                    )}}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;