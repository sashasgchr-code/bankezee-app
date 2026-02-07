import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus } from 'lucide-react';

const AgentLeadCreate = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    city: '',
    employment_type: '',
    monthly_income: '',
    company_name: '',
    requirement: '',
    loan_amount: '',
    existing_loan_amount: '',
    property_value: '',
    current_emi: '',
    purpose: '',
    comments: ''
  });

  useEffect(() => {
    fetchAgent();
  }, []);

  const fetchAgent = async () => {
    try {
      const response = await api.get(`/agents?email=${user.email}`);
      if (response.data && response.data.length > 0) {
        setAgent(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch agent:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agent) {
      toast.error('Agent data not loaded');
      return;
    }
    
    setLoading(true);
    
    try {
      const leadData = {
        full_name: formData.full_name,
        mobile: formData.mobile,
        email: formData.email,
        city: formData.city,
        employment_type: formData.employment_type,
        requirement: formData.requirement,
        source: 'agent',
        source_id: agent.id,
        additional_data: {
          monthly_income: formData.monthly_income,
          company_name: formData.company_name,
          loan_amount: formData.loan_amount,
          existing_loan_amount: formData.existing_loan_amount,
          property_value: formData.property_value,
          current_emi: formData.current_emi,
          purpose: formData.purpose,
          comments: formData.comments
        }
      };
      
      await api.post('/leads/create', leadData);
      toast.success('Lead created successfully!');
      setTimeout(() => navigate('/agent/dashboard'), 2000);
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
          onClick={() => navigate('/agent/dashboard')}
          variant="ghost"
          size="sm"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Create New Lead</h1>
      </nav>

      <div className="px-6 py-12 max-w-4xl mx-auto">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)]" data-testid="agent-lead-form-card">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Detailed Lead Application</CardTitle>
                <CardDescription>Complete customer information for better processing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">Customer Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+919876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 bg-slate-50"
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
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="employment_type">Employment Type *</Label>
                  <Select
                    value={formData.employment_type || undefined}
                    onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                    required
                  >
                    <SelectTrigger className="h-12 bg-slate-50">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried</SelectItem>
                      <SelectItem value="self_employed">Self-Employed</SelectItem>
                      <SelectItem value="business">Business Owner</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="monthly_income">Monthly Income (₹) *</Label>
                  <Input
                    id="monthly_income"
                    type="number"
                    placeholder="50000"
                    value={formData.monthly_income}
                    onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                    required
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Company/Business Name</Label>
                  <Input
                    id="company_name"
                    placeholder="Enter company name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="requirement">Loan Requirement *</Label>
                  <Select
                    value={formData.requirement || undefined}
                    onValueChange={(value) => setFormData({ ...formData, requirement: value })}
                    required
                  >
                    <SelectTrigger className="h-12 bg-slate-50">
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reduce_emi">Reduce Home Loan EMI</SelectItem>
                      <SelectItem value="merge_loans">Merge Multiple Loans</SelectItem>
                      <SelectItem value="top_up">Top-up Loan</SelectItem>
                      <SelectItem value="new_personal">New Personal Loan</SelectItem>
                      <SelectItem value="new_home">New Home Loan</SelectItem>
                      <SelectItem value="balance_transfer">Balance Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="loan_amount">Required Loan Amount (₹)</Label>
                  <Input
                    id="loan_amount"
                    type="number"
                    placeholder="1000000"
                    value={formData.loan_amount}
                    onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="existing_loan_amount">Existing Loan Amount (₹)</Label>
                  <Input
                    id="existing_loan_amount"
                    type="number"
                    placeholder="500000"
                    value={formData.existing_loan_amount}
                    onChange={(e) => setFormData({ ...formData, existing_loan_amount: e.target.value })}
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="property_value">Property Value (₹)</Label>
                  <Input
                    id="property_value"
                    type="number"
                    placeholder="5000000"
                    value={formData.property_value}
                    onChange={(e) => setFormData({ ...formData, property_value: e.target.value })}
                    className="h-12 bg-slate-50"
                  />
                </div>

                <div>
                  <Label htmlFor="current_emi">Current EMI (₹)</Label>
                  <Input
                    id="current_emi"
                    type="number"
                    placeholder="25000"
                    value={formData.current_emi}
                    onChange={(e) => setFormData({ ...formData, current_emi: e.target.value })}
                    className="h-12 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose of Loan</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Home purchase, debt consolidation, business expansion"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="h-12 bg-slate-50"
                />
              </div>

              <div>
                <Label htmlFor="comments">Additional Comments/Requirements</Label>
                <Textarea
                  id="comments"
                  placeholder="Any additional information..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={4}
                  className="bg-slate-50"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6 text-lg font-semibold"
                disabled={loading}
                data-testid="submit-lead-btn"
              >
                {loading ? 'Creating Lead...' : 'Submit Lead Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentLeadCreate;
