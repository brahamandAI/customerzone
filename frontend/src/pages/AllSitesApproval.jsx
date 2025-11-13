import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Fade, 
  Zoom, 
  Button, 
  Chip, 
  Avatar, 
  List, 
  ListItem, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Tabs, 
  Tab, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip
} from '@mui/material';
import ApprovalIcon from '@mui/icons-material/Approval';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { expenseAPI, siteAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import AttachmentViewer from '../components/AttachmentViewer';

const AllSitesApproval = () => {
  const navigate = useNavigate();
  const [allExpenses, setAllExpenses] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [modifiedAmount, setModifiedAmount] = useState('');
  const [amountChangeReason, setAmountChangeReason] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedExpenseForAttachments, setSelectedExpenseForAttachments] = useState(null);
  const { user, getUserRole } = useAuth();
  const { socket } = useSocket();
  const { darkMode } = useTheme();

  const userRole = getUserRole();
  const isL2Approver = userRole === 'L2_APPROVER';

  // Fetch all sites
  const fetchSites = useCallback(async () => {
    try {
      const response = await siteAPI.getAll();
      if (response.data.success) {
        setSites(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  }, []);

  // Fetch all expenses for L2 approver
  const fetchAllExpenses = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching all expenses for L2 approver');
      const response = await expenseAPI.getAll();
      if (response.data.success) {
        let filteredExpenses = response.data.data;
        
        // Filter for L2 approver (expenses that need L2 approval)
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.status === 'approved_l1' || 
          expense.status === 'submitted' // Include submitted for overview
        );

        // Transform data
        const transformedExpenses = filteredExpenses.map(expense => {
          // Transform approval history to match frontend expected format
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
            id: expense.id || expense._id,
            expenseNumber: expense.expenseNumber,
            title: expense.title,
            amount: expense.amount,
            site: expense.site?.name || 'Unknown Site',
            siteId: expense.site?._id || expense.site,
            category: expense.category,
            submitter: expense.submittedBy?.name || 'Unknown User',
            date: new Date(expense.expenseDate).toISOString().split('T')[0],
            description: expense.description,
            status: expense.status,
            approvalLevel: expense.status === 'submitted' ? 'L1' :
                         expense.status === 'approved_l1' ? 'L2' : 'L1',
            priority: expense.priority || 'normal',
            attachments: expense.attachments?.length || 0,
            modifiedAmount: expense.modifiedAmount,
            approvalComments: transformedApprovalHistory
          };
        });

        setAllExpenses(transformedExpenses);
      } else {
        throw new Error(response.data.message || 'Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching all expenses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter expenses based on selected site and status
  const getFilteredExpenses = () => {
    let filtered = allExpenses;

    if (selectedSite !== 'all') {
      filtered = filtered.filter(expense => expense.siteId === selectedSite);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === selectedStatus);
    }

    return filtered;
  };

  // Socket event handlers
  useEffect(() => {
    if (socket) {
      socket.on('expense-updated', handleExpenseUpdate);
      socket.on('expense-approved-l1', handleExpenseApprovedL1);
      socket.on('expense-approved-l2', handleExpenseApprovedL2);
      socket.on('expense-rejected', handleExpenseRejected);
      socket.on('payment-processed', handlePaymentProcessed);

      return () => {
        socket.off('expense-updated', handleExpenseUpdate);
        socket.off('expense-approved-l1', handleExpenseApprovedL1);
        socket.off('expense-approved-l2', handleExpenseApprovedL2);
        socket.off('expense-rejected', handleExpenseRejected);
        socket.off('payment-processed', handlePaymentProcessed);
      };
    }
  }, [socket]);

  const handleExpenseUpdate = () => {
    fetchAllExpenses();
  };

  const handleExpenseApprovedL1 = () => {
    fetchAllExpenses();
  };

  const handleExpenseApprovedL2 = () => {
    fetchAllExpenses();
  };

  const handleExpenseRejected = () => {
    fetchAllExpenses();
  };

  const handlePaymentProcessed = () => {
    fetchAllExpenses();
  };

  // Load data on component mount
  useEffect(() => {
    fetchSites();
    fetchAllExpenses();
  }, [fetchSites, fetchAllExpenses]);

  // Approval handlers
  const handleApprove = async (id) => {
    try {
      const response = await expenseAPI.approveExpense(id, {
        comment: approvalComment,
        modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : undefined,
        amountChangeReason: amountChangeReason || undefined,
        priority: selectedPriority
      });

      if (response.data.success) {
        setSnackbarMessage('Expense approved successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setOpenDialog(false);
        setApprovalComment('');
        setModifiedAmount('');
        setAmountChangeReason('');
        fetchAllExpenses();
      }
    } catch (error) {
      setSnackbarMessage(error.response?.data?.message || 'Failed to approve expense');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await expenseAPI.rejectExpense(id, {
        comment: approvalComment
      });

      if (response.data.success) {
        setSnackbarMessage('Expense rejected successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setOpenDialog(false);
        setApprovalComment('');
        fetchAllExpenses();
      }
    } catch (error) {
      setSnackbarMessage(error.response?.data?.message || 'Failed to reject expense');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleOpenDialog = (expense) => {
    setSelectedExpense(expense);
    setOpenDialog(true);
  };

  const handleOpenAttachmentDialog = (expense) => {
    setSelectedExpenseForAttachments(expense);
    setAttachmentDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#ff9800';
      case 'approved_l1': return '#2196f3';
      case 'approved_l2': return '#4caf50';
      case 'rejected': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <PendingIcon />;
      case 'approved_l1': return <CheckCircleIcon />;
      case 'approved_l2': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      default: return <PendingIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const canApprove = (expense) => {
    return expense.status === 'approved_l1' && isL2Approver;
  };

  const filteredExpenses = getFilteredExpenses();
  const pendingApprovals = filteredExpenses.filter(expense => 
    canApprove(expense) && expense.status === 'approved_l1'
  ).length;

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Fade in timeout={1000}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/approval')}
                sx={{ mr: 2, color: 'white' }}
              >
                Back to Approvals
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <img 
                  src="/rakshak-logo.png" 
                  alt="Rakshak Securitas Logo" 
                  style={{ height: '40px' }}
                />
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
              <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                All Sites Overview
              </Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}>
                <Zoom in style={{ transitionDelay: '200ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: '#ff9800', mx: 'auto', mb: 2 }}>
                      <PendingIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#ff9800">
                      {pendingApprovals}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending L2 Approvals
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Zoom in style={{ transitionDelay: '400ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: '#2196f3', mx: 'auto', mb: 2 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#2196f3">
                      {sites.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sites
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Zoom in style={{ transitionDelay: '600ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                      <AttachMoneyIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#4caf50">
                      ₹{totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Zoom in style={{ transitionDelay: '800ms' }}>
                  <Paper elevation={16} sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2 }}>
                      <ReceiptIcon />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700} color="#9c27b0">
                      {filteredExpenses.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Expenses
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
            </Grid>

            {/* Filters */}
            <Paper elevation={16} sx={{ 
              p: 3, 
              mb: 4,
              borderRadius: 3, 
              background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FilterListIcon sx={{ mr: 1, color: '#008080' }} />
                <Typography variant="h6" fontWeight={600}>
                  Filters
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Site</InputLabel>
                    <Select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      label="Site"
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
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="submitted">Submitted</MenuItem>
                      <MenuItem value="approved_l1">Approved L1</MenuItem>
                      <MenuItem value="approved_l2">Approved L2</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Expenses List */}
            <Paper elevation={16} sx={{ 
              borderRadius: 3, 
              background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
            }}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
                <Typography variant="h6" fontWeight={600}>
                  All Sites Expenses ({filteredExpenses.length})
                </Typography>
              </Box>
              
              <List sx={{ p: 0 }}>
                {filteredExpenses.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No expenses found for the selected filters.
                    </Typography>
                  </Box>
                ) : (
                  filteredExpenses.map((expense, index) => (
                    <React.Fragment key={expense.id}>
                      <ListItem sx={{ 
                        p: 3, 
                        '&:hover': { 
                          background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' 
                        }
                      }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ 
                                bgcolor: getStatusColor(expense.status), 
                                mr: 2,
                                width: 40,
                                height: 40
                              }}>
                                {getStatusIcon(expense.status)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {expense.expenseNumber}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {expense.title}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationOnIcon sx={{ mr: 1, color: '#008080' }} />
                              <Typography variant="body2">
                                {expense.site}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CurrencyRupeeIcon sx={{ mr: 1, color: '#4caf50' }} />
                              <Typography variant="body1" fontWeight={600}>
                                ₹{expense.amount.toLocaleString()}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CategoryIcon sx={{ mr: 1, color: '#ff9800' }} />
                              <Typography variant="body2">
                                {expense.category}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon sx={{ mr: 1, color: '#2196f3' }} />
                              <Typography variant="body2">
                                {expense.submitter}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              {canApprove(expense) && (
                                <Tooltip title="Approve">
                                  <IconButton
                                    onClick={() => handleOpenDialog(expense)}
                                    sx={{ color: '#4caf50' }}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {expense.attachments > 0 && (
                                <Tooltip title={`${expense.attachments} attachments`}>
                                  <IconButton 
                                    sx={{ color: '#ff9800' }}
                                    onClick={() => handleOpenAttachmentDialog(expense)}
                                  >
                                    <AttachFileIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </ListItem>
                      {index < filteredExpenses.length - 1 && (
                        <Divider />
                      )}
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
          </Box>
        </Fade>
      )}

      {/* Approval Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ApprovalIcon sx={{ mr: 2, color: '#008080' }} />
            <Typography variant="h6">
              Approve Expense - {selectedExpense?.expenseNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                  <Typography variant="body1">{selectedExpense.title}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                  <Typography variant="body1">₹{selectedExpense.amount.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Site</Typography>
                  <Typography variant="body1">{selectedExpense.site}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                  <Typography variant="body1">{selectedExpense.category}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedExpense.description || 'No description provided'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Approval Comment"
                    multiline
                    rows={3}
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add your approval comment..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => handleReject(selectedExpense?.id)}
            color="error"
            variant="outlined"
          >
            Reject
          </Button>
          <Button 
            onClick={() => handleApprove(selectedExpense?.id)}
            variant="contained"
            sx={{ background: '#4caf50' }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attachment Dialog */}
      <Dialog 
        open={attachmentDialogOpen} 
        onClose={() => setAttachmentDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachFileIcon sx={{ mr: 2, color: '#ff9800' }} />
            <Typography variant="h6">
              Attachments - {selectedExpenseForAttachments?.expenseNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedExpenseForAttachments && (
            <AttachmentViewer 
              expenseId={selectedExpenseForAttachments.id || selectedExpenseForAttachments._id}
              attachments={selectedExpenseForAttachments.attachments || []}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachmentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AllSitesApproval;
