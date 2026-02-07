import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/utils/api';
import { toast } from 'sonner';
import { LogIn, Smartphone } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '' });
  const [otpLogin, setOtpLogin] = useState({ phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', emailLogin);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');
      
      const role = response.data.user.role;
      if (role === 'admin' || role === 'operations') {
        navigate('/admin/dashboard');
      } else if (role === 'sales_agent') {
        navigate('/agent/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: otpLogin.phone });
      setOtpSent(true);
      toast.success('OTP sent to your phone');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { phone: otpLogin.phone, code: otpLogin.otp });
      console.log('OTP Verification Response:', response.data);
      
      if (response.data.valid && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Login successful!');
        
        const role = response.data.user.role;
        const partnerId = response.data.user.partner_id || response.data.user.id;
        
        console.log('User role:', role, 'Partner ID:', partnerId);
        
        if (role === 'admin' || role === 'operations') {
          navigate('/admin/dashboard');
        } else if (role === 'sales_agent') {
          navigate('/agent/dashboard');
        } else if (role === 'partner') {
          console.log('Navigating to partner dashboard:', `/partner/dashboard/${partnerId}`);
          navigate(`/partner/dashboard/${partnerId}`);
        } else {
          navigate('/');
        }
      } else {
        console.error('Invalid response:', response.data);
        toast.error(response.data.message || 'Invalid OTP or phone number not registered');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="login-card">
        <CardHeader>
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Welcome Back</CardTitle>
          <CardDescription>Sign in to access your Bankezee account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email" data-testid="email-login-tab">
                <LogIn className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="otp" data-testid="otp-login-tab">
                <Smartphone className="w-4 h-4 mr-2" />
                OTP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailLogin.email}
                    onChange={(e) => setEmailLogin({ ...emailLogin, email: e.target.value })}
                    required
                    data-testid="email-input"
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={emailLogin.password}
                    onChange={(e) => setEmailLogin({ ...emailLogin, password: e.target.value })}
                    required
                    data-testid="password-input"
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6"
                  disabled={loading}
                  data-testid="email-login-submit"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={otpLogin.phone}
                      onChange={(e) => setOtpLogin({ ...otpLogin, phone: e.target.value })}
                      required
                      disabled={otpSent}
                      data-testid="phone-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                    {!otpSent && (
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={loading || !otpLogin.phone}
                        data-testid="send-otp-btn"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                      >
                        Send OTP
                      </Button>
                    )}
                  </div>
                </div>
                {otpSent && (
                  <>
                    <div>
                      <Label htmlFor="otp">OTP Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otpLogin.otp}
                        onChange={(e) => setOtpLogin({ ...otpLogin, otp: e.target.value })}
                        required
                        data-testid="otp-input"
                        className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6"
                      disabled={loading}
                      data-testid="verify-otp-submit"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-slate-600">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:underline"
              data-testid="back-home-link"
            >
              Back to Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;