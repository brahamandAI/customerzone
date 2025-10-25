import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, Fade, Zoom, Button, Chip, Avatar, List, ListItem, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Snackbar, Alert, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
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
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { expenseAPI, dashboardAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import AttachmentViewer from '../components/AttachmentViewer';

const Approval = () => {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [modifiedAmount, setModifiedAmount] = useState('');
  const [amountChangeReason, setAmountChangeReason] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [approvalPriorities, setApprovalPriorities] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState(null);
  const [approvalStats, setApprovalStats] = useState({
    approvedCount: 0,
    rejectedCount: 0,
    totalAmount: 0,
    currentMonthApprovedAmount: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedApprovalForAttachments, setSelectedApprovalForAttachments] = useState(null);
  const { user, getUserRole } = useAuth();
  const { socket } = useSocket();
  const { darkMode } = useTheme();

  // Get user role in correct format
  const userRole = getUserRole(); // This returns UPPERCASE
  const isL3Approver = userRole === 'L3_APPROVER';
  const isL2Approver = userRole === 'L2_APPROVER';
  const isFinance = userRole === 'FINANCE';
  const canSetPriority = isL2Approver || isL3Approver;
  console.log('User role from context:', userRole);
  console.log('Is L3 Approver (correct check):', isL3Approver);
  console.log('Can set priority:', canSetPriority);

  // Fetch approval statistics from dashboard
  const fetchApprovalStats = useCallback(async () => {
    try {
      console.log('Fetching approval statistics...');
      const response = await dashboardAPI.getOverview({ timestamp: Date.now() });
      if (response.data.success) {
        const data = response.data.data;
        console.log('Approval stats response:', data);
        
        // Extract approval statistics
        if (data.approvalStats) {
          setApprovalStats({
            approvedCount: data.approvalStats.approvedCount || 0,
            rejectedCount: data.approvalStats.rejectedCount || 0,
            totalAmount: data.approvalStats.totalAmount || 0,
            currentMonthApprovedAmount: data.approvalStats.currentMonthApprovedAmount || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
    }
  }, []);

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching pending approvals');
      const response = await expenseAPI.getPendingApprovals();
      if (response.data.success) {
        const userRole = getUserRole();
        let filteredExpenses = response.data.data;
        
        console.log('Raw expenses from API:', filteredExpenses);
        console.log('User role for filtering:', userRole);
        console.log('Total expenses from API:', response.data.data.length);
        
        // Filter based on role
        if (userRole === 'L1_APPROVER') {
          filteredExpenses = response.data.data.filter(expense => expense.status === 'submitted' || expense.status === 'under_review');
          console.log('L1 Approver - Filtered expenses (submitted + under_review):', filteredExpenses);
        } else if (userRole === 'L2_APPROVER') {
          filteredExpenses = response.data.data.filter(expense => expense.status === 'approved_l1');
          console.log('L2 Approver - Filtered expenses (approved_l1):', filteredExpenses);
        } else if (userRole === 'L3_APPROVER') {
          filteredExpenses = response.data.data.filter(expense => expense.status === 'approved_l2');
          console.log('L3 Approver - All expenses:', response.data.data);
          console.log('L3 Approver - Filtered expenses (approved_l2):', filteredExpenses);
        } else if (userRole === 'FINANCE') {
          filteredExpenses = response.data.data.filter(expense => expense.status === 'approved_l3');
          console.log('Finance - All expenses:', response.data.data);
          console.log('Finance - Filtered expenses (approved_l3):', filteredExpenses);
          console.log('Finance - Filtered expenses count:', filteredExpenses.length);
        }

        // Transform data with error handling
        const transformedApprovals = filteredExpenses.map(expense => {
          try {
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

            const transformedApproval = {
              id: expense.id || expense._id,
          expenseNumber: expense.expenseNumber,
          title: expense.title,
          amount: expense.amount,
              site: typeof expense.site === 'object' ? (expense.site?.name || 'Unknown Site') : expense.site,
          category: expense.category,
              submitter: typeof expense.submittedBy === 'object' ? (expense.submittedBy?.name || 'Unknown User') : expense.submittedBy,
          date: new Date(expense.expenseDate).toISOString().split('T')[0],
          description: expense.description,
                      status: expense.status === 'submitted' || expense.status === 'under_review' || expense.status === 'approved_l1' || expense.status === 'approved_l2' || expense.status === 'approved_l3'
          ? 'pending' 
          : expense.status.toLowerCase(),
          approvalLevel: expense.status === 'submitted' ? 'L1' :
                       expense.status === 'approved_l1' ? 'L2' :
                       expense.status === 'approved_l2' ? 'L3' :
                       expense.status === 'approved_l3' ? 'L4' : 'L1',
          priority: expense.priority || 'normal',
          attachments: expense.attachments?.length || 0,
          modifiedAmount: expense.modifiedAmount,
          approvalComments: transformedApprovalHistory,
          policyFlags: expense.policyFlags || [],
          riskScore: expense.riskScore || 0
            };
            
            // Additional logging for Finance users
            if (userRole === 'FINANCE') {
              console.log(`Finance - Transforming expense: ${expense.title}`);
              console.log(`   Original status: ${expense.status}`);
              console.log(`   Transformed status: ${transformedApproval.status}`);
              console.log(`   Transformed approvalLevel: ${transformedApproval.approvalLevel}`);
              console.log(`   Can approve: ${transformedApproval.approvalLevel === 'L4'}`);
            }
            
            return transformedApproval;
            } catch (error) {
            console.error('Error transforming expense:', error, expense);
            // Return a safe fallback object to prevent rendering issues
            return {
              id: expense.id || expense._id,
              expenseNumber: expense.expenseNumber || 'Unknown',
              title: expense.title || 'Unknown Title',
              amount: expense.amount || 0,
              site: 'Unknown Site',
              category: expense.category || 'Unknown',
              submitter: 'Unknown User',
              date: new Date().toISOString().split('T')[0],
              description: expense.description || 'No description',
              status: 'pending',
              approvalLevel: 'L1',
              priority: 'normal',
              attachments: 0,
              modifiedAmount: null,
              approvalComments: [],
              policyFlags: [],
              riskScore: 0
            };
          }
        }); // No need to filter since we return safe fallback objects

        console.log('Transformed approvals:', transformedApprovals);
        console.log('Transformed approvals count:', transformedApprovals.length);
        
        // Additional logging for Finance users
        if (userRole === 'FINANCE') {
          console.log('Finance - Final transformed approvals:');
          transformedApprovals.forEach((approval, index) => {
            console.log(`${index + 1}. ${approval.title} (₹${approval.amount}) - Status: ${approval.status} - Level: ${approval.approvalLevel}`);
          });
        }
        
        setApprovals(transformedApprovals);
      } else {
        throw new Error(response.data.message || 'Failed to fetch approvals');
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [getUserRole]);

  // Fetch both approvals and stats
  const fetchData = useCallback(async () => {
    await Promise.all([fetchApprovals(), fetchApprovalStats()]);
  }, [fetchApprovals, fetchApprovalStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Force refresh for Finance users on component mount
  useEffect(() => {
    if (user?.role?.toLowerCase() === 'finance') {
      console.log('🔄 Finance user detected, forcing approval page refresh...');
      fetchData();
      
      // Additional refresh after 2 seconds to ensure data is loaded
      setTimeout(() => {
        console.log('🔄 Second refresh for Finance user...');
        fetchData();
      }, 2000);
      
      // Third refresh after 5 seconds
      setTimeout(() => {
        console.log('🔄 Third refresh for Finance user...');
        fetchData();
      }, 5000);
    }
  }, [user, fetchData]);

  // Socket event handlers for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleExpenseUpdate = () => {
      console.log('🔄 Expense updated via socket, refreshing approval data...');
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    const handleExpenseApprovedL1 = () => {
      console.log('✅ L1 Approval via socket, refreshing data...');
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    const handleExpenseApprovedL2 = () => {
      console.log('✅ L2 Approval via socket, refreshing data...');
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    const handleExpenseRejected = () => {
      console.log('❌ Expense rejected via socket, refreshing data...');
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    const handlePaymentProcessed = () => {
      console.log('💰 Payment processed via socket, refreshing data...');
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    socket.on('expense-updated', handleExpenseUpdate);
    socket.on('expense_approved_l1', handleExpenseApprovedL1);
    socket.on('expense_approved_l2', handleExpenseApprovedL2);
    socket.on('expense_rejected', handleExpenseRejected);
    socket.on('expense_payment_processed', handlePaymentProcessed);

    return () => {
      socket.off('expense-updated', handleExpenseUpdate);
      socket.off('expense_approved_l1', handleExpenseApprovedL1);
      socket.off('expense_approved_l2', handleExpenseApprovedL2);
      socket.off('expense_rejected', handleExpenseRejected);
      socket.off('expense_payment_processed', handlePaymentProcessed);
    };
  }, [socket, fetchData]);

  const levelMap = { L1: 1, L2: 2, L3: 3 };

  const handleApprove = async (id) => {
    // Store original state for rollback
    const originalApprovals = [...approvals];
    
    // Optimistic UI update - immediately remove from pending list
    setApprovals(approvals.filter(approval => approval.id !== id));
    setOpenDialog(false);
    setApprovalComment('');
    setModifiedAmount('');
    setAmountChangeReason('');
    
    // Clear priority for this specific approval
    setApprovalPriorities(prev => {
      const newPriorities = { ...prev };
      delete newPriorities[id];
      return newPriorities;
    });

    try {
      console.log('🚀 Starting approval process for expense:', id);
      console.log('📝 Approval data:', {
        action: 'approve',
        level: levelMap[selectedApproval.approvalLevel],
        approverId: user?._id,
        comments: approvalComment,
        modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : null,
        modificationReason: amountChangeReason,
        priority: canSetPriority ? (approvalPriorities[id] || 'medium') : null
      });

      const response = await expenseAPI.approveExpense(id, {
        action: 'approve',
        level: levelMap[selectedApproval.approvalLevel], // send as int
        approverId: user?._id, // <-- Add user id here
        comments: approvalComment,
        modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : null,
        modificationReason: amountChangeReason,
        priority: canSetPriority ? (approvalPriorities[id] || 'medium') : null
      });

      console.log('✅ Approval API response:', response);
      const data = response.data;
      console.log('📊 Response data:', data);
      
      if (data && data.success) {
        console.log('🎉 Approval successful!');
        // Show success message
        setSnackbarMessage(`Expense approved successfully! ${selectedApproval.approvalLevel === 'L3' ? 'Payment initiated.' : 'Forwarded to next level.'}`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Refresh data to get updated stats
        fetchData();
      } else {
        console.error('❌ API returned success: false', data);
        const errorMessage = data?.message || 'Unknown error occurred';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error approving expense:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Restore original state on error
      setApprovals(originalApprovals);
      
      // Don't show error notification immediately - check if expense was actually approved
      console.log('🔄 Checking if expense was actually approved despite the error...');
      
      // Show a neutral message while checking
      setSnackbarMessage('Checking approval status...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      // Refresh data immediately to check actual status
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing data to check approval status...');
          
          // Use existing fetchData function to get fresh data
          const freshApprovals = await expenseAPI.getPendingApprovals();
          
          if (freshApprovals.data && freshApprovals.data.success) {
            const rawData = freshApprovals.data.data || [];
            
            // Transform fresh data properly to avoid object rendering issues
            const transformedFreshData = rawData.map(expense => {
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
                site: typeof expense.site === 'object' ? expense.site?.name : expense.site,
                category: expense.category,
                submitter: typeof expense.submittedBy === 'object' ? expense.submittedBy?.name : expense.submittedBy,
                date: new Date(expense.expenseDate).toISOString().split('T')[0],
                description: expense.description,
                status: expense.status === 'submitted' || expense.status === 'under_review' || expense.status === 'approved_l1' || expense.status === 'approved_l2' || expense.status === 'approved_l3'
                  ? 'pending' 
                  : expense.status.toLowerCase(),
                approvalLevel: expense.status === 'submitted' ? 'L1' :
                             expense.status === 'approved_l1' ? 'L2' :
                             expense.status === 'approved_l2' ? 'L3' :
                             expense.status === 'approved_l3' ? 'L4' : 'L1',
                priority: expense.priority || 'normal',
                attachments: expense.attachments?.length || 0,
                modifiedAmount: expense.modifiedAmount,
                approvalComments: transformedApprovalHistory,
                policyFlags: expense.policyFlags || [],
                riskScore: expense.riskScore || 0
              };
            });
            
            // Check if the expense is no longer in pending approvals (meaning it was approved)
            const isStillPending = transformedFreshData.some(approval => approval.id === id);
            if (!isStillPending) {
              console.log('✅ Expense was actually approved despite the error!');
              setSnackbarMessage('Expense approved successfully!');
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            } else {
              // Only show error if expense is still pending
              console.log('❌ Expense is still pending, showing error');
              setSnackbarMessage('Failed to approve expense. Please try again.');
              setSnackbarSeverity('error');
              setSnackbarOpen(true);
            }
            
            // Update the approvals state with properly transformed fresh data
            setApprovals(transformedFreshData);
          } else {
            console.error('Failed to fetch fresh data');
            setSnackbarMessage('Failed to approve expense. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
          }
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          // Only show error if we can't refresh data
          setSnackbarMessage('Failed to approve expense. Please try again.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }, 1000);
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await expenseAPI.rejectExpense(id, {
        action: 'reject',
        level: levelMap[selectedApproval.approvalLevel], // send as int
        approverId: user?._id, // <-- Add user id here
        comments: approvalComment,
          modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : null,
        modificationReason: amountChangeReason
      });

      const data = response.data;
      
      if (data.success) {
        // Show success message
        setSnackbarMessage('Expense rejected successfully! Submitter will be notified.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Update local state
        setApprovals(approvals.filter(approval => approval.id !== id));
    setOpenDialog(false);
    setApprovalComment('');
    setModifiedAmount('');
    setAmountChangeReason('');
    // Clear priority for this specific approval
    setApprovalPriorities(prev => {
      const newPriorities = { ...prev };
      delete newPriorities[id];
      return newPriorities;
    });
    fetchData(); // Re-fetch both approvals and stats to update summary cards
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setSnackbarMessage('Failed to reject expense. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handlePayment = async (id) => {
    // Find the expense data for payment
    const expense = approvals.find(approval => approval.id === id);
    if (expense) {
      setSelectedExpenseForPayment(expense);
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = (paymentData) => {
    // Show success message
    setSnackbarMessage('Payment processed successfully! Expense marked as paid.');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    
    // Update local state - remove the processed expense from the list
    setApprovals(approvals.filter(approval => approval.id !== selectedExpenseForPayment.id));
    setPaymentModalOpen(false);
    setSelectedExpenseForPayment(null);
    
    // Refresh data to update statistics
    fetchData();
  };

  const handleOpenDialog = (approval) => {
    setSelectedApproval(approval);
    setModifiedAmount('');
    setAmountChangeReason('');
    setSelectedPriority('medium'); // Reset priority to default when opening dialog
    setOpenDialog(true);
  };

  const handleOpenAttachmentDialog = (approval) => {
    setSelectedApprovalForAttachments(approval);
    setAttachmentDialogOpen(true);
  };

  const handlePriorityChange = (approvalId, priority) => {
    if (priority) {
      setApprovalPriorities(prev => ({
        ...prev,
        [approvalId]: priority
      }));
    } else {
      // Remove priority if empty value is selected
      setApprovalPriorities(prev => {
        const newPriorities = { ...prev };
        delete newPriorities[approvalId];
        return newPriorities;
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#2196f3';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      case 'pending': return <PendingIcon />;
      default: return <ReceiptIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      case 'normal': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#2196f3';
    }
  };

  // Removed unused getNextApprovalLevel function

    const getApprovalLevelName = (level) => {
    // Handle both string format (L1, L2, L3, L4) and numeric format (1, 2, 3, 4)
    const levelStr = level.toString();
    switch (levelStr) {
      case 'L1':
      case '1': 
        return 'Regional/Operations Manager';
      case 'L2':
      case '2': 
        return 'Admin';
      case 'L3':
      case '3': 
        return 'Super Admin';
      case 'L4':
      case '4': 
        return 'Finance';
      default: 
        console.warn('Unknown approval level:', level);
        return 'Unknown';
    }
  };

  const canApprove = (approval) => {
    const userRole = getUserRole();
    const approvalLevel = approval.approvalLevel;
    
    // Convert role to level number with correct case
        const roleToLevel = {
      'L1_APPROVER': 'L1',
      'L2_APPROVER': 'L2',
      'L3_APPROVER': 'L3',
      'FINANCE': 'L4'
    };
    
    console.log('Checking approval:', { userRole, approvalLevel, canApprove: roleToLevel[userRole] === approvalLevel });
    return roleToLevel[userRole] === approvalLevel;
  };

  // Update the pending approvals count calculation
  const pendingApprovals = approvals.filter(approval => {
    const isApprover = canApprove(approval);
    const isPending = approval.status === 'pending';
    console.log('Checking pending:', { id: approval.id, status: approval.status, isApprover, isPending });
    return isPending && isApprover;
  }).length;
  
  // Use real-time approval statistics from dashboard API
  const { approvedCount, rejectedCount, totalAmount, currentMonthApprovedAmount } = approvalStats;



  // Debug: Log user role to check if L3 Approver changes should be applied
  console.log('Current user role:', user?.role);
  console.log('Is L3 Approver:', user?.role?.toLowerCase() === 'l3_approver');
  console.log('User object:', user);
  console.log('Can set priority:', canSetPriority);

  // Update the expense list rendering
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
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <img 
                src="/rakshak-logo.png" 
                alt="Rakshak Securitas Logo" 
                style={{ height: '40px' }}
              />
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <ApprovalIcon />
              </Avatar>
            </Box>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              {isFinance ? 'Payment Processing' : 'Expense Approvals'}
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
                    {isFinance ? 'Pending Payments' : 'Pending Approvals'}
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
                  <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                    <CheckCircleIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#4caf50">
                    {approvedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isFinance ? 'Processed Payments' : 'Approved This Month'}
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
                  <Avatar sx={{ bgcolor: '#f44336', mx: 'auto', mb: 2 }}>
                    <CancelIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#f44336">
                    {rejectedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected This Month
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
                  <Avatar sx={{ bgcolor: '#2196f3', mx: 'auto', mb: 2 }}>
                    <CurrencyRupeeIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="#2196f3">
                    ₹{totalAmount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Approved Amount
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
            
            {/* All Sites Card for L2 Approvers */}
            {isL2Approver && (
              <Grid item xs={12} md={3}>
                <Zoom in style={{ transitionDelay: '1000ms' }}>
                  <Paper 
                    elevation={16} 
                    sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        background: darkMode ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)',
                      }
                    }}
                    onClick={() => navigate('/all-sites-approval')}
                  >
                    <Avatar sx={{ bgcolor: '#9c27b0', mx: 'auto', mb: 2 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={700} color="#9c27b0" sx={{ mb: 1 }}>
                      All Sites
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      View expenses from all sites
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="small"
                      sx={{ 
                        background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                        '&:hover': { background: 'linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)' }
                      }}
                    >
                      View All
                    </Button>
                  </Paper>
                </Zoom>
              </Grid>
            )}
          </Grid>

          {/* Approvals List */}
          <Paper elevation={16} sx={{ 
            borderRadius: 3, 
            background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" fontWeight={600} color="#667eea">
                {isFinance ? 'Payment Requests' : 'Approval Requests'}
              </Typography>
            </Box>
            
            <List sx={{ p: 0 }}>
              {approvals.map((approval, index) => (
                <React.Fragment key={approval.id}>
                  <ListItem sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                      <Avatar sx={{ bgcolor: getStatusColor(approval.status) }}>
                        {getStatusIcon(approval.status)}
                      </Avatar>
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="h6" fontWeight={600}>
                            {approval.title}
                          </Typography>
                          <Chip 
                            label={approval.expenseNumber} 
                            size="small"
                            variant="outlined"
                            sx={{ 
                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                              color: '#667eea',
                              fontWeight: 600,
                              borderColor: '#667eea'
                            }}
                          />
                          <Chip 
                            label={approval.priority} 
                            size="small"
                            sx={{ 
                              bgcolor: `${getPriorityColor(approval.priority)}20`,
                              color: getPriorityColor(approval.priority),
                              fontWeight: 600
                            }}
                          />
                          <Chip 
                            label={approval.status} 
                            size="small"
                            sx={{ 
                              bgcolor: `${getStatusColor(approval.status)}20`,
                              color: getStatusColor(approval.status),
                              fontWeight: 600
                            }}
                          />
                          {approval.policyFlags && approval.policyFlags.length > 0 && (
                            <Chip 
                              label={`Flagged (${approval.policyFlags.length})`} 
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        {approval.policyFlags && approval.policyFlags.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {approval.policyFlags.map((flag, i) => (
                              <Chip key={i} label={flag} size="small" sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#f44336' }} />
                            ))}
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ReceiptIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {approval.expenseNumber}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {approval.site}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CategoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {approval.category}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {approval.submitter}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {approval.date}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {approval.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h6" fontWeight={700} color="#667eea">
                            ₹{approval.amount.toLocaleString()}
                          </Typography>
                          {approval.modifiedAmount && approval.modifiedAmount !== approval.amount && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="warning.main" fontWeight={600}>
                                → ₹{approval.modifiedAmount.toLocaleString()}
                              </Typography>
                              <Chip 
                                label="Modified" 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            </Box>
                          )}
                          {approval.attachments > 0 && (
                            <Tooltip title={`${approval.attachments} attachment${approval.attachments > 1 ? 's' : ''}`}>
                              <IconButton 
                              size="small"
                                onClick={() => handleOpenAttachmentDialog(approval)}
                                sx={{ 
                                  color: '#ff9800',
                                  '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.1)' }
                                }}
                              >
                                <AttachFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Chip 
                            label={getApprovalLevelName(approval.approvalLevel)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      {approval.status === 'pending' && canApprove(approval) && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {isFinance ? (
                            // Finance (L4) - Payment only
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleOpenDialog(approval)}
                              sx={{ minWidth: 'auto', px: 2 }}
                              startIcon={<CurrencyRupeeIcon />}
                            >
                              Process Payment
                            </Button>
                          ) : (
                            // L1, L2, and L3 (Super Admin) - Approve/Reject
                            <>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleOpenDialog(approval)}
                            sx={{ minWidth: 'auto', px: 2 }}
                          >
                            {approval.approvalLevel === 'L4' ? 'Payment' : 'Approve'}
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleOpenDialog(approval)}
                            sx={{ minWidth: 'auto', px: 2 }}
                          >
                            Reject
                          </Button>
                          
                          {/* Priority Dropdown for L2 and L3 (Super Admin) Users */}
                          {canSetPriority && (
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <InputLabel sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'inherit' }}>Priority</InputLabel>
                              <Select
                                value={approvalPriorities[approval.id] || ''}
                                onChange={(e) => handlePriorityChange(approval.id, e.target.value)}
                                label="Priority"
                                size="small"
                                displayEmpty
                                renderValue={(value) => value || 'Select'}
                                sx={{
                                  '& .MuiSelect-select': {
                                    color: approvalPriorities[approval.id] ? 'inherit' : (darkMode ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)')
                                  }
                                }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                            </>
                          )}
                        </Box>
                      )}
                      
                      {approval.status === 'pending' && !canApprove(approval) && (
                        <Chip 
                          label={`Waiting for ${getApprovalLevelName(approval.approvalLevel)}`}
                          size="small"
                          color="warning"
                        />
                      )}
                    </Box>
                  </ListItem>
                  {index < approvals.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      </Fade>
      )}

      {/* Approval Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedApproval && (
            (isL3Approver || isFinance)
              ? `Payment: ${selectedApproval.title}`
              : `Review Expense: ${selectedApproval.title}`
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ px: 2 }}
            >
              <Tab label="Review Details" />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachFileIcon fontSize="small" />
                    Attachments
                    {selectedApproval?.attachments > 0 && (
                      <Chip 
                        label={selectedApproval.attachments} 
                        size="small" 
                        color="primary"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                } 
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Expense Details */}
                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>Expense Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Expense Number:</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedApproval?.expenseNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Current Level:</Typography>
                      <Typography variant="body1" fontWeight={600} color="primary">
                        {selectedApproval && getApprovalLevelName(selectedApproval.approvalLevel)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Original Amount:</Typography>
                      <Typography variant="body1" fontWeight={600}>₹{selectedApproval?.amount?.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Site:</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedApproval?.site}</Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Amount Modification (All Approvers) */}
                <Box sx={{ p: 2, bgcolor: 'rgba(102, 126, 234, 0.1)', borderRadius: 2, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                  <Typography variant="h6" gutterBottom color="#667eea">
                    {(isL3Approver || isFinance) ? 'Payment Amount' : 'Amount Modification'}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Original Amount"
                        value={`₹${selectedApproval?.amount?.toLocaleString()}`}
                        fullWidth
                        disabled
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={isFinance ? 'Payment Amount (₹)' : 'Modified Amount (₹)'}
                        type="number"
                        value={modifiedAmount}
                        onChange={(e) => setModifiedAmount(e.target.value)}
                        placeholder={`Enter ${isFinance ? 'payment' : 'new'} amount`}
                        fullWidth
                        helperText={modifiedAmount && parseFloat(modifiedAmount) !== selectedApproval?.amount ? 
                          `Difference: ₹${(parseFloat(modifiedAmount) - selectedApproval?.amount).toLocaleString()}` : 
                          "Leave empty to keep original amount"
                        }
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    {modifiedAmount && parseFloat(modifiedAmount) !== selectedApproval?.amount && (
                      <Grid item xs={12}>
                        <TextField
                          label="Reason for Amount Change"
                          multiline
                          rows={2}
                          value={amountChangeReason}
                          onChange={(e) => setAmountChangeReason(e.target.value)}
                          placeholder="Please provide a reason for modifying the amount..."
                          fullWidth
                          required
                          helperText="Required when modifying amount"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Approval Comments */}
                <TextField
                  label={isFinance ? 'Payment Comment' : 'Approval Comment'}
                  multiline
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={isFinance ? 'Add payment processing comments...' : 'Add your approval/rejection comments...'}
                  fullWidth
                />

                {/* Previous Comments */}
                {selectedApproval?.approvalComments?.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Previous Comments</Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {selectedApproval.approvalComments.map((comment, index) => (
                        <Box key={index} sx={{ p: 2, mb: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {getApprovalLevelName(comment.level)}
                              {comment.approver?.name && ` - ${comment.approver.name}`}
                              {' - '}
                              {new Date(comment.timestamp).toLocaleString()}
                            </Typography>
                            {comment.amountModified && (
                              <Chip 
                                label="Amount Modified" 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>{comment.comment}</Typography>
                          
                          {comment.amountModified && (
                            <Box sx={{ 
                              p: 1, 
                              bgcolor: 'rgba(255, 152, 0, 0.1)', 
                              borderRadius: 1, 
                              border: '1px solid rgba(255, 152, 0, 0.3)',
                              mt: 1
                            }}>
                              <Typography variant="caption" color="warning.main" fontWeight={600} display="block">
                                Amount Modification:
                              </Typography>
                              <Typography variant="body2">
                                Original: ₹{comment.originalAmount?.toLocaleString()} → 
                                Modified: ₹{comment.modifiedAmount?.toLocaleString()}
                              </Typography>
                              {comment.amountChangeReason && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                  Reason: {comment.amountChangeReason}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Attachments Tab */}
            {activeTab === 1 && (
              <Box>
                <AttachmentViewer 
                  expenseId={selectedApproval?.id || selectedApproval?._id}
                  attachments={selectedApproval?.attachments || []}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          {isFinance ? (
            // Finance (L4) - Payment only
            <Button 
              onClick={() => selectedApproval && handlePayment(selectedApproval.id)}
              color="primary"
              variant="contained"
              disabled={modifiedAmount && parseFloat(modifiedAmount) !== selectedApproval?.amount && !amountChangeReason}
              startIcon={<CurrencyRupeeIcon />}
            >
              Process Payment
            </Button>
          ) : (
            // L1, L2, and L3 (Super Admin) - Approve/Reject
            <>
              <Button 
                onClick={() => selectedApproval && handleReject(selectedApproval.id)}
                color="error"
                variant="contained"
                disabled={modifiedAmount && parseFloat(modifiedAmount) !== selectedApproval?.amount && !amountChangeReason}
              >
                Reject
              </Button>
              

              
              <Button 
                onClick={() => selectedApproval && handleApprove(selectedApproval.id)}
                color="success"
                variant="contained"
                disabled={modifiedAmount && parseFloat(modifiedAmount) !== selectedApproval?.amount && !amountChangeReason}
              >
                {selectedApproval?.approvalLevel === 'L4' ? 'Payment' : 'Approve & Forward'}
              </Button>
            </>
          )}
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
              Attachments - {selectedApprovalForAttachments?.expenseNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedApprovalForAttachments && (
            <AttachmentViewer 
              expenseId={selectedApprovalForAttachments.id || selectedApprovalForAttachments._id}
              attachments={selectedApprovalForAttachments.attachments || []}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachmentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        expense={selectedExpenseForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Approval; 