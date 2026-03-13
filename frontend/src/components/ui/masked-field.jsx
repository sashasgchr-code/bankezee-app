import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { maskMobile, maskEmail, canUnmask } from '@/utils/masking';

/**
 * MaskedField component - displays masked data with optional unmask toggle
 * @param {string} value - The actual value to display/mask
 * @param {string} type - Type of data: 'mobile' or 'email'
 * @param {string} className - Additional CSS classes
 * @param {boolean} showToggle - Whether to show the toggle button (respects role permissions)
 */
export const MaskedField = ({ value, type = 'mobile', className = '', showToggle = true }) => {
  const [isUnmasked, setIsUnmasked] = useState(false);
  const allowUnmask = canUnmask();

  if (!value) return <span className={className}>-</span>;

  const maskedValue = type === 'email' ? maskEmail(value) : maskMobile(value);
  const displayValue = (isUnmasked && allowUnmask) ? value : maskedValue;

  // If user can't unmask, just show masked value without toggle
  if (!allowUnmask || !showToggle) {
    return <span className={className}>{maskedValue}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{displayValue}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-slate-100"
        onClick={(e) => {
          e.stopPropagation();
          setIsUnmasked(!isUnmasked);
        }}
        title={isUnmasked ? 'Hide' : 'Show'}
        data-testid={`unmask-${type}-btn`}
      >
        {isUnmasked ? (
          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-slate-500" />
        )}
      </Button>
    </span>
  );
};

/**
 * MaskedText - Simple inline masked text without toggle button
 * Use this for places where you just want masked display
 */
export const MaskedText = ({ value, type = 'mobile', className = '' }) => {
  if (!value) return <span className={className}>-</span>;
  const maskedValue = type === 'email' ? maskEmail(value) : maskMobile(value);
  return <span className={className}>{maskedValue}</span>;
};

export default MaskedField;
