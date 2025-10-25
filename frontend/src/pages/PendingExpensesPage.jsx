import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Button,
  IconButton,
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
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Search,
  FilterList,
  Refresh,
  Visibility,
  Edit,
  Cancel,
  CheckCircle,
  Pending,
  Schedule,
  AttachMoney,
  Category,
  Description,
  DateRange,
  Person,
  Business,
  TrendingUp,
  TrendingDown,
  Warning,
  Info
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { expenseAPI } from '../services/api';
import { createCSVExportHandler } from '../utils/exportUtils';

const PendingExpensesPage = () => {
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
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
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
      console.log('🔍 Fetching expenses for submitter...');
      
      const response = await expenseAPI.getAll();
      
      if (response.data.success) {
        const data = response.data.data || [];
        console.log('📊 Raw expenses data:', data);
        
        // Filter expenses for submitter - only pending expenses
        let filteredExpenses = data.filter(exp => {
          const matchesSubmittedBy = exp.submittedBy === user._id;
          const matchesSubmittedById = exp.submittedBy?._id === user._id;
          const matchesUserId = exp.userId === user._id;
          const matchesUser = exp.user === user._id;
          
          const isUserExpense = matchesSubmittedBy || matchesSubmittedById || matchesUserId || matchesUser;
          const isPendingStatus = ['submitted', 'under_review', 'approved_l1', 'approved_l2', 'approved_l3', 'approved_finance'].includes(exp.status);
          
          return isUserExpense && isPendingStatus;
        });
        
        console.log('📊 Filtered pending expenses for submitter:', filteredExpenses);
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
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

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
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const totalExpenses = timeFilteredExpenses.length;
    const totalAmount = timeFilteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    const pendingAmount = timeFilteredExpenses
      .filter(exp => ['submitted', 'under_review', 'approved_l1', 'approved_l2', 'approved_l3', 'approved_finance'].includes(exp.status))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    const approvedAmount = timeFilteredExpenses
      .filter(exp => ['approved', 'reimbursed', 'payment_processed'].includes(exp.status))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    const rejectedAmount = timeFilteredExpenses
      .filter(exp => exp.status === 'rejected')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Category breakdown
    const categoryBreakdown = timeFilteredExpenses.reduce((acc, exp) => {
      const category = exp.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 };
      }
      acc[category].count++;
      acc[category].amount += exp.amount || 0;
      return acc;
    }, {});

    const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    // Status breakdown
    const statusBreakdown = timeFilteredExpenses.reduce((acc, exp) => {
      const status = exp.status || 'unknown';
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count++;
      acc[status].amount += exp.amount || 0;
      return acc;
    }, {});

    const statusBreakdownArray = Object.entries(statusBreakdown).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthExpenses = timeFilteredExpenses.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === month && expDate.getFullYear() === year;
      });
      
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        count: monthExpenses.length
      });
    }

    // Top expenses
    const topExpenses = [...timeFilteredExpenses]
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5);

    // Recent expenses
    const recentExpenses = [...timeFilteredExpenses]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    setStats({
      totalExpenses,
      totalAmount,
      pendingAmount,
      approvedAmount,
      rejectedAmount,
      categoryBreakdown: categoryBreakdownArray,
      statusBreakdown: statusBreakdownArray,
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
    const statusColors = {
      submitted: '#ff9800',
      under_review: '#2196f3',
      approved_l1: '#4caf50',
      approved_l2: '#4caf50',
      approved_l3: '#4caf50',
      approved_finance: '#4caf50',
      approved: '#4caf50',
      rejected: '#f44336',
      reimbursed: '#4caf50',
      payment_processed: '#4caf50'
    };
    return statusColors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      submitted: <Pending />,
      under_review: <Schedule />,
      approved_l1: <CheckCircle />,
      approved_l2: <CheckCircle />,
      approved_l3: <CheckCircle />,
      approved_finance: <CheckCircle />,
      approved: <CheckCircle />,
      rejected: <Cancel />,
      reimbursed: <CheckCircle />,
      payment_processed: <CheckCircle />
    };
    return statusIcons[status] || <Info />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Pending Expenses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={createCSVExportHandler(expenses, 'pending-expenses')}
          sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
        >
          Export
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Pending
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {stats.totalExpenses}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <Pending />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Amount
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {formatCurrency(stats.pendingAmount)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <AttachMoney />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Approved Amount
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {formatCurrency(stats.approvedAmount)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Rejected Amount
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#f44336">
                    {formatCurrency(stats.rejectedAmount)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f44336' }}>
                  <Cancel />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <MenuItem value="all">All Categories</MenuItem>
                {stats.categoryBreakdown.map((cat) => (
                  <MenuItem key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                {stats.statusBreakdown.map((status) => (
                  <MenuItem key={status.status} value={status.status}>
                    {status.status} ({status.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Expenses Table */}
      <Paper sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Expense #</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {expense.expenseNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {expense.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.category}
                      size="small"
                      sx={{ bgcolor: COLORS[0], color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(expense.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(expense.status)}
                      label={expense.status}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(expense.status),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(expense.expenseDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {expenses.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No pending expenses found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PendingExpensesPage;
