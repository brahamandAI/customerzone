import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { userAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const EditUser = () => {
  const { darkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    department: '',
    role: '',
    site: '',
    // Notification preferences
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    // Permissions
    canCreateExpenses: true,
    canApproveExpenses: false,
    canManageUsers: false,
    canManageSites: false,
    canViewReports: false,
    canManageBudgets: false,
    // Address
    streetAddress: '',
    city: '',
    state: '',
    pinCode: '',
    // Bank Details
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    bankAccountHolderName: ''
  });

  const departments = ['Administration', 'Finance', 'Operations', 'HR', 'IT', 'Sales', 'Marketing'];
  const roles = ['submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'];

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError('');
      try {
        console.log('🔍 Fetching user data for ID:', userId);
        const res = await userAPI.getUser(userId);
        console.log('✅ User data received:', res.data);
        
        const user = res.data.data;
        if (!user) {
          throw new Error('No user data received');
        }
        
        console.log('📋 Setting form data for user:', user.name);
        setFormData({
          fullName: user.name || '',
          email: user.email || '',
          phoneNumber: user.phone || '',
          employeeId: user.employeeId || '',
          department: user.department || '',
          role: user.role || '',
          site: user.site?.code || '',
          // Notification preferences
          emailNotifications: user.preferences?.notifications?.email ?? true,
          pushNotifications: user.preferences?.notifications?.push ?? true,
          smsNotifications: user.preferences?.notifications?.sms ?? false,
          // Permissions
          canCreateExpenses: user.permissions?.canCreateExpenses ?? true,
          canApproveExpenses: user.permissions?.canApproveExpenses ?? false,
          canManageUsers: user.permissions?.canManageUsers ?? false,
          canManageSites: user.permissions?.canManageSites ?? false,
          canViewReports: user.permissions?.canViewReports ?? false,
          canManageBudgets: user.permissions?.canManageBudgets ?? false,
          // Address
          streetAddress: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          pinCode: user.address?.zipCode || '',
          // Bank Details
          bankAccountNumber: user.bankDetails?.accountNumber || '',
          bankIfscCode: user.bankDetails?.ifscCode || '',
          bankName: user.bankDetails?.bankName || '',
          bankAccountHolderName: user.bankDetails?.accountHolderName || ''
        });
        console.log('✅ Form data set successfully');
      } catch (err) {
        console.error('❌ Error fetching user:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If role is being changed, set appropriate permissions
    if (name === 'role') {
      let newPermissions = {
        canCreateExpenses: false,
        canApproveExpenses: false,
        canManageUsers: false,
        canManageSites: false,
        canViewReports: false,
        canManageBudgets: false
      };
      
      if (value === 'finance') {
        // Finance: admin functionality without expense creation/approval
        newPermissions = {
          canCreateExpenses: false,
          canApproveExpenses: false,
          canManageUsers: true,
          canManageSites: true,
          canViewReports: true,
          canManageBudgets: true
        };
      } else if (value === 'l3_approver') {
        // L3 Approver: full permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: true,
          canManageSites: true,
          canViewReports: true,
          canManageBudgets: true
        };
      } else if (value === 'l2_approver') {
        // L2 Approver: some admin permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: false
        };
      } else if (value === 'l1_approver') {
        // L1 Approver: basic approval permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: false
        };
      } else if (value === 'submitter') {
        // Submitter: only create expenses
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: false,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: false,
          canManageBudgets: false
        };
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        ...newPermissions
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSwitchChange = (name) => (event) => {
    setFormData(prev => ({
      ...prev,
      [name]: event.target.checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const userData = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phoneNumber,
        employeeId: formData.employeeId,
        department: formData.department,
        role: formData.role,
        address: {
          street: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          zipCode: formData.pinCode
        },
        bankDetails: {
          accountNumber: formData.bankAccountNumber,
          ifscCode: formData.bankIfscCode,
          bankName: formData.bankName,
          accountHolderName: formData.bankAccountHolderName
        },
        // Notification preferences
        emailNotifications: formData.emailNotifications,
        pushNotifications: formData.pushNotifications,
        smsNotifications: formData.smsNotifications,
        // Permissions
        canCreateExpenses: formData.canCreateExpenses,
        canApproveExpenses: formData.canApproveExpenses,
        canManageUsers: formData.canManageUsers,
        canManageSites: formData.canManageSites,
        canViewReports: formData.canViewReports,
        canManageBudgets: formData.canManageBudgets
      };

      await userAPI.updateUser(userId, userData);
      navigate('/manage-users');
    } catch (err) {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  // Check if current user can edit this user
  const canEditUser = currentUser?.role === 'l3_approver' || currentUser?.role === 'finance' || currentUser?._id === userId;

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        mt: 8,
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="primary">
          Loading user data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ 
      maxWidth: 1200, 
      mx: 'auto', 
      p: 3,
      background: darkMode ? '#1a1a1a' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        mb: 3,
        background: darkMode ? '#2a2a2a' : '#ffffff',
        border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0'
      }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
          Edit User
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Debug Info - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Debug Info:</strong> User ID: {userId} | Current User Role: {currentUser?.role} | Can Edit: {canEditUser ? 'Yes' : 'No'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Form Data:</strong> {formData.fullName ? `Loaded for ${formData.fullName}` : 'Not loaded yet'}
            </Typography>
          </Alert>
        )}
        
        {/* Basic Information */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
            Basic Information
          </Typography>
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Employee ID"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Department</InputLabel>
                <Select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
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
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Role</InputLabel>
                <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
                  disabled={!canEditUser}
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
                  {roles.map(role => (
                    <MenuItem key={role} value={role}>
                      {role === 'l3_approver' ? 'Super Admin' : 
                       role === 'finance' ? 'Finance' : 
                       role.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Notification Preferences */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
            Notification Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.emailNotifications}
                    onChange={handleSwitchChange('emailNotifications')}
                  />
                }
                label="Email Notifications"
                sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.pushNotifications}
                    onChange={handleSwitchChange('pushNotifications')}
                  />
                }
                label="Push Notifications"
                sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.smsNotifications}
                    onChange={handleSwitchChange('smsNotifications')}
                  />
                }
                label="SMS Notifications"
                sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* User Permissions Section */}
        {canEditUser && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
              User Permissions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canCreateExpenses}
                      onChange={handleSwitchChange('canCreateExpenses')}
                    />
                  }
                  label="Can Create Expenses"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canApproveExpenses}
                      onChange={handleSwitchChange('canApproveExpenses')}
                    />
                  }
                  label="Can Approve Expenses"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canManageUsers}
                      onChange={handleSwitchChange('canManageUsers')}
                    />
                  }
                  label="Can Manage Users"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canManageSites}
                      onChange={handleSwitchChange('canManageSites')}
                    />
                  }
                  label="Can Manage Sites"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canViewReports}
                      onChange={handleSwitchChange('canViewReports')}
                    />
                  }
                  label="Can View Reports"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canManageBudgets}
                      onChange={handleSwitchChange('canManageBudgets')}
                    />
                  }
                  label="Can Manage Budgets"
                  sx={{ color: darkMode ? '#e0e0e0' : '#333333' }}
            />
          </Grid>
            </Grid>
          </Box>
        )}

        {/* Address Details Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
            Address Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="PIN Code"
              name="pinCode"
              value={formData.pinCode}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          </Grid>
        </Box>

          {/* Bank Details Section */}
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
              Bank Details
            </Typography>
          <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Account Number"
              name="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="IFSC Code"
              name="bankIfscCode"
              value={formData.bankIfscCode}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Account Holder Name"
              name="bankAccountHolderName"
              value={formData.bankAccountHolderName}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                  color: darkMode ? '#e0e0e0' : '#333333',
                  '& fieldset': {
                    borderColor: darkMode ? '#333333' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#b0b0b0' : '#666666',
                  '&.Mui-focused': {
                    color: darkMode ? '#4fc3f7' : '#667eea',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#e0e0e0' : '#333333',
                },
              }}
            />
          </Grid>
        </Grid>
        </Box>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={saving}
          sx={{ mt: 3 }}
        >
          {saving ? 'Saving...' : 'Update User'}
        </Button>
      </Paper>
    </Box>
  );
};

export default EditUser; 