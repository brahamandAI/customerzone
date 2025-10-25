import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation strings
const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Settings
    settings: 'Settings & Preferences',
    notifications: 'Notifications',
    security: 'Security',
    appearance: 'Appearance',
    regional: 'Regional Settings',
    expenseSettings: 'Expense Settings',
    
    // Notification settings
    emailNotifications: 'Email Notifications',
    smsNotifications: 'SMS Notifications',
    budgetAlerts: 'Budget Alerts',
    approvalReminders: 'Approval Reminders',
    
    // Security settings
    twoFactorAuth: 'Two-Factor Authentication',
    autoLogout: 'Auto Logout (minutes)',
    
    // Appearance settings
    darkMode: 'Dark Mode',
    language: 'Language',
    
    // Regional settings
    timezone: 'Timezone',
    currency: 'Currency',
    
    // Expense settings
    autoSaveDraft: 'Auto-save Draft Expenses',
    showExpenseTips: 'Show Expense Tips',
    
    // Actions
    saveChanges: 'Save Changes',
    reset: 'Reset',
    saving: 'Saving...',
    
    // Messages
    settingsSaved: 'Settings saved successfully!',
    failedToSave: 'Failed to save settings',
    failedToLoad: 'Failed to load settings',
    loadingSettings: 'Loading settings...',
    
    // Dashboard
    dashboard: 'Dashboard',
    totalAmountYTD: 'Total Amount (YTD)',
    budgetUtilization: 'Budget Utilization',
    quickActions: 'Quick Actions',
    submitExpense: 'Submit Expense',
    createNewExpenseReport: 'Create new expense report',
    budgetAlerts: 'Budget Alerts',
    manageBudgetAlerts: 'Manage budget alerts',
    recentActivities: 'Recent Activities',
    recentUpdates: 'Recent Updates',
    activities: 'activities',
    lastDaysAgo: 'Last {days} days ago',
    expenseApprovedBy: 'Expense approved by {level}',
    topExpenseCategories: 'Top Expense Categories',
    totalSpent: 'Total Spent',
    acrossCategories: 'Across {count} categories',
    travel: 'Travel',
    food: 'Food',
    vsLastYear: 'vs last year',
  },
  hi: {
    // Common
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    
    // Settings
    settings: 'सेटिंग्स और प्राथमिकताएं',
    notifications: 'सूचनाएं',
    security: 'सुरक्षा',
    appearance: 'दिखावट',
    regional: 'क्षेत्रीय सेटिंग्स',
    expenseSettings: 'खर्च सेटिंग्स',
    
    // Notification settings
    emailNotifications: 'ईमेल सूचनाएं',
    smsNotifications: 'एसएमएस सूचनाएं',
    budgetAlerts: 'बजट अलर्ट',
    approvalReminders: 'अनुमोदन अनुस्मारक',
    
    // Security settings
    twoFactorAuth: 'दो-कारक प्रमाणीकरण',
    autoLogout: 'स्वचालित लॉगआउट (मिनट)',
    
    // Appearance settings
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    
    // Regional settings
    timezone: 'समय क्षेत्र',
    currency: 'मुद्रा',
    
    // Expense settings
    autoSaveDraft: 'ड्राफ्ट खर्च स्वचालित सहेजें',
    showExpenseTips: 'खर्च टिप्स दिखाएं',
    
    // Actions
    saveChanges: 'परिवर्तन सहेजें',
    reset: 'रीसेट',
    saving: 'सहेज रहा है...',
    
    // Messages
    settingsSaved: 'सेटिंग्स सफलतापूर्वक सहेजी गईं!',
    failedToSave: 'सेटिंग्स सहेजने में विफल',
    failedToLoad: 'सेटिंग्स लोड करने में विफल',
    loadingSettings: 'सेटिंग्स लोड हो रही हैं...',
    
    // Dashboard
    dashboard: 'डैशबोर्ड',
    totalAmountYTD: 'कुल राशि (वर्ष-से-दिनांक)',
    budgetUtilization: 'बजट उपयोग',
    quickActions: 'त्वरित कार्य',
    submitExpense: 'खर्च जमा करें',
    createNewExpenseReport: 'नई खर्च रिपोर्ट बनाएं',
    budgetAlerts: 'बजट अलर्ट',
    manageBudgetAlerts: 'बजट अलर्ट प्रबंधित करें',
    recentActivities: 'हाल की गतिविधियां',
    recentUpdates: 'हाल के अपडेट',
    activities: 'गतिविधियां',
    lastDaysAgo: 'पिछले {days} दिन पहले',
    expenseApprovedBy: 'खर्च {level} द्वारा स्वीकृत',
    topExpenseCategories: 'शीर्ष खर्च श्रेणियां',
    totalSpent: 'कुल खर्च',
    acrossCategories: '{count} श्रेणियों में',
    travel: 'यात्रा',
    food: 'भोजन',
    vsLastYear: 'पिछले वर्ष की तुलना में',
  },
  gu: {
    // Common
    save: 'સાચવો',
    cancel: 'રદ કરો',
    loading: 'લોડ થઈ રહ્યું છે...',
    error: 'ભૂલ',
    success: 'સફળતા',
    
    // Settings
    settings: 'સેટિંગ્સ અને પસંદગીઓ',
    notifications: 'સૂચનાઓ',
    security: 'સુરક્ષા',
    appearance: 'દેખાવ',
    regional: 'પ્રાદેશિક સેટિંગ્સ',
    expenseSettings: 'ખર્ચ સેટિંગ્સ',
    
    // Notification settings
    emailNotifications: 'ઈમેઇલ સૂચનાઓ',
    smsNotifications: 'એસએમએસ સૂચનાઓ',
    budgetAlerts: 'બજેટ અલર્ટ',
    approvalReminders: 'મંજૂરી રિમાઇન્ડર',
    
    // Security settings
    twoFactorAuth: 'બે-કારક પ્રમાણીકરણ',
    autoLogout: 'સ્વયંસંચાલિત લૉગઆઉટ (મિનિટ)',
    
    // Appearance settings
    darkMode: 'ડાર્ક મોડ',
    language: 'ભાષા',
    
    // Regional settings
    timezone: 'સમય ક્ષેત્ર',
    currency: 'ચલણ',
    
    // Expense settings
    autoSaveDraft: 'ડ્રાફ્ટ ખર્ચ સ્વયંસંચાલિત સાચવો',
    showExpenseTips: 'ખર્ચ ટિપ્સ બતાવો',
    
    // Actions
    saveChanges: 'ફેરફારો સાચવો',
    reset: 'રીસેટ',
    saving: 'સાચવી રહ્યા છીએ...',
    
    // Messages
    settingsSaved: 'સેટિંગ્સ સફળતાપૂર્વક સાચવી!',
    failedToSave: 'સેટિંગ્સ સાચવવામાં નિષ્ફળ',
    failedToLoad: 'સેટિંગ્સ લોડ કરવામાં નિષ્ફળ',
    loadingSettings: 'સેટિંગ્સ લોડ થઈ રહી છે...',
    
    // Dashboard
    dashboard: 'ડેશબોર્ડ',
    totalAmountYTD: 'કુલ રકમ (વર્ષ-થી-દિવસ)',
    budgetUtilization: 'બજેટ ઉપયોગ',
    quickActions: 'ઝડપી ક્રિયાઓ',
    submitExpense: 'ખર્ચ સબમિટ કરો',
    createNewExpenseReport: 'નવી ખર્ચ રિપોર્ટ બનાવો',
    budgetAlerts: 'બજેટ અલર્ટ',
    manageBudgetAlerts: 'બજેટ અલર્ટ મેનેજ કરો',
    recentActivities: 'તાજેતરની પ્રવૃત્તિઓ',
    recentUpdates: 'તાજેતરના અપડેટ્સ',
    activities: 'પ્રવૃત્તિઓ',
    lastDaysAgo: 'છેલ્લા {days} દિવસ પહેલા',
    expenseApprovedBy: 'ખર્ચ {level} દ્વારા મંજૂર',
    topExpenseCategories: 'ટોપ ખર્ચ કેટેગરી',
    totalSpent: 'કુલ ખર્ચ',
    acrossCategories: '{count} કેટેગરીમાં',
    travel: 'પ્રવાસ',
    food: 'ખોરાક',
    vsLastYear: 'ગયા વર્ષની તુલના',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load language preference from localStorage and backend
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        // First try to load from localStorage for immediate access
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && translations[savedLanguage]) {
          setLanguage(savedLanguage);
        }

        // Then try to load from backend user preferences
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await authAPI.getProfile();
            if (response.data.success && response.data.user?.preferences?.language) {
              const userLanguage = response.data.user.preferences.language;
              if (translations[userLanguage]) {
                setLanguage(userLanguage);
                localStorage.setItem('language', userLanguage);
              }
            }
          } catch (error) {
            console.log('Could not load language from backend, using localStorage:', error.message);
          }
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguagePreference();
  }, []);

  // Save language preference to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('language', language);
    }
  }, [language, isLoading]);

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const t = (key, params = {}) => {
    let text = translations[language][key] || translations.en[key] || key;
    
    // Replace parameters in the text
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return text;
  };

  const value = {
    language,
    changeLanguage,
    t,
    translations,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 