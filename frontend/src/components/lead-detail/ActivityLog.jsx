import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Download, Trash2, FolderDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { toast } from 'sonner';

const ActivityLog = ({ 
  activities = [], 
  documents = [],
  note,
  onNoteChange,
  onAddNote,
  leadId,
  canEdit,
  onDocumentsChange,
  additionalData = {}
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Sync documents from props when they change (e.g., on page load)
  useEffect(() => {
    setUploadedFiles(documents || []);
  }, [documents]);

  // Generate download URL for a document with auth token
  const getDownloadUrl = (doc) => {
    const token = localStorage.getItem('token');
    if (doc.file_path) {
      return `${process.env.REACT_APP_BACKEND_URL}/api/storage/download/${doc.file_path}?token=${token}`;
    }
    return doc.download_url || '#';
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    const successfulUploads = [];
    const failedUploads = [];
    
    try {
      // Upload files sequentially to avoid server overload
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('lead_id', leadId || '');
          formData.append('document_type', 'general');
          
          const response = await api.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          successfulUploads.push(response.data);
        } catch (error) {
          failedUploads.push(file.name);
        }
      }
      
      if (successfulUploads.length > 0) {
        const newDocs = [...uploadedFiles, ...successfulUploads];
        setUploadedFiles(newDocs);
        if (onDocumentsChange) onDocumentsChange(newDocs);
        toast.success(`${successfulUploads.length} document(s) uploaded successfully`);
      }
      
      if (failedUploads.length > 0) {
        toast.error(`Failed to upload: ${failedUploads.join(', ')}`);
      }
    } catch (error) {
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filePath) => {
    try {
      await api.delete(`/storage/files/${filePath}`);
      toast.success('Document deleted');
      const newDocs = uploadedFiles.filter(f => f.file_path !== filePath);
      setUploadedFiles(newDocs);
      if (onDocumentsChange) onDocumentsChange(newDocs);
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Documents */}
      <Card data-testid="documents-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents ({uploadedFiles.length})
            </CardTitle>
            {uploadedFiles.length > 0 && (
              <a
                href={`${api.defaults.baseURL}/storage/download-all/${leadId}?token=${localStorage.getItem('token')}`}
                download
              >
                <Button variant="outline" size="sm" className="h-7 text-xs" data-testid="download-all-docs">
                  <FolderDown className="w-3.5 h-3.5 mr-1" /> Download All ZIP
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {additionalData.has_password_files === 'yes' && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm" data-testid="password-info">
              <span className="font-semibold text-amber-700">Password Protected Files:</span>{' '}
              <span className="text-amber-800">{additionalData.file_passwords || 'No passwords provided'}</span>
            </div>
          )}
          {uploadedFiles.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((doc, idx) => (
                <div key={doc.file_id || idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.original_name || doc.file_name}</p>
                    <p className="text-xs text-slate-500">{doc.document_type} • {((doc.size || 0) / 1024).toFixed(1)}KB</p>
                  </div>
                  <div className="flex gap-1">
                    <a href={getDownloadUrl(doc)} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(doc.file_path)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <div className="mt-4">
              <input 
                type="file" 
                className="hidden" 
                id="doc-upload"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                onChange={handleUpload}
                multiple
              />
              <label htmlFor="doc-upload">
                <Button variant="outline" className="w-full cursor-pointer" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Documents'}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-slate-500 mt-2 text-center">PDF, Images, DOC, XLS (max 10MB each) - Select multiple files</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card data-testid="activity-log-card">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit && (
            <div className="mb-4 space-y-2">
              <Textarea 
                placeholder="Add a note..."
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                className="min-h-20"
              />
              <Button 
                onClick={onAddNote} 
                disabled={!note.trim()}
                className="w-full bg-primary text-primary-foreground"
              >
                Add Note
              </Button>
            </div>
          )}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No activity yet</p>
            ) : (
              activities.map((activity, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-3 py-2">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-slate-500">
                    {activity.by_name || 'System'} • {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'N/A'}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
