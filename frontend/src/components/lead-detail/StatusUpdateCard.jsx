import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'documents_collected', label: 'Documents Collected' },
  { value: 'not_eligible', label: 'Not Eligible' },
  { value: 'sent_to_bank', label: 'Sent to Bank' },
  { value: 'login', label: 'Login' },
  { value: 'not_login', label: 'Not Login' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'not_disbursed', label: 'Not Disbursed' },
  { value: 'rejected', label: 'Rejected' }
];

const StatusUpdateCard = ({ 
  currentStatus, 
  newStatus, 
  onStatusChange, 
  onUpdate 
}) => {
  return (
    <Card data-testid="status-update-card">
      <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Select value={newStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-12 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={onUpdate} 
            disabled={newStatus === currentStatus} 
            className="bg-primary text-primary-foreground"
          >
            Update Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusUpdateCard;
