import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Fade,
  Zoom,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Category,
  Business,
  Person,
  CalendarToday,
  Refresh,
  Download,
  FilterList,
  AttachMoney,
  Schedule,
  Assessment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { expenseAPI, dashboardAPI } from '../services/api';
import { createCSVExportHandler } from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const ApprovedThisMonthPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalApproved: 0,
    monthlyApproved: 0,
    averageApprovalTime: 0,
    categoryBreakdown: [],
    dailyApprovals: [],
    topApprovers: [],
    approvalTrend: []
  });

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

  // Fetch approved expenses data
  const fetchApprovedExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getAll();
      
      if (response.data.success) {
        const data = response.data.data || [];
        
        // Filter approved expenses based on user role
        let approvedExpenses = data.filter(exp => 
          ['approved', 'approved_l1', 'approved_l2', 'approved_l3', 'approved_finance', 'reimbursed', 'payment_processed'].includes(exp.status)
        );

        // Transform approval history to match frontend expected format
        approvedExpenses = approvedExpenses.map(expense => {
          const transformedApprovalHistory = (expense.approvalHistory || []).map(history => ({
            level: `L${history.level}`, // Convert numeric level to string format
            comment: history.comments || history.comment || '', // Handle both field names
            timestamp: history.date || history.timestamp || new Date(), // Handle both field names
            action: history.action || '',
            amountModified: history.modifiedAmount ? true : false,
            originalAmount: expense.amount,
            modifiedAmount: history.modifiedAmount,
            amountChangeReason: history.modificationReason || '',
            approver: history.approver
          }));

          return {
            ...expense,
            approvalComments: transformedApprovalHistory
          };
        });

        if (user?.role?.toLowerCase() === 'submitter') {
          // Try multiple ways to match expenses for submitter
          approvedExpenses = approvedExpenses.filter(exp => {
            const matchesSubmittedBy = exp.submittedBy === user._id;
            const matchesSubmittedById = exp.submittedBy?._id === user._id;
            const matchesUserId = exp.userId === user._id;
            const matchesUser = exp.user === user._id;
            
            return matchesSubmittedBy || matchesSubmittedById || matchesUserId || matchesUser;
          });
        } else if (user?.role?.toLowerCase() === 'l1_approver') {
          console.log('🔍 L1 Approver - Filtering approved expenses for site:', user.site?._id);
          console.log('🔍 L1 Approver - Raw approved expenses count:', approvedExpenses.length);
          console.log('🔍 L1 Approver - Raw approved expenses sample:', approvedExpenses.slice(0, 3));
          
          // L1 approver: show all approved expenses from their site
          approvedExpenses = approvedExpenses.filter(exp => {
            // Try multiple ways to match site
            const matchesSite = exp.site === user.site?._id;
            const matchesSiteId = exp.site?._id === user.site?._id;
            const matchesSiteString = exp.site === user.site?._id?.toString();
            
            console.log('🔍 L1 Approver - Checking expense site match:', {
              expenseId: exp._id,
              expenseSite: exp.site,
              expenseSiteId: exp.site?._id,
              userSiteId: user.site?._id,
              userSiteIdString: user.site?._id?.toString(),
              matchesSite,
              matchesSiteId,
              matchesSiteString
            });
            
            return matchesSite || matchesSiteId || matchesSiteString;
          });
          
          console.log('📊 L1 Approver - Filtered approved expenses count:', approvedExpenses.length);
          console.log('📊 L1 Approver - Filtered approved expenses sample:', approvedExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'l2_approver') {
          console.log('🔍 L2 Approver - Showing all approved expenses from all sites');
          console.log('🔍 L2 Approver - Raw approved expenses count:', approvedExpenses.length);
          console.log('🔍 L2 Approver - Raw approved expenses sample:', approvedExpenses.slice(0, 3));
          
          // L2 approver: show all approved expenses from all sites
          // No filtering needed - show all approved expenses
          
          console.log('📊 L2 Approver - Filtered approved expenses count:', approvedExpenses.length);
          console.log('📊 L2 Approver - Filtered approved expenses sample:', approvedExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'l3_approver') {
          console.log('🔍 L3 Approver - Showing all approved expenses from all sites');
          console.log('🔍 L3 Approver - Raw approved expenses count:', approvedExpenses.length);
          console.log('🔍 L3 Approver - Raw approved expenses sample:', approvedExpenses.slice(0, 3));
          
          // L3 approver: show all approved expenses from all sites
          // No filtering needed - show all approved expenses
          
          console.log('📊 L3 Approver - Filtered approved expenses count:', approvedExpenses.length);
          console.log('📊 L3 Approver - Filtered approved expenses sample:', approvedExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'finance') {
          console.log('🔍 Finance - Filtering approved expenses');
          console.log('🔍 Finance - Raw approved expenses count:', approvedExpenses.length);
          console.log('🔍 Finance - Raw approved expenses sample:', approvedExpenses.slice(0, 3));
          
          // Finance: show all approved expenses
          approvedExpenses = approvedExpenses.filter(exp => {
            const isApproved = ['approved', 'reimbursed', 'payment_processed'].includes(exp.status);
            console.log('🔍 Finance - Checking expense approval status:', {
              expenseId: exp._id,
              status: exp.status,
              isApproved
            });
            return isApproved;
          });
          
          console.log('📊 Finance - Filtered approved expenses count:', approvedExpenses.length);
          console.log('📊 Finance - Filtered approved expenses sample:', approvedExpenses.slice(0, 3));
        }

        setExpenses(approvedExpenses);
        calculateStats(approvedExpenses);
      }
    } catch (err) {
      console.error('Error fetching approved expenses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calculate statistics
  const calculateStats = (expensesData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Time range filtering
    let timeFilteredExpenses = expensesData;
    if (timeRange === 'month') {
      timeFilteredExpenses = expensesData.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      });
    } else if (timeRange === 'year') {
      timeFilteredExpenses = expensesData.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getFullYear() === currentYear;
      });
    }

    // Category filtering
    if (categoryFilter !== 'all') {
      timeFilteredExpenses = timeFilteredExpenses.filter(exp => exp.category === categoryFilter);
    }

    // Status filtering
    if (statusFilter !== 'all') {
      timeFilteredExpenses = timeFilteredExpenses.filter(exp => exp.status === statusFilter);
    }

    // Calculate totals
    const totalApproved = timeFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const monthlyApproved = expensesData.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    }).reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate average approval time
    const approvalTimes = timeFilteredExpenses
      .filter(exp => exp.approvalComments && exp.approvalComments.length > 0)
      .map(exp => {
        const submissionDate = new Date(exp.submissionDate || exp.createdAt);
        const lastApprovalDate = new Date(exp.approvalComments[exp.approvalComments.length - 1].timestamp);
        return Math.ceil((lastApprovalDate - submissionDate) / (1000 * 60 * 60 * 24));
      });
    
    const averageApprovalTime = approvalTimes.length > 0 
      ? approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length 
      : 0;

    // Category breakdown
    const categoryMap = {};
    timeFilteredExpenses.forEach(exp => {
      if (categoryMap[exp.category]) {
        categoryMap[exp.category] += exp.amount;
      } else {
        categoryMap[exp.category] = exp.amount;
      }
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalApproved) * 100
    })).sort((a, b) => b.amount - a.amount);

    // Daily approvals (last 30 days)
    const dailyApprovals = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayExpenses = expensesData.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.toDateString() === date.toDateString();
      });
      dailyApprovals.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dayExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        count: dayExpenses.length
      });
    }

    // Top approvers
    const approverMap = {};
    timeFilteredExpenses.forEach(exp => {
      if (exp.approvalComments) {
        exp.approvalComments.forEach(approval => {
          if (approverMap[approval.approver]) {
            approverMap[approval.approver].count += 1;
            approverMap[approval.approver].amount += exp.amount;
          } else {
            approverMap[approval.approver] = {
              count: 1,
              amount: exp.amount,
              name: approval.approver?.name || 'Unknown'
            };
          }
        });
      }
    });

    const topApprovers = Object.entries(approverMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Approval trend (last 6 months)
    const approvalTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthExpenses = expensesData.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });
      approvalTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        count: monthExpenses.length
      });
    }

    setStats({
      totalApproved,
      monthlyApproved,
      averageApprovalTime,
      categoryBreakdown,
      dailyApprovals,
      topApprovers,
      approvalTrend
    });
  };

  useEffect(() => {
    fetchApprovedExpenses();
  }, [fetchApprovedExpenses]);

  useEffect(() => {
    calculateStats(expenses);
  }, [timeRange, categoryFilter, statusFilter, expenses]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'approved_l1': return '#2196f3';
      case 'approved_l2': return '#ff9800';
      case 'approved_l3': return '#9c27b0';
      case 'approved_finance': return '#f44336';
      case 'reimbursed': return '#00bcd4';
      case 'payment_processed': return '#795548';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'approved_l1': return <CheckCircle />;
      case 'approved_l2': return <CheckCircle />;
      case 'approved_l3': return <CheckCircle />;
      case 'approved_finance': return <CheckCircle />;
      case 'reimbursed': return <AttachMoney />;
      case 'payment_processed': return <AttachMoney />;
      default: return <CheckCircle />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'travel': return '✈️';
      case 'food': return '🍽️';
      case 'accommodation': return '🏨';
      case 'transport': return '🚗';
      case 'office': return '🏢';
      case 'miscellaneous': return '📦';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode 
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton 
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  mr: 2, 
                  color: darkMode ? '#fff' : '#333',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h4" fontWeight={700} color={darkMode ? '#fff' : '#333'}>
                Approved This Month
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Detailed analysis of approved expenses and approval trends
            </Typography>
          </Box>
        </Fade>

        {/* Filters */}
        <Fade in timeout={800}>
          <Paper sx={{ 
            p: 3, 
            mb: 4,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Time Range</InputLabel>
                  <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="year">This Year</MenuItem>
                    <MenuItem value="all">All Time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {stats.categoryBreakdown.map((cat) => (
                      <MenuItem key={cat.category} value={cat.category}>
                        {cat.category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="approved">Fully Approved</MenuItem>
                    <MenuItem value="approved_l1">L1 Approved</MenuItem>
                    <MenuItem value="approved_l2">L2 Approved</MenuItem>
                    <MenuItem value="approved_l3">L3 Approved</MenuItem>
                    <MenuItem value="approved_finance">Finance Approved</MenuItem>
                    <MenuItem value="reimbursed">Reimbursed</MenuItem>
                    <MenuItem value="payment_processed">Payment Processed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchApprovedExpenses}
                    sx={{ 
                      borderColor: darkMode ? '#555' : '#ccc',
                      color: darkMode ? '#fff' : '#333'
                    }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={createCSVExportHandler(
                      { 
                        summary: { approvedThisMonth: stats.approvedThisMonth, totalAmount: stats.totalAmount },
                        expenses: expenses,
                        monthlyTrend: stats.monthlyTrend
                      }, 
                      'approved-this-month', 
                      user, 
                      setError
                    )}
                    sx={{ 
                      borderColor: darkMode ? '#555' : '#ccc',
                      color: darkMode ? '#fff' : '#333'
                    }}
                  >
                    Export
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '200ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                      <CheckCircle />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalApproved.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    {timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Total Approved'}
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '400ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#2196f3', mr: 2 }}>
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.monthlyApproved.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    This Month
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '600ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                      <Schedule />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.averageApprovalTime.toFixed(1)} days
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Avg Approval Time
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '800ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#9c27b0', mr: 2 }}>
                      <Assessment />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.categoryBreakdown.length}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Categories
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Daily Approvals Chart */}
          <Grid item xs={12} md={8}>
            <Fade in timeout={1000}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Daily Approvals (Last 30 Days)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.dailyApprovals}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#555' : '#ccc'} />
                    <XAxis dataKey="date" stroke={darkMode ? '#fff' : '#333'} />
                    <YAxis stroke={darkMode ? '#fff' : '#333'} />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#333' : '#fff',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="amount" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} md={4}>
            <Fade in timeout={1200}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Category Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {stats.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Top Approvers */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            p: 3,
            mb: 4,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
              Top Approvers
            </Typography>
            <Grid container spacing={2}>
              {stats.topApprovers.map((approver, index) => (
                <Grid item xs={12} sm={6} md={4} key={approver.id}>
                  <Card sx={{ 
                    background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${COLORS[index % COLORS.length]}20`
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: COLORS[index % COLORS.length], mr: 2 }}>
                          <Person />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                          {approver.name}
                        </Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={700} color={COLORS[index % COLORS.length]}>
                        {approver.count}
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                        Approvals
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                        ₹{approver.amount.toLocaleString()} total
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Fade>

        {/* Recent Approvals Table */}
        <Fade in timeout={1600}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Recent Approvals
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Expense</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Approved Date</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Approval Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.slice(0, 10).map((expense, index) => {
                    const approvalTime = expense.approvalComments && expense.approvalComments.length > 0
                      ? Math.ceil((new Date(expense.approvalComments[expense.approvalComments.length - 1].timestamp) - new Date(expense.submissionDate || expense.createdAt)) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <TableRow key={expense._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                            {expense.title}
                          </Typography>
                          <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                            {expense.expenseNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<Category />}
                            label={expense.category}
                            size="small"
                            sx={{
                              bgcolor: COLORS[index % COLORS.length],
                              color: '#fff',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                            ₹{expense.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(expense.status)}
                            label={expense.status.replace('_', ' ').toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: getStatusColor(expense.status),
                              color: '#fff',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                            {expense.approvalComments && expense.approvalComments.length > 0
                              ? new Date(expense.approvalComments[expense.approvalComments.length - 1].timestamp).toLocaleDateString()
                              : 'N/A'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color={approvalTime > 7 ? '#f44336' : (darkMode ? '#b0b0b0' : '#666')}
                          >
                            {approvalTime} days
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default ApprovedThisMonthPage;
