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
  Person,
  PersonAdd,
  PersonRemove,
  Edit,
  Delete,
  Search,
  FilterList,
  Refresh,
  Download,
  Business,
  Email,
  Phone,
  CalendarToday,
  CheckCircle,
  Cancel,
  Warning,
  AttachMoney
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { userAPI, siteAPI } from '../services/api';
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

const TotalUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    roleBreakdown: [],
    siteBreakdown: [],
    monthlyGrowth: [],
    recentUsers: []
  });

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffecd2'];

  // Fetch users and sites data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersResponse, sitesResponse] = await Promise.all([
        userAPI.getUsers(),
        siteAPI.getAll()
      ]);
      
      if (usersResponse.data.success && sitesResponse.data.success) {
        const usersData = usersResponse.data.data || [];
        const sitesData = sitesResponse.data.data || [];
        
        setUsers(usersData);
        setSites(sitesData);
        calculateStats(usersData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics
  const calculateStats = (usersData) => {
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.isActive !== false).length;
    const inactiveUsers = totalUsers - activeUsers;

    // Role breakdown
    const roleMap = {};
    usersData.forEach(user => {
      if (roleMap[user.role]) {
        roleMap[user.role] += 1;
      } else {
        roleMap[user.role] = 1;
      }
    });

    const roleBreakdown = Object.entries(roleMap).map(([role, count]) => ({
      role: role.replace('_', ' ').toUpperCase(),
      count,
      percentage: (count / totalUsers) * 100
    })).sort((a, b) => b.count - a.count);

    // Site breakdown
    const siteMap = {};
    usersData.forEach(user => {
      const siteName = user.site?.name || 'No Site';
      if (siteMap[siteName]) {
        siteMap[siteName] += 1;
      } else {
        siteMap[siteName] = 1;
      }
    });

    const siteBreakdown = Object.entries(siteMap).map(([site, count]) => ({
      site,
      count,
      percentage: (count / totalUsers) * 100
    })).sort((a, b) => b.count - a.count);

    // Monthly growth (last 6 months)
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthUsers = usersData.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate.getMonth() === date.getMonth() && userDate.getFullYear() === date.getFullYear();
      });
      monthlyGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count: monthUsers.length
      });
    }

    // Recent users
    const recentUsers = usersData
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    setStats({
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleBreakdown,
      siteBreakdown,
      monthlyGrowth,
      recentUsers
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSite = siteFilter === 'all' || user.site?._id === siteFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive !== false) ||
      (statusFilter === 'inactive' && user.isActive === false);
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesSite && matchesStatus && matchesSearch;
  });

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'submitter': return '#2196f3';
      case 'l1_approver': return '#ff9800';
      case 'l2_approver': return '#9c27b0';
      case 'l3_approver': return '#f44336';
      case 'finance': return '#4caf50';
      default: return '#757575';
    }
  };

  const getRoleIcon = (role) => {
    switch (role.toLowerCase()) {
      case 'submitter': return <Person />;
      case 'l1_approver': return <CheckCircle />;
      case 'l2_approver': return <CheckCircle />;
      case 'l3_approver': return <CheckCircle />;
      case 'finance': return <AttachMoney />;
      default: return <Person />;
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setOpenDialog(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userAPI.deleteUser(userId);
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
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
                Total Users Management
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Manage users, roles, and access permissions
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
                  placeholder="Search users..."
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
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="submitter">Submitter</MenuItem>
                    <MenuItem value="l1_approver">L1 Approver</MenuItem>
                    <MenuItem value="l2_approver">L2 Approver</MenuItem>
                    <MenuItem value="l3_approver">L3 Approver</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Site</InputLabel>
                  <Select
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Sites</MenuItem>
                    {sites.map((site) => (
                      <MenuItem key={site._id} value={site._id}>
                        {site.name}
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
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={3}>
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
                        summary: { totalUsers: users.length, activeUsers: stats.activeUsers },
                        users: users,
                        roleBreakdown: stats.roleBreakdown,
                        siteBreakdown: stats.siteBreakdown
                      }, 
                      'total-users', 
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
                      <Person />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.totalUsers}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Users
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
                      {stats.activeUsers}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Active Users
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
                    <Avatar sx={{ bgcolor: '#f44336', mr: 2 }}>
                      <Cancel />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.inactiveUsers}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Inactive Users
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
                      <Business />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.roleBreakdown.length}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Roles
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
                  Monthly User Growth
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthlyGrowth}>
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

          {/* Role Breakdown */}
          <Grid item xs={12} md={4}>
            <Fade in timeout={1200}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Role Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.roleBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, percentage }) => `${role} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.roleBreakdown.map((entry, index) => (
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

        {/* Users Table */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Users List ({filteredUsers.length} users)
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Site</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Joined</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: getRoleColor(user.role) }}>
                            {getRoleIcon(user.role)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getRoleIcon(user.role)}
                          label={user.role.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: getRoleColor(user.role),
                            color: '#fff',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                          {user.site?.name || 'No Site'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive !== false ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.isActive !== false ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => handleEditUser(user)}
                              sx={{ color: '#2196f3' }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user._id)}
                              sx={{ color: '#f44336' }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>

        {/* Edit User Dialog */}
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
            Edit User: {selectedUser?.name}
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Name"
                      defaultValue={selectedUser.name}
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
                      label="Email"
                      defaultValue={selectedUser.email}
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
                      <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Role</InputLabel>
                      <Select
                        defaultValue={selectedUser.role}
                        sx={{ color: darkMode ? '#fff' : '#333' }}
                      >
                        <MenuItem value="submitter">Submitter</MenuItem>
                        <MenuItem value="l1_approver">L1 Approver</MenuItem>
                        <MenuItem value="l2_approver">L2 Approver</MenuItem>
                        <MenuItem value="l3_approver">L3 Approver</MenuItem>
                        <MenuItem value="finance">Finance</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Site</InputLabel>
                      <Select
                        defaultValue={selectedUser.site?._id}
                        sx={{ color: darkMode ? '#fff' : '#333' }}
                      >
                        {sites.map((site) => (
                          <MenuItem key={site._id} value={site._id}>
                            {site.name}
                          </MenuItem>
                        ))}
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
              Update User
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default TotalUsersPage;
