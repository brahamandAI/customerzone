import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, Fade, Zoom, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { reportAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import * as XLSX from 'xlsx';

const Reports = () => {
  const { darkMode } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSite, setSelectedSite] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [expenseData, setExpenseData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [summaryStats, setSummaryStats] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to validate date range
  const validateDateRange = () => {
    if (selectedPeriod === 'custom') {
      if (!startDate || !endDate) {
        return { valid: false, message: 'Please select both start and end dates' };
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return { valid: false, message: 'Start date cannot be after end date' };
      }
      
      // Check if date range is not more than 2 years
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 730) { // 2 years
        return { valid: false, message: 'Date range cannot exceed 2 years' };
      }
    }
    
    return { valid: true };
  };

  // Function to get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let start, end;
    
    switch (selectedPeriod) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        end = new Date(now);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        end = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
        } else {
          // Fallback to current month
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    async function fetchReports() {
      // Validate date range before fetching
      const validation = validateDateRange();
      if (!validation.valid) {
        console.warn('⚠️ Date range validation failed:', validation.message);
        setError(validation.message);
        return;
      }
      
      setError('');
      setLoading(true);
      try {
        const dateRange = getDateRange();
        const params = {
          ...dateRange,
          site: selectedSite !== 'all' ? selectedSite : undefined
        };
        
        console.log('📊 Fetching reports with params:', params);
        
        const [detailsRes, barRes, pieRes, summaryRes] = await Promise.allSettled([
          reportAPI.getExpenseDetails(params),
          reportAPI.getBarData(params),
          reportAPI.getPieData(params),
          reportAPI.getExpenseSummary(params)
        ]);

        const expenseDataFromAPI = detailsRes.status === 'fulfilled' ? (detailsRes.value.data.data.expenses || []) : [];
        console.log('📊 Expense data received:', expenseDataFromAPI);
        console.log('📊 Number of expenses:', expenseDataFromAPI.length);
        if (expenseDataFromAPI.length > 0) {
          console.log('📊 Sample expense:', expenseDataFromAPI[0]);
        }
        setExpenseData(expenseDataFromAPI);
        
        // Handle summary data properly
        if (summaryRes.status === 'fulfilled' && summaryRes.value.data.data) {
          const data = summaryRes.value.data.data;
          setSummaryData(data);
          
          // Transform summary data into the expected format for summaryStats with real trends
          const formatTrend = (trend) => {
            const sign = trend >= 0 ? '+' : '';
            return `${sign}${trend}%`;
          };

          const getTrendDirection = (trend) => {
            if (trend > 0) return 'up';
            if (trend < 0) return 'down';
            return 'neutral';
          };

          const stats = [
            {
              label: 'Total Expenses',
              value: data.summary?.totalExpenses || 0,
              change: formatTrend(data.trends?.totalExpenses || 0),
              trend: getTrendDirection(data.trends?.totalExpenses || 0)
            },
            {
              label: 'Total Amount',
              value: `₹${(data.summary?.totalAmount || 0).toLocaleString()}`,
              change: formatTrend(data.trends?.totalAmount || 0),
              trend: getTrendDirection(data.trends?.totalAmount || 0)
            },
            {
              label: 'Approved',
              value: data.summary?.approvedCount || 0,
              change: formatTrend(data.trends?.approvedCount || 0),
              trend: getTrendDirection(data.trends?.approvedCount || 0)
            },
            {
              label: 'Pending',
              value: data.summary?.pendingCount || 0,
              change: formatTrend(data.trends?.pendingCount || 0),
              trend: getTrendDirection(data.trends?.pendingCount || 0)
            }
          ];
          setSummaryStats(stats);
          
          // Transform monthly trends for bar chart
          const barChartData = data.monthlyTrends?.map(trend => ({
            month: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
            expenses: trend.amount,
            approved: trend.approvedAmount || 0
          })) || [];
          setBarData(barChartData);
          
          // Transform category breakdown for pie chart
          const pieChartData = data.categoryBreakdown?.map(cat => ({
            name: cat._id,
            value: cat.amount
          })) || [];
          setPieData(pieChartData);
        } else {
          setSummaryStats([]);
          setSummaryData(null);
          setBarData([]);
          setPieData([]);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        // Set default values to prevent crashes
        setExpenseData([]);
        setBarData([]);
        setPieData([]);
        setSummaryStats([]);
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [selectedPeriod, selectedSite, startDate, endDate, useCustomRange]);

  const handleExportExcel = async () => {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Export Summary Data
      if (summaryData) {
        const summarySheet = [
          ['Expense Summary Report'],
          [''],
          ['Metric', 'Value', 'Trend'],
          ['Total Expenses', summaryData.summary?.totalExpenses || 0, `${summaryData.trends?.totalExpenses || 0}%`],
          ['Total Amount', `₹${(summaryData.summary?.totalAmount || 0).toLocaleString()}`, `${summaryData.trends?.totalAmount || 0}%`],
          ['Approved Count', summaryData.summary?.approvedCount || 0, `${summaryData.trends?.approvedCount || 0}%`],
          ['Pending Count', summaryData.summary?.pendingCount || 0, `${summaryData.trends?.pendingCount || 0}%`],
          ['Rejected Count', summaryData.summary?.rejectedCount || 0, 'N/A'],
          [''],
          ['Category Breakdown'],
          ['Category', 'Amount', 'Count', 'Percentage']
        ];

        // Add category breakdown
        if (summaryData.categoryBreakdown) {
          summaryData.categoryBreakdown.forEach(cat => {
            const percentage = summaryData.summary?.totalAmount > 0 
              ? Math.round((cat.amount / summaryData.summary.totalAmount) * 100) 
              : 0;
            summarySheet.push([cat._id, `₹${cat.amount.toLocaleString()}`, cat.count, `${percentage}%`]);
          });
        }

        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summarySheet);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      }

      // Export Detailed Expense Data
      if (expenseData && expenseData.length > 0) {
        const expenseSheet = [
          ['Detailed Expense Report'],
          [''],
          ['Expense ID', 'Title', 'Amount', 'Category', 'Status', 'Submitter', 'Site', 'Date', 'Submission Date', 'Description']
        ];

        expenseData.forEach(expense => {
          expenseSheet.push([
            expense.expenseId || expense._id,
            expense.title || '',
            `₹${(expense.amount || 0).toLocaleString()}`,
            expense.category || '',
            expense.status || '',
            expense.submittedBy?.name || '',
            expense.site?.name || '',
            expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : '',
            expense.submissionDate ? new Date(expense.submissionDate).toLocaleDateString() : '',
            expense.description || ''
          ]);
        });

        const expenseWorksheet = XLSX.utils.aoa_to_sheet(expenseSheet);
        XLSX.utils.book_append_sheet(workbook, expenseWorksheet, 'Expenses');
      }

      // Export Monthly Trends
      if (summaryData?.monthlyTrends && summaryData.monthlyTrends.length > 0) {
        const trendsSheet = [
          ['Monthly Trends Report'],
          [''],
          ['Month', 'Total Amount', 'Count', 'Approved Amount']
        ];

        summaryData.monthlyTrends.forEach(trend => {
          trendsSheet.push([
            `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
            `₹${(trend.amount || 0).toLocaleString()}`,
            trend.count || 0,
            `₹${(trend.approvedAmount || 0).toLocaleString()}`
          ]);
        });

        const trendsWorksheet = XLSX.utils.aoa_to_sheet(trendsSheet);
        XLSX.utils.book_append_sheet(workbook, trendsWorksheet, 'Monthly Trends');
      }

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `expense_report_${dateStr}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);
      
      console.log('Excel file exported successfully:', filename);
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      alert('Error exporting Excel file. Please try again.');
    }
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
        background: 'url("data:image/svg+xml,%3Csvg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Cpath d="M40 40c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'pulse 15s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 0.8 }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Reports & Analytics
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': { background: 'rgba(255,255,255,0.3)' }
              }}
            >
              Export Excel
            </Button>
          </Box>

          {/* Filters */}
          <Zoom in style={{ transitionDelay: '200ms' }}>
            <Paper elevation={16} sx={{ 
              p: 3, 
              mb: 3,
              borderRadius: 3, 
              background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterListIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Filters:</Typography>
                </Box>
                
                {loading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="primary">
                      Loading reports...
                    </Typography>
                  </Box>
                )}
                
                <Chip 
                  label={`Period: ${selectedPeriod === 'custom' ? `${startDate} to ${endDate}` : selectedPeriod}`}
                  color="primary"
                  variant="outlined"
                />
                
                {error && (
                  <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                    {error}
                  </Alert>
                )}
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={selectedPeriod}
                    label="Period"
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      if (e.target.value !== 'custom') {
                        setUseCustomRange(false);
                      }
                    }}
                  >
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="quarter">This Quarter</MenuItem>
                    <MenuItem value="year">This Year</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>
                
                {selectedPeriod === 'custom' && (
                  <>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 150 }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 150 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        const validation = validateDateRange();
                        if (validation.valid) {
                          setError('');
                          // Trigger report generation
                          const dateRange = getDateRange();
                          console.log('📊 Generating custom report for:', dateRange);
                        } else {
                          setError(validation.message);
                        }
                      }}
                      disabled={!startDate || !endDate}
                    >
                      Generate Report
                    </Button>
                  </>
                )}
                
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Site</InputLabel>
                  <Select
                    value={selectedSite}
                    label="Site"
                    onChange={(e) => setSelectedSite(e.target.value)}
                  >
                    <MenuItem value="all">All Sites</MenuItem>
                    <MenuItem value="site1">Site A</MenuItem>
                    <MenuItem value="site2">Site B</MenuItem>
                    <MenuItem value="site3">Site C</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Zoom>

          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {Array.isArray(summaryStats) && summaryStats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Zoom in style={{ transitionDelay: `${400 + index * 100}ms` }}>
                  <Card elevation={12} sx={{ 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                    transition: '0.3s',
                    '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                          {stat.label}
                        </Typography>
                        <Chip 
                          label={stat.change} 
                          size="small"
                          color={stat.trend === 'up' ? 'success' : 'error'}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography variant="h4" fontWeight={700} color="#667eea">
                        {stat.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Bar Chart */}
            <Grid item xs={12} lg={8}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <TrendingUpIcon sx={{ color: '#667eea', mr: 2, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600} color="#667eea">
                      Monthly Expense Trends
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: darkMode ? '#ffffff' : '#000000' }}
                        axisLine={{ stroke: darkMode ? '#444' : '#ccc' }}
                      />
                      <YAxis 
                        tick={{ fill: darkMode ? '#ffffff' : '#000000' }}
                        axisLine={{ stroke: darkMode ? '#444' : '#ccc' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#333' : '#fff',
                          border: darkMode ? '1px solid #555' : '1px solid #ccc',
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                      />
                      <Bar dataKey="expenses" fill="#667eea" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Zoom>
            </Grid>

            {/* Pie Chart */}
            <Grid item xs={12} lg={4}>
              <Zoom in style={{ transitionDelay: '800ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PieChartIcon sx={{ color: darkMode ? '#90caf9' : '#667eea', mr: 2, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#90caf9' : '#667eea'}>
                      Expense Categories
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#333' : '#fff',
                          border: darkMode ? '1px solid #555' : '1px solid #ccc',
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                        labelStyle={{
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 2 }}>
                    {pieData.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: item.color, borderRadius: '50%', mr: 1 }} />
                        <Typography variant="body2" sx={{ color: darkMode ? '#ffffff' : '#000000' }}>
                          {item.name}: {item.value}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>

          {/* Detailed Expense Table */}
          <Zoom in style={{ transitionDelay: '1000ms' }}>
            <Paper elevation={16} sx={{ 
              p: 4, 
              borderRadius: 3, 
              background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
              mt: 4
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TableChartIcon sx={{ color: darkMode ? '#90caf9' : '#667eea', mr: 2, fontSize: 28 }} />
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#90caf9' : '#667eea'}>
                  Detailed Expense Report
                </Typography>
              </Box>
              <TableContainer sx={{
                backgroundColor: darkMode ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
                borderRadius: 2,
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
              }}>
                <Table sx={{
                  '& .MuiTableCell-root': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: darkMode ? 'rgba(50,50,50,0.8)' : 'rgba(240,240,240,0.8)' }}>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>S. No.</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Expense Number</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Site Code</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Site Name</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Submitter</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000', fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenseData.length > 0 ? (
                      expenseData.map((row, index) => (
                        <TableRow key={row._id} sx={{ 
                          backgroundColor: darkMode ? 'rgba(40,40,40,0.6)' : 'rgba(255,255,255,0.6)',
                          '&:hover': {
                            backgroundColor: darkMode ? 'rgba(60,60,60,0.8)' : 'rgba(240,240,240,0.8)'
                          }
                        }}>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{index + 1}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.expenseNumber}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.category}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.site?.code || 'N/A'}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.site?.name || 'N/A'}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.description || row.title}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>₹{row.amount?.toLocaleString()}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.submittedBy?.name || 'N/A'}</TableCell>
                          <TableCell sx={{ color: darkMode ? '#ffffff' : '#000000' }}>{row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={row.status} 
                              color={
                                row.status === 'approved' ? 'success' :
                                row.status === 'rejected' ? 'error' :
                                row.status === 'submitted' ? 'warning' :
                                'default'
                              }
                              size="small"
                              sx={{
                                color: darkMode ? '#ffffff' : '#000000',
                                fontWeight: 500
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color={darkMode ? '#ffffff' : 'text.secondary'}>
                            No expense data found for the selected filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Zoom>
        </Box>
      </Fade>
    </Box>
  );
};

export default Reports; 