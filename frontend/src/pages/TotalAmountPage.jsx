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
  Divider
} from '@mui/material';
import {
  ArrowBack,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Category,
  Business,
  Person,
  CalendarToday,
  Refresh,
  Download,
  FilterList
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
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const TotalAmountPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stats, setStats] = useState({
    totalAmount: 0,
    monthlyAmount: 0,
    yearlyAmount: 0,
    averageAmount: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
    topExpenses: []
  });

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffecd2'];

  // Fetch expenses data
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching expenses for user:', user);
      console.log('👤 User role:', user?.role);
      console.log('👤 User ID:', user?._id);
      
      // Try dashboard API first for better data consistency
      try {
        const dashboardResponse = await dashboardAPI.getOverview();
        console.log('📡 Dashboard API response:', dashboardResponse);
        
        if (dashboardResponse.data.success) {
          const dashboardData = dashboardResponse.data.data;
          console.log('📊 Dashboard data:', dashboardData);
          
          // Use dashboard data for initial stats
          if (user?.role?.toLowerCase() === 'submitter' && dashboardData.submitterBudgetBreakdown) {
            setStats(prevStats => ({
              ...prevStats,
              totalAmount: dashboardData.submitterBudgetBreakdown.approvedAmount || 0,
              monthlyAmount: dashboardData.submitterBudgetBreakdown.approvedAmount || 0,
              yearlyAmount: dashboardData.submitterBudgetBreakdown.approvedAmount || 0
            }));
          }
        }
      } catch (dashboardErr) {
        console.warn('Dashboard API failed, falling back to expenses API:', dashboardErr);
      }
      
      // Also fetch expenses for detailed breakdown
      const response = await expenseAPI.getAll();
      console.log('📡 Expenses API response:', response);
      
      if (response.data.success) {
        const data = response.data.data || [];
        console.log('📊 Raw expenses data:', data);
        console.log('📊 Total expenses count:', data.length);
        
        setExpenses(data);
        calculateStats(data);
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
    
    console.log('📊 Calculating stats for user:', user?.role);
    console.log('📊 Raw expenses count:', expensesData.length);
    
    // Filter expenses based on user role
    let filteredExpenses = expensesData;
    if (user?.role?.toLowerCase() === 'submitter') {
      console.log('🔍 Filtering for submitter with user ID:', user._id);
      console.log('🔍 User object:', user);
      
      // Try multiple ways to match expenses
      filteredExpenses = expensesData.filter(exp => {
        const matchesSubmittedBy = exp.submittedBy === user._id;
        const matchesSubmittedById = exp.submittedBy?._id === user._id;
        const matchesUserId = exp.userId === user._id;
        const matchesUser = exp.user === user._id;
        
        console.log('🔍 Checking expense:', exp._id, {
          submittedBy: exp.submittedBy,
          submittedById: exp.submittedBy?._id,
          userId: exp.userId,
          user: exp.user,
          matchesSubmittedBy,
          matchesSubmittedById,
          matchesUserId,
          matchesUser
        });
        
        return matchesSubmittedBy || matchesSubmittedById || matchesUserId || matchesUser;
      });
      console.log('📊 Filtered expenses count for submitter:', filteredExpenses.length);
    } else if (user?.role?.toLowerCase() === 'l1_approver') {
      console.log('🔍 Filtering for L1 approver with site ID:', user.site?._id);
      console.log('🔍 User site object:', user.site);
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      
      // L1 approver: show all expenses from their site
      filteredExpenses = expensesData.filter(exp => {
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
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      
      // L2 approver: show all expenses from all sites
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for L2 approver:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    } else if (user?.role?.toLowerCase() === 'l3_approver') {
      console.log('🔍 L3 approver: showing all expenses from all sites');
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      // L3 approver: show all expenses from all sites
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for L3 approver:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    } else if (user?.role?.toLowerCase() === 'finance') {
      console.log('🔍 Filtering for Finance - all expenses');
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      // Finance: show all expenses
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for Finance:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    }

    // Time range filtering
    let timeFilteredExpenses = filteredExpenses;
    if (timeRange === 'month') {
      timeFilteredExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      });
    } else if (timeRange === 'year') {
      timeFilteredExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getFullYear() === currentYear;
      });
    }

    // Category filtering
    if (categoryFilter !== 'all') {
      timeFilteredExpenses = timeFilteredExpenses.filter(exp => exp.category === categoryFilter);
    }

    // Calculate totals
    const totalAmount = timeFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const monthlyAmount = filteredExpenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    }).reduce((sum, exp) => sum + exp.amount, 0);
    
    const yearlyAmount = filteredExpenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getFullYear() === currentYear;
    }).reduce((sum, exp) => sum + exp.amount, 0);

    console.log('📊 Calculated amounts:');
    console.log('📊 Total Amount:', totalAmount);
    console.log('📊 Monthly Amount:', monthlyAmount);
    console.log('📊 Yearly Amount:', yearlyAmount);
    console.log('📊 Time filtered expenses count:', timeFilteredExpenses.length);

    // If no data found, try to get from dashboard API
    if (totalAmount === 0 && user?.role?.toLowerCase() === 'submitter') {
      console.log('⚠️ No expenses found, trying dashboard API...');
      // This will be handled by the dashboard API call in fetchExpenses
    }

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
      percentage: (amount / totalAmount) * 100
    })).sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      });
    }

    // Top expenses
    const topExpenses = timeFilteredExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const newStats = {
      totalAmount,
      monthlyAmount,
      yearlyAmount,
      averageAmount: timeFilteredExpenses.length > 0 ? totalAmount / timeFilteredExpenses.length : 0,
      categoryBreakdown,
      monthlyTrend,
      topExpenses
    };
    
    console.log('📊 Setting new stats:', newStats);
    setStats(newStats);
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    calculateStats(expenses);
  }, [timeRange, categoryFilter, expenses]);

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

  // Export functionality
  const handleExport = createCSVExportHandler(
    { 
      summary: {
        totalAmount: stats.totalAmount,
        monthlyAmount: stats.monthlyAmount,
        yearlyAmount: stats.yearlyAmount,
        averageAmount: stats.averageAmount,
        totalExpenses: expenses.length,
        filteredExpenses: expenses.filter(exp => {
          if (user?.role?.toLowerCase() === 'submitter') {
            return exp.submittedBy === user._id || exp.submittedBy?._id === user._id || exp.userId === user._id || exp.user === user._id;
          } else if (user?.role?.toLowerCase().includes('approver')) {
            return exp.site === user.site?._id;
          }
          return true;
        }).length
      },
      categoryBreakdown: stats.categoryBreakdown,
      monthlyTrend: stats.monthlyTrend,
      topExpenses: stats.topExpenses,
      expenses: expenses.filter(exp => {
        if (user?.role?.toLowerCase() === 'submitter') {
          return exp.submittedBy === user._id || exp.submittedBy?._id === user._id || exp.userId === user._id || exp.user === user._id;
        } else if (user?.role?.toLowerCase().includes('approver')) {
          return exp.site === user.site?._id;
        }
        return true;
      })
    }, 
    'total-amount-analysis', 
    user, 
    setError
  );

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
                Total Amount Analysis
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Detailed breakdown of expense amounts and trends
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
              <Grid item xs={12} sm={12} md={6}>
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
                    onClick={handleExport}
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
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    {timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Total Amount'}
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
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.monthlyAmount.toLocaleString()}
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
                      <CalendarToday />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.yearlyAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    This Year
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
                      <TrendingDown />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.averageAmount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Average Amount
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
                  Monthly Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#555' : '#ccc'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#fff' : '#333'} />
                    <YAxis stroke={darkMode ? '#fff' : '#333'} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#333' : '#fff',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#667eea" 
                      strokeWidth={3}
                      dot={{ fill: '#667eea', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Category Details */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            p: 3,
            mb: 4,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
              Category Details
            </Typography>
            <Grid container spacing={2}>
              {stats.categoryBreakdown.map((category, index) => (
                <Grid item xs={12} sm={6} md={4} key={category.category}>
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
                      <Typography variant="h5" fontWeight={700} color={COLORS[index % COLORS.length]}>
                        ₹{category.amount.toLocaleString()}
                      </Typography>
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

        {/* Top Expenses */}
        <Fade in timeout={1600}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Top Expenses
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Expense</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.topExpenses.map((expense, index) => (
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
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          color={expense.status === 'approved' ? 'success' : 'warning'}
                        />
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

export default TotalAmountPage;
