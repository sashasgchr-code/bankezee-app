import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

const LeadFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    city: '',
    employment_type: '',
    requirement: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const leadData = {
        ...formData,
        source: referralCode ? 'retail_qr' : 'digital'
      };
      
      if (referralCode) {
        try {
          const partnerResponse = await api.get(`/partners/by-code/${referralCode}`);
          if (partnerResponse.data) {
            leadData.source_id = partnerResponse.data.id;
          }
        } catch (error) {
          console.warn('Partner not found for referral code:', referralCode);
        }
      }
      
      await api.post('/leads/create', leadData);
      toast.success('Your request has been submitted! Our team will contact you soon.');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="lead-form-card">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Apply for Loan</CardTitle>
                <CardDescription>Fill in your details and we'll get back to you</CardDescription>
              </div>
            </div>
            {referralCode && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
                Referred by: {referralCode}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  data-testid="lead-fullname-input"
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
                  data-testid="lead-mobile-input"
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
                  data-testid="lead-city-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="employment_type">Employment Type *</Label>
                <Select
                  value={formData.employment_type || undefined}
                  onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                  required
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200" data-testid="lead-employment-select">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaried">Salaried</SelectItem>
                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="requirement">Loan Requirement *</Label>
                <Select
                  value={formData.requirement || undefined}
                  onValueChange={(value) => setFormData({ ...formData, requirement: value })}
                  required
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200" data-testid="lead-requirement-select">
                    <SelectValue placeholder="Select your requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reduce_emi">Reduce Home Loan EMI</SelectItem>
                    <SelectItem value="merge_loans">Merge Multiple Loans</SelectItem>
                    <SelectItem value="top_up">Top-up Loan</SelectItem>
                    <SelectItem value="new_personal">New Personal Loan</SelectItem>
                    <SelectItem value="new_home">New Home Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6 text-lg font-semibold"
                disabled={loading}
                data-testid="lead-submit-btn"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>

              <div className="text-center text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-primary hover:underline"
                  data-testid="lead-back-link"
                >
                  Back to Home
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadFormPage;