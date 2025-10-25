import React, { useState, useEffect } from 'react';
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
  Avatar,
  IconButton,
  Tooltip,
  FormHelperText
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { siteAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CreateUser = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    department: 'Administration',
    role: 'SUBMITTER',
    site: '', // Changed from assignedSites to site for single site selection
    initialPassword: '',
    confirmPassword: '',
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
  const roles = ['SUBMITTER', 'L1_APPROVER', 'L2_APPROVER', 'L3_APPROVER', 'finance'];
  const [sites, setSites] = useState([]);

  useEffect(() => {
    siteAPI.getAll().then(res => {
      setSites(res.data.data || []);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If this is a site selection, store the site code in localStorage
    if (name === 'site') {
      localStorage.setItem('selectedSiteCode', value);
    }
    
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
      } else if (value === 'L3_APPROVER') {
        // L3 Approver: full permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: true,
          canManageSites: true,
          canViewReports: true,
          canManageBudgets: true
        };
      } else if (value === 'L2_APPROVER') {
        // L2 Approver: some admin permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: false
        };
      } else if (value === 'L1_APPROVER') {
        // L1 Approver: basic approval permissions
        newPermissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: false
        };
      } else if (value === 'SUBMITTER') {
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
    setLoading(true);
    setError('');

    try {
      // Get the site code from localStorage if available
      const siteCode = localStorage.getItem('selectedSiteCode') || formData.site;
      
      const userData = {
        ...formData,
        site: siteCode, // Send the site code to backend
        bankAccountNumber: formData.bankAccountNumber,
        bankIfscCode: formData.bankIfscCode,
        bankName: formData.bankName,
        bankAccountHolderName: formData.bankAccountHolderName
      };

      const response = await userAPI.createUser(userData);
      if (response.data.success) {
        // Clear the stored site code after successful creation
        localStorage.removeItem('selectedSiteCode');
        
        // Show success message using alert for now
        alert('User created successfully!');
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Basic Information Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: darkMode ? '#4fc3f7' : 'primary.main'
          }}>
            <Avatar sx={{ bgcolor: darkMode ? '#4fc3f7' : 'primary.main', width: 32, height: 32 }}>👤</Avatar>
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
                type="email"
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
                helperText="Format: RSI-YYYY-NNN (e.g., RSI-2024-001)"
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
                  '& .MuiFormHelperText-root': {
                    color: darkMode ? '#b0b0b0' : '#666666',
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
                      {role === 'L3_APPROVER' ? 'Super Admin' : 
                       role === 'finance' ? 'Finance' : 
                       role.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Site field - Only show for roles that need a site */}
            {(formData.role === 'SUBMITTER' || formData.role === 'L1_APPROVER' || formData.role === 'L2_APPROVER') && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Site</InputLabel>
                  <Select
                    name="site"
                    value={formData.site}
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
                    {sites.map(site => (
                      <MenuItem key={site._id} value={site.code}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Initial Password"
                name="initialPassword"
                type="password"
                value={formData.initialPassword}
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
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
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
          </Grid>

          {/* Notification Preferences */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
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
        </Box>

        {/* User Permissions Section */}
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
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
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
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
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
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="PIN Code"
                name="pinCode"
                value={formData.pinCode}
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
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="IFSC Code"
                name="bankIfscCode"
                value={formData.bankIfscCode}
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
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
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
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Account Holder Name"
                name="bankAccountHolderName"
                value={formData.bankAccountHolderName}
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
          </Grid>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </Paper>
    </Box>
  );
};

export default CreateUser; 