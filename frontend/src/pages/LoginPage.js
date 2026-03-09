import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');
      
      const role = response.data.user.role;
      const userId = response.data.user.id;
      
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'operations') {
        navigate('/operations/dashboard');
      } else if (role === 'manager') {
        navigate('/manager/dashboard');
      } else if (role === 'team_leader') {
        navigate('/team-leader/dashboard');
      } else if (role === 'sales_agent') {
        navigate('/agent/dashboard');
      } else if (role === 'partner') {
        navigate(`/partner/dashboard/${userId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="login-card">
        <CardHeader className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_7c3fdd96-2e7c-4f0d-8929-2f39966615d7/artifacts/d1dzd93e_BankEzee%20Logo.png" 
            alt="BankEzee Logo" 
            className="h-14 mx-auto mb-4"
          />
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Welcome Back</CardTitle>
          <CardDescription>Sign in to access your BankEzee account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
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
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                data-testid="password-input"
                className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6"
              disabled={loading}
              data-testid="login-submit"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p className="mb-2">Don't have an account?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/agent-registration')}
                className="text-primary hover:underline"
              >
                Register as Agent
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => navigate('/partner-registration')}
                className="text-primary hover:underline"
              >
                Register as Partner
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-slate-500 hover:text-primary"
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
