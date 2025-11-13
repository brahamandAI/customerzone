import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { authAPI } from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [themeReady, setThemeReady] = useState(false);

  // Load theme preference from localStorage and backend
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        
        if (token) {
          // User is logged in, load from backend first
          try {
            const response = await authAPI.getProfile();
            if (response.data.success && response.data.user?.preferences?.darkMode !== undefined) {
              const userDarkMode = response.data.user.preferences.darkMode;
              setDarkMode(userDarkMode);
              localStorage.setItem('darkMode', JSON.stringify(userDarkMode));
            } else {
              // Backend doesn't have darkMode preference, default to false
              setDarkMode(false);
              localStorage.setItem('darkMode', JSON.stringify(false));
            }
          } catch (error) {
            console.log('Could not load theme from backend, using localStorage:', error.message);
            // Fallback to localStorage if backend fails
            const savedTheme = localStorage.getItem('darkMode');
            if (savedTheme !== null) {
              setDarkMode(JSON.parse(savedTheme));
            } else {
              // No localStorage either, default to false
              setDarkMode(false);
              localStorage.setItem('darkMode', JSON.stringify(false));
            }
          }
        } else {
          // User is not logged in, use localStorage only
          const savedTheme = localStorage.getItem('darkMode');
          if (savedTheme !== null) {
            setDarkMode(JSON.parse(savedTheme));
          } else {
            // No localStorage, default to false
            setDarkMode(false);
            localStorage.setItem('darkMode', JSON.stringify(false));
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // On any error, default to false
        setDarkMode(false);
        localStorage.setItem('darkMode', JSON.stringify(false));
      } finally {
        setIsLoading(false);
        setThemeReady(true);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
      
      // Also save to backend if user is logged in
      const saveToBackend = async () => {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            await authAPI.updateProfile({
              preferences: {
                darkMode: darkMode
              }
            });
          }
        } catch (error) {
          console.error('Error saving theme to backend:', error);
        }
      };
      
      saveToBackend();
    }
  }, [darkMode, isLoading]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const setTheme = (isDark) => {
    setDarkMode(isDark);
  };

  // Create Material-UI theme based on dark mode setting
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#4fc3f7' : '#667eea',
        light: darkMode ? '#8bf6ff' : '#9fa8da',
        dark: darkMode ? '#0099cc' : '#5e35b1',
      },
      secondary: {
        main: darkMode ? '#ff7043' : '#764ba2',
        light: darkMode ? '#ffa270' : '#a78bc7',
        dark: darkMode ? '#c63f17' : '#4a148c',
      },
      background: {
        default: darkMode ? '#0a0a0a' : '#f5f5f5',
        paper: darkMode ? '#1a1a1a' : '#ffffff',
      },
      surface: {
        main: darkMode ? '#2a2a2a' : '#ffffff',
        light: darkMode ? '#3a3a3a' : '#fafafa',
        dark: darkMode ? '#1a1a1a' : '#e0e0e0',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#333333',
        secondary: darkMode ? '#b0b0b0' : '#666666',
        disabled: darkMode ? '#666666' : '#999999',
      },
      divider: darkMode ? '#333333' : '#e0e0e0',
      action: {
        active: darkMode ? '#4fc3f7' : '#667eea',
        hover: darkMode ? 'rgba(79, 195, 247, 0.08)' : 'rgba(102, 126, 234, 0.08)',
        selected: darkMode ? 'rgba(79, 195, 247, 0.16)' : 'rgba(102, 126, 234, 0.16)',
        disabled: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
        disabledBackground: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      h2: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      h3: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      h4: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      h5: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      h6: {
        color: darkMode ? '#ffffff' : '#333333',
      },
      body1: {
        color: darkMode ? '#e0e0e0' : '#333333',
      },
      body2: {
        color: darkMode ? '#b0b0b0' : '#666666',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
            border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
            border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
            boxShadow: darkMode ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1a1a1a' : '#1976d2',
            color: darkMode ? '#ffffff' : '#ffffff',
            borderBottom: darkMode ? '1px solid #333333' : 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
          },
          contained: {
            boxShadow: darkMode ? '0 2px 8px rgba(79, 195, 247, 0.3)' : '0 2px 8px rgba(102, 126, 234, 0.3)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: darkMode ? '#4fc3f7' : '#667eea',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: darkMode ? '#4fc3f7' : '#667eea',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5',
            color: darkMode ? '#e0e0e0' : '#333333',
            border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: darkMode ? '#333333' : '#e0e0e0',
          },
        },
      },
    },
  });

  const value = {
    darkMode,
    toggleDarkMode,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <div style={{ 
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          minHeight: '100vh',
          transition: 'all 0.3s ease'
        }}>
          {children}
        </div>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 