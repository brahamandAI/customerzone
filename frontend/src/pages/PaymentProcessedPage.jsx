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
  Payment,
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
  CheckCircle,
  Cancel,
  Warning,
  Receipt,
  AccountBalance
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

const PaymentProcessedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    monthlyPayments: 0,
    monthlyAmount: 0,
    averagePayment: 0,
    statusBreakdown: [],
    monthlyTrend: [],
    topPayments: [],
    recentPayments: []
  });

  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

  // Fetch payment data
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getAll();
      
      if (response.data.success) {
        const data = response.data.data || [];
        
        // Filter for processed payments
        const paymentData = data.filter(exp => 
          ['payment_processed', 'reimbursed', 'approved'].includes(exp.status)
        );
        
        setPayments(paymentData);
        calculateStats(paymentData);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics
  const calculateStats = (paymentData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Time range filtering
    let timeFilteredPayments = paymentData;
    if (timeRange === 'month') {
      timeFilteredPayments = paymentData.filter(payment => {
        const paymentDate = new Date(payment.expenseDate);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
    } else if (timeRange === 'year') {
      timeFilteredPayments = paymentData.filter(payment => {
        const paymentDate = new Date(payment.expenseDate);
        return paymentDate.getFullYear() === currentYear;
      });
    }

    // Status filtering
    if (statusFilter !== 'all') {
      timeFilteredPayments = timeFilteredPayments.filter(payment => payment.status === statusFilter);
    }

    // Search filtering
    if (searchTerm) {
      timeFilteredPayments = timeFilteredPayments.filter(payment => 
        payment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate totals
    const totalPayments = timeFilteredPayments.length;
    const totalAmount = timeFilteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const monthlyPayments = paymentData.filter(payment => {
      const paymentDate = new Date(payment.expenseDate);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    }).length;
    
    const monthlyAmount = paymentData.filter(payment => {
      const paymentDate = new Date(payment.expenseDate);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    }).reduce((sum, payment) => sum + payment.amount, 0);

    const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;

    // Status breakdown
    const statusMap = {};
    timeFilteredPayments.forEach(payment => {
      if (statusMap[payment.status]) {
        statusMap[payment.status].count += 1;
        statusMap[payment.status].amount += payment.amount;
      } else {
        statusMap[payment.status] = { count: 1, amount: payment.amount };
      }
    });

    const statusBreakdown = Object.entries(statusMap).map(([status, data]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count: data.count,
      amount: data.amount,
      percentage: (data.count / totalPayments) * 100
    })).sort((a, b) => b.count - a.count);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthPayments = paymentData.filter(payment => {
        const paymentDate = new Date(payment.expenseDate);
        return paymentDate.getMonth() === date.getMonth() && paymentDate.getFullYear() === date.getFullYear();
      });
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count: monthPayments.length,
        amount: monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
      });
    }

    // Top payments
    const topPayments = timeFilteredPayments
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Recent payments
    const recentPayments = timeFilteredPayments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    setStats({
      totalPayments,
      totalAmount,
      monthlyPayments,
      monthlyAmount,
      averagePayment,
      statusBreakdown,
      monthlyTrend,
      topPayments,
      recentPayments
    });
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    calculateStats(payments);
  }, [timeRange, statusFilter, searchTerm, payments]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'payment_processed': return '#4caf50';
      case 'reimbursed': return '#2196f3';
      case 'approved': return '#ff9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'payment_processed': return <Payment />;
      case 'reimbursed': return <Receipt />;
      case 'approved': return <CheckCircle />;
      default: return <Payment />;
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
                Payment Processed Overview
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Track and analyze all processed payments and reimbursements
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
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search payments..."
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
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="payment_processed">Payment Processed</MenuItem>
                    <MenuItem value="reimbursed">Reimbursed</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchPayments}
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
                        summary: { totalPayments: expenses.length, totalAmount: stats.totalAmount },
                        expenses: expenses,
                        paymentBreakdown: stats.paymentBreakdown,
                        monthlyTrend: stats.monthlyTrend
                      }, 
                      'payment-processed', 
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
                      <Payment />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.totalPayments}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    {timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Total Payments'}
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
                      ₹{stats.averagePayment.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Average Payment
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
                      <AccountBalance />
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
                  Monthly Payment Trend
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
                      stroke="#4caf50" 
                      fill="#4caf50"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stackId="2"
                      stroke="#2196f3" 
                      fill="#2196f3"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>

          {/* Status Breakdown */}
          <Grid item xs={12} md={4}>
            <Fade in timeout={1200}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.statusBreakdown.map((entry, index) => (
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

        {/* Status Details */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            p: 3,
            mb: 4,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
              Payment Status Breakdown
            </Typography>
            <Grid container spacing={2}>
              {stats.statusBreakdown.map((status, index) => (
                <Grid item xs={12} sm={6} md={4} key={status.status}>
                  <Card sx={{ 
                    background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${COLORS[index % COLORS.length]}20`
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: COLORS[index % COLORS.length], mr: 2, width: 32, height: 32 }}>
                          {getStatusIcon(status.status.toLowerCase())}
                        </Avatar>
                        <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                          {status.status}
                        </Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={700} color={COLORS[index % COLORS.length]}>
                        {status.count}
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                        Payments
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                        ₹{status.amount.toLocaleString()}
                      </Typography>
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

        {/* Recent Payments Table */}
        <Fade in timeout={1600}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Recent Processed Payments
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Payment</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Processed Date</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Recipient</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentPayments.map((payment, index) => (
                    <TableRow key={payment._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                          {payment.title}
                        </Typography>
                        <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                          {payment.expenseNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<Category />}
                          label={payment.category}
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
                          ₹{payment.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(payment.status)}
                          label={payment.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(payment.status),
                            color: '#fff',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                          {new Date(payment.expenseDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: 16, mr: 1, color: darkMode ? '#b0b0b0' : '#666' }} />
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                            {payment.submittedBy?.name || 'Unknown'}
                          </Typography>
                        </Box>
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

export default PaymentProcessedPage;
