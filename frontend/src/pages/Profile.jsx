import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Avatar, Fade, Zoom, Card, CardContent, IconButton, Chip, Badge } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardAPI } from '../services/api';

const Profile = () => {
  const { user, getUserRole, updateUser } = useAuth();
  const { darkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    employeeId: '',
    joinDate: '',
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });

  // Save profile photo
  const handleSavePhoto = async () => {
    if (!profilePhoto) return;

    try {
      const formData = new FormData();
      formData.append('profilePhoto', profilePhoto);

      // Upload to backend
      const response = await fetch('http://localhost:5001/api/users/upload-profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // Don't set Content-Type - let browser set it automatically for FormData
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Update user context with new profile picture
        const updatedUser = { ...user, profilePicture: result.profilePicture };
        updateUser(updatedUser);
        
        // Also update the profile picture in the database via API
        try {
          const updateResponse = await fetch('http://localhost:5001/api/auth/profile-picture', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ profilePicture: result.profilePicture })
          });
          
          const updateResult = await updateResponse.json();
          if (updateResult.success) {
            console.log('✅ DEBUG: Profile picture updated in database');
          } else {
            console.error('❌ DEBUG: Failed to update profile picture in database:', updateResult.message);
          }
        } catch (error) {
          console.error('❌ DEBUG: Error updating profile picture in database:', error);
        }
        
        // Clear the temporary photo state
        setProfilePhoto(null);
        setPhotoLoadError(false); // Reset error state
        
        alert('Profile photo updated successfully!');
      } else {
        alert(result.message || 'Failed to upload profile photo');
      }
      
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile photo');
    }
  };

  // Auto-save photo when selected
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      setProfilePhoto(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoUrl(e.target.result);
      };
      reader.readAsDataURL(file);

      // Auto-save the photo
      const formData = new FormData();
      formData.append('profilePhoto', file);

      console.log('🔍 DEBUG: Uploading file:', file.name, file.size, file.type);

      try {
        const response = await fetch('http://localhost:5001/api/users/upload-profile-photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            // Don't set Content-Type - let browser set it automatically for FormData
          },
          body: formData
        });

        console.log('🔍 DEBUG: Response status:', response.status);
        console.log('🔍 DEBUG: Response headers:', response.headers);

        const result = await response.json();
        console.log('🔍 DEBUG: Response result:', result);

        if (result.success) {
          // Update user context with new profile picture
          const updatedUser = { ...user, profilePicture: result.profilePicture };
          updateUser(updatedUser);
          
          // Also update the profile picture in the database via API
          try {
            const updateResponse = await fetch('http://localhost:5001/api/auth/profile-picture', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ profilePicture: result.profilePicture })
            });
            
            const updateResult = await updateResponse.json();
            if (updateResult.success) {
              console.log('✅ DEBUG: Profile picture updated in database');
            } else {
              console.error('❌ DEBUG: Failed to update profile picture in database:', updateResult.message);
            }
          } catch (error) {
            console.error('❌ DEBUG: Error updating profile picture in database:', error);
          }
          
          // Clear the temporary photo state
          setProfilePhoto(null);
          setPhotoLoadError(false); // Reset error state
          
          alert('Profile photo updated successfully!');
        } else {
          console.error('❌ DEBUG: Upload failed:', result.message);
          alert(result.message || 'Failed to upload profile photo');
        }
        
      } catch (error) {
        console.error('❌ DEBUG: Network error:', error);
        alert('Failed to upload profile photo');
      }
    }
  };

  // Handle photo upload click
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Initialize profile data from user context and fetch user stats
  useEffect(() => {
    const initializeProfile = async () => {
      if (user) {
        const userRole = getUserRole();
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: userRole || user.role || '',
          department: user.department || 'External',
          employeeId: user.employeeId || '',
          joinDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
          bankName: user.bankDetails?.bankName || '',
          accountNumber: user.bankDetails?.accountNumber || '',
          ifscCode: user.bankDetails?.ifscCode || ''
        });

        // Fetch real user statistics
        try {
          const response = await dashboardAPI.getOverview();
          if (response.data.success) {
            setUserStats(response.data.data);
            setStatsError(null);
          }
        } catch (error) {
          console.error('Error fetching user stats:', error);
          setStatsError('Failed to load statistics');
        }
        
        setLoading(false);
      }
    };

    initializeProfile();
  }, [user, getUserRole]);

  // Dynamic stats based on user role and real data
  const getStats = () => {
    const userRole = getUserRole();
    
    if (!userStats) {
      // Return loading placeholders if stats haven't loaded yet
      return [
        { label: 'Loading...', value: '...', icon: '⏳' },
        { label: 'Loading...', value: '...', icon: '⏳' },
        { label: 'Loading...', value: '...', icon: '⏳' },
        { label: 'Loading...', value: '...', icon: '⏳' }
      ];
    }

    if (statsError) {
      // Return error placeholders if stats failed to load
      return [
        { label: 'Error Loading', value: 'N/A', icon: '❌' },
        { label: 'Error Loading', value: 'N/A', icon: '❌' },
        { label: 'Error Loading', value: 'N/A', icon: '❌' },
        { label: 'Error Loading', value: 'N/A', icon: '❌' }
      ];
    }

    if (userRole === 'L3_APPROVER') {
      return [
        { 
          label: 'Total Expenses Processed', 
          value: `₹${userStats.userStats?.totalAmount?.toLocaleString() || 0}`, 
          icon: '₹' 
        },
        { 
          label: 'Pending Payments', 
          value: userStats.userStats?.pendingExpenses || 0, 
          icon: '⏳' 
        },
        { 
          label: 'Processed This Month', 
          value: `₹${userStats.userStats?.totalAmount?.toLocaleString() || 0}`, 
          icon: '✅' 
        },
        { 
          label: 'Sites Managed', 
          value: userStats.systemStats?.totalSites || 0, 
          icon: '🏢' 
        }
      ];
    } else if (userRole === 'L2_APPROVER' || userRole === 'L1_APPROVER') {
      return [
        { 
          label: 'Total Expenses Reviewed', 
          value: `₹${userStats.userStats?.totalAmount?.toLocaleString() || 0}`, 
          icon: '₹' 
        },
        { 
          label: 'Pending Approvals', 
          value: userStats.pendingApprovalsCount || 0, 
          icon: '⏳' 
        },
        { 
          label: user?.role?.toLowerCase() === 'l3_approver' ? 'Processed Payments' : 'Approved This Month', 
          value: `₹${userStats.userStats?.totalAmount?.toLocaleString() || 0}`, 
          icon: '✅' 
        },
        { 
          label: 'Sites Managed', 
          value: userStats.systemStats?.totalSites || 0, 
          icon: '🏢' 
        }
      ];
    } else {
      // Submitter stats - using real data
      return [
        { 
          label: 'Total Expenses Submitted', 
          value: userStats.userStats?.totalExpenses || 0, 
          icon: '₹' 
        },
        { 
          label: 'Total Amount', 
          value: `₹${userStats.userStats?.totalAmount?.toLocaleString() || 0}`, 
          icon: '₹' 
        },
        { 
          label: 'Pending Approvals', 
          value: userStats.userStats?.pendingExpenses || 0, 
          icon: '⏳' 
        },
        { 
          label: 'Rejected This Month', 
          value: userStats.userStats?.rejectedExpenses || 0, 
          icon: '❌' 
        }
      ];
    }
  };

  const stats = getStats();

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to backend
    console.log('Profile data saved:', profileData);
    // TODO: Implement API call to update user profile
    // Example: await userAPI.updateProfile(profileData);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
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
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight={900} color="white" textAlign="center" gutterBottom sx={{ mb: 4, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            My Profile
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <Typography variant="h6" color="white">Loading profile data...</Typography>
            </Box>
          ) : (
          
          <Grid container spacing={3}>
            {/* Profile Header */}
            <Grid item xs={12}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={24} sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ position: 'relative', mr: 3 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <IconButton
                              onClick={handlePhotoClick}
                              sx={{
                                bgcolor: '#667eea',
                                color: 'white',
                                width: 32,
                                height: 32,
                                '&:hover': { bgcolor: '#5a6fd8' }
                              }}
                            >
                              <CameraAltIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          }
                        >
                          <Avatar 
                            sx={{ 
                              width: 80, 
                              height: 80, 
                              bgcolor: '#667eea', 
                              fontSize: '2rem',
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 }
                            }}
                            src={!photoLoadError && user?.profilePicture ? `http://localhost:5001/api/users/profile-photo/${user.profilePicture}` : profilePhotoUrl}
                            onClick={handlePhotoClick}
                            onError={(e) => {
                              setPhotoLoadError(true);
                            }}
                            crossOrigin="anonymous"
                          >
                            {profileData.name.charAt(0)}
                          </Avatar>
                        </Badge>
                        
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </Box>
                      
                      <Box>
                        <Typography variant="h4" fontWeight={700} color="#667eea">
                          {profileData.name}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                          {profileData.role} • {profileData.department}
                        </Typography>
                        <Chip label={profileData.employeeId} color="primary" size="small" sx={{ mt: 1 }} />
                        
                        
                      </Box>
                    </Box>
                    <IconButton 
                      onClick={() => setIsEditing(!isEditing)}
                      sx={{ 
                        bgcolor: isEditing ? '#f44336' : '#667eea',
                        color: 'white',
                        '&:hover': { bgcolor: isEditing ? '#d32f2f' : '#5a6fd8' }
                      }}
                    >
                      {isEditing ? <CancelIcon /> : <EditIcon />}
                    </IconButton>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            {/* Stats Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {stats.map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={stat.label}>
                    <Zoom in style={{ transitionDelay: `${400 + index * 100}ms` }}>
                                             <Card elevation={8} sx={{ 
                         borderRadius: 3, 
                         background: darkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)',
                         backdropFilter: 'blur(10px)',
                         transition: '0.3s',
                         border: '2px solid rgba(102, 126, 234, 0.1)',
                         '&:hover': { 
                           transform: 'translateY(-5px)', 
                           boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                           border: '2px solid rgba(102, 126, 234, 0.3)'
                         }
                       }}>
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                                                     <Typography variant="h2" sx={{ mb: 1, fontSize: '3rem', fontWeight: 'bold', color: '#667eea' }}>{stat.icon}</Typography>
                                                     <Typography variant="h5" fontWeight={700} color="#667eea" gutterBottom sx={{ fontSize: '1.5rem', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                             {stat.value}
                           </Typography>
                          <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                            {stat.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Profile Details */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AccountCircleIcon sx={{ color: '#667eea', mr: 2, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600} color="#667eea">
                      Personal Information
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        variant="outlined"
                        value={profileData.name}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        InputProps={{
                          startAdornment: <AccountCircleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        variant="outlined"
                        value={profileData.email}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        InputProps={{
                          startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone"
                        variant="outlined"
                        value={profileData.phone}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        InputProps={{
                          startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Role"
                        variant="outlined"
                        value={profileData.role}
                        disabled={true} // Role should not be editable
                        InputProps={{
                          startAdornment: <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Department"
                        variant="outlined"
                        value={profileData.department}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                        InputProps={{
                          startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Employee ID"
                        variant="outlined"
                        value={profileData.employeeId}
                        disabled={true} // Employee ID should not be editable
                        InputProps={{
                          startAdornment: <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Join Date"
                        variant="outlined"
                        value={profileData.joinDate}
                        disabled={true} // Join date should not be editable
                        InputProps={{
                          startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Zoom>
            </Grid>

            {/* Bank Details */}
            <Grid item xs={12} md={6}>
              <Zoom in style={{ transitionDelay: '800ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  height: 'fit-content',
                  border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SecurityIcon sx={{ color: darkMode ? '#4fc3f7' : '#667eea', mr: 2, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#4fc3f7' : '#667eea'}>
                      Bank Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        variant="outlined"
                        value={profileData.bankName}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, bankName: e.target.value})}
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
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Account Number"
                        variant="outlined"
                        value={profileData.accountNumber}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, accountNumber: e.target.value})}
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
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="IFSC Code"
                        variant="outlined"
                        value={profileData.ifscCode}
                        disabled={!isEditing}
                        onChange={(e) => setProfileData({...profileData, ifscCode: e.target.value})}
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
                  
                  {isEditing && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        sx={{
                          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                          borderRadius: 2,
                          px: 3
                        }}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setIsEditing(false)}
                        sx={{ borderRadius: 2, px: 3 }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default Profile; 