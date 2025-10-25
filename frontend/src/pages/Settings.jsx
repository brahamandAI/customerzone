import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Switch, FormControlLabel, Fade, Zoom, Divider, Button, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Avatar, Alert, Snackbar } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import LanguageIcon from '@mui/icons-material/Language';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI, notificationAPI } from '../services/api';

const Settings = () => {
  const { darkMode } = useTheme();
  const { user, getUserRole } = useAuth();
  const { darkMode: themeDarkMode, setTheme, isLoading: themeLoading } = useTheme();
  const { language, changeLanguage, t, isLoading: languageLoading } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showMessage, setShowMessage] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    budgetAlerts: true,
    approvalReminders: true,
    darkMode: false,
    language: 'en',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    autoLogout: 30,
    twoFactorAuth: false,
    autoSaveDraft: true,
    showExpenseTips: true
  });

  // Load user settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Load notification preferences
        const notificationResponse = await notificationAPI.getPreferences();
        const notificationPrefs = notificationResponse.data.data;
        
        // Load user profile for other preferences
        const profileResponse = await authAPI.getProfile();
        const userProfile = profileResponse.data.user;
        
        // Combine settings from different sources
        const userDarkMode = userProfile?.preferences?.darkMode ?? false;
        const userLanguage = userProfile?.preferences?.language ?? 'en';
        
        setSettings({
          emailNotifications: notificationPrefs?.email ?? true,
          smsNotifications: notificationPrefs?.sms ?? false,
          budgetAlerts: userProfile?.preferences?.notifications?.budgetAlerts ?? true,
          approvalReminders: userProfile?.preferences?.notifications?.approvalReminders ?? true,
          darkMode: userDarkMode,
          language: userLanguage,
          timezone: userProfile?.preferences?.timezone ?? 'Asia/Kolkata',
          currency: userProfile?.preferences?.currency ?? 'INR',
          autoLogout: userProfile?.preferences?.autoLogout ?? 30,
          twoFactorAuth: userProfile?.preferences?.twoFactorAuth ?? false,
          autoSaveDraft: userProfile?.preferences?.autoSaveDraft ?? true,
          showExpenseTips: userProfile?.preferences?.showExpenseTips ?? true
        });
        
        // Sync with context providers (only if they're not already set)
        if (!themeLoading) {
          setTheme(userDarkMode);
        }
        if (!languageLoading) {
          changeLanguage(userLanguage);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        displayMessage(t('failedToLoad'), 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user && !themeLoading && !languageLoading) {
      loadSettings();
    }
  }, [user, themeLoading, languageLoading]);

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    
    // Apply changes immediately for theme and language
    if (key === 'darkMode') {
      setTheme(newValue);
      // ThemeContext will automatically save to backend, no need to save here
    } else if (key === 'language') {
      // Language changes will be handled by the select component
    } else {
      // Auto-save other settings after a short delay
      setTimeout(async () => {
        try {
          if (key === 'emailNotifications' || key === 'smsNotifications') {
            await notificationAPI.updatePreferences({
              email: key === 'emailNotifications' ? newValue : settings.emailNotifications,
              sms: key === 'smsNotifications' ? newValue : settings.smsNotifications
            });
          } else {
            await authAPI.updateProfile({
              preferences: {
                ...settings,
                [key]: newValue
              }
            });
          }
        } catch (error) {
          console.error('Error auto-saving setting:', error);
          // Revert if save fails
          setSettings(prev => ({ ...prev, [key]: !newValue }));
        }
      }, 1000); // 1 second delay for auto-save
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save notification preferences
      await notificationAPI.updatePreferences({
        email: settings.emailNotifications,
        sms: settings.smsNotifications
      });
      
      // Save other preferences to user profile
      await authAPI.updateProfile({
        preferences: {
          notifications: {
            budgetAlerts: settings.budgetAlerts,
            approvalReminders: settings.approvalReminders
          },
          darkMode: settings.darkMode,
          language: settings.language,
          timezone: settings.timezone,
          currency: settings.currency,
          autoLogout: settings.autoLogout,
          twoFactorAuth: settings.twoFactorAuth,
          autoSaveDraft: settings.autoSaveDraft,
          showExpenseTips: settings.showExpenseTips
        }
      });
      
      displayMessage(t('settingsSaved'), 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      displayMessage(t('failedToSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      emailNotifications: true,
      smsNotifications: false,
      budgetAlerts: true,
      approvalReminders: true,
      darkMode: false,
      language: 'en',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      autoLogout: 30,
      twoFactorAuth: false,
      autoSaveDraft: true,
      showExpenseTips: true
    });
  };

  const displayMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowMessage(true);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkMode 
          ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.01"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              {t('settings')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={saving || loading}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { borderColor: 'white' }
                }}
              >
                {t('reset')}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving || loading}
                sx={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { background: 'rgba(255,255,255,0.3)' }
                }}
              >
                {saving ? t('saving') : t('saveChanges')}
              </Button>
            </Box>
          </Box>

          {!loading && (
            <Grid container spacing={3}>
            {/* Notifications */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                      <NotificationsIcon />
                    </Avatar>
                                         <Typography variant="h6" fontWeight={600} color="#667eea">
                       {t('notifications')}
                     </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={settings.emailNotifications}
                          onChange={() => handleToggle('emailNotifications')}
                          color="primary"
                        />
                      }
                                             label={t('emailNotifications')}
                     />
                     <FormControlLabel
                       control={
                         <Switch 
                           checked={settings.smsNotifications}
                           onChange={() => handleToggle('smsNotifications')}
                           color="primary"
                         />
                       }
                       label={t('smsNotifications')}
                     />
                    {getUserRole() === 'SUBMITTER' && (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={settings.budgetAlerts}
                            onChange={() => handleToggle('budgetAlerts')}
                            color="primary"
                          />
                        }
                                                 label={t('budgetAlerts')}
                       />
                     )}
                     {getUserRole() === 'SUBMITTER' && (
                       <FormControlLabel
                         control={
                           <Switch 
                             checked={settings.approvalReminders}
                             onChange={() => handleToggle('approvalReminders')}
                             color="primary"
                           />
                         }
                         label={t('approvalReminders')}
                       />
                     )}
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            {/* Security */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: '400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#f44336', mr: 2 }}>
                      <SecurityIcon />
                    </Avatar>
                                         <Typography variant="h6" fontWeight={600} color="#f44336">
                       {t('security')}
                     </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={settings.twoFactorAuth}
                          onChange={() => handleToggle('twoFactorAuth')}
                          color="error"
                        />
                      }
                                             label={t('twoFactorAuth')}
                     />
                    
                                         <FormControl fullWidth>
                       <InputLabel>{t('autoLogout')}</InputLabel>
                       <Select
                         value={settings.autoLogout}
                         label={t('autoLogout')}
                         onChange={(e) => setSettings({...settings, autoLogout: e.target.value})}
                       >
                        <MenuItem value={15}>15 minutes</MenuItem>
                        <MenuItem value={30}>30 minutes</MenuItem>
                        <MenuItem value={60}>1 hour</MenuItem>
                        <MenuItem value={120}>2 hours</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            {/* Appearance */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                      <PaletteIcon />
                    </Avatar>
                                         <Typography variant="h6" fontWeight={600} color="#ff9800">
                       {t('appearance')}
                     </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={settings.darkMode}
                          onChange={() => handleToggle('darkMode')}
                          color="warning"
                        />
                      }
                                             label={t('darkMode')}
                     />
                    
                                         <FormControl fullWidth>
                       <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>{t('language')}</InputLabel>
                       <Select
                         value={settings.language}
                         label={t('language')}
                         onChange={async (e) => {
                           const newLanguage = e.target.value;
                           setSettings({...settings, language: newLanguage});
                           changeLanguage(newLanguage);
                           
                           // Immediately save language to backend
                           try {
                             await authAPI.updateProfile({
                               preferences: {
                                 ...settings,
                                 language: newLanguage
                               }
                             });
                           } catch (error) {
                             console.error('Error saving language:', error);
                             // Revert if save fails
                             setSettings({...settings, language: settings.language});
                             changeLanguage(settings.language);
                             displayMessage('Failed to save language setting', 'error');
                           }
                         }}
                         sx={{
                           backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                           color: darkMode ? '#e0e0e0' : '#333333',
                           '& .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#333333' : '#e0e0e0',
                           },
                           '&:hover .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '& .MuiSelect-icon': {
                             color: darkMode ? '#b0b0b0' : '#666666',
                           },
                         }}
                         MenuProps={{
                           PaperProps: {
                             sx: {
                               bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                               '& .MuiMenuItem-root': {
                                 color: darkMode ? '#e0e0e0' : '#333333',
                                 '&:hover': {
                                   bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                 },
                               },
                             },
                           },
                         }}
                       >
                         <MenuItem value="en">English</MenuItem>
                         <MenuItem value="hi">हिंदी</MenuItem>
                         <MenuItem value="gu">ગુજરાતી</MenuItem>
                       </Select>
                     </FormControl>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            {/* Expense Settings - Only for Submitters */}
            {getUserRole() === 'SUBMITTER' && (
              <Grid item xs={12} md={6}>
                <Zoom in style={{ transitionDelay: '800ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 4, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                    height: 'fit-content'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Avatar sx={{ bgcolor: '#9c27b0', mr: 2 }}>
                        <SaveIcon />
                      </Avatar>
                                           <Typography variant="h6" fontWeight={600} color="#9c27b0">
                       {t('expenseSettings')}
                     </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={settings.autoSaveDraft}
                            onChange={() => handleToggle('autoSaveDraft')}
                            color="secondary"
                          />
                        }
                                                 label={t('autoSaveDraft')}
                       />
                       <FormControlLabel
                         control={
                           <Switch 
                             checked={settings.showExpenseTips}
                             onChange={() => handleToggle('showExpenseTips')}
                             color="secondary"
                           />
                         }
                         label={t('showExpenseTips')}
                       />
                    </Box>
                  </Paper>
                </Zoom>
              </Grid>
            )}

            {/* Regional */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: getUserRole() === 'SUBMITTER' ? '1000ms' : '800ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                      <LanguageIcon />
                    </Avatar>
                                         <Typography variant="h6" fontWeight={600} color="#4caf50">
                       {t('regional')}
                     </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                         <FormControl fullWidth>
                       <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>{t('timezone')}</InputLabel>
                       <Select
                         value={settings.timezone}
                         label={t('timezone')}
                         onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                         sx={{
                           backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                           color: darkMode ? '#e0e0e0' : '#333333',
                           '& .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#333333' : '#e0e0e0',
                           },
                           '&:hover .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '& .MuiSelect-icon': {
                             color: darkMode ? '#b0b0b0' : '#666666',
                           },
                         }}
                         MenuProps={{
                           PaperProps: {
                             sx: {
                               bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                               '& .MuiMenuItem-root': {
                                 color: darkMode ? '#e0e0e0' : '#333333',
                                 '&:hover': {
                                   bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                 },
                               },
                             },
                           },
                         }}
                       >
                        <MenuItem value="Asia/Kolkata">Asia/Kolkata (IST)</MenuItem>
                        <MenuItem value="Asia/Dubai">Asia/Dubai (GST)</MenuItem>
                        <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                      </Select>
                    </FormControl>
                    
                                         <FormControl fullWidth>
                       <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>{t('currency')}</InputLabel>
                       <Select
                         value={settings.currency}
                         label={t('currency')}
                         onChange={(e) => setSettings({...settings, currency: e.target.value})}
                         sx={{
                           backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                           color: darkMode ? '#e0e0e0' : '#333333',
                           '& .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#333333' : '#e0e0e0',
                           },
                           '&:hover .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                             borderColor: darkMode ? '#4fc3f7' : '#667eea',
                           },
                           '& .MuiSelect-icon': {
                             color: darkMode ? '#b0b0b0' : '#666666',
                           },
                         }}
                         MenuProps={{
                           PaperProps: {
                             sx: {
                               bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                               '& .MuiMenuItem-root': {
                                 color: darkMode ? '#e0e0e0' : '#333333',
                                 '&:hover': {
                                   bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                 },
                               },
                             },
                           },
                         }}
                       >
                        <MenuItem value="INR">Indian Rupee (₹)</MenuItem>
                        <MenuItem value="USD">US Dollar (₹)</MenuItem>
                        <MenuItem value="EUR">Euro (€)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
          )}
          
                     {loading && (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
               <Typography variant="h6" color="white">{t('loadingSettings')}</Typography>
             </Box>
           )}
        </Box>
      </Fade>
      
      {/* Message Snackbar */}
      <Snackbar
        open={showMessage}
        autoHideDuration={6000}
        onClose={() => setShowMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowMessage(false)} 
          severity={messageType}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings; 