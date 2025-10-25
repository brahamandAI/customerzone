import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Fade, Zoom, Slide, Avatar, InputAdornment, IconButton, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import { GoogleLogin } from '@react-oauth/google';
import LoginDemoOverlay from '../components/LoginDemoOverlay';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, getRoleDisplayName } = useAuth();
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'submitter',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);
  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0 = Password Login, 1 = OTP Login
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringForm, setIsHoveringForm] = useState(false);

  // Generate floating particles with enhanced movement
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 6 + 2,
        speed: Math.random() * 3 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y > -50 ? p.y - p.speed : window.innerHeight + 50,
        x: p.x + Math.sin(p.y / 50) * 0.8 + (mousePosition.x - window.innerWidth / 2) * 0.0001,
        rotation: p.rotation + p.rotationSpeed,
        opacity: isHoveringForm ? p.opacity * 1.5 : p.opacity
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [mousePosition, isHoveringForm]);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);
    
    try {
      // Call real backend login API
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      // Save token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      login(response.data.user, response.data.token); // update context with token
      navigate('/dashboard');
    } catch (error) {
      setErrors({ email: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    console.log('🔐 Google Sign-In initiated:', credentialResponse);
    setLoading(true);
    
    try {
      // Call backend Google OAuth API with the credential token
      const response = await authAPI.googleSignIn({
        token: credentialResponse.credential
      });

      console.log('✅ Google Sign-In successful:', response.data);

      // Save token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      setErrors({ email: error.response?.data?.message || 'Google sign-in failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Sign-In Error');
    setErrors({ email: 'Google sign-in was cancelled or failed. Please try again.' });
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordError('Email is required to reset password.');
      return;
    }

    setLoading(true);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    try {
      await authAPI.forgotPassword(forgotPasswordEmail);
      setForgotPasswordSuccess('Password reset instructions have been sent to your email.');
      setOpenForgotPasswordDialog(false);
      setForgotPasswordEmail('');
    } catch (error) {
      setForgotPasswordError(error.response?.data?.message || 'Failed to send password reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForgotPasswordDialog = () => {
    setOpenForgotPasswordDialog(false);
    setForgotPasswordEmail('');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'l1_approver': return <SecurityIcon />;
      case 'l2_approver': return <BusinessIcon />;
            case 'l3_approver': return <AccountBalanceIcon />;
      case 'finance': return <AccountBalanceIcon />;

      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'l1_approver': return '#ff9800';
      case 'l2_approver': return '#9c27b0';
            case 'l3_approver': return '#4caf50';
      case 'finance': return '#4caf50';

      default: return '#607d8b';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #008080 0%, #20B2AA 50%, #48D1CC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Enhanced Floating Particles */}
      {particles.map(particle => (
        <Box
          key={particle.id}
          sx={{
            position: 'absolute',
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, rgba(255, 255, 255, ${particle.opacity * 0.8}) 0%, rgba(255, 255, 255, ${particle.opacity * 0.3}) 100%)`,
            borderRadius: '50%',
            opacity: particle.opacity,
            transform: `rotate(${particle.rotation}deg)`,
            animation: 'sparkle 3s ease-in-out infinite',
            zIndex: 0,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${particle.size * 2}px rgba(255, 255, 255, ${particle.opacity * 0.3})`,
            '@keyframes sparkle': {
              '0%, 100%': { 
                transform: `rotate(${particle.rotation}deg) scale(1)`,
                opacity: particle.opacity 
              },
              '50%': { 
                transform: `rotate(${particle.rotation + 180}deg) scale(1.2)`,
                opacity: particle.opacity * 1.5
              }
            }
          }}
        />
      ))}

      {/* Interactive Mouse Follower */}
      <Box sx={{
        position: 'absolute',
        left: mousePosition.x - 100,
        top: mousePosition.y - 100,
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'all 0.3s ease',
        transform: isHoveringForm ? 'scale(1.5)' : 'scale(1)'
      }} />

      {/* Animated background patterns */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 50%)
        `,
        animation: 'pulse 4s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 }
        }
      }} />

      {/* Floating geometric shapes */}
      <Box sx={{
        position: 'absolute',
        top: '10%',
        right: '10%',
        width: 100,
        height: 100,
        border: '2px solid rgba(255,255,255,0.2)',
        borderRadius: '50%',
        animation: 'rotate 20s linear infinite',
        '@keyframes rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }} />
      
      <Box sx={{
        position: 'absolute',
        bottom: '15%',
        left: '15%',
        width: 60,
        height: 60,
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '50%',
        animation: 'rotate 15s linear infinite reverse',
      }} />

      <Fade in timeout={1000}>
        <Box sx={{ 
          position: 'relative', 
          zIndex: 1, 
          width: '100%', 
          maxWidth: 1200,
          display: { xs: 'flex', md: 'flex' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 0,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {/* Left Side - Login Form */}
          <Zoom in style={{ transitionDelay: '200ms' }}>
            <Paper 
              elevation={24} 
              onMouseEnter={() => setIsHoveringForm(true)}
              onMouseLeave={() => setIsHoveringForm(false)}
              sx={{ 
                flex: 1,
                p: { xs: 3, sm: 4, md: 5 }, 
                background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                minHeight: { xs: 'auto', md: '600px' },
                boxShadow: darkMode
                  ? '20px 20px 60px #1a1a1a, -20px -20px 60px #2e2e2e'
                  : '12px 12px 30px rgba(0,0,0,0.08), -12px -12px 30px rgba(255,255,255,0.8)',
                transform: isHoveringForm ? 'translateY(-5px) scale(1.02)' : 'translateY(0) scale(1)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: isHoveringForm ? '6px' : '4px',
                  background: 'linear-gradient(90deg, #008080, #20B2AA, #48D1CC)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  background: 'linear-gradient(45deg, #008080, #20B2AA, #48D1CC, #008080)',
                  borderRadius: 'inherit',
                  zIndex: -1,
                  opacity: isHoveringForm ? 0.3 : 0,
                  filter: 'blur(8px)',
                  transition: 'opacity 0.3s ease'
                }
              }}>
              {/* Login Form Header */}
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                {/* Mobile Logo and Title */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <img 
                    src="/rakshak-logo.png" 
                    alt="Rakshak Securitas Logo" 
                    style={{ 
                      height: '60px', 
                      width: 'auto',
                      marginBottom: '16px'
                    }}
                  />
                  <Typography variant="h5" fontWeight={700} color="#008080" sx={{ mb: 1 }}>
                    Rakshak Securitas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                    Expense Management System
                  </Typography>
                </Box>
                
                <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8 }}>
                  Sign in to your account to continue
                </Typography>
              </Box>

              {/* Tabs for Login methods */}
              <Box sx={{ mb: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, v) => setActiveTab(v)}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{
                    '& .MuiTab-root': { 
                      textTransform: 'none', 
                      fontWeight: 600,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        color: '#008080',
                        '&::before': {
                          opacity: 1,
                          transform: 'scaleX(1)'
                        }
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'linear-gradient(90deg, #008080, #20B2AA)',
                        opacity: 0,
                        transform: 'scaleX(0)',
                        transition: 'all 0.3s ease',
                        transformOrigin: 'center'
                      },
                      '&.Mui-selected': {
                        color: '#008080',
                        fontWeight: 700,
                        '&::before': {
                          opacity: 1,
                          transform: 'scaleX(1)'
                        }
                      }
                    },
                    '& .MuiTabs-indicator': { 
                      backgroundColor: '#008080',
                      height: '3px',
                      borderRadius: '2px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                  }}
                >
                  <Tab label="Password Login" id="tab-password" />
                  <Tab label="OTP Login" />
                </Tabs>
              </Box>

              {/* Password Login */}
              <Slide in={activeTab === 0} direction="right" mountOnEnter unmountOnExit>
                <Box component="form" onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={!!errors.email}
                    helperText={errors.email}
                    id="login-email"
                    FormHelperTextProps={{
                      sx: { color: errors.email ? '#f44336' : (darkMode ? '#b0b0b0' : '#666666') }
                    }}
                    InputProps={{
                      sx: { 
                        borderRadius: 3,
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        color: darkMode ? '#ffffff' : '#333333',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: 'translateY(0)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,128,128,0.15)',
                          '& fieldset': { borderColor: '#008080' }
                        },
                        '&.Mui-focused': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(0,128,128,0.25)',
                          '& fieldset': { borderColor: '#008080', borderWidth: '2px' }
                        },
                        '& .MuiInputBase-input': {
                          color: darkMode ? '#ffffff' : '#333333',
                        },
                        '& .MuiInputLabel-root': {
                          color: darkMode ? '#b0b0b0' : '#666666',
                          transition: 'all 0.3s ease',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#008080',
                          transform: 'translate(14px, -9px) scale(0.75)',
                        }
                      }
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    helperText={errors.password}
                    id="login-password"
                    FormHelperTextProps={{
                      sx: { color: errors.password ? '#f44336' : (darkMode ? '#b0b0b0' : '#666666') }
                    }}
                      InputProps={{
                        sx: { 
                          borderRadius: 3,
                          backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                          color: darkMode ? '#ffffff' : '#333333',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: 'translateY(0)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,128,128,0.15)',
                            '& fieldset': { borderColor: '#008080' }
                          },
                          '&.Mui-focused': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(0,128,128,0.25)',
                            '& fieldset': { borderColor: '#008080', borderWidth: '2px' }
                          },
                          '& .MuiInputBase-input': {
                            color: darkMode ? '#ffffff' : '#333333',
                          },
                          '& .MuiInputLabel-root': {
                            color: darkMode ? '#b0b0b0' : '#666666',
                            transition: 'all 0.3s ease',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#008080',
                          }
                        },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: '#008080' }}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel sx={{ 
                      color: darkMode ? '#b0b0b0' : '#666666',
                      '&.Mui-focused': { color: '#008080' }
                    }}>Select Your Role</InputLabel>
                    <Select
                      value={formData.role}
                      label="Select Your Role"
                      onChange={handleInputChange('role')}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                            '& .MuiMenuItem-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              '&:hover': {
                                backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5'
                              }
                            }
                          }
                        }
                      }}
                      sx={{ 
                        borderRadius: 3,
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        color: darkMode ? '#ffffff' : '#333333',
                        '&:hover fieldset': { borderColor: '#008080' },
                        '&.Mui-focused fieldset': { borderColor: '#008080' },
                        '& .MuiSelect-icon': {
                          color: darkMode ? '#ffffff' : '#333333',
                        },
                        '& .MuiInputBase-input': {
                          color: darkMode ? '#ffffff' : '#333333',
                        }
                      }}
                      renderValue={(value) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: getRoleColor(value),
                            fontSize: '0.8rem'
                          }}>
                            {getRoleIcon(value)}
                          </Avatar>
                          <Typography sx={{ color: darkMode ? '#ffffff' : '#333333' }}>{getRoleDisplayName(value)}</Typography>
                        </Box>
                      )}
                    >
                      <MenuItem value="submitter" sx={{ 
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        '&:hover': { backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#2196f3' }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Expense Submitter</Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Submit and track expenses</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="l1_approver" sx={{ 
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        '&:hover': { backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#ff9800' }}>
                            <SecurityIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Level 1 Approver</Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Regional Manager</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="l2_approver" sx={{ 
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        '&:hover': { backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#9c27b0' }}>
                            <BusinessIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Level 2 Approver</Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Admin</Typography>
                          </Box>
                        </Box>
                      </MenuItem>

                      <MenuItem value="l3_approver" sx={{ 
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        '&:hover': { backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#4caf50' }}>
                            <AccountBalanceIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Super Admin</Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Full Access</Typography>
                          </Box>
                        </Box>
                      </MenuItem>

                      <MenuItem value="finance" sx={{ 
                        backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                        '&:hover': { backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#4caf50' }}>
                            <AccountBalanceIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Finance</Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Payment Processing</Typography>
                          </Box>
                        </Box>
                      </MenuItem>

                    </Select>
                  </FormControl>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.rememberMe}
                          onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                          sx={{ color: '#008080', '&.Mui-checked': { color: '#008080' } }}
                        />
                      }
                      label={<Typography sx={{ color: darkMode ? '#ffffff' : '#333333' }}>Remember me</Typography>}
                    />
                    <Button
                      variant="text"
                      sx={{ 
                        textTransform: 'none',
                        color: '#008080',
                        '&:hover': { background: 'rgba(0,128,128,0.1)' }
                      }}
                      onClick={() => setOpenForgotPasswordDialog(true)}
                    >
                      Forgot password?
                    </Button>
                  </Box>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    startIcon={<LockIcon />}
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
                      color: 'white',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 32px rgba(0,128,128,0.3)',
                      '&:hover': { 
                        background: 'linear-gradient(45deg, #006666 30%, #008080 90%)',
                        transform: 'translateY(-3px) scale(1.01)',
                        boxShadow: '0 14px 46px rgba(0,128,128,0.45)'
                      },
                      '&:disabled': {
                        background: 'rgba(0,128,128,0.3)',
                        transform: 'none'
                      },
                      transition: 'all 0.25s ease'
                    }}
                    id="login-submit"
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {loading && (
                        <Box sx={{
                          width: 20,
                          height: 20,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' }
                          }
                        }} />
                      )}
                      {loading ? 'Signing in...' : 'Sign In'}
                      {!loading && (
                        <Box sx={{
                          position: 'absolute',
                          right: -30,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid white',
                          borderTop: '4px solid transparent',
                          borderBottom: '4px solid transparent',
                          opacity: 0,
                          transition: 'all 0.3s ease',
                          '.MuiButton-root:hover &': {
                            right: 10,
                            opacity: 1
                          }
                        }} />
                      )}
                    </Box>
                  </Button>

                  <Divider sx={{ my: 3 }}>
                    <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                      OR
                    </Typography>
                  </Divider>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    '& .google-login-button': {
                      width: '100%',
                      '& div': {
                        width: '100% !important',
                        borderRadius: '12px !important',
                        height: '56px !important',
                        display: 'flex !important',
                        alignItems: 'center !important',
                        justifyContent: 'center !important',
                        fontSize: '1.1rem !important',
                        fontWeight: '600 !important',
                        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif !important',
                        textTransform: 'none !important',
                        transition: 'all 0.3s ease !important',
                        '&:hover': {
                          transform: 'translateY(-2px) !important',
                          boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3) !important'
                        }
                      }
                    }
                  }}>
                    {/* Debug: Show client ID status */}
                    {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                      <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                        ⚠️ Google Client ID not configured. Please check your .env file.
                      </Typography>
                    )}
                    <GoogleLogin
                      onSuccess={handleGoogleSignIn}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      text="signin_with"
                      shape="rectangular"
                      className="google-login-button"
                      disabled={loading}
                    />
                  </Box>
                </Box>
                </Box>
              </Slide>

              {/* OTP Login */}
              <Slide in={activeTab === 1} direction="left" mountOnEnter unmountOnExit>
                <Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      InputProps={{
                        sx: {
                          borderRadius: 3,
                          backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                          '&:hover fieldset': { borderColor: '#008080' },
                          '&.Mui-focused fieldset': { borderColor: '#008080' }
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Enter OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        InputProps={{
                          sx: {
                            borderRadius: 3,
                            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                            '&:hover fieldset': { borderColor: '#008080' },
                            '&.Mui-focused fieldset': { borderColor: '#008080' }
                          }
                        }}
                      />
                      <Button
                        variant="outlined"
                        sx={{
                          whiteSpace: 'nowrap',
                          borderRadius: 3,
                          borderColor: '#008080',
                          color: '#008080',
                          '&:hover': { borderColor: '#006666', color: '#006666', background: 'rgba(0,128,128,0.06)' }
                        }}
                        disabled={otpSending || !otpEmail}
                        onClick={async () => {
                          try {
                            setOtpSending(true);
                            setOtpMessage('');
                            await authAPI.sendOtp(otpEmail);
                            setOtpMessage('OTP sent to your email.');
                          } catch (e) {
                            setOtpMessage(e.userMessage || 'Failed to send OTP');
                          } finally {
                            setOtpSending(false);
                          }
                        }}
                      >
                        {otpSending ? 'Sending...' : 'Send OTP'}
                      </Button>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
                        color: 'white',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 8px 32px rgba(0,128,128,0.3)',
                        '&:hover': { background: 'linear-gradient(45deg, #006666 30%, #008080 90%)', transform: 'translateY(-3px) scale(1.01)' },
                        transition: 'all 0.25s ease'
                      }}
                      disabled={otpVerifying || !otpEmail || !otpCode}
                      onClick={async () => {
                        try {
                          setOtpVerifying(true);
                          setOtpMessage('');
                          const response = await authAPI.verifyOtp(otpEmail, otpCode);
                          localStorage.setItem('token', response.data.token);
                          localStorage.setItem('user', JSON.stringify(response.data.user));
                          login(response.data.user, response.data.token);
                          navigate('/dashboard');
                        } catch (e) {
                          setOtpMessage(e.userMessage || 'Invalid or expired OTP');
                        } finally {
                          setOtpVerifying(false);
                        }
                      }}
                    >
                      {otpVerifying ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>
                    {otpMessage && (
                      <Typography variant="caption" sx={{ textAlign: 'center', color: otpMessage.includes('Failed') || otpMessage.includes('Invalid') ? '#f44336' : '#008080' }}>
                        {otpMessage}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Slide>

              {/* Demo Credentials */}
              <Box sx={{ 
                mt: 4, 
                p: { xs: 2, sm: 2.5, md: 3 }, 
                bgcolor: 'rgba(0,128,128,0.1)', 
                borderRadius: 3,
                border: '1px solid rgba(0,128,128,0.2)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, #008080, #20B2AA)'
                }
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                  🚀 Demo Credentials:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.8rem' } }}>
                      👤 Expense Submitter
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      📧 submitter@rakshaksecuritas.com
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      🔑 Password: submitter123
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.8rem' } }}>
                      🛡️ Level 1 Approver (Regional Manager)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      📧 l1approver@rakshaksecuritas.com
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      🔑 Password: l1approver123
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.8rem' } }}>
                      🏢 Level 2 Approver (Admin)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      📧 l2approver@rakshaksecuritas.com
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      🔑 Password: l2approver123
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.8rem' } }}>
                      💰 Level 3 Approver (Finance)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      📧 l3approver@rakshaksecuritas.com
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' } }}>
                      🔑 Password: l3approver123
                    </Typography>
                  </Box>
                  

                </Box>
              </Box>
            </Paper>
          </Zoom>

          {/* Right Side - Company Details */}
          <Zoom in style={{ transitionDelay: '400ms' }}>
            <Paper elevation={24} sx={{ 
              flex: 1,
              background: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
              color: 'white',
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: { xs: 3, sm: 4, md: 6 },
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 'auto', md: '600px' },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                animation: 'float 20s ease-in-out infinite'
              }
            }}>
              {/* Company Logo */}
              <Box sx={{ 
                mb: 4, 
                width: { xs: 120, sm: 150, md: 200 }, 
                height: { xs: 120, sm: 150, md: 200 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                animation: 'bounce 2s ease-in-out infinite',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' }
                }
              }}>
                <Box sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                <img 
                  src="/rakshak-logo.png" 
                  alt="Rakshak Securitas Logo" 
                  style={{ 
                    height: '120px', 
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                  }}
                  sx={{
                    height: { xs: '80px', sm: '100px', md: '120px' }
                  }}
                />
              </Box>

              {/* Company Name */}
              <Typography variant="h2" fontWeight={900} gutterBottom sx={{
                textAlign: 'center',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                mb: 2,
                fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3.5rem' }
              }}>
                Rakshak Securitas
              </Typography>

              {/* Company Tagline */}
              <Typography variant="h5" sx={{ 
                mb: 3, 
                textAlign: 'center',
                opacity: 0.9,
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.2rem', md: '1.6rem' }
              }}>
                Expense Management System
              </Typography>

              {/* Company Description */}
              <Typography variant="body1" sx={{ 
                textAlign: 'center',
                mb: 4,
                opacity: 0.8,
                maxWidth: 400,
                lineHeight: 1.6,
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                px: { xs: 2, sm: 3, md: 0 }
              }}>
                Leading security services provider with comprehensive expense management solutions. 
                Streamline your financial processes with our advanced expense tracking system.
              </Typography>

              {/* Key Features */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4, px: { xs: 2, sm: 3, md: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    opacity: 0.8
                  }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                    Multi-level approval workflow
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    opacity: 0.8
                  }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                    Real-time budget monitoring
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    opacity: 0.8
                  }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                    Advanced reporting & analytics
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    opacity: 0.8
                  }} />
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                    Secure & compliant platform
                  </Typography>
                </Box>
              </Box>

              {/* Contact Info */}
              <Box sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 }, 
                bgcolor: 'rgba(255,255,255,0.1)', 
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.2)',
                textAlign: 'center',
                mx: { xs: 2, sm: 3, md: 0 }
              }}>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                  Rakshak Securitas
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}>
                  📧 info@rakshaksecuritas.com
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}>
                  📞 +91 98765 43210
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}>
                  🌐 www.rakshaksecuritas.com
                </Typography>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.9rem' } }}>
                  Developed by ROBUSTRIX
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}>
                  📧 info@therobustrix.com
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' } }}>
                  📞 +91 9090020245
                </Typography>
              </Box>

              {/* Footer */}
              <Box sx={{ 
                mt: 4, 
                pt: 3, 
                borderTop: '1px solid rgba(255,255,255,0.2)',
                textAlign: 'center',
                px: { xs: 2, sm: 3, md: 0 }
              }}>
                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.7rem' } }}>
                  © 2025 Rakshak Securitas. All rights reserved.
                </Typography>
                <Typography variant="caption" display="block" sx={{ opacity: 0.6, mt: 0.5, fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.7rem' } }}>
                  Crafted by ROBUSTRIX – Empowering seamless expense management.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.7rem' } }}>
                    📧 info@therobustrix.com
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.7rem' } }}>
                    📞 +91 9090020245
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Zoom>
        </Box>
      </Fade>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={openForgotPasswordDialog} 
        onClose={handleCloseForgotPasswordDialog} 
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            width: { xs: '90%', sm: '400px' },
            maxWidth: '90vw'
          } 
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', py: 3 }}>
          <LockIcon sx={{ fontSize: { xs: 40, sm: 50, md: 60 }, color: '#008080' }} />
          <Typography variant="h5" sx={{ mt: 2, fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.5rem' } }}>
            Forgot Password?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="body1" sx={{ mb: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Enter your email address to receive a password reset link.
          </Typography>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            error={!!forgotPasswordError}
            helperText={forgotPasswordError}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: '#008080' }} />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          {forgotPasswordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {forgotPasswordSuccess}
            </Alert>
          )}
          {forgotPasswordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {forgotPasswordError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 3, px: { xs: 2, sm: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 1 } }}>
          <Button
            variant="outlined"
            onClick={handleCloseForgotPasswordDialog}
            sx={{ 
              color: '#008080', 
              borderColor: '#008080',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleForgotPassword}
            disabled={loading}
            sx={{
              background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
              '&:hover': { background: 'linear-gradient(45deg, #006666 30%, #008080 90%)' },
              '&:disabled': {
                background: 'rgba(0,128,128,0.3)',
                transform: 'none'
              },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login; 
// Overlay demo can be mounted in Layout or here later as needed