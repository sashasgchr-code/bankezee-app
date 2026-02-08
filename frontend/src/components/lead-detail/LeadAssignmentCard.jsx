import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck } from 'lucide-react';

const LeadAssignmentCard = ({ 
  opsTeam, 
  selectedAssignee, 
  currentAssignee,
  onAssigneeChange, 
  onAssign 
}) => {
  const assignedUser = opsTeam.find(o => o.id === currentAssignee);
  
  return (
    <Card data-testid="assign-lead-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          Assign Lead
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Select value={selectedAssignee || undefined} onValueChange={onAssigneeChange}>
            <SelectTrigger className="h-12 flex-1">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {opsTeam.map((member) => (
                <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={onAssign} 
            disabled={!selectedAssignee || selectedAssignee === currentAssignee}
            className="bg-primary text-primary-foreground"
          >
            Assign
          </Button>
        </div>
        {assignedUser && (
          <p className="text-sm text-slate-600 mt-2">
            Currently assigned to: <span className="font-medium text-primary">{assignedUser.full_name}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentCard;
