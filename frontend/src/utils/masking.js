/**
 * Utility functions for masking sensitive customer data
 * Only Admin and Operations roles can unmask data
 */

/**
 * Mask a mobile number - shows only last 4 digits
 * @param {string} mobile - The mobile number to mask
 * @returns {string} Masked mobile number (e.g., "******7890")
 */
export const maskMobile = (mobile) => {
  if (!mobile) return '-';
  const str = String(mobile).replace(/\s/g, '');
  if (str.length <= 4) return str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
};

/**
 * Mask an email address - shows first 2 chars and domain
 * @param {string} email - The email to mask
 * @returns {string} Masked email (e.g., "te****@example.com")
 */
export const maskEmail = (email) => {
  if (!email) return '-';
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  if (localPart.length <= 2) return `${localPart}****@${domain}`;
  return `${localPart.slice(0, 2)}****@${domain}`;
};

/**
 * Check if the current user can unmask sensitive data
 * @returns {boolean} True if user is Admin or Operations
 */
export const canUnmask = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return ['admin', 'operations'].includes(user.role);
  } catch {
    return false;
  }
};

/**
 * Get the current user's role
 * @returns {string} User role or empty string
 */
export const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || '';
  } catch {
    return '';
  }
};
