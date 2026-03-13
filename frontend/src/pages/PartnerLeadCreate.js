import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus } from 'lucide-react';

const PartnerLeadCreate = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const partnerId = user.partner_id || user.id;
  
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
        source: 'partner',
        source_id: partnerId
      };
      
      await api.post('/leads/create', leadData);
      toast.success('Lead created successfully! It will appear in your dashboard.');
      setTimeout(() => navigate(`/partner/dashboard/${partnerId}`), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
        <Button
          onClick={() => navigate(`/partner/dashboard/${partnerId}`)}
          variant="ghost"
          size="sm"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Create New Lead</h1>
      </nav>

      <div className="px-6 py-12 max-w-2xl mx-auto">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="partner-lead-form-card">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Add Customer Lead</CardTitle>
                <CardDescription>Enter customer details to generate a new lead</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name">Customer Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="Enter customer's full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  data-testid="customer-name-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="mobile">Customer Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                  data-testid="customer-mobile-input"
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                />
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  data-testid="customer-city-input"
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
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200" data-testid="customer-employment-select">
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
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200" data-testid="customer-requirement-select">
                    <SelectValue placeholder="Select loan requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reduce_home_loan_emi">Reduce Home Loan EMI</SelectItem>
                    <SelectItem value="merge_multiple_loans">Merge Multiple Loans</SelectItem>
                    <SelectItem value="top_up_pl">Top Up PL</SelectItem>
                    <SelectItem value="top_up_hl">Top Up HL</SelectItem>
                    <SelectItem value="new_personal_loan">New Personal Loan</SelectItem>
                    <SelectItem value="new_home_loan">New Home Loan</SelectItem>
                    <SelectItem value="business_loan">Business Loan</SelectItem>
                    <SelectItem value="new_vehicle_loan">New Vehicle Loan</SelectItem>
                    <SelectItem value="used_vehicle_loan">Used Vehicle Loan</SelectItem>
                    <SelectItem value="balance_transfer_pl">Balance Transfer-PL</SelectItem>
                    <SelectItem value="balance_transfer_hl">Balance Transfer-HL</SelectItem>
                    <SelectItem value="balance_transfer_topup_pl">Balance Transfer+Top Up PL</SelectItem>
                    <SelectItem value="balance_transfer_topup_hl">Balance Transfer+Top Up HL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6 text-lg font-semibold"
                disabled={loading}
                data-testid="submit-lead-btn"
              >
                {loading ? 'Creating Lead...' : 'Create Lead'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerLeadCreate;
