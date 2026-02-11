import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Handshake } from 'lucide-react';

const PartnerRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    city: '',
    occupation: '',
    pan_number: '',
    id_proof: null,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: ''
  });

  const handleFileChange = (e) => {
    setFormData({ ...formData, id_proof: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First upload ID card if provided
      let idCardUrl = null;
      if (formData.id_proof) {
        const idFormData = new FormData();
        idFormData.append('file', formData.id_proof);
        idFormData.append('document_type', 'partner_id_card');
        const uploadResponse = await api.post('/storage/upload-public', idFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        idCardUrl = uploadResponse.data.file_url;
      }

      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        city: formData.city,
        occupation: formData.occupation,
        pan_number: formData.pan_number,
        id_card_url: idCardUrl,
        bank_details: {
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          ifsc_code: formData.ifsc_code,
          account_holder_name: formData.account_holder_name
        }
      };
      
      const response = await api.post('/partners/register', registrationData);
      toast.success('Retail Partner registration successful! Awaiting admin approval.');
      toast.info(`Your referral code: ${response.data.referral_code}. You can login after approval.`);
      setTimeout(() => navigate('/login'), 4000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="partner-registration-card">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Handshake className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Retail Partner Registration</CardTitle>
                <CardDescription>Become a retail partner and start earning commissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="partner-name-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="partner-email-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="partner-password-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                  data-testid="partner-mobile-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  data-testid="partner-city-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="Your occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  data-testid="partner-occupation-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">KYC Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pan_number">PAN Number *</Label>
                    <Input
                      id="pan_number"
                      placeholder="ABCDE1234F"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                      required
                      maxLength={10}
                      data-testid="partner-pan-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="id_proof">ID Proof (Aadhar/Passport/Driving License)</Label>
                    <Input
                      id="id_proof"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      data-testid="partner-idproof-input"
                      className="h-12 bg-slate-50 border-slate-200"
                    />
                    <p className="text-xs text-slate-500 mt-1">Upload PDF, JPG, or PNG (Max 5MB)</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Bank Details (For Commission Payout)</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                    <Input
                      id="account_holder_name"
                      placeholder="As per bank account"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      required
                      data-testid="partner-account-name-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g., HDFC Bank, ICICI Bank"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      required
                      data-testid="partner-bank-name-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input
                      id="account_number"
                      type="text"
                      placeholder="Enter account number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      required
                      data-testid="partner-account-number-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ifsc_code">IFSC Code *</Label>
                    <Input
                      id="ifsc_code"
                      placeholder="e.g., HDFC0001234"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      required
                      maxLength={11}
                      data-testid="partner-ifsc-input"
                      className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6 text-lg font-semibold"
                disabled={loading}
                data-testid="partner-submit-btn"
              >
                {loading ? 'Registering...' : 'Register as Partner'}
              </Button>

              <div className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary hover:underline"
                  data-testid="partner-login-link"
                >
                  Login here
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerRegistration;