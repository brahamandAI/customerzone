import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  CircularProgress,
  Fade,
  Zoom
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  Visibility,
  FilterList,
  Search,
  Refresh,
  TrendingUp,
  TrendingDown,
  Schedule,
  Person,
  Business,
  AttachMoney,
  Download
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { expenseAPI } from '../services/api';
import { createCSVExportHandler } from '../utils/exportUtils';

const PendingApprovalsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [approvals, setApprovals] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [modifiedAmount, setModifiedAmount] = useState('');
  const [amountChangeReason, setAmountChangeReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    overdue: 0,
    totalAmount: 0
  });

  const itemsPerPage = 10;

  // Fetch pending approvals
  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getPendingApprovals();
      
      if (response.data.success) {
        const data = response.data.data;
        setApprovals(data || []);
        
        // Calculate stats
        const total = data?.length || 0;
        const urgent = data?.filter(exp => exp.priority === 'urgent' || exp.daysSinceSubmission > 7).length || 0;
        const overdue = data?.filter(exp => exp.daysSinceSubmission > 7).length || 0;
        const totalAmount = data?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        
        setStats({ total, urgent, overdue, totalAmount });
        setTotalPages(Math.ceil(total / itemsPerPage));
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Filter and search approvals
  const filteredApprovals = approvals.filter(approval => {
    const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
    const matchesSearch = approval.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Pagination
  const paginatedApprovals = filteredApprovals.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleApprove = async (id) => {
    try {
      const response = await expenseAPI.approveExpense(id, {
        action: 'approve',
        level: 2,
        approverId: user?._id,
        comments: approvalComment,
        modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : null,
        modificationReason: amountChangeReason
      });

      if (response.data.success) {
        setOpenDialog(false);
        setApprovalComment('');
        setModifiedAmount('');
        setAmountChangeReason('');
        fetchApprovals();
      }
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await expenseAPI.rejectExpense(id, {
        action: 'reject',
        level: 2,
        approverId: user?._id,
        comments: approvalComment
      });

      if (response.data.success) {
        setOpenDialog(false);
        setApprovalComment('');
        fetchApprovals();
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#ff9800';
      case 'under_review': return '#2196f3';
      case 'approved_l1': return '#4caf50';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <Schedule />;
      case 'under_review': return <Visibility />;
      case 'approved_l1': return <CheckCircle />;
      default: return <Schedule />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#757575';
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
                Pending Approvals
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Review and approve pending expense requests
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={createCSVExportHandler(
                  { 
                    summary: { totalPending: expenses.length },
                    expenses: expenses,
                    filters: { status: 'pending' }
                  }, 
                  'pending-approvals', 
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
          </Box>
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
                    <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                      <Schedule />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.total}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Pending
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
                    <Avatar sx={{ bgcolor: '#f44336', mr: 2 }}>
                      <TrendingUp />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.urgent}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Urgent
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
                    <Avatar sx={{ bgcolor: '#ff5722', mr: 2 }}>
                      <TrendingDown />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.overdue}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Overdue
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
        </Grid>

        {/* Filters and Search */}
        <Fade in timeout={800}>
          <Paper sx={{ 
            p: 3, 
            mb: 3,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
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
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: darkMode ? '#b0b0b0' : '#666' }}>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    sx={{ color: darkMode ? '#fff' : '#333' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="submitted">Submitted</MenuItem>
                    <MenuItem value="under_review">Under Review</MenuItem>
                    <MenuItem value="approved_l1">L1 Approved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={5}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchApprovals}
                    sx={{ 
                      borderColor: darkMode ? '#555' : '#ccc',
                      color: darkMode ? '#fff' : '#333'
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>

        {/* Approvals Table */}
        <Fade in timeout={1000}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Expense</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Submitted By</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Priority</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Days</TableCell>
                    <TableCell sx={{ color: darkMode ? '#fff' : '#333', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedApprovals.map((approval) => (
                    <TableRow key={approval._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                            {approval.title}
                          </Typography>
                          <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                            {approval.expenseNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: '#667eea' }}>
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" color={darkMode ? '#fff' : '#333'}>
                              {approval.submittedBy?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                              {approval.department}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} color={darkMode ? '#fff' : '#333'}>
                          ₹{approval.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(approval.status)}
                          label={approval.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(approval.status),
                            color: '#fff',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={approval.priority || 'Medium'}
                          size="small"
                          sx={{
                            bgcolor: getPriorityColor(approval.priority),
                            color: '#fff',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={approval.daysSinceSubmission > 7 ? '#f44336' : (darkMode ? '#b0b0b0' : '#666')}
                        >
                          {approval.daysSinceSubmission || 0} days
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setOpenDialog(true);
                              }}
                              sx={{ color: '#2196f3' }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </Paper>
        </Fade>

        {/* Approval Dialog */}
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
            Review Expense: {selectedApproval?.title}
          </DialogTitle>
          <DialogContent>
            {selectedApproval && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Expense Number
                    </Typography>
                    <Typography variant="body1" color={darkMode ? '#fff' : '#333'}>
                      {selectedApproval.expenseNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Amount
                    </Typography>
                    <Typography variant="body1" color={darkMode ? '#fff' : '#333'}>
                      ₹{selectedApproval.amount.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Submitted By
                    </Typography>
                    <Typography variant="body1" color={darkMode ? '#fff' : '#333'}>
                      {selectedApproval.submittedBy?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Site
                    </Typography>
                    <Typography variant="body1" color={darkMode ? '#fff' : '#333'}>
                      {selectedApproval.site?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Approval Comment"
                      multiline
                      rows={3}
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
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
                      label="Modified Amount (Optional)"
                      type="number"
                      value={modifiedAmount}
                      onChange={(e) => setModifiedAmount(e.target.value)}
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
                      label="Amount Change Reason"
                      value={amountChangeReason}
                      onChange={(e) => setAmountChangeReason(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: darkMode ? '#fff' : '#333',
                          '& fieldset': { borderColor: darkMode ? '#555' : '#ccc' }
                        }
                      }}
                    />
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
              onClick={() => handleReject(selectedApproval?._id)}
              color="error"
              startIcon={<Cancel />}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleApprove(selectedApproval?._id)}
              color="success"
              startIcon={<CheckCircle />}
            >
              Approve & Forward
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default PendingApprovalsPage;
