import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Upload, UserCheck, Plus, Trash2, Building2, Save, Edit2 } from 'lucide-react';

const EMPTY_ELIGIBILITY = {
  bank_name: '',
  is_eligible: '',
  eligible_amount: '',
  eligible_tenure: '',
  login_done: '',
  login_bank: '',
  login_rejection_reason: '',
  approval_status: '',
  approved_bank: '',
  approved_amount: '',
  approved_tenure: '',
  approved_roi: '',
  declined_bank: '',
  declined_reason: '',
  disbursed: '',
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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canEdit = ['admin', 'operations'].includes(user.role);

  useEffect(() => {
    fetchLead();
    if (['admin', 'operations'].includes(user.role)) {
      fetchOpsTeam();
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      const leadData = response.data;
      setLead(leadData);
      setNewStatus(leadData.status || 'new');
      setSelectedAssignee(leadData.assigned_to || '');
      // Initialize edited details
      const additionalData = leadData.additional_data || {};
      setEditedDetails({
        full_name: leadData.full_name || '',
        mobile: leadData.mobile || '',
        email: leadData.email || '',
        city: leadData.city || '',
        employment_type: leadData.employment_type || '',
        mother_name: additionalData.mother_name || '',
        current_address: additionalData.current_address || '',
        company_name: additionalData.company_name || '',
        net_salary: additionalData.net_salary || '',
        office_address: additionalData.office_address || '',
        obligations_emi: additionalData.obligations_emi || '',
        existing_loan_1: additionalData.existing_loan_1 || '',
        existing_loan_2: additionalData.existing_loan_2 || '',
        existing_loan_3: additionalData.existing_loan_3 || '',
        type_of_loan: additionalData.type_of_loan || leadData.requirement || '',
        cibil_score: additionalData.cibil_score || '',
        loan_amount_required: additionalData.loan_amount_required || '',
        tenure_required: additionalData.tenure_required || ''
      });
      // Convert eligibilities to string format for form handling
      const formattedElig = (leadData.eligibilities || []).map(e => ({
        ...e,
        is_eligible: e.is_eligible === true ? 'yes' : e.is_eligible === false ? 'no' : '',
        login_done: e.login_done === true ? 'yes' : e.login_done === false ? 'no' : '',
        disbursed: e.disbursed === true ? 'yes' : e.disbursed === false ? 'no' : '',
        eligible_amount: e.eligible_amount || '',
        eligible_tenure: e.eligible_tenure || '',
        approved_amount: e.approved_amount || '',
        approved_tenure: e.approved_tenure || '',
        approved_roi: e.approved_roi || '',
        disbursed_amount: e.disbursed_amount || '',
        disbursed_tenure: e.disbursed_tenure || '',
        disbursed_roi: e.disbursed_roi || '',
      }));
      setEligibilities(formattedElig);
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

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const updatePayload = {
        full_name: editedDetails.full_name,
        mobile: editedDetails.mobile,
        email: editedDetails.email,
        city: editedDetails.city,
        employment_type: editedDetails.employment_type,
        requirement: editedDetails.type_of_loan,
        additional_data: {
          mother_name: editedDetails.mother_name,
          current_address: editedDetails.current_address,
          company_name: editedDetails.company_name,
          net_salary: editedDetails.net_salary,
          office_address: editedDetails.office_address,
          obligations_emi: editedDetails.obligations_emi,
          existing_loan_1: editedDetails.existing_loan_1,
          existing_loan_2: editedDetails.existing_loan_2,
          existing_loan_3: editedDetails.existing_loan_3,
          type_of_loan: editedDetails.type_of_loan,
          cibil_score: editedDetails.cibil_score,
          loan_amount_required: editedDetails.loan_amount_required,
          tenure_required: editedDetails.tenure_required
        }
      };
      await api.put(`/crm/${leadId}/details`, updatePayload);
      toast.success('Lead details saved successfully');
      setIsEditingDetails(false);
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save details');
    } finally {
      setSavingDetails(false);
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
        bank_name: e.bank_name || '',
        is_eligible: e.is_eligible === 'yes',
        eligible_amount: e.eligible_amount ? parseFloat(e.eligible_amount) : null,
        eligible_tenure: e.eligible_tenure ? parseInt(e.eligible_tenure) : null,
        login_done: e.login_done === 'yes' ? true : e.login_done === 'no' ? false : null,
        login_bank: e.login_bank || null,
        login_rejection_reason: e.login_rejection_reason || null,
        approval_status: e.approval_status || null,
        approved_bank: e.approved_bank || null,
        approved_amount: e.approved_amount ? parseFloat(e.approved_amount) : null,
        approved_tenure: e.approved_tenure ? parseInt(e.approved_tenure) : null,
        approved_roi: e.approved_roi ? parseFloat(e.approved_roi) : null,
        declined_bank: e.declined_bank || null,
        declined_reason: e.declined_reason || null,
        disbursed: e.disbursed === 'yes' ? true : e.disbursed === 'no' ? false : null,
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

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Lead not found</div>
      </div>
    );
  }

  const additionalData = lead.additional_data || {};

  // Editable field component
  const EditableField = ({ label, fieldKey, type = 'text', placeholder = '' }) => (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {isEditingDetails ? (
        <Input
          type={type}
          value={editedDetails[fieldKey] || ''}
          onChange={(e) => setEditedDetails({ ...editedDetails, [fieldKey]: e.target.value })}
          className="h-9 bg-white"
          placeholder={placeholder}
        />
      ) : (
        <p className="font-medium">
          {type === 'number' && editedDetails[fieldKey] 
            ? `₹${Number(editedDetails[fieldKey]).toLocaleString()}` 
            : editedDetails[fieldKey] || '-'}
        </p>
      )}
    </div>
  );

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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Complete Lead Information</CardTitle>
                {canEdit && (
                  <div className="flex gap-2">
                    {isEditingDetails ? (
                      <>
                        <Button onClick={() => setIsEditingDetails(false)} variant="outline" size="sm">Cancel</Button>
                        <Button onClick={handleSaveDetails} size="sm" className="bg-primary text-primary-foreground" disabled={savingDetails}>
                          <Save className="w-4 h-4 mr-1" />
                          {savingDetails ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditingDetails(true)} variant="outline" size="sm">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit Details
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Customer Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EditableField label="Full Name" fieldKey="full_name" />
                    <EditableField label="Mobile" fieldKey="mobile" />
                    <EditableField label="Email" fieldKey="email" type="email" />
                    <EditableField label="Mother Name" fieldKey="mother_name" />
                    <div className="col-span-2">
                      <EditableField label="Current Address" fieldKey="current_address" />
                    </div>
                  </div>
                </div>
                
                {/* Employment Info */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Employment Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EditableField label="Company Name" fieldKey="company_name" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Net Salary</p>
                      {isEditingDetails ? (
                        <Input
                          type="number"
                          value={editedDetails.net_salary || ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, net_salary: e.target.value })}
                          className="h-9 bg-white"
                          placeholder="₹"
                        />
                      ) : (
                        <p className="font-medium">{editedDetails.net_salary ? `₹${Number(editedDetails.net_salary).toLocaleString()}` : '-'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Employment Type</p>
                      {isEditingDetails ? (
                        <Select value={editedDetails.employment_type || undefined} onValueChange={(v) => setEditedDetails({ ...editedDetails, employment_type: v })}>
                          <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="salaried">Salaried</SelectItem>
                            <SelectItem value="self_employed">Self Employed</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium capitalize">{editedDetails.employment_type || '-'}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <EditableField label="Office Address" fieldKey="office_address" />
                    </div>
                  </div>
                </div>

                {/* Existing Loans */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Existing Loans & Obligations</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total EMI</p>
                      {isEditingDetails ? (
                        <Input
                          type="number"
                          value={editedDetails.obligations_emi || ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, obligations_emi: e.target.value })}
                          className="h-9 bg-white"
                          placeholder="₹"
                        />
                      ) : (
                        <p className="font-medium">{editedDetails.obligations_emi ? `₹${Number(editedDetails.obligations_emi).toLocaleString()}` : '-'}</p>
                      )}
                    </div>
                    <EditableField label="Existing Loan 1" fieldKey="existing_loan_1" placeholder="Bank & amount" />
                    <EditableField label="Existing Loan 2" fieldKey="existing_loan_2" placeholder="Bank & amount" />
                    <EditableField label="Existing Loan 3" fieldKey="existing_loan_3" placeholder="Bank & amount" />
                  </div>
                </div>

                {/* Loan Requirements */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-3">Loan Requirements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Loan Type</p>
                      {isEditingDetails ? (
                        <Select value={editedDetails.type_of_loan || undefined} onValueChange={(v) => setEditedDetails({ ...editedDetails, type_of_loan: v })}>
                          <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home_loan">Home Loan</SelectItem>
                            <SelectItem value="personal_loan">Personal Loan</SelectItem>
                            <SelectItem value="top_up">Top-up Loan</SelectItem>
                            <SelectItem value="balance_transfer">Balance Transfer</SelectItem>
                            <SelectItem value="loan_against_property">Loan Against Property</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium capitalize">{(editedDetails.type_of_loan || '-').replace(/_/g, ' ')}</p>
                      )}
                    </div>
                    <EditableField label="CIBIL Score" fieldKey="cibil_score" type="number" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Amount Required</p>
                      {isEditingDetails ? (
                        <Input
                          type="number"
                          value={editedDetails.loan_amount_required || ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, loan_amount_required: e.target.value })}
                          className="h-9 bg-white"
                          placeholder="₹"
                        />
                      ) : (
                        <p className="font-medium">{editedDetails.loan_amount_required ? `₹${Number(editedDetails.loan_amount_required).toLocaleString()}` : '-'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Tenure Required</p>
                      {isEditingDetails ? (
                        <Input
                          type="number"
                          value={editedDetails.tenure_required || ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, tenure_required: e.target.value })}
                          className="h-9 bg-white"
                          placeholder="Years"
                        />
                      ) : (
                        <p className="font-medium">{editedDetails.tenure_required ? `${editedDetails.tenure_required} years` : '-'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Source Info - Not editable */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="font-medium capitalize">{lead.source || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Current Status</p>
                      <span className={`text-sm px-2 py-1 rounded-full capitalize ${
                        lead.status === 'disbursed' ? 'bg-green-100 text-green-800' :
                        lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        lead.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{(lead.status || 'new').replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Created</p>
                      <p className="font-medium">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eligibility Tracking */}
            <Card data-testid="eligibility-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Bank Eligibilities ({eligibilities.length}/7)
                </CardTitle>
                {canEdit && (
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
                        {canEdit && (
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
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Bank Name</p>
                            {canEdit ? (
                              <Input value={elig.bank_name || ''} onChange={(e) => updateEligibility(index, 'bank_name', e.target.value)} className="h-9 bg-white" placeholder="Enter bank name" />
                            ) : (
                              <p className="font-medium">{elig.bank_name || '-'}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Eligible?</p>
                            {canEdit ? (
                              <Select value={elig.is_eligible || undefined} onValueChange={(v) => updateEligibility(index, 'is_eligible', v)}>
                                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Yes - Eligible</SelectItem>
                                  <SelectItem value="no">No - Not Eligible</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className={`font-medium ${elig.is_eligible === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                                {elig.is_eligible === 'yes' ? 'Eligible' : elig.is_eligible === 'no' ? 'Not Eligible' : '-'}
                              </p>
                            )}
                          </div>
                          
                          {elig.is_eligible === 'yes' && (
                            <>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Eligible Amount (₹)</p>
                                {canEdit ? (
                                  <Input type="number" value={elig.eligible_amount || ''} onChange={(e) => updateEligibility(index, 'eligible_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" />
                                ) : (
                                  <p className="font-medium">{elig.eligible_amount ? `₹${Number(elig.eligible_amount).toLocaleString()}` : '-'}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Eligible Tenure (months)</p>
                                {canEdit ? (
                                  <Input type="number" value={elig.eligible_tenure || ''} onChange={(e) => updateEligibility(index, 'eligible_tenure', e.target.value)} className="h-9 bg-white" placeholder="Months" />
                                ) : (
                                  <p className="font-medium">{elig.eligible_tenure || '-'}</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Login Status */}
                        {elig.is_eligible === 'yes' && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Login Status</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Login Done?</p>
                                {canEdit ? (
                                  <Select value={elig.login_done || undefined} onValueChange={(v) => updateEligibility(index, 'login_done', v)}>
                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className="font-medium">{elig.login_done === 'yes' ? 'Yes' : elig.login_done === 'no' ? 'No' : '-'}</p>
                                )}
                              </div>
                              {elig.login_done === 'yes' && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Login Bank</p>
                                  {canEdit ? (
                                    <Input value={elig.login_bank || ''} onChange={(e) => updateEligibility(index, 'login_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank name" />
                                  ) : (
                                    <p className="font-medium">{elig.login_bank || '-'}</p>
                                  )}
                                </div>
                              )}
                              {elig.login_done === 'no' && (
                                <div className="col-span-2">
                                  <p className="text-xs text-slate-500 mb-1">Rejection Reason</p>
                                  {canEdit ? (
                                    <Input value={elig.login_rejection_reason || ''} onChange={(e) => updateEligibility(index, 'login_rejection_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" />
                                  ) : (
                                    <p className="font-medium">{elig.login_rejection_reason || '-'}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Approval Status */}
                        {elig.login_done === 'yes' && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Approval Status</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Approval</p>
                                {canEdit ? (
                                  <Select value={elig.approval_status || undefined} onValueChange={(v) => updateEligibility(index, 'approval_status', v)}>
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
                                  <div><p className="text-xs text-slate-500 mb-1">Approved Bank</p>{canEdit ? <Input value={elig.approved_bank || ''} onChange={(e) => updateEligibility(index, 'approved_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.approved_bank || '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">Approved Amount</p>{canEdit ? <Input type="number" value={elig.approved_amount || ''} onChange={(e) => updateEligibility(index, 'approved_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" /> : <p className="font-medium">{elig.approved_amount ? `₹${Number(elig.approved_amount).toLocaleString()}` : '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">Tenure (months)</p>{canEdit ? <Input type="number" value={elig.approved_tenure || ''} onChange={(e) => updateEligibility(index, 'approved_tenure', e.target.value)} className="h-9 bg-white" placeholder="Months" /> : <p className="font-medium">{elig.approved_tenure || '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">ROI (%)</p>{canEdit ? <Input type="number" step="0.01" value={elig.approved_roi || ''} onChange={(e) => updateEligibility(index, 'approved_roi', e.target.value)} className="h-9 bg-white" placeholder="%" /> : <p className="font-medium">{elig.approved_roi ? `${elig.approved_roi}%` : '-'}</p>}</div>
                                </>
                              )}
                              {elig.approval_status === 'declined' && (
                                <>
                                  <div><p className="text-xs text-slate-500 mb-1">Declined Bank</p>{canEdit ? <Input value={elig.declined_bank || ''} onChange={(e) => updateEligibility(index, 'declined_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.declined_bank || '-'}</p>}</div>
                                  <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Decline Reason</p>{canEdit ? <Input value={elig.declined_reason || ''} onChange={(e) => updateEligibility(index, 'declined_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" /> : <p className="font-medium">{elig.declined_reason || '-'}</p>}</div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Disbursement Status */}
                        {elig.approval_status === 'approved' && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Disbursement Status</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Disbursed?</p>
                                {canEdit ? (
                                  <Select value={elig.disbursed || undefined} onValueChange={(v) => updateEligibility(index, 'disbursed', v)}>
                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className={`font-medium ${elig.disbursed === 'yes' ? 'text-green-600' : ''}`}>{elig.disbursed === 'yes' ? 'Yes' : elig.disbursed === 'no' ? 'No' : '-'}</p>
                                )}
                              </div>
                              {elig.disbursed === 'yes' && (
                                <>
                                  <div><p className="text-xs text-slate-500 mb-1">Disbursed Bank</p>{canEdit ? <Input value={elig.disbursed_bank || ''} onChange={(e) => updateEligibility(index, 'disbursed_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.disbursed_bank || '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">Disbursed Amount</p>{canEdit ? <Input type="number" value={elig.disbursed_amount || ''} onChange={(e) => updateEligibility(index, 'disbursed_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" /> : <p className="font-medium">{elig.disbursed_amount ? `₹${Number(elig.disbursed_amount).toLocaleString()}` : '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">Tenure (months)</p>{canEdit ? <Input type="number" value={elig.disbursed_tenure || ''} onChange={(e) => updateEligibility(index, 'disbursed_tenure', e.target.value)} className="h-9 bg-white" placeholder="Months" /> : <p className="font-medium">{elig.disbursed_tenure || '-'}</p>}</div>
                                  <div><p className="text-xs text-slate-500 mb-1">ROI (%)</p>{canEdit ? <Input type="number" step="0.01" value={elig.disbursed_roi || ''} onChange={(e) => updateEligibility(index, 'disbursed_roi', e.target.value)} className="h-9 bg-white" placeholder="%" /> : <p className="font-medium">{elig.disbursed_roi ? `${elig.disbursed_roi}%` : '-'}</p>}</div>
                                </>
                              )}
                              {elig.disbursed === 'no' && (
                                <div className="col-span-3"><p className="text-xs text-slate-500 mb-1">Rejection Reason</p>{canEdit ? <Input value={elig.disbursement_rejection_reason || ''} onChange={(e) => updateEligibility(index, 'disbursement_rejection_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" /> : <p className="font-medium">{elig.disbursement_rejection_reason || '-'}</p>}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {canEdit && eligibilities.length > 0 && (
                  <Button onClick={saveEligibilities} className="w-full mt-4 bg-primary text-primary-foreground" disabled={savingEligibilities}>
                    {savingEligibilities ? 'Saving...' : 'Save All Eligibilities'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Status Update - Only for Admin/Ops */}
            {canEdit && (
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
            {canEdit && (
              <Card data-testid="assign-lead-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" />Assign Lead</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Select value={selectedAssignee || undefined} onValueChange={setSelectedAssignee}>
                      <SelectTrigger className="h-12 flex-1"><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {opsTeam.length > 0 ? opsTeam.map((member) => (
                          <SelectItem key={member.id} value={member.id}>{member.full_name} ({member.email})</SelectItem>
                        )) : <SelectItem value="none" disabled>No operations team members</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAssignLead} disabled={!selectedAssignee || selectedAssignee === lead.assigned_to} className="bg-primary text-primary-foreground">Assign</Button>
                  </div>
                  {lead.assigned_to && <p className="text-sm text-slate-500 mt-2">Currently assigned to: <span className="font-medium">{opsTeam.find(m => m.id === lead.assigned_to)?.full_name || 'Unknown'}</span></p>}
                </CardContent>
              </Card>
            )}

            {/* Notes - Only for Admin/Ops */}
            {canEdit && (
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
                  {canEdit && (
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
                  {(!lead.documents || lead.documents.length === 0) && !canEdit && (
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
