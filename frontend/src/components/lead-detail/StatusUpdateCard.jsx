import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUSES } from '@/utils/constants';

const StatusUpdateCard = ({ 
  currentStatus, 
  newStatus, 
  onStatusChange, 
  onUpdate,
  applicationId,
  onApplicationIdChange
}) => {
  // Check if login-related status is selected
  const showApplicationId = ['login', 'sent_for_login', 'sent_for_approval', 'underwriting', 'fi', 'query_hold', 'approved', 'disbursed'].includes(newStatus);

  return (
    <Card data-testid="status-update-card">
      <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
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
          {showApplicationId && (
            <div>
              <label className="text-sm text-slate-600 block mb-1">Application ID (Optional)</label>
              <Input
                placeholder="Enter bank application ID"
                value={applicationId || ''}
                onChange={(e) => onApplicationIdChange?.(e.target.value)}
                className="h-10"
                data-testid="application-id-input"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusUpdateCard;
