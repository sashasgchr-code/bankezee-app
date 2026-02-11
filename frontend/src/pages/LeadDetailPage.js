import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Edit2 } from 'lucide-react';

import {
  CustomerDetailsSection,
  EmploymentDetailsSection,
  ExistingLoansSection,
  LoanRequirementsSection,
  LeadSourceSection,
  EligibilityTracker,
  StatusUpdateCard,
  LeadAssignmentCard,
  ActivityLog
} from '@/components/lead-detail';

const EMPTY_ELIGIBILITY = {
  bank_name: '',
  is_eligible: '',
  eligible_amount: '',
  eligible_roi: '',
  not_eligible_reason: '',
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
  disbursement_rejection_reason: '',
  commission_percentage: '',
  commission_amount: ''
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
  const [sourceInfo, setSourceInfo] = useState(null);
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
      
      if (!leadData) {
        toast.error('Lead not found');
        navigate(-1);
        return;
      }
      
      setLead(leadData);
      setNewStatus(leadData.status || 'new');
      setSelectedAssignee(leadData.assigned_to || '');
      
      // Fetch source agent/partner info if available
      if (leadData.source_id && ['admin', 'operations'].includes(user.role)) {
        fetchSourceInfo(leadData.source, leadData.source_id);
      }
      
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
      
      // Convert eligibilities to form format
      const formattedElig = (leadData.eligibilities || []).map(e => ({
        ...e,
        is_eligible: e.is_eligible === true ? 'yes' : e.is_eligible === false ? 'no' : '',
        login_done: e.login_done === true ? 'yes' : e.login_done === false ? 'no' : '',
        disbursed: e.disbursed === true ? 'yes' : e.disbursed === false ? 'no' : '',
        eligible_amount: e.eligible_amount || '',
        eligible_roi: e.eligible_roi || '',
        not_eligible_reason: e.not_eligible_reason || '',
        approved_amount: e.approved_amount || '',
        approved_tenure: e.approved_tenure || '',
        approved_roi: e.approved_roi || '',
        disbursed_amount: e.disbursed_amount || '',
        disbursed_tenure: e.disbursed_tenure || '',
        disbursed_roi: e.disbursed_roi || '',
      }));
      setEligibilities(formattedElig);
    } catch (error) {
      console.error('Failed to load lead:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view this lead');
      } else if (error.response?.status === 404) {
        toast.error('Lead not found');
      } else {
        toast.error('Failed to load lead details');
      }
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

  const fetchSourceInfo = async (sourceType, sourceId) => {
    try {
      if (sourceType === 'agent') {
        const response = await api.get(`/agents/${sourceId}`);
        setSourceInfo({ type: 'Agent', ...response.data });
      } else if (sourceType === 'partner' || sourceType === 'retail_qr') {
        const response = await api.get(`/partners/${sourceId}`);
        setSourceInfo({ type: 'Partner', ...response.data });
      }
    } catch (error) {
      console.error('Failed to fetch source info:', error);
      setSourceInfo({ type: sourceType === 'agent' ? 'Agent' : 'Partner', id: sourceId });
    }
  };

  const handleDetailChange = (field, value) => {
    setEditedDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.put(`/crm/${leadId}/details`, {
        full_name: editedDetails.full_name,
        mobile: editedDetails.mobile,
        email: editedDetails.email,
        city: editedDetails.city,
        employment_type: editedDetails.employment_type,
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
      });
      toast.success('Details saved successfully');
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

  const handleAssignment = async () => {
    try {
      await api.put(`/crm/${leadId}/assign`, { assigned_to: selectedAssignee });
      toast.success('Lead assigned successfully');
      fetchLead();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await api.post(`/crm/${leadId}/notes`, { note: note });
      toast.success('Note added');
      setNote('');
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add note');
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    toast.info('Document upload coming soon - Google Drive integration required');
    setUploading(false);
  };

  // Eligibility handlers
  const addEligibility = () => {
    if (eligibilities.length >= 7) return;
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
        not_eligible_reason: e.not_eligible_reason || null,
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
        disbursement_rejection_reason: e.disbursement_rejection_reason || null,
        commission_percentage: e.commission_percentage ? parseFloat(e.commission_percentage) : null,
        commission_amount: e.commission_percentage && e.disbursed_amount 
          ? parseFloat(((parseFloat(e.disbursed_amount) * parseFloat(e.commission_percentage)) / 100).toFixed(2)) 
          : null
      }));
      const response = await api.put(`/crm/${leadId}/eligibilities`, { eligibilities: formattedEligibilities });
      if (response.data.commission_credited > 0) {
        toast.success(`Eligibilities saved! Commission of ₹${response.data.commission_credited.toLocaleString()} credited.`);
      } else {
        toast.success('Eligibilities saved successfully');
      }
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

  if (!lead) return null;

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
                <CustomerDetailsSection
                  details={editedDetails}
                  isEditing={isEditingDetails}
                  onDetailChange={handleDetailChange}
                />
                <EmploymentDetailsSection
                  details={editedDetails}
                  isEditing={isEditingDetails}
                  onDetailChange={handleDetailChange}
                />
                <ExistingLoansSection
                  details={editedDetails}
                  isEditing={isEditingDetails}
                  onDetailChange={handleDetailChange}
                />
                <LoanRequirementsSection
                  details={editedDetails}
                  isEditing={isEditingDetails}
                  onDetailChange={handleDetailChange}
                />
                <LeadSourceSection
                  lead={lead}
                  sourceInfo={sourceInfo}
                  canEdit={canEdit}
                />
              </CardContent>
            </Card>

            {/* Eligibility Tracker */}
            <EligibilityTracker
              eligibilities={eligibilities}
              canEdit={canEdit}
              onUpdate={updateEligibility}
              onAdd={addEligibility}
              onRemove={removeEligibility}
              onSave={saveEligibilities}
              isSaving={savingEligibilities}
            />

            {/* Status Update - Only for Admin/Ops */}
            {canEdit && (
              <StatusUpdateCard
                currentStatus={lead.status}
                newStatus={newStatus}
                onStatusChange={setNewStatus}
                onUpdate={handleStatusUpdate}
              />
            )}

            {/* Assign Lead - Only for Admin/Ops */}
            {canEdit && (
              <LeadAssignmentCard
                opsTeam={opsTeam}
                selectedAssignee={selectedAssignee}
                currentAssignee={lead.assigned_to}
                onAssigneeChange={setSelectedAssignee}
                onAssign={handleAssignment}
              />
            )}
          </div>

          {/* Sidebar */}
          <div>
            <ActivityLog
              activities={lead.activities || []}
              documents={lead.documents || []}
              note={note}
              onNoteChange={setNote}
              onAddNote={handleAddNote}
              leadId={leadId}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage;
