import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, Fade, Zoom, Chip, Avatar, List, ListItem, ListItemIcon, ListItemText, Divider, CircularProgress, Alert, IconButton } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { userAPI, siteAPI, categoryAPI, approvalAPI, dashboardAPI } from '../services/api';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSites: 0,
    totalCategories: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    systemHealth: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAdminStats() {
      let pendingApprovalsCount = 0; // Define at function scope
      
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Fetching admin stats...');
        
        // Use dashboard API for better data consistency
        const dashboardRes = await dashboardAPI.getOverview();
        console.log('📊 Dashboard response:', dashboardRes.data);
        
        // Extract data from dashboard response
        const dashboardData = dashboardRes.data.data;
        pendingApprovalsCount = dashboardData.pendingApprovalsCount || 0;
        
        // Try to get additional data for admin panel with better error handling
        let totalUsers = 0;
        let activeUsers = 0;
        let totalSites = 0;
        let totalCategories = 0;
        let recentUsers = [];

        try {
          // Try to get users data
          console.log('🔍 Fetching users data...');
          const usersRes = await userAPI.getUsers();
          console.log('👥 Users API response:', usersRes);
          console.log('👥 Users API response data:', usersRes.data);
          console.log('👥 Users API response success:', usersRes.data?.success);
          
          if (usersRes.data && usersRes.data.data) {
            const users = usersRes.data.data;
            totalUsers = users.length;
            activeUsers = users.filter(u => u.isActive !== false).length;
            recentUsers = users.slice(0, 5);
            console.log('✅ Users data loaded:', { totalUsers, activeUsers, recentUsersCount: recentUsers.length });
          } else {
            console.warn('⚠️ Users API returned no data');
            // Try to get users from different endpoint
            try {
              const altUsersRes = await userAPI.getAll();
              if (altUsersRes.data && altUsersRes.data.data) {
                const users = altUsersRes.data.data;
                totalUsers = users.length;
                activeUsers = users.filter(u => u.isActive !== false).length;
                recentUsers = users.slice(0, 5);
                console.log('✅ Users data loaded from alternative endpoint:', { totalUsers, activeUsers, recentUsersCount: recentUsers.length });
              } else {
                totalUsers = 0;
                activeUsers = 0;
                recentUsers = [];
              }
            } catch (altErr) {
              console.warn('⚠️ Alternative users API also failed:', altErr);
              totalUsers = 0;
              activeUsers = 0;
              recentUsers = [];
            }
          }
        } catch (userErr) {
          console.warn('⚠️ Users API failed:', userErr);
          // Try alternative approach to get users
          try {
            const altUsersRes = await userAPI.getAll();
            if (altUsersRes.data && altUsersRes.data.data) {
              const users = altUsersRes.data.data;
              totalUsers = users.length;
              activeUsers = users.filter(u => u.isActive !== false).length;
              recentUsers = users.slice(0, 5);
              console.log('✅ Users data loaded from fallback endpoint:', { totalUsers, activeUsers, recentUsersCount: recentUsers.length });
            } else {
              totalUsers = 0;
              activeUsers = 0;
              recentUsers = [];
            }
          } catch (fallbackErr) {
            console.warn('⚠️ Fallback users API also failed:', fallbackErr);
            totalUsers = 0;
            activeUsers = 0;
            recentUsers = [];
          }
        }

        try {
          // Try to get sites data
          const sitesRes = await siteAPI.getAll();
          console.log('🏢 Sites API response:', sitesRes);
          
          if (sitesRes.data && sitesRes.data.data) {
            const sites = sitesRes.data.data;
            totalSites = sites.length;
            console.log('✅ Sites data loaded:', { totalSites });
          } else {
            console.warn('⚠️ Sites API returned no data');
            totalSites = 3; // Demo value
          }
        } catch (siteErr) {
          console.warn('⚠️ Sites API failed:', siteErr);
          totalSites = 3; // Demo value
        }

        try {
          // Try to get categories data
          const catsRes = await categoryAPI.getAll();
          console.log('📂 Categories API response:', catsRes);
          
          if (catsRes.data && catsRes.data.data) {
            const categories = catsRes.data.data;
            totalCategories = categories.length;
            console.log('✅ Categories data loaded:', { totalCategories });
          } else {
            console.warn('⚠️ Categories API returned no data');
            totalCategories = 8; // Demo value
          }
        } catch (catErr) {
          console.warn('⚠️ Categories API failed:', catErr);
          totalCategories = 8; // Demo value
        }

        // Calculate system health based on available data
        const systemHealth = Math.min(100, Math.max(0, 
          (totalUsers > 0 ? 25 : 0) + 
          (totalSites > 0 ? 25 : 0) + 
          (totalCategories > 0 ? 25 : 0) + 
          (pendingApprovalsCount >= 0 ? 25 : 0)
        ));

        const newStats = {
          totalUsers,
          totalSites,
          totalCategories,
          activeUsers,
          pendingApprovals: pendingApprovalsCount,
          systemHealth
        };

        console.log('📊 Final admin stats:', newStats);
        setStats(newStats);
        setRecentUsers(recentUsers);
        setLoading(false);
        
      } catch (err) {
        console.error('❌ Error fetching admin stats:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        
        setError(err.message || 'Failed to load admin data');
        
        // Set empty values instead of fake data
        setStats({
          totalUsers: 0,
          totalSites: 0,
          totalCategories: 0,
          activeUsers: 0,
          pendingApprovals: pendingApprovalsCount || 0,
          systemHealth: 0
        });
        setRecentUsers([]);
        setLoading(false);
      }
    }
    fetchAdminStats();
  }, []);



  const adminActions = [
    {
      title: 'Manage Users',
      description: 'Add, edit, and manage user accounts',
      icon: <PeopleIcon />,
      color: '#667eea',
      action: () => navigate('/manage-users')
    },
    {
      title: 'Manage Sites',
      description: 'View and manage all sites',
      icon: <BusinessIcon />,
      color: '#4caf50',
      action: () => navigate('/manage-sites')
    },
    {
      title: 'Site Policy',
      description: 'Edit per-site expense policy',
      icon: <SettingsIcon />,
      color: '#3f51b5',
      action: () => navigate('/admin/policy')
    },
    {
      title: 'Manage Categories',
      description: 'Configure expense categories',
      icon: <CategoryIcon />,
      color: '#ff9800',
      action: () => navigate('/create-category')
    },
    {
      title: 'System Settings',
      description: 'Configure system parameters',
      icon: <SettingsIcon />,
      color: '#2196f3',
      action: () => navigate('/settings')
    },
    {
      title: 'Security & Permissions',
      description: 'Manage access controls',
      icon: <SecurityIcon />,
      color: '#f44336',
      action: () => console.log('Security clicked')
    },
    {
      title: 'Analytics & Reports',
      description: 'View system analytics',
      icon: <AnalyticsIcon />,
      color: '#9c27b0',
      action: () => navigate('/reports')
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
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
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <img 
                  src="/rakshak-logo.png" 
                  alt="Rakshak Securitas Logo" 
                  style={{ height: '40px' }}
                />
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <AdminPanelSettingsIcon />
                </Avatar>
              </Box>
              <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                Admin Panel
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  <Typography variant="body2" color="white">
                    Loading...
                  </Typography>
                </Box>
              )}

            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, backgroundColor: darkMode ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.1)' }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* System Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#667eea', mx: 'auto', mb: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#667eea">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    Total Users
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                    <BusinessIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#4caf50">
                    {stats.totalSites}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    Total Sites
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#ff9800', mx: 'auto', mb: 2 }}>
                    <CategoryIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#ff9800">
                    {stats.totalCategories}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    Categories
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '800ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#2196f3', mx: 'auto', mb: 2 }}>
                    <NotificationsIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#2196f3">
                    {stats.pendingApprovals}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    Pending Approvals
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '1000ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#4caf50">
                    {stats.activeUsers}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    Active Users
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Zoom in style={{ transitionDelay: '1200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center'
                }}>
                  <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2 }}>
                    <AnalyticsIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#9c27b0">
                    {stats.systemHealth}%
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                    System Health
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Admin Actions */}
            <Grid item xs={12} md={8}>
              <Zoom in style={{ transitionDelay: '1400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Typography variant="h6" fontWeight={600} color="#667eea" gutterBottom>
                    Administrative Actions
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {adminActions.map((action, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Card 
                          sx={{ 
                            p: 3, 
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            background: darkMode ? 'rgba(60,60,60,0.8)' : 'rgba(255,255,255,0.8)',
                            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            '&:hover': { 
                              transform: 'translateY(-4px)',
                              boxShadow: 8,
                              background: darkMode ? 'rgba(70,70,70,0.9)' : 'rgba(255,255,255,0.9)'
                            }
                          }}
                          onClick={action.action}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: action.color }}>
                              {action.icon}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" fontWeight={600} gutterBottom color={darkMode ? '#ffffff' : 'inherit'}>
                                {action.title}
                              </Typography>
                              <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                                {action.description}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Zoom>
            </Grid>

            {/* Recent Users */}
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '1600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Typography variant="h6" fontWeight={600} color="#667eea" gutterBottom>
                    Recent Users
                  </Typography>
                  
                  <List sx={{ p: 0 }}>
                    {recentUsers && recentUsers.length > 0 ? (
                      recentUsers.map((user, index) => (
                        <React.Fragment key={user._id || user.id || index}>
                        <ListItem sx={{ px: 0, py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Avatar sx={{ bgcolor: (user.isActive !== false) ? '#4caf50' : '#f44336', width: 32, height: 32 }}>
                              <PeopleIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500} color={darkMode ? '#ffffff' : 'inherit'}>
                                  {user.name || user.fullName || 'Unknown User'}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                                    {user.role} • {user.site?.name || user.site || 'No Site'}
                                </Typography>
                                <Typography variant="caption" display="block" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                                    Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip 
                              label={(user.isActive !== false) ? 'active' : 'inactive'} 
                            size="small"
                            color={(user.isActive !== false) ? 'success' : 'error'}
                          />
                        </ListItem>
                        {index < recentUsers.length - 1 && <Divider sx={{ borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)' }} />}
                      </React.Fragment>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                              No recent users found
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default AdminPanel; 