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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack,
  Business,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Refresh,
  Download,
  LocationOn,
  AttachMoney,
  People,
  TrendingUp,
  CheckCircle,
  Cancel,
  Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { siteAPI, userAPI } from '../services/api';
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

const TotalSitesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeSites: 0,
    inactiveSites: 0,
    totalBudget: 0,
    usedBudget: 0,
    siteBreakdown: [],
    monthlyTrend: [],
    topSites: []
  });

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffecd2'];

  // Fetch sites and users data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sitesResponse, usersResponse] = await Promise.all([
        siteAPI.getAll(),
        userAPI.getUsers()
      ]);
      
      if (sitesResponse.data.success && usersResponse.data.success) {
        const sitesData = sitesResponse.data.data || [];
        const usersData = usersResponse.data.data || [];
        
        setSites(sitesData);
        setUsers(usersData);
        calculateStats(sitesData, usersData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics
  const calculateStats = (sitesData, usersData) => {
    const totalSites = sitesData.length;
    const activeSites = sitesData.filter(site => site.isActive !== false).length;
    const inactiveSites = totalSites - activeSites;

    // Budget calculations
    const totalBudget = sitesData.reduce((sum, site) => sum + (site.budget?.monthly || 0), 0);
    const usedBudget = sitesData.reduce((sum, site) => sum + (site.statistics?.monthlySpend || 0), 0);

    // Site breakdown by budget utilization
    const siteBreakdown = sitesData.map(site => {
      const monthlyBudget = site.budget?.monthly || 0;
      const monthlySpend = site.statistics?.monthlySpend || 0;
      const utilization = monthlyBudget > 0 ? (monthlySpend / monthlyBudget) * 100 : 0;
      
      return {
        name: site.name,
        budget: monthlyBudget,
        spent: monthlySpend,
        utilization: utilization,
        users: usersData.filter(user => user.site?._id === site._id).length
      };
    }).sort((a, b) => b.budget - a.budget);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthSites = sitesData.filter(site => {
        const siteDate = new Date(site.createdAt);
        return siteDate.getMonth() === date.getMonth() && siteDate.getFullYear() === date.getFullYear();
      });
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count: monthSites.length
      });
    }

    // Top sites by budget
    const topSites = siteBreakdown.slice(0, 10);

    setStats({
      totalSites,
      activeSites,
      inactiveSites,
      totalBudget,
      usedBudget,
      siteBreakdown,
      monthlyTrend,
      topSites
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter sites
  const filteredSites = sites.filter(site => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && site.isActive !== false) ||
      (statusFilter === 'inactive' && site.isActive === false);
    const matchesSearch = searchTerm === '' || 
      site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return '#f44336';
    if (utilization >= 80) return '#ff9800';
    if (utilization >= 50) return '#2196f3';
    return '#4caf50';
  };

  const getUtilizationStatus = (utilization) => {
    if (utilization >= 90) return 'Critical';
    if (utilization >= 80) return 'Warning';
    if (utilization >= 50) return 'Moderate';
    return 'Healthy';
  };

  const handleEditSite = (site) => {
    setSelectedSite(site);
    setOpenDialog(true);
  };

  const handleDeleteSite = async (siteId) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      try {
        await siteAPI.deleteSite(siteId);
        fetchData();
      } catch (error) {
        console.error('Error deleting site:', error);
      }
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
                Total Sites Management
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Manage sites, budgets, and location-based operations
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
                  placeholder="Search sites..."
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
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={5}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
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
                        summary: { totalSites: sites.length, activeSites: stats.activeSites },
                        sites: sites,
                        budgetBreakdown: stats.budgetBreakdown,
                        locationBreakdown: stats.locationBreakdown
                      }, 
                      'total-sites', 
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
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    sx={{ 
                      bgcolor: '#667eea',
                      '&:hover': { bgcolor: '#5a6fd8' }
                    }}
                  >
                    Add Site
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
                      <Business />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.totalSites}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Sites
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
                      <CheckCircle />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.activeSites}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Active Sites
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
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Budget
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
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.usedBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Used Budget
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Monthly Growth Chart */}
          <Grid item xs={12} md={8}>
            <Fade in timeout={1000}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Monthly Site Growth
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthlyTrend}>
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
                    <Bar dataKey="count" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>

          {/* Budget Utilization */}
          <Grid item xs={12} md={4}>
            <Fade in timeout={1200}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Budget Utilization
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Total Budget
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Used Budget
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.usedBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.totalBudget > 0 ? (stats.usedBudget / stats.totalBudget) * 100 : 0} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: darkMode ? '#333' : '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#667eea'
                      }
                    }}
                  />
                </Box>
                <Typography variant="h4" fontWeight={700} color="#667eea" sx={{ textAlign: 'center' }}>
                  {stats.totalBudget > 0 ? ((stats.usedBudget / stats.totalBudget) * 100).toFixed(1) : 0}%
                </Typography>
                <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ textAlign: 'center' }}>
                  Utilization Rate
                </Typography>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Sites Table */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Sites List ({filteredSites.length} sites)
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Site</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Budget</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Utilization</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Users</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSites.map((site) => {
                    const siteStats = stats.siteBreakdown.find(s => s.name === site.name);
                    const utilization = siteStats?.utilization || 0;
                    
                    return (
                      <TableRow key={site._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: '#667eea' }}>
                              <Business />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                                {site.name}
                              </Typography>
                              <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                                {site.code}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationOn sx={{ fontSize: 16, mr: 1, color: darkMode ? '#b0b0b0' : '#666' }} />
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              {site.location || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                            ₹{site.budget?.monthly?.toLocaleString() || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              {utilization.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={utilization} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: darkMode ? '#333' : '#f0f0f0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getUtilizationColor(utilization)
                              }
                            }}
                          />
                          <Typography variant="caption" color={getUtilizationColor(utilization)}>
                            {getUtilizationStatus(utilization)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <People sx={{ fontSize: 16, mr: 1, color: darkMode ? '#b0b0b0' : '#666' }} />
                            <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                              {siteStats?.users || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={site.isActive !== false ? 'Active' : 'Inactive'}
                            size="small"
                            color={site.isActive !== false ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit Site">
                              <IconButton
                                size="small"
                                onClick={() => handleEditSite(site)}
                                sx={{ color: '#2196f3' }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Site">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteSite(site._id)}
                                sx={{ color: '#f44336' }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>

        {/* Edit Site Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
            }
          }}
        >
          <DialogTitle sx={{ color: darkMode ? '#fff' : '#333' }}>
            Edit Site: {selectedSite?.name}
          </DialogTitle>
          <DialogContent>
            {selectedSite && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Site Name"
                      defaultValue={selectedSite.name}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: darkMode ? '#fff' : '#333',
                          '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Site Code"
                      defaultValue={selectedSite.code}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: darkMode ? '#fff' : '#333',
                          '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location"
                      defaultValue={selectedSite.location}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: darkMode ? '#fff' : '#333',
                          '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Monthly Budget"
                      type="number"
                      defaultValue={selectedSite.budget?.monthly}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: darkMode ? '#fff' : '#333',
                          '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                      <Select
                        defaultValue={selectedSite.isActive !== false ? 'active' : 'inactive'}
                        sx={{ color: darkMode ? '#fff' : '#333' }}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setOpenDialog(false)}
              sx={{ color: darkMode ? '#b0b0b0' : '#666' }}
            >
              Cancel
            </Button>
            <Button 
              color="primary"
              startIcon={<Edit />}
            >
              Update Site
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default TotalSitesPage;
