import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Avatar, Fade, Zoom, Chip, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { categoryAPI, siteAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const CreateCategory = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budgetLimit: '',
    color: '#1976d2',
    siteId: '' // Will be set based on user role
  });

  const [sites, setSites] = useState([]);
  const [showSiteSelection, setShowSiteSelection] = useState(false);

  // Load sites for Super Admin and Finance users
  useEffect(() => {
    const loadSites = async () => {
      if (user?.role === 'l3_approver' || user?.role === 'finance') {
        try {
          const response = await siteAPI.getAll();
          if (response.data.success) {
            setSites(response.data.data || []);
            setShowSiteSelection(true);
          }
        } catch (error) {
          console.error('Error loading sites:', error);
        }
      } else {
        // For other users, use their assigned site
        const userSiteId = user?.site?._id || user?.siteId;
        console.log('🔍 CreateCategory site assignment debug:', {
          userSiteId,
          userSiteType: typeof userSiteId,
          userSite: user?.site
        });
        if (userSiteId) {
          setFormData(prev => ({ ...prev, siteId: userSiteId }));
        }
      }
    };

    loadSites();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      // For Super Admin and Finance, use selected site
      // For other users, use their assigned site
      let siteId = formData.siteId;
      
      if (!siteId) {
        if (user?.role === 'l3_approver' || user?.role === 'finance') {
          setError('Please select a site for the category.');
        } else {
          setError('User is not assigned to any site. Please contact administrator.');
        }
        setLoading(false);
        return;
      }

      const categoryData = {
        siteId: siteId,
        name: formData.name,
        description: formData.description,
        budgetLimit: Number(formData.budgetLimit) || 0,
        color: formData.color,
        isActive: true
      };

      const response = await categoryAPI.create(categoryData);
      
      if (response.data.success) {
        setSuccess('✅ Category created successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to create category');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
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
          ? 'url("data:image/svg+xml,%3Csvg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.01"%3E%3Cpath d="M40 40c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          : 'url("data:image/svg+xml,%3Csvg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M40 40c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'pulse 15s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 0.8 }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight={900} color="white" textAlign="center" gutterBottom sx={{ mb: 4, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Create Expense Category
          </Typography>
          
          <Grid container justifyContent="center">
            <Grid item xs={12} md={8} lg={6}>
              <Zoom in style={{ transitionDelay: '300ms' }}>
                <Paper elevation={24} sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: darkMode ? '#4fc3f7' : '#f093fb', mr: 2, width: 56, height: 56 }}>
                      <CategoryIcon fontSize="large" />
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} color={darkMode ? '#4fc3f7' : '#f093fb'}>
                      Category Details
                    </Typography>
                  </Box>
                  
                  <form onSubmit={handleSubmit}>
                                         <Grid container spacing={3}>
                       {/* Site Selection for Super Admin and Finance */}
                       {showSiteSelection && (
                         <Grid item xs={12}>
                           <FormControl fullWidth>
                             <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>Select Site</InputLabel>
                             <Select
                               value={formData.siteId}
                               onChange={(e) => setFormData({...formData, siteId: e.target.value})}
                               required
                               sx={{
                                 backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                                 color: darkMode ? '#e0e0e0' : '#333333',
                                 '& .MuiOutlinedInput-notchedOutline': {
                                   borderColor: darkMode ? '#333333' : '#e0e0e0',
                                 },
                                 '&:hover .MuiOutlinedInput-notchedOutline': {
                                   borderColor: darkMode ? '#4fc3f7' : '#f093fb',
                                 },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                   borderColor: darkMode ? '#4fc3f7' : '#f093fb',
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
                               <MenuItem value="">
                                 <em>Select a site</em>
                               </MenuItem>
                               {sites.map(site => (
                                 <MenuItem key={site._id} value={site._id}>
                                   {site.name} ({site.code})
                                 </MenuItem>
                               ))}
                             </Select>
                           </FormControl>
                         </Grid>
                       )}
                       
                       <Grid item xs={12}>
                         <TextField
                          fullWidth
                          label="Category Name"
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
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              }
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#f093fb',
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
                          label="Description"
                          variant="outlined"
                          multiline
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              }
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#f093fb',
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
                          label="Budget Limit (₹)"
                          variant="outlined"
                          type="number"
                          value={formData.budgetLimit}
                          onChange={(e) => setFormData({...formData, budgetLimit: e.target.value})}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              },
                              '&.Mui-focused fieldset': { 
                                borderColor: darkMode ? '#4fc3f7' : '#f093fb' 
                              }
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#f093fb',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: darkMode ? '#e0e0e0' : '#333333',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>Color:</Typography>
                          <Chip 
                            label="Default" 
                            sx={{ 
                              bgcolor: formData.color, 
                              color: 'white',
                              fontWeight: 600,
                              '&:hover': { opacity: 0.8 }
                            }} 
                          />
                        </Box>
                      </Grid>
                      
                      {/* Success and Error Messages */}
                      {success && (
                        <Grid item xs={12}>
                          <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                          </Alert>
                        </Grid>
                      )}
                      {error && (
                        <Grid item xs={12}>
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                          </Alert>
                        </Grid>
                      )}
                      
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          startIcon={loading ? null : <AddIcon />}
                          disabled={loading}
                          sx={{
                            background: darkMode ? 'linear-gradient(45deg, #4fc3f7 30%, #29b6f6 90%)' : 'linear-gradient(45deg, #f093fb 30%, #f5576c 90%)',
                            borderRadius: 3,
                            py: 1.5,
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: darkMode ? '0 8px 32px rgba(79, 195, 247, 0.3)' : '0 8px 32px rgba(240, 147, 251, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: darkMode ? '0 12px 40px rgba(79, 195, 247, 0.4)' : '0 12px 40px rgba(240, 147, 251, 0.4)'
                            }
                          }}
                        >
                          {loading ? 'Creating...' : 'Create Category'}
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

export default CreateCategory; 