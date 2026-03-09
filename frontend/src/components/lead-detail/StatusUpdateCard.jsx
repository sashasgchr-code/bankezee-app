import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LEAD_STATUSES } from '@/utils/constants';

const StatusUpdateCard = ({ 
  currentStatus, 
  newStatus, 
  onStatusChange, 
  onUpdate,
  pendingDocuments,
  onPendingDocumentsChange
}) => {
  return (
    <Card data-testid="status-update-card">
      <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={newStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-12 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={onUpdate} 
            disabled={newStatus === currentStatus || (newStatus === 'documents_pending' && !pendingDocuments?.trim())} 
            className="bg-primary text-primary-foreground"
          >
            Update Status
          </Button>
        </div>
        
        {/* Show pending documents input when Documents Pending is selected */}
        {newStatus === 'documents_pending' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <Label className="text-amber-800 font-semibold">
              📄 List of Documents Pending *
            </Label>
            <Textarea
              value={pendingDocuments || ''}
              onChange={(e) => onPendingDocumentsChange?.(e.target.value)}
              placeholder="Enter the list of pending documents (e.g., Aadhaar Copy, PAN Card, Last 3 months Bank Statements...)"
              className="min-h-[100px] bg-white"
              data-testid="pending-documents-input"
            />
            <p className="text-xs text-amber-600">Enter each document on a new line or separated by commas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusUpdateCard;
