import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const BankEligibilityCard = ({ 
  eligibility, 
  index, 
  canEdit, 
  onUpdate, 
  onRemove 
}) => {
  const elig = eligibility;
  
  const updateField = (field, value) => {
    onUpdate(index, field, value);
  };

  return (
    <div className="border rounded-lg p-4 bg-slate-50 relative">
      {canEdit && (
        <Button 
          onClick={() => onRemove(index)} 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
      <h5 className="font-semibold text-primary mb-3">Bank #{index + 1}</h5>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Bank Name */}
        <div>
          <p className="text-xs text-slate-500 mb-1">Bank Name</p>
          {canEdit ? (
            <Input value={elig.bank_name || ''} onChange={(e) => updateField('bank_name', e.target.value)} className="h-9 bg-white" placeholder="Enter bank name" />
          ) : (
            <p className="font-medium">{elig.bank_name || '-'}</p>
          )}
        </div>

        {/* Eligible? */}
        <div>
          <p className="text-xs text-slate-500 mb-1">Eligible?</p>
          {canEdit ? (
            <Select value={elig.is_eligible || undefined} onValueChange={(v) => updateField('is_eligible', v)}>
              <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Eligible</SelectItem>
                <SelectItem value="no">No - Not Eligible</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className={`font-medium ${elig.is_eligible === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
              {elig.is_eligible === 'yes' ? 'Eligible' : elig.is_eligible === 'no' ? 'Not Eligible' : '-'}
            </p>
          )}
        </div>
        
        {/* If Eligible */}
        {elig.is_eligible === 'yes' && (
          <>
            <div>
              <p className="text-xs text-slate-500 mb-1">Eligible Amount (₹)</p>
              {canEdit ? (
                <Input type="number" value={elig.eligible_amount || ''} onChange={(e) => updateField('eligible_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" />
              ) : (
                <p className="font-medium">{elig.eligible_amount ? `₹${Number(elig.eligible_amount).toLocaleString()}` : '-'}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">ROI (%)</p>
              {canEdit ? (
                <Input type="number" step="0.01" value={elig.eligible_roi || ''} onChange={(e) => updateField('eligible_roi', e.target.value)} className="h-9 bg-white" placeholder="%" />
              ) : (
                <p className="font-medium">{elig.eligible_roi ? `${elig.eligible_roi}%` : '-'}</p>
              )}
            </div>
          </>
        )}
        
        {/* If Not Eligible */}
        {elig.is_eligible === 'no' && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-1">Not Eligible Reason</p>
            {canEdit ? (
              <Input value={elig.not_eligible_reason || ''} onChange={(e) => updateField('not_eligible_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" />
            ) : (
              <p className="font-medium">{elig.not_eligible_reason || '-'}</p>
            )}
          </div>
        )}
      </div>

      {/* Login Status Section */}
      {elig.is_eligible === 'yes' && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <p className="text-xs font-semibold text-slate-700 mb-2">Login Status</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Login Done?</p>
              {canEdit ? (
                <Select value={elig.login_done || undefined} onValueChange={(v) => updateField('login_done', v)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{elig.login_done === 'yes' ? 'Yes' : elig.login_done === 'no' ? 'No' : '-'}</p>
              )}
            </div>
            {elig.login_done === 'yes' && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Login Bank</p>
                {canEdit ? (
                  <Input value={elig.login_bank || ''} onChange={(e) => updateField('login_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank name" />
                ) : (
                  <p className="font-medium">{elig.login_bank || '-'}</p>
                )}
              </div>
            )}
            {elig.login_done === 'yes' && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Application ID</p>
                {canEdit ? (
                  <Input value={elig.application_id || ''} onChange={(e) => updateField('application_id', e.target.value)} className="h-9 bg-white" placeholder="Enter App ID" />
                ) : (
                  <p className="font-medium">{elig.application_id || '-'}</p>
                )}
              </div>
            )}
            {elig.login_done === 'no' && (
              <div className="col-span-3">
                <p className="text-xs text-slate-500 mb-1">Login Rejection Reason</p>
                {canEdit ? (
                  <Input value={elig.login_rejection_reason || ''} onChange={(e) => updateField('login_rejection_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" />
                ) : (
                  <p className="font-medium">{elig.login_rejection_reason || '-'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Status Section */}
      {elig.login_done === 'yes' && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <p className="text-xs font-semibold text-slate-700 mb-2">Approval Status</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              {canEdit ? (
                <Select value={elig.approval_status || undefined} onValueChange={(v) => updateField('approval_status', v)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`font-medium ${elig.approval_status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                  {elig.approval_status === 'approved' ? 'Approved' : elig.approval_status === 'declined' ? 'Declined' : '-'}
                </p>
              )}
            </div>
            {elig.approval_status === 'approved' && (
              <>
                <div><p className="text-xs text-slate-500 mb-1">Approved Bank</p>{canEdit ? <Input value={elig.approved_bank || ''} onChange={(e) => updateField('approved_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.approved_bank || '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">Approved Amount (₹)</p>{canEdit ? <Input type="number" value={elig.approved_amount || ''} onChange={(e) => updateField('approved_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" /> : <p className="font-medium">{elig.approved_amount ? `₹${Number(elig.approved_amount).toLocaleString()}` : '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">Tenure (months)</p>{canEdit ? <Input type="number" value={elig.approved_tenure || ''} onChange={(e) => updateField('approved_tenure', e.target.value)} className="h-9 bg-white" placeholder="Months" /> : <p className="font-medium">{elig.approved_tenure || '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">ROI (%)</p>{canEdit ? <Input type="number" step="0.01" value={elig.approved_roi || ''} onChange={(e) => updateField('approved_roi', e.target.value)} className="h-9 bg-white" placeholder="%" /> : <p className="font-medium">{elig.approved_roi ? `${elig.approved_roi}%` : '-'}</p>}</div>
              </>
            )}
            {elig.approval_status === 'declined' && (
              <>
                <div><p className="text-xs text-slate-500 mb-1">Declined Bank</p>{canEdit ? <Input value={elig.declined_bank || ''} onChange={(e) => updateField('declined_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.declined_bank || '-'}</p>}</div>
                <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Decline Reason</p>{canEdit ? <Input value={elig.declined_reason || ''} onChange={(e) => updateField('declined_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" /> : <p className="font-medium">{elig.declined_reason || '-'}</p>}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Disbursement Section */}
      {elig.approval_status === 'approved' && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <p className="text-xs font-semibold text-slate-700 mb-2">Disbursement</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Disbursed?</p>
              {canEdit ? (
                <Select value={elig.disbursed || undefined} onValueChange={(v) => updateField('disbursed', v)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`font-medium ${elig.disbursed === 'yes' ? 'text-green-600' : ''}`}>{elig.disbursed === 'yes' ? 'Yes' : elig.disbursed === 'no' ? 'No' : '-'}</p>
              )}
            </div>
            {elig.disbursed === 'yes' && (
              <>
                <div><p className="text-xs text-slate-500 mb-1">Disbursed Bank</p>{canEdit ? <Input value={elig.disbursed_bank || ''} onChange={(e) => updateField('disbursed_bank', e.target.value)} className="h-9 bg-white" placeholder="Bank" /> : <p className="font-medium">{elig.disbursed_bank || '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">Disbursed Amount</p>{canEdit ? <Input type="number" value={elig.disbursed_amount || ''} onChange={(e) => updateField('disbursed_amount', e.target.value)} className="h-9 bg-white" placeholder="Amount" /> : <p className="font-medium">{elig.disbursed_amount ? `₹${Number(elig.disbursed_amount).toLocaleString()}` : '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">Tenure (months)</p>{canEdit ? <Input type="number" value={elig.disbursed_tenure || ''} onChange={(e) => updateField('disbursed_tenure', e.target.value)} className="h-9 bg-white" placeholder="Months" /> : <p className="font-medium">{elig.disbursed_tenure || '-'}</p>}</div>
                <div><p className="text-xs text-slate-500 mb-1">ROI (%)</p>{canEdit ? <Input type="number" step="0.01" value={elig.disbursed_roi || ''} onChange={(e) => updateField('disbursed_roi', e.target.value)} className="h-9 bg-white" placeholder="%" /> : <p className="font-medium">{elig.disbursed_roi ? `${elig.disbursed_roi}%` : '-'}</p>}</div>
                <div className="col-span-2 mt-2 pt-2 border-t border-dashed">
                  <p className="text-xs font-semibold text-primary mb-2">Commission (for Agent/Partner)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Commission %</p>
                      {canEdit ? (
                        <Input type="number" step="0.01" value={elig.commission_percentage || ''} onChange={(e) => updateField('commission_percentage', e.target.value)} className="h-9 bg-white" placeholder="e.g., 0.5" />
                      ) : (
                        <p className="font-medium">{elig.commission_percentage ? `${elig.commission_percentage}%` : '-'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Commission Amount</p>
                      <p className="font-medium text-green-600">
                        {elig.commission_percentage && elig.disbursed_amount 
                          ? `₹${((Number(elig.disbursed_amount) * Number(elig.commission_percentage)) / 100).toLocaleString(undefined, {maximumFractionDigits: 2})}` 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {elig.disbursed === 'no' && (
              <div className="col-span-3"><p className="text-xs text-slate-500 mb-1">Rejection Reason</p>{canEdit ? <Input value={elig.disbursement_rejection_reason || ''} onChange={(e) => updateField('disbursement_rejection_reason', e.target.value)} className="h-9 bg-white" placeholder="Reason" /> : <p className="font-medium">{elig.disbursement_rejection_reason || '-'}</p>}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankEligibilityCard;
