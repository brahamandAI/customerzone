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
  Tooltip,
  TextField
} from '@mui/material';
import {
  ArrowBack,
  Receipt,
  TrendingUp,
  TrendingDown,
  Category,
  Business,
  Person,
  CalendarToday,
  Refresh,
  Download,
  FilterList,
  Search,
  AttachMoney,
  Assessment,
  Speed,
  CheckCircle,
  Cancel,
  Edit
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
  Line,
  Area,
  AreaChart
} from 'recharts';

const TotalExpensesPage = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    yearlyExpenses: 0,
    averageExpense: 0,
    categoryBreakdown: [],
    statusBreakdown: [],
    monthlyTrend: [],
    topExpenses: [],
    recentExpenses: []
  });

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffecd2'];

  // Fetch expenses data
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getAll();
      
      if (response.data.success) {
        const data = response.data.data || [];
        
        // Filter expenses based on user role
        let filteredExpenses = data;
        if (user?.role?.toLowerCase() === 'submitter') {
          // Try multiple ways to match expenses for submitter
          filteredExpenses = data.filter(exp => {
            const matchesSubmittedBy = exp.submittedBy === user._id;
            const matchesSubmittedById = exp.submittedBy?._id === user._id;
            const matchesUserId = exp.userId === user._id;
            const matchesUser = exp.user === user._id;
            
            return matchesSubmittedBy || matchesSubmittedById || matchesUserId || matchesUser;
          });
        } else if (user?.role?.toLowerCase() === 'l1_approver') {
          console.log('🔍 Filtering for L1 approver with site ID:', user.site?._id);
          console.log('🔍 User site object:', user.site);
          console.log('🔍 Raw expenses data sample:', data.slice(0, 3));
          
          // L1 approver: show all expenses from their site
          filteredExpenses = data.filter(exp => {
            // Try multiple ways to match site
            const matchesSite = exp.site === user.site?._id;
            const matchesSiteId = exp.site?._id === user.site?._id;
            const matchesSiteString = exp.site === user.site?._id?.toString();
            
            console.log('🔍 Checking expense site match:', {
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
          console.log('📊 Filtered expenses count for L1 approver:', filteredExpenses.length);
          console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'l2_approver') {
          console.log('🔍 L2 approver: showing all expenses from all sites');
          console.log('🔍 Raw expenses data sample:', data.slice(0, 3));
          
          // L2 approver: show all expenses from all sites
          filteredExpenses = data;
          console.log('📊 Filtered expenses count for L2 approver:', filteredExpenses.length);
          console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'l3_approver') {
          console.log('🔍 L3 approver: showing all expenses from all sites');
          console.log('🔍 Raw expenses data sample:', data.slice(0, 3));
          // L3 approver: show all expenses from all sites
          filteredExpenses = data;
          console.log('📊 Filtered expenses count for L3 approver:', filteredExpenses.length);
          console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
        } else if (user?.role?.toLowerCase() === 'finance') {
          console.log('🔍 Filtering for Finance - all expenses');
          console.log('🔍 Raw expenses data sample:', data.slice(0, 3));
          // Finance: show all expenses
          filteredExpenses = data;
          console.log('📊 Filtered expenses count for Finance:', filteredExpenses.length);
          console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
        }

        setExpenses(filteredExpenses);
        calculateStats(filteredExpenses);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
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

    // Search filtering
    if (searchTerm) {
      timeFilteredExpenses = timeFilteredExpenses.filter(exp => 
        exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate totals
    const totalExpenses = timeFilteredExpenses.length;
    const totalAmount = timeFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const monthlyExpenses = expensesData.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    }).length;
    
    const yearlyExpenses = expensesData.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getFullYear() === currentYear;
    }).length;

    const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // Category breakdown
    const categoryMap = {};
    timeFilteredExpenses.forEach(exp => {
      if (categoryMap[exp.category]) {
        categoryMap[exp.category].count += 1;
        categoryMap[exp.category].amount += exp.amount;
      } else {
        categoryMap[exp.category] = { count: 1, amount: exp.amount };
      }
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: (data.count / totalExpenses) * 100
    })).sort((a, b) => b.count - a.count);

    // Status breakdown
    const statusMap = {};
    timeFilteredExpenses.forEach(exp => {
      if (statusMap[exp.status]) {
        statusMap[exp.status].count += 1;
        statusMap[exp.status].amount += exp.amount;
      } else {
        statusMap[exp.status] = { count: 1, amount: exp.amount };
      }
    });

    const statusBreakdown = Object.entries(statusMap).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
      percentage: (data.count / totalExpenses) * 100
    })).sort((a, b) => b.count - a.count);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthExpenses = expensesData.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count: monthExpenses.length,
        amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      });
    }

    // Top expenses
    const topExpenses = timeFilteredExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Recent expenses
    const recentExpenses = timeFilteredExpenses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    setStats({
      totalExpenses,
      totalAmount,
      monthlyExpenses,
      yearlyExpenses,
      averageExpense,
      categoryBreakdown,
      statusBreakdown,
      monthlyTrend,
      topExpenses,
      recentExpenses
    });
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    calculateStats(expenses);
  }, [timeRange, categoryFilter, statusFilter, searchTerm, expenses]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'submitted': return '#ff9800';
      case 'under_review': return '#2196f3';
      case 'rejected': return '#f44336';
      case 'draft': return '#757575';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'submitted': return <Receipt />;
      case 'under_review': return <Assessment />;
      case 'rejected': return <Cancel />;
      case 'draft': return <Edit />;
      default: return <Receipt />;
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
                Total Expenses Analysis
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Comprehensive view of all expenses and spending patterns
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
                <TextField
                  fullWidth
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: darkMode ? '#b0b0b0' : '#666' }} />
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: darkMode ? '#fff' : '#333',
                      '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
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
              <Grid item xs={12} sm={6} md={2}>
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
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {stats.statusBreakdown.map((status) => (
                      <MenuItem key={status.status} value={status.status}>
                        {status.status.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchExpenses}
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
                        summary: { totalExpenses: expenses.length, totalAmount: stats.totalAmount },
                        expenses: expenses,
                        categoryBreakdown: stats.categoryBreakdown
                      }, 
                      'total-expenses', 
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
                    <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                      <Receipt />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.totalExpenses}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    {timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Total Expenses'}
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
                    <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Amount
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
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.averageExpense.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Average Amount
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
          {/* Monthly Trend Chart */}
          <Grid item xs={12} md={8}>
            <Fade in timeout={1000}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Monthly Expense Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#555' : '#ccc'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#fff' : '#333'} />
                    <YAxis stroke={darkMode ? '#fff' : '#333'} />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#333' : '#fff',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stackId="1"
                      stroke="#667eea" 
                      fill="#667eea"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stackId="2"
                      stroke="#4caf50" 
                      fill="#4caf50"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
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
                      dataKey="count"
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

        {/* Category and Status Details */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Category Details */}
          <Grid item xs={12} md={6}>
            <Fade in timeout={1400}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
                  Category Details
                </Typography>
                <Grid container spacing={2}>
                  {stats.categoryBreakdown.map((category, index) => (
                    <Grid item xs={12} key={category.category}>
                      <Card sx={{ 
                        background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${COLORS[index % COLORS.length]}20`
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h4" sx={{ mr: 1 }}>
                              {getCategoryIcon(category.category)}
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                              {category.category}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              Count: {category.count}
                            </Typography>
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              Amount: ₹{category.amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                            {category.percentage.toFixed(1)}% of total
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={category.percentage} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: darkMode ? '#333' : '#f0f0f0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: COLORS[index % COLORS.length]
                              }
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Fade>
          </Grid>

          {/* Status Details */}
          <Grid item xs={12} md={6}>
            <Fade in timeout={1600}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
                  Status Breakdown
                </Typography>
                <Grid container spacing={2}>
                  {stats.statusBreakdown.map((status, index) => (
                    <Grid item xs={12} key={status.status}>
                      <Card sx={{ 
                        background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${getStatusColor(status.status)}20`
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar sx={{ bgcolor: getStatusColor(status.status), mr: 2, width: 32, height: 32 }}>
                              {getStatusIcon(status.status)}
                            </Avatar>
                            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                              {status.status.replace('_', ' ').toUpperCase()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              Count: {status.count}
                            </Typography>
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              Amount: ₹{status.amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                            {status.percentage.toFixed(1)}% of total
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={status.percentage} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: darkMode ? '#333' : '#f0f0f0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getStatusColor(status.status)
                              }
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Recent Expenses Table */}
        <Fade in timeout={1800}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Recent Expenses
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
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentExpenses.map((expense, index) => (
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
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default TotalExpensesPage;
