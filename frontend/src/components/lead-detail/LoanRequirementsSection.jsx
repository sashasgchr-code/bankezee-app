import { EditableField, EditableSelect } from './EditableField';

const LOAN_TYPES = [
  { value: 'reduce_home_loan_emi', label: 'Reduce Home Loan EMI' },
  { value: 'merge_multiple_loans', label: 'Merge Multiple Loans' },
  { value: 'top_up_loan', label: 'Top-up Loan' },
  { value: 'new_personal_loan', label: 'New Personal Loan' },
  { value: 'new_home_loan', label: 'New Home Loan' },
  { value: 'business_loan', label: 'Business Loan' },
  { value: 'loan_against_property', label: 'Loan Against Property' },
  { value: 'car_loan', label: 'Car Loan' },
  { value: 'education_loan', label: 'Education Loan' },
  { value: 'other', label: 'Other' }
];

// Export for use in other components
export { LOAN_TYPES };

const LoanRequirementsSection = ({ 
  details, 
  isEditing, 
  onDetailChange 
}) => {
  return (
    <div className="pt-4 border-t">
      <h4 className="text-sm font-semibold text-primary mb-3">Loan Requirements</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EditableSelect
          label="Type of Loan"
          value={details.type_of_loan}
          onChange={(v) => onDetailChange('type_of_loan', v)}
          isEditing={isEditing}
          options={LOAN_TYPES}
          displayValue={LOAN_TYPES.find(t => t.value === details.type_of_loan)?.label || details.type_of_loan}
        />
        <EditableField
          label="CIBIL Score"
          value={details.cibil_score}
          onChange={(v) => onDetailChange('cibil_score', v)}
          isEditing={isEditing}
          type="number"
        />
        <EditableField
          label="Loan Amount Required (₹)"
          value={details.loan_amount_required}
          onChange={(v) => onDetailChange('loan_amount_required', v)}
          isEditing={isEditing}
          type="number"
        />
        <EditableField
          label="Tenure Required (months)"
          value={details.tenure_required}
          onChange={(v) => onDetailChange('tenure_required', v)}
          isEditing={isEditing}
          type="number"
        />
      </div>
    </div>
  );
};

export default LoanRequirementsSection;
