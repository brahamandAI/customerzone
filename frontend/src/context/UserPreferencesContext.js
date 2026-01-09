import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import useAutoLogout from '../hooks/useAutoLogout';

const UserPreferencesContext = createContext();

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export const UserPreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [preferences, setPreferences] = useState({
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    autoLogout: 30,
    autoSaveDraft: true,
    showExpenseTips: true,
    budgetAlerts: true,
    approvalReminders: true
  });

  // Load preferences from user data
  useEffect(() => {
    if (user?.preferences) {
      setPreferences(prev => ({
        ...prev,
        currency: user.preferences.currency || 'INR',
        timezone: user.preferences.timezone || 'Asia/Kolkata',
        autoLogout: user.preferences.autoLogout || 30,
        autoSaveDraft: user.preferences.autoSaveDraft ?? true,
        showExpenseTips: user.preferences.showExpenseTips ?? true,
        budgetAlerts: user.preferences.notifications?.budgetAlerts ?? true,
        approvalReminders: user.preferences.notifications?.approvalReminders ?? true
      }));
    }
  }, [user]);

  // Auto-logout hook
  useAutoLogout(preferences.autoLogout);

  // Currency formatting
  const currencyConfig = {
    INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
    USD: { symbol: '$', code: 'USD', locale: 'en-US' },
    EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' }
  };

  const formatCurrency = useCallback((amount) => {
    const config = currencyConfig[preferences.currency] || currencyConfig.INR;
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount || 0);
    } catch (error) {
      // Fallback formatting
      return `${config.symbol}${(amount || 0).toLocaleString()}`;
    }
  }, [preferences.currency]);

  const getCurrencySymbol = useCallback(() => {
    return currencyConfig[preferences.currency]?.symbol || '₹';
  }, [preferences.currency]);

  // Date formatting with timezone
  const formatDate = useCallback((dateString, options = {}) => {
    if (!dateString) return '';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: preferences.timezone
    };

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    } catch (error) {
      return new Date(dateString).toLocaleDateString();
    }
  }, [preferences.timezone]);

  const formatDateTime = useCallback((dateString, options = {}) => {
    if (!dateString) return '';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: preferences.timezone
    };

    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', { ...defaultOptions, ...options });
    } catch (error) {
      return new Date(dateString).toLocaleString();
    }
  }, [preferences.timezone]);

  // Auto-save draft functions
  const saveDraft = useCallback((key, data) => {
    if (preferences.autoSaveDraft) {
      try {
        localStorage.setItem(`draft_${key}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
        console.log('📝 Draft auto-saved');
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
  }, [preferences.autoSaveDraft]);

  const loadDraft = useCallback((key) => {
    try {
      const draft = localStorage.getItem(`draft_${key}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        // Check if draft is less than 24 hours old
        const draftTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now - draftTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return parsed.data;
        } else {
          // Remove old draft
          localStorage.removeItem(`draft_${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, []);

  const clearDraft = useCallback((key) => {
    try {
      localStorage.removeItem(`draft_${key}`);
      console.log('📝 Draft cleared');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  // Expense tips
  const expenseTips = [
    "💡 Tip: Always attach receipts for faster approval and audit compliance.",
    "💡 Tip: Use clear descriptions to help approvers understand your expense.",
    "💡 Tip: Submit expenses within 7 days for quicker processing.",
    "💡 Tip: Group related expenses together when possible.",
    "💡 Tip: Double-check the category before submitting.",
    "💡 Tip: Select the correct site to ensure proper budget tracking.",
    "💡 Tip: Take photos of receipts immediately to avoid losing them.",
    "💡 Tip: Check your expense limits before making purchases."
  ];

  const getRandomTip = useCallback(() => {
    if (!preferences.showExpenseTips) return null;
    return expenseTips[Math.floor(Math.random() * expenseTips.length)];
  }, [preferences.showExpenseTips]);

  const value = {
    preferences,
    setPreferences,
    // Currency
    formatCurrency,
    getCurrencySymbol,
    // Date/Time
    formatDate,
    formatDateTime,
    // Drafts
    saveDraft,
    loadDraft,
    clearDraft,
    // Tips
    getRandomTip,
    showExpenseTips: preferences.showExpenseTips,
    // Notifications
    budgetAlerts: preferences.budgetAlerts,
    approvalReminders: preferences.approvalReminders
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export default UserPreferencesContext;

