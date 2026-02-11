import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUSES } from '@/utils/constants';

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
              {LEAD_STATUSES.map(opt => (
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
