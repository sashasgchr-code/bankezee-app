import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const VehiclePreVerification = ({ tvrDone, emiOk, tvrReason, emiReason, canEdit, onUpdate, onSave, isSaving }) => {
  const isComplete = tvrDone === 'yes' && emiOk === 'yes';

  return (
    <Card className={`border-2 ${isComplete ? 'border-green-300 bg-green-50/30' : 'border-blue-300 bg-blue-50/30'}`} data-testid="vehicle-pre-verification">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600" />
          )}
          Vehicle Loan - Pre-Verification
          {isComplete && <span className="text-xs text-green-600 font-normal ml-2">(Verified)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* TVR Done */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">TVR Done?</p>
            {canEdit ? (
              <Select value={tvrDone || undefined} onValueChange={(v) => onUpdate('tvr_done', v)}>
                <SelectTrigger className="h-9 bg-white" data-testid="tvr-done-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className={`font-medium ${tvrDone === 'yes' ? 'text-green-600' : 'text-amber-600'}`}>
                {tvrDone === 'yes' ? 'Yes' : tvrDone === 'no' ? 'No' : '-'}
              </p>
            )}
          </div>
          {tvrDone === 'no' && (
            <div className="col-span-3">
              <p className="text-xs text-slate-500 mb-1 font-medium">TVR Not Done Reason</p>
              {canEdit ? (
                <Input value={tvrReason || ''} onChange={(e) => onUpdate('tvr_not_done_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason why TVR not done" data-testid="tvr-reason-input" />
              ) : (
                <p className="font-medium">{tvrReason || '-'}</p>
              )}
            </div>
          )}
          {/* EMI OK - Show after TVR */}
          {tvrDone === 'yes' && (
            <div>
              <p className="text-xs text-slate-500 mb-1 font-medium">EMI OK?</p>
              {canEdit ? (
                <Select value={emiOk || undefined} onValueChange={(v) => onUpdate('emi_ok', v)}>
                  <SelectTrigger className="h-9 bg-white" data-testid="emi-ok-select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`font-medium ${emiOk === 'yes' ? 'text-green-600' : 'text-amber-600'}`}>
                  {emiOk === 'yes' ? 'Yes' : emiOk === 'no' ? 'No' : '-'}
                </p>
              )}
            </div>
          )}
          {tvrDone === 'yes' && emiOk === 'no' && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1 font-medium">EMI Not OK Reason</p>
              {canEdit ? (
                <Input value={emiReason || ''} onChange={(e) => onUpdate('emi_not_ok_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason why EMI not OK" data-testid="emi-reason-input" />
              ) : (
                <p className="font-medium">{emiReason || '-'}</p>
              )}
            </div>
          )}
        </div>
        {canEdit && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onSave} disabled={isSaving} size="sm" data-testid="save-pre-verification-btn">
              {isSaving ? 'Saving...' : 'Save Pre-Verification'}
            </Button>
          </div>
        )}
        {!isComplete && (
          <p className="text-xs text-blue-600 mt-3 italic">
            Complete TVR and EMI verification to proceed with Bank Eligibilities.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default VehiclePreVerification;
