import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Avatar, Fade, Zoom, Alert, Snackbar, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { siteAPI } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

const EditSite = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: ''
    },
    contactPerson: '',
    phone: '',
    email: '',
    budget: {
      monthly: '',
      yearly: ''
    },
    vehicleKmLimit: '',
    categoryBudgets: [],
    isActive: true
  });

  // Load site data
  useEffect(() => {
    const fetchSite = async () => {
      try {
        const response = await siteAPI.getById(siteId);
        if (response.data.success) {
          const site = response.data.data;
          setFormData({
            name: site.name || '',
            code: site.code || '',
            location: {
              address: site.location?.address || '',
              city: site.location?.city || '',
              state: site.location?.state || '',
              pincode: site.location?.pincode || ''
            },
            contactPerson: site.contactPerson || '',
            phone: site.phone || '',
            email: site.email || '',
            budget: {
              monthly: site.budget?.monthly || '',
              yearly: site.budget?.yearly || ''
            },
            vehicleKmLimit: site.vehicleKmLimit || '',
            categoryBudgets: site.categoryBudgets || [],
            isActive: site.isActive !== undefined ? site.isActive : true
          });
        }
      } catch (err) {
        setError('Failed to load site data');
        console.error('Error fetching site:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchSite();
  }, [siteId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await siteAPI.update(siteId, formData);
      if (response.data.success) {
        setSuccess('Site updated successfully!');
        setTimeout(() => {
          navigate('/manage-sites');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to update site');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update site');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{
        minHeight: '100vh',
        background: darkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Typography color="white">Loading site data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: darkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/manage-sites')}
              sx={{ mr: 2, color: 'white' }}
            >
              Back to Sites
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <img
                src="/rakshak-logo.png"
                alt="Rakshak Securitas Logo"
                style={{ height: '40px' }}
              />
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', ml: 2 }}>
                <BusinessIcon />
              </Avatar>
            </Box>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Edit Site
            </Typography>
          </Box>

          {/* Form */}
          <Zoom in style={{ transitionDelay: '200ms' }}>
            <Paper elevation={16} sx={{
              p: 4,
              borderRadius: 3,
              background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
              maxWidth: 800,
              mx: 'auto'
            }}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#4caf50' }}>
                      Basic Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Site Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Site Code"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  {/* Location Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#4caf50' }}>
                      Location Details
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      name="location.address"
                      value={formData.location.address}
                      onChange={handleChange}
                      required
                      multiline
                      rows={2}
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="City"
                      name="location.city"
                      value={formData.location.city}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="State"
                      name="location.state"
                      value={formData.location.state}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Pincode"
                      name="location.pincode"
                      value={formData.location.pincode}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  {/* Contact Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#4caf50' }}>
                      Contact Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contact Person"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  {/* Budget Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#4caf50' }}>
                      Budget Configuration
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Monthly Budget (₹)"
                      name="budget.monthly"
                      type="number"
                      value={formData.budget.monthly}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Yearly Budget (₹)"
                      name="budget.yearly"
                      type="number"
                      value={formData.budget.yearly}
                      onChange={handleChange}
                      required
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Vehicle KM Limit"
                      name="vehicleKmLimit"
                      type="number"
                      value={formData.vehicleKmLimit}
                      onChange={handleChange}
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Site Status</InputLabel>
                      <Select
                        name="isActive"
                        value={formData.isActive}
                        onChange={handleChange}
                        label="Site Status"
                      >
                        <MenuItem value={true}>Active</MenuItem>
                        <MenuItem value={false}>Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Submit Button */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/manage-sites')}
                        sx={{ px: 4, py: 1.5 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                          color: 'white',
                          fontWeight: 600,
                          px: 4,
                          py: 1.5,
                          '&:hover': {
                            background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)'
                          }
                        }}
                      >
                        {loading ? 'Updating...' : 'Update Site'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Zoom>
        </Box>
      </Fade>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={!!success || !!error}
        autoHideDuration={6000}
        onClose={() => { setSuccess(''); setError(''); }}
      >
        <Alert
          onClose={() => { setSuccess(''); setError(''); }}
          severity={success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {success || error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditSite;
