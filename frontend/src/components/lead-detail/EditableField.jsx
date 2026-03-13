import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaskedField } from '@/components/ui/masked-field';

export const EditableField = ({ 
  label, 
  value, 
  onChange, 
  isEditing, 
  type = 'text',
  placeholder = '',
  className = '',
  colSpan = 1,
  masked = false,  // New prop to enable masking
  maskType = 'mobile'  // 'mobile' or 'email'
}) => {
  const colSpanClass = colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : '';
  
  return (
    <div className={colSpanClass}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {isEditing ? (
        <Input 
          type={type}
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          className={`h-9 bg-white ${className}`}
          placeholder={placeholder}
        />
      ) : masked ? (
        <MaskedField value={value} type={maskType} className="font-medium" />
      ) : (
        <p className="font-medium">{value || '-'}</p>
      )}
    </div>
  );
};

export const EditableSelect = ({ 
  label, 
  value, 
  onChange, 
  isEditing, 
  options,
  placeholder = 'Select',
  displayValue
}) => {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {isEditing ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-9 bg-white">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="font-medium">{displayValue || value || '-'}</p>
      )}
    </div>
  );
};

export default EditableField;
