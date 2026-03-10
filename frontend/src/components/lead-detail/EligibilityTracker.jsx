import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';
import BankEligibilityCard from './BankEligibilityCard';

const EligibilityTracker = ({ 
  eligibilities, 
  canEdit, 
  onUpdate, 
  onAdd, 
  onRemove, 
  onSave,
  isSaving,
  showSmFields = false  // Only for Admin/Ops
}) => {
  return (
    <Card data-testid="eligibility-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Bank Eligibilities ({eligibilities.length}/7)
        </CardTitle>
        {canEdit && (
          <Button onClick={onAdd} variant="outline" size="sm" disabled={eligibilities.length >= 7}>
            <Plus className="w-4 h-4 mr-1" /> Add Bank
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {eligibilities.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No eligibility records yet</p>
        ) : (
          <div className="space-y-6">
            {eligibilities.map((elig, index) => (
              <BankEligibilityCard
                key={index}
                eligibility={elig}
                index={index}
                canEdit={canEdit}
                onUpdate={onUpdate}
                onRemove={onRemove}
                showSmFields={showSmFields}
              />
            ))}
          </div>
        )}
        {canEdit && eligibilities.length > 0 && (
          <Button onClick={onSave} className="w-full mt-4 bg-primary text-primary-foreground" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save All Eligibilities'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EligibilityTracker;
