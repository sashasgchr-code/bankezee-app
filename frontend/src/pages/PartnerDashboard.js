import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { QrCode, DollarSign, FileText, LogOut, LayoutDashboard } from 'lucide-react';

const PartnerDashboard = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [qrData, setQrData] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
    fetchQRCode();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get(`/dashboard/partner/${partnerId}`);
      setDashboard(response.data);
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
      console.error('Failed to load QR code');
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
                <CardDescription>Share this QR code to generate leads</CardDescription>
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
                <Button
                  onClick={() => window.open(`/qr/generate/${partnerId}`, '_blank')}
                  className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="download-qr-btn"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          )}

          <Card data-testid="recent-leads-card">
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>Leads generated through your referral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recent_leads?.length > 0 ? (
                  dashboard.recent_leads.map((lead) => (
                    <div key={lead.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{lead.full_name}</p>
                        <p className="text-xs text-slate-500">{lead.requirement}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No leads generated yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;