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
import { ArrowLeft, FileText, Upload, UserCheck } from 'lucide-react';

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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    } catch (error) {
      toast.error('Failed to load lead details');
      navigate('/crm');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading lead details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
        <Button
          onClick={() => navigate('/crm')}
          variant="ghost"
          size="sm"
          data-testid="back-to-crm-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to CRM
        </Button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Lead Details</h1>
      </nav>

      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card data-testid="lead-info-card">
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600">Full Name</Label>
                    <p className="font-semibold">{lead.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Mobile</Label>
                    <p className="font-semibold">{lead.mobile}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">City</Label>
                    <p className="font-semibold">{lead.city}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Employment Type</Label>
                    <p className="font-semibold capitalize">{lead.employment_type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Requirement</Label>
                    <p className="font-semibold capitalize">{lead.requirement?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Source</Label>
                    <p className="font-semibold capitalize">{lead.source}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="status-update-card">
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-12 flex-1" data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={newStatus === lead.status}
                    className="bg-primary text-primary-foreground"
                    data-testid="update-status-btn"
                  >
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="add-note-card">
              <CardHeader>
                <CardTitle>Add Note</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your note here..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="bg-slate-50 border-slate-200"
                    data-testid="note-textarea"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!note.trim()}
                    className="bg-primary text-primary-foreground"
                    data-testid="add-note-btn"
                  >
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card data-testid="documents-card">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600">Click to upload document</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      data-testid="file-upload-input"
                    />
                  </label>

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
                </div>
              </CardContent>
            </Card>

            <Card data-testid="activity-log-card">
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lead.activities && lead.activities.length > 0 ? (
                    lead.activities.reverse().map((activity, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-3 pb-3">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {activity.by_name || 'System'} • {new Date(activity.timestamp).toLocaleString()}
                        </p>
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