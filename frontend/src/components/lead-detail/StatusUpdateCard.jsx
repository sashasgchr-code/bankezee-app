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
  onPendingDocumentsChange,
  queryHoldReason,
  onQueryHoldReasonChange
}) => {
  const isQueryHoldStatus = newStatus === 'query_hold';
  const isDocsPendingStatus = newStatus === 'documents_pending';
  
  const isUpdateDisabled = 
    newStatus === currentStatus || 
    (isDocsPendingStatus && !pendingDocuments?.trim()) ||
    (isQueryHoldStatus && !queryHoldReason?.trim());

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
            disabled={isUpdateDisabled} 
            className="bg-primary text-primary-foreground"
          >
            Update Status
          </Button>
        </div>
        
        {/* Show pending documents input when Documents Pending is selected */}
        {isDocsPendingStatus && (
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

        {/* Show Query/Hold reason input when Query/Hold status is selected */}
        {isQueryHoldStatus && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
            <Label className="text-purple-800 font-semibold">
              ❓ Query/Hold Reason *
            </Label>
            <Textarea
              value={queryHoldReason || ''}
              onChange={(e) => onQueryHoldReasonChange?.(e.target.value)}
              placeholder="Enter the reason for query or hold (e.g., Awaiting customer response, Additional documents required, Verification pending...)"
              className="min-h-[100px] bg-white"
              data-testid="query-hold-reason-input"
            />
            <p className="text-xs text-purple-600">Please provide a clear reason for placing this lead on Query/Hold</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusUpdateCard;
