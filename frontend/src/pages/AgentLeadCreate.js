import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Upload } from 'lucide-react';

const AgentLeadCreate = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    mobile: '',
    email: '',
    mother_name: '',
    current_address: '',
    company_name: '',
    net_salary: '',
    office_address: '',
    obligations_emi: '',
    existing_loan_1: '',
    existing_loan_2: '',
    existing_loan_3: '',
    type_of_loan: '',
    cibil_score: '',
    loan_amount_required: '',
    tenure_required: ''
  });

  useEffect(() => {
    fetchAgent();
  }, []);

  const fetchAgent = async () => {
    try {
      const response = await api.get(`/agents/by-user/${user.id}`);
      setAgent(response.data);
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      toast.error('Agent profile not found');
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
        full_name: formData.customer_name,
        mobile: formData.mobile,
        email: formData.email,
        city: formData.current_address.split(',')[0] || 'Not provided',
        employment_type: 'salaried',
        requirement: formData.type_of_loan || 'general',
        source: 'agent',
        source_id: agent.id,
        additional_data: {
          mother_name: formData.mother_name,
          current_address: formData.current_address,
          company_name: formData.company_name,
          net_salary: formData.net_salary,
          office_address: formData.office_address,
          obligations_emi: formData.obligations_emi,
          existing_loan_1: formData.existing_loan_1,
          existing_loan_2: formData.existing_loan_2,
          existing_loan_3: formData.existing_loan_3,
          type_of_loan: formData.type_of_loan,
          cibil_score: formData.cibil_score,
          loan_amount_required: formData.loan_amount_required,
          tenure_required: formData.tenure_required,
          documents_note: 'Documents to be uploaded separately'
        }
      };
      
      await api.post('/leads/create', leadData);
      toast.success('Lead created successfully! Documents can be uploaded from CRM.');
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
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Agent Lead Application Form</h1>
      </nav>

      <div className="px-6 py-12 max-w-6xl mx-auto">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Complete Loan Application</CardTitle>
            <CardDescription>Fill all required fields for faster processing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name (As per Aadhaar) *</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      required
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Mobile Number *</Label>
                    <Input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Email ID</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Mother Name</Label>
                    <Input
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Current Address *</Label>
                    <Input
                      value={formData.current_address}
                      onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
                      required
                      className="h-11 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name (As per Payslip) *</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Net Salary (As per Payslip) *</Label>
                    <Input
                      type="number"
                      value={formData.net_salary}
                      onChange={(e) => setFormData({ ...formData, net_salary: e.target.value })}
                      required
                      placeholder="₹"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Office Address</Label>
                    <Input
                      value={formData.office_address}
                      onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
                      className="h-11 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Existing Loans & Obligations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total EMI Obligations (₹)</Label>
                    <Input
                      type="number"
                      value={formData.obligations_emi}
                      onChange={(e) => setFormData({ ...formData, obligations_emi: e.target.value })}
                      placeholder="Total monthly EMI"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Existing Loan 1</Label>
                    <Input
                      value={formData.existing_loan_1}
                      onChange={(e) => setFormData({ ...formData, existing_loan_1: e.target.value })}
                      placeholder="Bank name & amount"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Existing Loan 2</Label>
                    <Input
                      value={formData.existing_loan_2}
                      onChange={(e) => setFormData({ ...formData, existing_loan_2: e.target.value })}
                      placeholder="Bank name & amount"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Existing Loan 3</Label>
                    <Input
                      value={formData.existing_loan_3}
                      onChange={(e) => setFormData({ ...formData, existing_loan_3: e.target.value })}
                      placeholder="Bank name & amount"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* New Loan Requirements */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">New Loan Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type of Loan *</Label>
                    <Select
                      value={formData.type_of_loan || undefined}
                      onValueChange={(value) => setFormData({ ...formData, type_of_loan: value })}
                      required
                    >
                      <SelectTrigger className="h-11 bg-slate-50">
                        <SelectValue placeholder="Select loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reduce_home_loan_emi">Reduce Home Loan EMI</SelectItem>
                        <SelectItem value="merge_multiple_loans">Merge Multiple Loans</SelectItem>
                        <SelectItem value="top_up_loan">Top-Up Loan</SelectItem>
                        <SelectItem value="new_personal_loan">New Personal Loan</SelectItem>
                        <SelectItem value="new_home_loan">New Home Loan</SelectItem>
                        <SelectItem value="business_loan">Business Loan</SelectItem>
                        <SelectItem value="vehicle_loan">Vehicle Loan</SelectItem>
                        <SelectItem value="balance_transfer">Balance Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CIBIL Score</Label>
                    <Input
                      type="number"
                      value={formData.cibil_score}
                      onChange={(e) => setFormData({ ...formData, cibil_score: e.target.value })}
                      placeholder="e.g., 750"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Loan Amount Required (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.loan_amount_required}
                      onChange={(e) => setFormData({ ...formData, loan_amount_required: e.target.value })}
                      required
                      placeholder="e.g., 1000000"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label>Tenure Required (Years) *</Label>
                    <Input
                      type="number"
                      value={formData.tenure_required}
                      onChange={(e) => setFormData({ ...formData, tenure_required: e.target.value })}
                      required
                      placeholder="e.g., 20"
                      className="h-11 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Documents Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Document Upload Instructions
                </h3>
                <p className="text-sm text-blue-800">
                  After creating this lead, you can upload the following documents from the CRM Lead Detail page:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
                  <li>• Customer Aadhaar</li>
                  <li>• Customer PAN</li>
                  <li>• Passport Photo</li>
                  <li>• Latest 3 Months Payslips</li>
                  <li>• Latest 3 Months Bank Statements</li>
                  <li>• CIBIL Score Screenshots</li>
                  <li>• Form 16</li>
                  <li>• Current Address Proof</li>
                  <li>• ID Card</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full py-6 text-lg font-semibold"
                disabled={loading}
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
