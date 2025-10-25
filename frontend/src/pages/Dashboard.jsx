import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, Card, Fade, Zoom, Chip, Avatar, List, ListItem, ListItemIcon, ListItemText, Divider, LinearProgress, Button, IconButton } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ApprovalIcon from '@mui/icons-material/Approval';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();
  const { darkMode } = useTheme();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    budgetUtilization: 0,
    savings: 0
  });
  const [budgetBreakdown, setBudgetBreakdown] = useState({ approvedAmount: 0, pendingAmount: 0, remainingBudget: 0, approvedUtilization: 0, projectedUtilization: 0 });
  const [topCategories, setTopCategories] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // New state for "See More" functionality
  const [showMoreActivities, setShowMoreActivities] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);



  // Fetch dashboard data
  const fetchDashboard = useCallback(async (forceRefresh = false) => {
    try {
      setDashboardLoading(true);
      console.log('🔄 Fetching dashboard data for user:', user);
      console.log('👤 User role:', user?.role);
      console.log('🔄 Force refresh:', forceRefresh);
      
      // Force refresh for Finance users to ensure data is loaded
      const shouldForceRefresh = forceRefresh || user?.role?.toLowerCase() === 'finance';
      
      const res = await dashboardAPI.getOverview(shouldForceRefresh ? { timestamp: Date.now() } : {});
      console.log('📡 Dashboard API response:', res);
      
      if (res.data.success) {
        const data = res.data.data;
        console.log('📊 Dashboard data received:', data);
        console.log('📊 Approval stats:', data.approvalStats);
        console.log('📊 Monthly stats:', data.monthlyStats);
        console.log('📊 User stats:', data.userStats);
        console.log('📊 Budget utilization data:', {
          budgetUtilization: data.budgetUtilization,
          siteBudget: data.siteBudget,
          userRole: user?.role
        });
        console.log('📊 Pending approvals count:', data.pendingApprovalsCount);
        console.log('📊 Payment stats:', data.paymentStats);
        
        const calculatedStats = calculateStats(data);
        console.log('📊 Calculated stats:', calculatedStats);
        
        setStats(calculatedStats);
        setTopCategories(data.topCategories || []);
        if (data.submitterBudgetBreakdown) setBudgetBreakdown(data.submitterBudgetBreakdown);
        setRecentActivities(data.recentActivities || []);
        
        console.log('✅ Dashboard data updated successfully');
      } else {
        console.error('❌ Dashboard API returned success: false');
      }
    } catch (err) {
      console.error('❌ Error fetching dashboard:', err);
      console.error('❌ Error details:', err.response?.data);
      // Set default values to prevent infinite loading
      setStats({
        totalExpenses: 0,
        monthlyExpenses: 0,
        pendingApprovals: 0,
        approvedThisMonth: 0,
        budgetUtilization: 0,
        savings: 0
      });
      setTopCategories([]);
      setRecentActivities([]);
    } finally {
      setDashboardLoading(false);
    }
  }, [user]);

  // Force refresh for Finance users on component mount
  useEffect(() => {
    if (user?.role?.toLowerCase() === 'finance') {
      console.log('🔄 Finance user detected, forcing dashboard refresh...');
      fetchDashboard(true);
      
      // Additional refresh after 2 seconds to ensure data is loaded
      setTimeout(() => {
        console.log('🔄 Second refresh for Finance user...');
        fetchDashboard(true);
      }, 2000);
      
      // Third refresh after 5 seconds
      setTimeout(() => {
        console.log('🔄 Third refresh for Finance user...');
        fetchDashboard(true);
      }, 5000);
    }
  }, [user, fetchDashboard]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log('❌ No socket connection available');
      return;
    }

    console.log('🔌 Setting up dashboard socket handlers');
    console.log('🔌 Socket connected:', socket.connected);
    console.log('🔌 Current user:', user);
    console.log('🔌 Socket ID:', socket.id);

    const handleExpenseUpdate = async (data) => {
      console.log('📡 Expense update received:', data);
      console.log('👤 Current user role:', user?.role);
      console.log('👤 Current user ID:', user?._id);
      console.log('📊 Current stats before update:', stats);
      
      // Add the new activity immediately for better UX
      let activityType = 'expense_approved';
      let activityTitle = `Expense ${data.status}`;
      
      if (data.status === 'payment_processed') {
        activityType = 'payment_processed';
        activityTitle = 'Payment Processed';
      } else if (data.status === 'rejected') {
        activityType = 'expense_rejected';
        activityTitle = 'Expense Rejected';
      }
      
      const newActivity = {
        id: Date.now(),
        type: activityType,
        title: activityTitle,
        description: `${data.siteName} - ₹${(data.amount || 0).toLocaleString()}`,
        time: 'Just now',
        status: data.status
      };
      setRecentActivities(prev => [newActivity, ...prev.slice(0, 9)]);

      // Wait a short moment for backend to process the change
      console.log('⏳ Waiting for backend processing...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force a fresh data fetch with timestamp to bypass any caching
      console.log('🔄 Forcing dashboard refresh after expense update');
      await fetchDashboard(true);
    };

    const handleDashboardUpdate = async () => {
      console.log('📡 Direct dashboard update received');
      await fetchDashboard(true);
    };

    // Handle all expense-related events
    console.log('🎧 Registering socket event listeners...');
    socket.on('expense-updated', (data) => {
      console.log('📡 Received expense-updated event:', data);
      handleExpenseUpdate(data);
    });
    socket.on('expense_approved_final', (data) => {
      console.log('📡 Received expense_approved_final event:', data);
      handleExpenseUpdate(data);
    });
    socket.on('new_expense_submitted', (data) => {
      console.log('📡 Received new_expense_submitted event:', data);
      handleExpenseUpdate(data);
    });
    socket.on('expense_approved_l1', (data) => {
      console.log('📡 Received expense_approved_l1 event:', data);
      handleExpenseUpdate(data);
    });
    socket.on('expense_approved_l2', (data) => {
      console.log('📡 Received expense_approved_l2 event:', data);
      handleExpenseUpdate(data);
    });
    socket.on('expense_rejected', (data) => {
      console.log('📡 Received expense_rejected event:', data);
      handleExpenseUpdate(data);
    });

    // Handle payment processing by L3 approvers
    socket.on('expense_payment_processed', (data) => {
      console.log('📡 Received expense_payment_processed event:', data);
      handleExpenseUpdate(data);
    });

    // Handle budget updates when new expenses are created
    socket.on('expense-created', (data) => {
      console.log('📡 Received expense-created event for budget update:', data);
      handleExpenseUpdate(data);
    });

    // Handle direct dashboard updates
    socket.on('dashboard-update', (data) => {
      console.log('📡 Received dashboard-update event:', data);
      handleDashboardUpdate();
    });

    // Test socket connection
    socket.on('connect', () => {
      console.log('✅ Socket connected in Dashboard');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected in Dashboard');
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error in Dashboard:', error);
    });

    return () => {
      console.log('🧹 Cleaning up dashboard socket handlers');
      socket.off('expense-updated');
      socket.off('expense_approved_final');
      socket.off('new_expense_submitted');
      socket.off('expense_approved_l1');
      socket.off('expense_approved_l2');
      socket.off('expense_rejected');
      socket.off('expense_payment_processed');
      socket.off('expense-created');
      socket.off('dashboard-update');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [socket, fetchDashboard, user, stats]);

  // Show loading while user is being loaded
  if (isLoading || !user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)'
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.9)', 
          padding: '2rem', 
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Loading Dashboard...</div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>Please wait while we load your data</div>
        </div>
      </Box>
    );
  }

  // Calculate stats based on user role
  const calculateStats = (data) => {
    // Add null check for user
    if (!user) {
      return {
        pendingApprovals: 0,
        totalAmount: 0,
        totalExpenses: 0,
        approvedThisMonth: 0,
        budgetUtilization: 0,
        totalUsers: 0,
        totalSites: 0,
        systemExpenses: 0
      };
    }

    const isApprover = user.role?.toLowerCase().includes('approver');
    const isFinance = user.role?.toLowerCase() === 'finance';
    
    console.log('Calculating stats for user:', {
      userRole: user.role,
      isApprover,
      isFinance,
      data: {
        pendingApprovalsCount: data.pendingApprovalsCount,
        monthlyStats: data.monthlyStats,
        approvalStats: data.approvalStats,
        userStats: data.userStats,
        systemStats: data.systemStats
      }
    });
    
    const stats = {
      pendingApprovals: data.pendingApprovalsCount || 0,
      totalAmount: isFinance 
        ? (data.paymentStats?.totalAmount || 0)  // Total amount paid by Finance
        : (isApprover 
          ? (data.monthlyStats?.monthlyApprovedAmount || 0) 
          : (data.userStats?.totalAmount || 0)),
      totalExpenses: isFinance
        ? (data.paymentStats?.totalPayments || 0)  // Total payments processed by Finance
        : (isApprover
          ? (data.monthlyStats?.monthlyApprovedCount || 0)
          : (data.userStats?.totalExpenses || 0)),
      approvedThisMonth: isFinance 
        ? (data.paymentStats?.totalPayments || 0)  // Payments this month for Finance
        : (user.role?.toLowerCase() === 'submitter' 
          ? (data.submitterBudgetBreakdown?.approvedAmount || 0)  // For submitter, use approved amount from budget breakdown (only fully approved)
          : (data.approvalStats?.approvedAmount || 0)),  // For approvers, use approval amount
      budgetUtilization: data.budgetUtilization || data.siteBudget?.utilization || 0,
      totalUsers: (isFinance || user?.role?.toLowerCase() === 'l3_approver') ? (data.systemStats?.totalUsers || 0) : 0,
      totalSites: (isFinance || user?.role?.toLowerCase() === 'l3_approver') ? (data.systemStats?.totalSites || 0) : 0,
      systemExpenses: (isFinance || user?.role?.toLowerCase() === 'l3_approver') ? (data.systemStats?.monthlyExpenses?.amount || 0) : 0,
      paymentProcessed: isFinance ? (data.paymentStats?.totalPayments || 0) : 0
    };
    
    console.log('Calculated stats:', stats);
    console.log('🔍 Debug - User role:', user.role);
    console.log('🔍 Debug - Approval stats:', data.approvalStats);
    console.log('🔍 Debug - Approved amount:', data.approvalStats?.approvedAmount);
    
    return stats;
  };

  // Quick actions based on user role
  const getQuickActions = () => {
    // Add null check for user
    if (!user) {
      return [
        {
                  title: t('submitExpense'),
        description: t('createNewExpenseReport'),
          icon: <AddIcon />,
          color: '#2196f3',
          action: () => navigate('/submit-expense')
        }
      ];
    }

    const userRole = user.role?.toLowerCase();
    const isSubmitter = userRole === 'submitter';
    const isFinance = userRole === 'finance';
    
    const actions = [];

    // Submit Expense for submitter
    if (isSubmitter) {
      actions.push({
        title: t('submitExpense'),
        description: t('createNewExpenseReport'),
        icon: <AddIcon />,
        color: '#2196f3',
        action: () => navigate('/submit-expense')
      });
    }

    // View Approvals for approvers (not submitter, not Finance)
    if (!isSubmitter && !isFinance) {
      actions.push({
        title: 'View Approvals',
        description: 'Check pending approvals',
        icon: <ApprovalIcon />,
        color: '#ff9800',
        action: () => navigate('/approval')
      });
    }

    // Reports for non-submitters
    if (!isSubmitter) {
      actions.push({
        title: 'Generate Report',
        description: 'Create expense reports',
        icon: <TrendingUpIcon />,
        color: '#4caf50',
        action: () => navigate('/reports')
      });
    }

    // Budget Alerts for all users except Finance
    if (!isFinance) {
      actions.push({
        title: t('budgetAlerts'),
        description: t('manageBudgetAlerts'),
        icon: <WarningIcon />,
        color: '#f44336',
        action: () => navigate('/budget-alerts')
      });
    }

    // Finance specific actions
    if (isFinance) {
      actions.push({
        title: 'Process Payments',
        description: 'Handle pending payments',
        icon: <CurrencyRupeeIcon />,
        color: '#4caf50',
        action: () => navigate('/approval')
      });
    }

    return actions;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'expense_submitted': return <ReceiptIcon />;
      case 'expense_approved': return <CheckCircleIcon />;
      case 'expense_rejected': return <WarningIcon />;
      case 'payment_processed': return <PaymentIcon />;
      case 'budget_alert': return <NotificationsIcon />;
      default: return <ReceiptIcon />;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'rejected': return '#f44336';
      case 'payment_processed': return '#4caf50';
      case 'warning': return '#ff9800';
      default: return '#2196f3';
    }
  };

  // Removed unused quickActions variable

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      position: 'relative',
      overflow: 'hidden',
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
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
        <Box sx={{ position: 'relative', zIndex: 1, p: 4 }} className="dashboard-container">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, mb: { xs: 1, md: 0 } }}>
              <img 
                src="/rakshak-logo.png" 
                alt="Rakshak Securitas Logo" 
                style={{ height: '40px' }}
              />
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <DashboardIcon />
              </Avatar>
            </Box>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' }
            }}>
              {t('dashboard')}
            </Typography>
            <Box sx={{ ml: { xs: 0, md: 2 }, mt: { xs: 1, md: 0 }, display: 'flex', alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
              {dashboardLoading && (
                <>
                  <Typography variant="body2" color="white" sx={{ mr: 1 }}>
                    Loading data...
                  </Typography>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid rgba(255,255,255,0.3)', 
                    borderTop: '2px solid white', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                </>
              )}

            </Box>
          </Box>

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }} className="dashboard-stats-grid">
            {/* Total Amount Card - Different for L4 Approver */}
            <Grid item xs={12} sm={6} md={3}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper 
                  elevation={16} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: darkMode ? '1px solid #667eea' : '1px solid #667eea'
                    }
                  }} 
                  className="dashboard-card"
                  onClick={() => navigate('/total-amount')}
                >
                  <Avatar sx={{ bgcolor: '#667eea', mx: 'auto', mb: 2 }}>
                    <CurrencyRupeeIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#667eea">
                    ₹{Number(stats.totalAmount || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                    {user?.role?.toLowerCase() === 'finance' ? 'Total Amount Paid' : t('totalAmountYTD')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="#4caf50">
                      +12.5% {t('vsLastYear')}
                    </Typography>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
            
            {/* Show approval cards for approvers, but different for L4 Approver */}
            {user?.role?.toLowerCase() !== 'submitter' && (
              <>
            <Grid item xs={12} sm={6} md={3}>
              <Zoom in style={{ transitionDelay: '400ms' }}>
                <Paper 
                  elevation={16} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: darkMode ? '1px solid #ff9800' : '1px solid #ff9800'
                    }
                  }}
                  onClick={() => navigate('/pending-approvals')}
                >
                  <Avatar sx={{ bgcolor: '#ff9800', mx: 'auto', mb: 2 }}>
                    <PendingIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#ff9800">
                    {Number(stats.pendingApprovals || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                    {user?.role?.toLowerCase() === 'l3_approver' ? 'Pending Approvals' : 
                     user?.role?.toLowerCase() === 'finance' ? 'Pending Payments' : 'Pending Approvals'}
                  </Typography>
                  <Chip 
                    label="Action Required" 
                    size="small" 
                    sx={{ mt: 1, bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800' }}
                  />
                </Paper>
              </Zoom>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper 
                  elevation={16} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      border: darkMode ? '1px solid #4caf50' : '1px solid #4caf50'
                    }
                  }}
                  onClick={() => navigate('/approved-this-month')}
                >
                  <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                    <CheckCircleIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#4caf50">
                    {Number(stats.approvedThisMonth || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                    {user?.role?.toLowerCase() === 'l3_approver' ? 'Approved This Month' : 
                     user?.role?.toLowerCase() === 'finance' ? 'Processed Payments' : 'Approved This Month'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" color="#4caf50">
                      +8.3% vs last month
                    </Typography>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
              </>
            )}

            {/* Payment Processed Card for Finance */}
            {user?.role?.toLowerCase() === 'finance' && (
              <Grid item xs={12} sm={6} md={3}>
                <Zoom in style={{ transitionDelay: '700ms' }}>
                  <Paper 
                    elevation={16} 
                    sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        border: darkMode ? '1px solid #9c27b0' : '1px solid #9c27b0'
                      }
                    }}
                    onClick={() => navigate('/payment-processed')}
                  >
                    <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2 }}>
                      <PaymentIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#9c27b0">
                      {Number(stats.paymentProcessed || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                      Payment Processed This Month
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                      <TrendingUpIcon sx={{ color: '#9c27b0', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#9c27b0">
                        System-wide
                      </Typography>
                    </Box>
                  </Paper>
                </Zoom>
              </Grid>
            )}
            
            {/* Budget Utilization Card - Hide for Finance and Super Admin */}
            {user?.role?.toLowerCase() !== 'finance' && user?.role?.toLowerCase() !== 'l3_approver' && (
              <Grid item xs={12} sm={6} md={3}>
                <Zoom in style={{ transitionDelay: '800ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: '#f44336', mx: 'auto', mb: 2 }}>
                      <WarningIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#f44336">
                      {Number(budgetBreakdown.approvedUtilization || stats.budgetUtilization || 0).toLocaleString()}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                      Approved Utilization
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={budgetBreakdown.approvedUtilization || stats.budgetUtilization} 
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: darkMode ? '#b0b0b0' : '#666666' }}>
                      Projected: {Number(budgetBreakdown.projectedUtilization || 0).toLocaleString()}%
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
            )}

            {/* Submitter mini-cards: Approved, Pending, Remaining */}
            {user?.role?.toLowerCase() === 'submitter' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '820ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        minHeight: 180,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #4caf50' : '1px solid #4caf50'
                        }
                      }}
                      onClick={() => navigate('/approved-this-month')}
                    >
                      <Typography variant="caption" sx={{ color: '#666' }}>Approved spend</Typography>
                      <Typography variant="h4" fontWeight={700} color="#4caf50">₹{Number(budgetBreakdown.approvedAmount || 0).toLocaleString()}</Typography>
                    </Paper>
                  </Zoom>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '840ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        minHeight: 180,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #ff9800' : '1px solid #ff9800'
                        }
                      }}
                      onClick={() => navigate('/pending-expenses')}
                    >
                      <Typography variant="caption" sx={{ color: '#666' }}>Pending spend</Typography>
                      <Typography variant="h4" fontWeight={700} color="#ff9800">₹{Number(budgetBreakdown.pendingAmount || 0).toLocaleString()}</Typography>
                    </Paper>
                  </Zoom>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '860ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        minHeight: 180,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #667eea' : '1px solid #667eea'
                        }
                      }}
                      onClick={() => navigate('/budget-utilization')}
                    >
                      <Typography variant="caption" sx={{ color: '#666' }}>Remaining budget</Typography>
                      <Typography variant="h4" fontWeight={700} color="#667eea">₹{Number(budgetBreakdown.remainingBudget || 0).toLocaleString()}</Typography>
                    </Paper>
                  </Zoom>
                </Grid>
              </>
            )}

            {/* Additional Super Admin Cards - Hide for Finance */}
            {user?.role?.toLowerCase() === 'l3_approver' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '1000ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #4caf50' : '1px solid #4caf50'
                        }
                      }}
                      onClick={() => navigate('/total-users')}
                    >
                      <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                        <PeopleIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700} color="#4caf50">
                        {Number(stats.totalUsers || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                        Total Users
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                        <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" color="#4caf50">
                          Active System
                        </Typography>
                      </Box>
                    </Paper>
                  </Zoom>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '1200ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #2196f3' : '1px solid #2196f3'
                        }
                      }}
                      onClick={() => navigate('/total-sites')}
                    >
                      <Avatar sx={{ bgcolor: '#2196f3', mx: 'auto', mb: 2 }}>
                        <BusinessIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700} color="#2196f3">
                        {Number(stats.totalSites || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                        Total Sites
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                        <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" color="#2196f3">
                          Operational
                        </Typography>
                      </Box>
                    </Paper>
                  </Zoom>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Zoom in style={{ transitionDelay: '1400ms' }}>
                    <Paper 
                      elevation={16} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          border: darkMode ? '1px solid #ff9800' : '1px solid #ff9800'
                        }
                      }}
                      onClick={() => navigate('/system-expenses')}
                    >
                      <Avatar sx={{ bgcolor: '#ff9800', mx: 'auto', mb: 2 }}>
                        <ReceiptIcon />
                      </Avatar>
                      <Typography variant="h4" fontWeight={700} color="#ff9800">
                        ₹{Number(stats.systemExpenses || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                        This Month Expenses
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                        <TrendingUpIcon sx={{ color: '#ff9800', fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption" color="#ff9800">
                          Current Period
                        </Typography>
                      </Box>
                    </Paper>
                  </Zoom>
                </Grid>
              </>
            )}
          </Grid>

          <Grid container spacing={4}>
            {/* Quick Actions */}
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '1000ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Typography variant="h6" fontWeight={600} color="#667eea" gutterBottom>
                    {t('quickActions')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {getQuickActions().map((action, index) => (
                      <Card 
                        key={index}
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': { 
                            transform: 'translateY(-2px)',
                            boxShadow: 4
                          }
                        }}
                        onClick={action.action}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: action.color, width: 40, height: 40 }}>
                            {action.icon}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {action.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                              {action.description}
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            {/* Recent Activities */}
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '1200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content',
                  minHeight: 400
                }}>
                  <Typography variant="h6" fontWeight={600} color="#667eea" gutterBottom>
                    {t('recentActivities')}
                  </Typography>
                  
                  {/* Summary Section */}
                  {recentActivities.length > 0 && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(102, 126, 234, 0.05)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }} gutterBottom>
                        {t('recentUpdates')}
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="#667eea">
                        {recentActivities.length} {t('activities')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                        {recentActivities.length > 0 ? `Last ${recentActivities[recentActivities.length - 1].time}` : 'No recent activity'}
                      </Typography>
                    </Box>
                  )}
                  
                  <List sx={{ p: 0 }}>
                    {recentActivities.slice(0, showMoreActivities ? recentActivities.length : 3).map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <ListItem sx={{ px: 0, py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Avatar sx={{ bgcolor: getActivityColor(activity.status), width: 32, height: 32 }}>
                              {getActivityIcon(activity.type)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500}>
                                {activity.title}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                                  {activity.description}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                                  {activity.time}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < (showMoreActivities ? recentActivities.length : 3) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  
                  {recentActivities.length > 3 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowMoreActivities(!showMoreActivities)}
                        sx={{ 
                          color: '#667eea',
                          '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.1)' }
                        }}
                      >
                        {showMoreActivities ? 'Show Less' : `See More (${recentActivities.length - 3})`}
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Zoom>
            </Grid>

            {/* Top Categories */}
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '1400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content',
                  minHeight: 400
                }}>
                  <Typography variant="h6" fontWeight={600} color="#667eea" gutterBottom>
                    {t('topExpenseCategories')}
                  </Typography>
                  
                  {/* Summary Section */}
                  {topCategories.length > 0 && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(102, 126, 234, 0.05)', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('totalSpent')}
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="#667eea">
                        ₹{topCategories.reduce((sum, cat) => sum + cat.amount, 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('acrossCategories', { count: topCategories.length })}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {topCategories.slice(0, showMoreCategories ? topCategories.length : 3).map((category, index) => (
                      <Box key={index}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {category.name}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="#667eea">
                            ₹{category.amount.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ 
                            flex: 1, 
                            height: 8, 
                            bgcolor: 'rgba(0,0,0,0.1)', 
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              width: `${category.percentage}%`, 
                              height: '100%', 
                              bgcolor: '#667eea',
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {category.percentage}%
                          </Typography>
                        </Box>
                        {showMoreCategories && (
                          <Typography variant="caption" color="text.secondary">
                            {category.count} expense{category.count !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  {topCategories.length > 3 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowMoreCategories(!showMoreCategories)}
                        sx={{ 
                          color: '#667eea',
                          '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.1)' }
                        }}
                      >
                        {showMoreCategories ? 'Show Less' : `See More (${topCategories.length - 3})`}
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default Dashboard; 