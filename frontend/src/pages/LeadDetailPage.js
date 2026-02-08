import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Upload, UserCheck, Plus, Trash2, Building2 } from 'lucide-react';

const EMPTY_ELIGIBILITY = {
  bank_name: '',
  is_eligible: null,
  eligible_amount: '',
  eligible_tenure: '',
  login_done: null,
  login_bank: '',
  login_rejection_reason: '',
  approval_status: '',
  approved_bank: '',
  approved_amount: '',
  approved_tenure: '',
  approved_roi: '',
  declined_bank: '',
  declined_reason: '',
  disbursed: null,
  disbursed_bank: '',
  disbursed_amount: '',
  disbursed_tenure: '',
  disbursed_roi: '',
  disbursement_rejection_reason: ''
};

const LeadDetailPage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [opsTeam, setOpsTeam] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [eligibilities, setEligibilities] = useState([]);
  const [savingEligibilities, setSavingEligibilities] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canEditEligibilities = ['admin', 'operations'].includes(user.role);

  useEffect(() => {
    fetchLead();
    if (['admin', 'operations'].includes(user.role)) {
      fetchOpsTeam();
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      setLead(response.data);
      setNewStatus(response.data.status);
      setSelectedAssignee(response.data.assigned_to || '');
      setEligibilities(response.data.eligibilities || []);
    } catch (error) {
      toast.error('Failed to load lead details');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsTeam = async () => {
    try {
      const response = await api.get('/crm/operations-team');
      setOpsTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch ops team:', error);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await api.put(`/crm/${leadId}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await api.post(`/crm/${leadId}/notes`, { note });
      toast.success('Note added successfully');
      setNote('');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleAssignLead = async () => {
    if (!selectedAssignee) return;
    try {
      await api.put(`/crm/${leadId}/assign`, { assigned_to: selectedAssignee });
      toast.success('Lead assigned successfully');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign lead');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/documents/upload?lead_id=${leadId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully');
      fetchLead();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const addEligibility = () => {
    if (eligibilities.length >= 7) {
      toast.error('Maximum 7 eligibilities allowed');
      return;
    }
    setEligibilities([...eligibilities, { ...EMPTY_ELIGIBILITY }]);
  };

  const removeEligibility = (index) => {
    setEligibilities(eligibilities.filter((_, i) => i !== index));
  };

  const updateEligibility = (index, field, value) => {
    const updated = [...eligibilities];
    updated[index] = { ...updated[index], [field]: value };
    setEligibilities(updated);
  };

  const saveEligibilities = async () => {
    setSavingEligibilities(true);
    try {
      const formattedEligibilities = eligibilities.map(e => ({
        bank_name: e.bank_name,
        is_eligible: e.is_eligible === 'true' || e.is_eligible === true,
        eligible_amount: e.eligible_amount ? parseFloat(e.eligible_amount) : null,
        eligible_tenure: e.eligible_tenure ? parseInt(e.eligible_tenure) : null,
        login_done: e.login_done === 'true' || e.login_done === true ? true : e.login_done === 'false' || e.login_done === false ? false : null,
        login_bank: e.login_bank || null,
        login_rejection_reason: e.login_rejection_reason || null,
        approval_status: e.approval_status || null,
        approved_bank: e.approved_bank || null,
        approved_amount: e.approved_amount ? parseFloat(e.approved_amount) : null,
        approved_tenure: e.approved_tenure ? parseInt(e.approved_tenure) : null,
        approved_roi: e.approved_roi ? parseFloat(e.approved_roi) : null,
        declined_bank: e.declined_bank || null,
        declined_reason: e.declined_reason || null,
        disbursed: e.disbursed === 'true' || e.disbursed === true ? true : e.disbursed === 'false' || e.disbursed === false ? false : null,
        disbursed_bank: e.disbursed_bank || null,
        disbursed_amount: e.disbursed_amount ? parseFloat(e.disbursed_amount) : null,
        disbursed_tenure: e.disbursed_tenure ? parseInt(e.disbursed_tenure) : null,
        disbursed_roi: e.disbursed_roi ? parseFloat(e.disbursed_roi) : null,
        disbursement_rejection_reason: e.disbursement_rejection_reason || null
      }));
      await api.put(`/crm/${leadId}/eligibilities`, { eligibilities: formattedEligibilities });
      toast.success('Eligibilities saved successfully');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save eligibilities');
    } finally {
      setSavingEligibilities(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading lead details...</div>
      </div>
    );
  }

  const additionalData = lead.additional_data || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Lead Details</h1>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Complete Lead Information */}
            <Card data-testid="lead-info-card">
              <CardHeader>
                <CardTitle>Complete Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Customer Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><Label className="text-slate-500 text-xs">Full Name</Label><p className="font-medium">{lead.full_name}</p></div>
                    <div><Label className="text-slate-500 text-xs">Mobile</Label><p className="font-medium">{lead.mobile}</p></div>
                    <div><Label className="text-slate-500 text-xs">Email</Label><p className="font-medium">{lead.email || '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Mother Name</Label><p className="font-medium">{additionalData.mother_name || '-'}</p></div>
                    <div className="col-span-2"><Label className="text-slate-500 text-xs">Current Address</Label><p className="font-medium">{additionalData.current_address || lead.city || '-'}</p></div>
                  </div>
                </div>
                
                {/* Employment Info */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Employment Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><Label className="text-slate-500 text-xs">Company Name</Label><p className="font-medium">{additionalData.company_name || '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Net Salary</Label><p className="font-medium">{additionalData.net_salary ? `₹${Number(additionalData.net_salary).toLocaleString()}` : '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Employment Type</Label><p className="font-medium capitalize">{lead.employment_type || '-'}</p></div>
                    <div className="col-span-2"><Label className="text-slate-500 text-xs">Office Address</Label><p className="font-medium">{additionalData.office_address || '-'}</p></div>
                  </div>
                </div>

                {/* Existing Loans */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Existing Loans & Obligations</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><Label className="text-slate-500 text-xs">Total EMI</Label><p className="font-medium">{additionalData.obligations_emi ? `₹${Number(additionalData.obligations_emi).toLocaleString()}` : '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Existing Loan 1</Label><p className="font-medium">{additionalData.existing_loan_1 || '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Existing Loan 2</Label><p className="font-medium">{additionalData.existing_loan_2 || '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Existing Loan 3</Label><p className="font-medium">{additionalData.existing_loan_3 || '-'}</p></div>
                  </div>
                </div>

                {/* Loan Requirements */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Loan Requirements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><Label className="text-slate-500 text-xs">Loan Type</Label><p className="font-medium capitalize">{(additionalData.type_of_loan || lead.requirement || '-').replace('_', ' ')}</p></div>
                    <div><Label className="text-slate-500 text-xs">CIBIL Score</Label><p className="font-medium">{additionalData.cibil_score || '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Amount Required</Label><p className="font-medium">{additionalData.loan_amount_required ? `₹${Number(additionalData.loan_amount_required).toLocaleString()}` : '-'}</p></div>
                    <div><Label className="text-slate-500 text-xs">Tenure Required</Label><p className="font-medium">{additionalData.tenure_required ? `${additionalData.tenure_required} years` : '-'}</p></div>
                  </div>
                </div>

                {/* Source Info */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><Label className="text-slate-500 text-xs">Source</Label><p className="font-medium capitalize">{lead.source}</p></div>
                    <div><Label className="text-slate-500 text-xs">Current Status</Label>
                      <span className={`text-sm px-2 py-1 rounded-full capitalize ${
                        lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                        lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{lead.status.replace('_', ' ')}</span>
                    </div>
                    <div><Label className="text-slate-500 text-xs">Created</Label><p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eligibility Tracking - Only for Admin/Ops to edit, but visible to all */}
            <Card data-testid="eligibility-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Bank Eligibilities ({eligibilities.length}/7)
                </CardTitle>
                {canEditEligibilities && (
                  <Button onClick={addEligibility} variant="outline" size="sm" disabled={eligibilities.length >= 7}>
                    <Plus className="w-4 h-4 mr-1" /> Add Bank
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {eligibilities.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No eligibility records yet</p>
                ) : (
                  <div className="space-y-6">
                    {eligibilities.map((elig, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-slate-50 relative">
                        {canEditEligibilities && (
                          <Button 
                            onClick={() => removeEligibility(index)} 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <h5 className="font-semibold text-primary mb-3">Bank #{index + 1}</h5>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Bank Name & Eligibility */}
                          <div>
                            <Label className="text-xs">Bank Name</Label>
                            {canEditEligibilities ? (
                              <Input value={elig.bank_name || ''} onChange={(e) => updateEligibility(index, 'bank_name', e.target.value)} className="h-9 bg-white" />
                            ) : (
                              <p className="font-medium">{elig.bank_name || '-'}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Eligible?</Label>
                            {canEditEligibilities ? (
                              <Select value={elig.is_eligible === true ? 'true' : elig.is_eligible === false ? 'false' : ''} onValueChange={(v) => updateEligibility(index, 'is_eligible', v)}>
                                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes - Eligible</SelectItem>
                                  <SelectItem value="false">No - Not Eligible</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className={`font-medium ${elig.is_eligible ? 'text-green-600' : 'text-red-600'}`}>{elig.is_eligible === true ? 'Eligible' : elig.is_eligible === false ? 'Not Eligible' : '-'}</p>
                            )}
                          </div>
                          
                          {/* Show these only if eligible */}
                          {(elig.is_eligible === true || elig.is_eligible === 'true') && (
                            <>
                              <div>
                                <Label className="text-xs">Eligible Amount (₹)</Label>
                                {canEditEligibilities ? (
                                  <Input type="number" value={elig.eligible_amount || ''} onChange={(e) => updateEligibility(index, 'eligible_amount', e.target.value)} className="h-9 bg-white" />
                                ) : (
                                  <p className="font-medium">{elig.eligible_amount ? `₹${Number(elig.eligible_amount).toLocaleString()}` : '-'}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs">Eligible Tenure (months)</Label>
                                {canEditEligibilities ? (
                                  <Input type="number" value={elig.eligible_tenure || ''} onChange={(e) => updateEligibility(index, 'eligible_tenure', e.target.value)} className="h-9 bg-white" />
                                ) : (
                                  <p className="font-medium">{elig.eligible_tenure || '-'}</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Login Status */}
                        {(elig.is_eligible === true || elig.is_eligible === 'true') && (
                          <div className="mt-4 pt-3 border-t">
                            <h6 className="text-xs font-semibold text-slate-600 mb-2">Login Status</h6>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Login Done?</Label>
                                {canEditEligibilities ? (
                                  <Select value={elig.login_done === true ? 'true' : elig.login_done === false ? 'false' : ''} onValueChange={(v) => updateEligibility(index, 'login_done', v)}>
                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Yes</SelectItem>
                                      <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className="font-medium">{elig.login_done === true ? 'Yes' : elig.login_done === false ? 'No' : '-'}</p>
                                )}
                              </div>
                              {(elig.login_done === true || elig.login_done === 'true') && (
                                <div>
                                  <Label className="text-xs">Login Bank</Label>
                                  {canEditEligibilities ? (
                                    <Input value={elig.login_bank || ''} onChange={(e) => updateEligibility(index, 'login_bank', e.target.value)} className="h-9 bg-white" />
                                  ) : (
                                    <p className="font-medium">{elig.login_bank || '-'}</p>
                                  )}
                                </div>
                              )}
                              {(elig.login_done === false || elig.login_done === 'false') && (
                                <div className="col-span-2">
                                  <Label className="text-xs">Rejection Reason</Label>
                                  {canEditEligibilities ? (
                                    <Input value={elig.login_rejection_reason || ''} onChange={(e) => updateEligibility(index, 'login_rejection_reason', e.target.value)} className="h-9 bg-white" />
                                  ) : (
                                    <p className="font-medium">{elig.login_rejection_reason || '-'}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Approval Status */}
                        {(elig.login_done === true || elig.login_done === 'true') && (
                          <div className="mt-4 pt-3 border-t">
                            <h6 className="text-xs font-semibold text-slate-600 mb-2">Approval Status</h6>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Approval</Label>
                                {canEditEligibilities ? (
                                  <Select value={elig.approval_status || ''} onValueChange={(v) => updateEligibility(index, 'approval_status', v)}>
                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="declined">Declined</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className={`font-medium capitalize ${elig.approval_status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{elig.approval_status || '-'}</p>
                                )}
                              </div>
                              {elig.approval_status === 'approved' && (
                                <>
                                  <div><Label className="text-xs">Approved Bank</Label>{canEditEligibilities ? <Input value={elig.approved_bank || ''} onChange={(e) => updateEligibility(index, 'approved_bank', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.approved_bank || '-'}</p>}</div>
                                  <div><Label className="text-xs">Approved Amount</Label>{canEditEligibilities ? <Input type="number" value={elig.approved_amount || ''} onChange={(e) => updateEligibility(index, 'approved_amount', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.approved_amount ? `₹${Number(elig.approved_amount).toLocaleString()}` : '-'}</p>}</div>
                                  <div><Label className="text-xs">Approved Tenure</Label>{canEditEligibilities ? <Input type="number" value={elig.approved_tenure || ''} onChange={(e) => updateEligibility(index, 'approved_tenure', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.approved_tenure || '-'}</p>}</div>
                                  <div><Label className="text-xs">ROI (%)</Label>{canEditEligibilities ? <Input type="number" step="0.01" value={elig.approved_roi || ''} onChange={(e) => updateEligibility(index, 'approved_roi', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.approved_roi ? `${elig.approved_roi}%` : '-'}</p>}</div>
                                </>
                              )}
                              {elig.approval_status === 'declined' && (
                                <>
                                  <div><Label className="text-xs">Declined Bank</Label>{canEditEligibilities ? <Input value={elig.declined_bank || ''} onChange={(e) => updateEligibility(index, 'declined_bank', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.declined_bank || '-'}</p>}</div>
                                  <div className="col-span-2"><Label className="text-xs">Decline Reason</Label>{canEditEligibilities ? <Input value={elig.declined_reason || ''} onChange={(e) => updateEligibility(index, 'declined_reason', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.declined_reason || '-'}</p>}</div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Disbursement Status */}
                        {elig.approval_status === 'approved' && (
                          <div className="mt-4 pt-3 border-t">
                            <h6 className="text-xs font-semibold text-slate-600 mb-2">Disbursement Status</h6>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Disbursed?</Label>
                                {canEditEligibilities ? (
                                  <Select value={elig.disbursed === true ? 'true' : elig.disbursed === false ? 'false' : ''} onValueChange={(v) => updateEligibility(index, 'disbursed', v)}>
                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Yes</SelectItem>
                                      <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className={`font-medium ${elig.disbursed === true ? 'text-green-600' : ''}`}>{elig.disbursed === true ? 'Yes' : elig.disbursed === false ? 'No' : '-'}</p>
                                )}
                              </div>
                              {(elig.disbursed === true || elig.disbursed === 'true') && (
                                <>
                                  <div><Label className="text-xs">Disbursed Bank</Label>{canEditEligibilities ? <Input value={elig.disbursed_bank || ''} onChange={(e) => updateEligibility(index, 'disbursed_bank', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.disbursed_bank || '-'}</p>}</div>
                                  <div><Label className="text-xs">Disbursed Amount</Label>{canEditEligibilities ? <Input type="number" value={elig.disbursed_amount || ''} onChange={(e) => updateEligibility(index, 'disbursed_amount', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.disbursed_amount ? `₹${Number(elig.disbursed_amount).toLocaleString()}` : '-'}</p>}</div>
                                  <div><Label className="text-xs">Disbursed Tenure</Label>{canEditEligibilities ? <Input type="number" value={elig.disbursed_tenure || ''} onChange={(e) => updateEligibility(index, 'disbursed_tenure', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.disbursed_tenure || '-'}</p>}</div>
                                  <div><Label className="text-xs">ROI (%)</Label>{canEditEligibilities ? <Input type="number" step="0.01" value={elig.disbursed_roi || ''} onChange={(e) => updateEligibility(index, 'disbursed_roi', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.disbursed_roi ? `${elig.disbursed_roi}%` : '-'}</p>}</div>
                                </>
                              )}
                              {(elig.disbursed === false || elig.disbursed === 'false') && (
                                <div className="col-span-3"><Label className="text-xs">Rejection Reason</Label>{canEditEligibilities ? <Input value={elig.disbursement_rejection_reason || ''} onChange={(e) => updateEligibility(index, 'disbursement_rejection_reason', e.target.value)} className="h-9 bg-white" /> : <p className="font-medium">{elig.disbursement_rejection_reason || '-'}</p>}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {canEditEligibilities && eligibilities.length > 0 && (
                  <Button onClick={saveEligibilities} className="w-full mt-4 bg-primary text-primary-foreground" disabled={savingEligibilities}>
                    {savingEligibilities ? 'Saving...' : 'Save All Eligibilities'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Status Update - Only for Admin/Ops */}
            {canEditEligibilities && (
              <Card data-testid="status-update-card">
                <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-12 flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="documents_collected">Documents Collected</SelectItem>
                        <SelectItem value="sent_to_bank">Sent to Bank</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="disbursed">Disbursed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleStatusUpdate} disabled={newStatus === lead.status} className="bg-primary text-primary-foreground">Update Status</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assign Lead - Only for Admin/Ops */}
            {canEditEligibilities && (
              <Card data-testid="assign-lead-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" />Assign Lead</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                      <SelectTrigger className="h-12 flex-1"><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {opsTeam.length > 0 ? opsTeam.map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.full_name} ({member.email})</SelectItem>
                        )) : <SelectItem value="" disabled>No operations team members</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAssignLead} disabled={!selectedAssignee || selectedAssignee === lead.assigned_to} className="bg-primary text-primary-foreground">Assign</Button>
                  </div>
                  {lead.assigned_to && <p className="text-sm text-slate-500 mt-2">Currently assigned to: <span className="font-medium">{opsTeam.find(m => m.id === lead.assigned_to)?.full_name || 'Unknown'}</span></p>}
                </CardContent>
              </Card>
            )}

            {/* Notes - Only for Admin/Ops */}
            {canEditEligibilities && (
              <Card data-testid="add-note-card">
                <CardHeader><CardTitle>Add Note</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea placeholder="Type your note here..." value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="bg-slate-50" />
                    <Button onClick={handleAddNote} disabled={!note.trim()} className="bg-primary text-primary-foreground">Add Note</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Documents */}
            <Card data-testid="documents-card">
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {canEditEligibilities && (
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600">Click to upload document</p>
                      </div>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  )}
                  {lead.documents && lead.documents.length > 0 && (
                    <div className="space-y-2">
                      {lead.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm flex-1">{doc.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!lead.documents || lead.documents.length === 0) && !canEditEligibilities && (
                    <p className="text-center text-slate-500 py-4 text-sm">No documents uploaded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card data-testid="activity-log-card">
              <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lead.activities && lead.activities.length > 0 ? (
                    [...lead.activities].reverse().map((activity, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-3 pb-3">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{activity.by_name || 'System'} • {new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage;
