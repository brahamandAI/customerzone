import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Avatar, Fade, Zoom, Card, CardContent, IconButton, Chip, MenuItem, FormControl, InputLabel, Select, Alert, Snackbar, CircularProgress, Divider, List, ListItem, ListItemText, ListItemIcon, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteIcon from '@mui/icons-material/Delete';
import { siteAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const CreateSite = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '', // Site Name
    code: '', // Site Code
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    phone: '',
    email: '',
    monthlyBudget: '',
    yearlyBudget: '',
    budgetAlertThreshold: 80, // Default 80%
    vehicleKmLimit: 1000 // Default 1000 KM
  });

  const [categoryBudgets, setCategoryBudgets] = useState([
    { category: 'Petty', budget: '', used: 0 },
    { category: 'Material', budget: '', used: 0 },
    { category: 'Misc. Expense', budget: '', used: 0 },
    { category: 'Fuel', budget: '', used: 0 },
    { category: 'Equipment', budget: '', used: 0 },
    { category: 'Maintenance', budget: '', used: 0 },
    { category: 'Travel', budget: '', used: 0 },
    { category: 'Office Supplies', budget: '', used: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCategoryBudgetChange = (index, field, value) => {
    const updatedBudgets = [...categoryBudgets];
    updatedBudgets[index] = { ...updatedBudgets[index], [field]: value };
    setCategoryBudgets(updatedBudgets);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    

    
    const siteData = {
      name: formData.name,
      code: formData.code,
      location: {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: 'India'
      },
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      budget: {
        monthly: Number(formData.monthlyBudget),
        yearly: Number(formData.yearlyBudget),
        alertThreshold: Number(formData.budgetAlertThreshold)
      },
      vehicleKmLimit: Number(formData.vehicleKmLimit),
      categoryBudgets,
      createdBy: user?._id
    };
    try {
      const res = await siteAPI.create(siteData);
      if (res.data.success) {
        setSuccess('✅ Site created successfully!');
        // Optionally reset form here
      } else {
        setError(res.data.message || 'Failed to create site');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkMode 
          ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.01"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight={900} color="white" textAlign="center" gutterBottom sx={{ mb: 4, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Create New Site
          </Typography>
          
          <Grid container justifyContent="center">
            <Grid item xs={12} md={8} lg={6}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={24} sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: darkMode ? '#4fc3f7' : '#667eea', mr: 2, width: 56, height: 56 }}>
                      <BusinessIcon fontSize="large" />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} color={darkMode ? '#4fc3f7' : '#667eea'}>
                      Site Information
                    </Typography>
                  </Box>
                  
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Site Name"
                          variant="outlined"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Site Code"
                          variant="outlined"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Address"
                          variant="outlined"
                          multiline
                          rows={3}
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="City"
                          variant="outlined"
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="State"
                          variant="outlined"
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Pincode"
                          variant="outlined"
                          value={formData.pincode}
                          onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Contact Person"
                          variant="outlined"
                          value={formData.contactPerson}
                          onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          variant="outlined"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          variant="outlined"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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

                      {/* Budget Configuration Section */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }}>
                          <Chip 
                            icon={<CurrencyRupeeIcon />}
                            label="Budget Configuration" 
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        </Divider>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Monthly Budget (₹)"
                          type="number"
                          variant="outlined"
                          value={formData.monthlyBudget}
                          onChange={(e) => setFormData({...formData, monthlyBudget: e.target.value})}
                          InputProps={{
                            startAdornment: <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ mr: 1 }}>₹</Typography>
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Yearly Budget (₹)"
                          type="number"
                          variant="outlined"
                          value={formData.yearlyBudget}
                          onChange={(e) => setFormData({...formData, yearlyBudget: e.target.value})}
                          InputProps={{
                            startAdornment: <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ mr: 1 }}>₹</Typography>
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Budget Alert Threshold</InputLabel>
                          <Select
                            value={formData.budgetAlertThreshold}
                            label="Budget Alert Threshold"
                            onChange={(e) => setFormData({...formData, budgetAlertThreshold: e.target.value})}
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
                            <MenuItem value={70}>70% - Early Warning</MenuItem>
                            <MenuItem value={80}>80% - Standard Alert</MenuItem>
                            <MenuItem value={90}>90% - Critical Alert</MenuItem>
                            <MenuItem value={95}>95% - Emergency Alert</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Vehicle KM Limit"
                          type="number"
                          variant="outlined"
                          value={formData.vehicleKmLimit}
                          onChange={(e) => setFormData({...formData, vehicleKmLimit: e.target.value})}
                          InputProps={{
                            endAdornment: <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ ml: 1 }}>KM</Typography>
                          }}
                          helperText="Monthly vehicle kilometer limit for this site"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                              }
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

                      <Grid item xs={12}>
                        <Typography variant="h6" fontWeight={600} color={darkMode ? '#4fc3f7' : '#667eea'} gutterBottom>
                          Category-wise Budget Allocation
                        </Typography>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ mb: 2 }}>
                          Set individual budgets for each expense category
                        </Typography>
                      </Grid>

                      {categoryBudgets.map((category, index) => (
                        <Grid item xs={12} sm={6} key={category.category}>
                          <TextField
                            fullWidth
                            label={`${category.category} Budget (₹)`}
                            type="number"
                            variant="outlined"
                            value={category.budget}
                            onChange={(e) => handleCategoryBudgetChange(index, 'budget', e.target.value)}
                            InputProps={{
                              startAdornment: <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ mr: 1 }}>₹</Typography>
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                                color: darkMode ? '#e0e0e0' : '#333333',
                                '& fieldset': {
                                  borderColor: darkMode ? '#333333' : '#e0e0e0',
                                },
                                '&:hover fieldset': { 
                                  borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                                },
                                '&.Mui-focused fieldset': { 
                                  borderColor: darkMode ? '#4fc3f7' : '#667eea' 
                                }
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
                      ))}

                      <Grid item xs={12}>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: darkMode ? 'rgba(79, 195, 247, 0.1)' : 'rgba(102, 126, 234, 0.1)', 
                          borderRadius: 2, 
                          border: darkMode ? '1px solid rgba(79, 195, 247, 0.2)' : '1px solid rgba(102, 126, 234, 0.2)' 
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CurrencyRupeeIcon sx={{ color: darkMode ? '#4fc3f7' : '#667eea', mr: 1 }} />
                            <Typography variant="h6" fontWeight={600} color={darkMode ? '#4fc3f7' : '#667eea'}>
                              Budget Summary
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                            Total Allocated Budget: ₹{categoryBudgets.reduce((sum, cat) => sum + (parseFloat(cat.budget) || 0), 0).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                            Alert Threshold: {formData.budgetAlertThreshold}% of budget utilization
                          </Typography>
                        </Box>
                      </Grid>
                      {success && <Typography color="success.main" sx={{ mb: 2 }}>{success}</Typography>}
                      {error && <Typography color="error.main" sx={{ mb: 2 }}>{error}</Typography>}
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          startIcon={<AddIcon />}
                          disabled={loading}
                          sx={{
                            background: darkMode ? 'linear-gradient(45deg, #4fc3f7 30%, #29b6f6 90%)' : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                            borderRadius: 3,
                            py: 1.5,
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: darkMode ? '0 8px 32px rgba(79, 195, 247, 0.3)' : '0 8px 32px rgba(102, 126, 234, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: darkMode ? '0 12px 40px rgba(79, 195, 247, 0.4)' : '0 12px 40px rgba(102, 126, 234, 0.4)'
                            }
                          }}
                        >
                          {loading ? 'Creating...' : 'Create Site with Budget Configuration'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default CreateSite; 