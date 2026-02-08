import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload } from 'lucide-react';

const ActivityLog = ({ 
  activities = [], 
  documents = [],
  note,
  onNoteChange,
  onAddNote,
  onUploadDocument,
  isUploading,
  canEdit
}) => {
  return (
    <div className="space-y-6">
      {/* Documents */}
      <Card data-testid="documents-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span className="text-sm">{doc.name}</span>
                  <Button variant="ghost" size="sm">View</Button>
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
                onChange={onUploadDocument}
              />
              <label htmlFor="doc-upload">
                <Button variant="outline" className="w-full cursor-pointer" disabled={isUploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                  </span>
                </Button>
              </label>
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
