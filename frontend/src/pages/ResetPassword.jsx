import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, TextField, Button, Fade, Zoom, Avatar, InputAdornment, IconButton, Alert, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const { resetToken } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!resetToken) {
      setTokenValid(false);
      setErrors({ general: 'Invalid reset link. Please request a new password reset.' });
    }
  }, [resetToken]);

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
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    
    try {
      await authAPI.resetPassword(resetToken, formData.password);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.message || 'Failed to reset password. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #008080 0%, #20B2AA 50%, #48D1CC 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4
      }}>
        <Fade in timeout={1000}>
          <Paper elevation={24} sx={{ 
            p: 5, 
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            borderRadius: 4
          }}>
            <LockIcon sx={{ fontSize: 60, color: '#f44336', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Invalid Reset Link
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.general}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
                '&:hover': { background: 'linear-gradient(45deg, #006666 30%, #008080 90%)' }
              }}
            >
              Back to Login
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #008080 0%, #20B2AA 50%, #48D1CC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4
    }}>
      <Fade in timeout={1000}>
        <Paper elevation={24} sx={{ 
          p: 5, 
          maxWidth: 500,
          width: '100%',
          borderRadius: 4
        }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <LockIcon sx={{ fontSize: 60, color: '#008080', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Reset Password
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your new password below
            </Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {errors.general && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.general}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover fieldset': { borderColor: '#008080' },
                    '&.Mui-focused fieldset': { borderColor: '#008080' }
                  }
                }}
              />
              
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: '#008080' }}
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover fieldset': { borderColor: '#008080' },
                    '&.Mui-focused fieldset': { borderColor: '#008080' }
                  }
                }}
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
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
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0,128,128,0.4)'
                  },
                  '&:disabled': {
                    background: 'rgba(0,128,128,0.3)',
                    transform: 'none'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>

              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ 
                  textTransform: 'none',
                  color: '#008080',
                  '&:hover': { background: 'rgba(0,128,128,0.1)' }
                }}
              >
                Back to Login
              </Button>
            </Box>
          </form>
        </Paper>
      </Fade>
    </Box>
  );
};

export default ResetPassword;
