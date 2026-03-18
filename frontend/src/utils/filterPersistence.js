/**
 * Filter persistence utility
 * Saves and loads filter settings per user to localStorage
 */

const FILTER_STORAGE_KEY = 'bankezee_filters';

/**
 * Get the current user's ID from localStorage
 */
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

/**
 * Get the storage key for the current user's filters
 */
const getStorageKey = (dashboardName) => {
  const userId = getCurrentUserId();
  return `${FILTER_STORAGE_KEY}_${dashboardName}_${userId}`;
};

/**
 * Save filters to localStorage for the current user
 * @param {string} dashboardName - Name of the dashboard (e.g., 'admin', 'operations')
 * @param {object} filters - Object containing filter values
 */
export const saveFilters = (dashboardName, filters) => {
  try {
    const key = getStorageKey(dashboardName);
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (error) {
    console.error('Error saving filters:', error);
  }
};

/**
 * Load filters from localStorage for the current user
 * @param {string} dashboardName - Name of the dashboard
 * @param {object} defaultFilters - Default filter values to use if none saved
 * @returns {object} Saved filters or defaults
 */
export const loadFilters = (dashboardName, defaultFilters = {}) => {
  try {
    const key = getStorageKey(dashboardName);
    const saved = localStorage.getItem(key);
    if (saved) {
      return { ...defaultFilters, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading filters:', error);
  }
  return defaultFilters;
};

/**
 * Clear filters for the current user on a specific dashboard
 * @param {string} dashboardName - Name of the dashboard
 */
export const clearFilters = (dashboardName) => {
  try {
    const key = getStorageKey(dashboardName);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing filters:', error);
  }
};

/**
 * Clear all filters for the current user (call on logout)
 */
export const clearAllUserFilters = () => {
  try {
    const userId = getCurrentUserId();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(FILTER_STORAGE_KEY) && key.includes(userId)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all filters:', error);
  }
};

/**
 * Default filter values for Admin Dashboard
 */
export const ADMIN_DEFAULT_FILTERS = {
  timeFilter: 'all',
  loanTypeFilter: 'all',
  statusFilter: 'all',
  sourceFilter: 'all',
  sourceIdFilter: 'all',
  managerFilter: 'all',
  activityTimeFilter: 'all',
  filterFromDate: '',
  filterToDate: '',
  activityFromDate: '',
  activityToDate: ''
};

/**
 * Default filter values for Operations Dashboard
 */
export const OPS_DEFAULT_FILTERS = {
  timeFilter: 'all',
  loanTypeFilter: 'all',
  statusFilter: 'all',
  sourceFilter: 'all',
  activityTimeFilter: 'all',
  filterFromDate: '',
  filterToDate: '',
  activityFromDate: '',
  activityToDate: ''
};
