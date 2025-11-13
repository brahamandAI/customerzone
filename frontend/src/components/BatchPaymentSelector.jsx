import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Payment as PaymentIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import BatchPaymentOTPModal from './BatchPaymentOTPModal';

const BatchPaymentSelector = ({ expenses, onPaymentComplete }) => {
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpData, setOtpData] = useState(null);

  // Filter only eligible expenses (approved and not yet paid)
  const eligibleExpenses = expenses.filter(exp => 
    ['approved', 'approved_l3', 'approved_finance'].includes(exp.status)
  );

  const handleSelectAll = () => {
    if (selectedExpenses.size === eligibleExpenses.length) {
      // Deselect all
      setSelectedExpenses(new Set());
    } else {
      // Select all
      const allIds = new Set(eligibleExpenses.map(exp => exp._id));
      setSelectedExpenses(allIds);
    }
  };

  const handleSelectExpense = (expenseId) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const calculateSelectedTotal = () => {
    return eligibleExpenses
      .filter(exp => selectedExpenses.has(exp._id))
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleGenerateOTP = async () => {
    if (selectedExpenses.size === 0) {
      setError('Please select at least one expense');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/batch-payments/generate-otp`,
        {
          expenseIds: Array.from(selectedExpenses)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setOtpData(response.data.data);
        setOtpModalOpen(true);
      } else {
        setError(response.data.message || 'Failed to generate OTP');
      }
    } catch (err) {
      console.error('OTP generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (results) => {
    // Clear selection
    setSelectedExpenses(new Set());
    setOtpData(null);
    
    // Notify parent component
    if (onPaymentComplete) {
      onPaymentComplete(results);
    }
  };

  if (eligibleExpenses.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No expenses available for batch payment processing at this time.
      </Alert>
    );
  }

  const selectedCount = selectedExpenses.size;
  const selectedTotal = calculateSelectedTotal();

  return (
    <Box>
      {/* Header Section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Batch Payment Processing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select multiple expenses to process payment with a single OTP
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title={selectedExpenses.size === eligibleExpenses.length ? 'Deselect All' : 'Select All'}>
              <Button
                variant="outlined"
                size="small"
                startIcon={selectedExpenses.size === eligibleExpenses.length ? <DeselectIcon /> : <SelectAllIcon />}
                onClick={handleSelectAll}
              >
                {selectedExpenses.size === eligibleExpenses.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
              onClick={handleGenerateOTP}
              disabled={loading || selectedCount === 0}
              sx={{
                background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #003333 0%, #004D4D 100%)',
                }
              }}
            >
              {loading ? 'Generating OTP...' : `Process ${selectedCount} Expense${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </Box>
        </Box>

        {/* Selection Summary */}
        {selectedCount > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${selectedCount} expense${selectedCount !== 1 ? 's' : ''} selected`}
              color="primary"
              variant="outlined"
            />
            <Chip 
              label={`Total: ₹${selectedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              color="success"
              variant="outlined"
            />
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Expenses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedExpenses.size === eligibleExpenses.length && eligibleExpenses.length > 0}
                  indeterminate={selectedExpenses.size > 0 && selectedExpenses.size < eligibleExpenses.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell><strong>Expense #</strong></TableCell>
              <TableCell><strong>Submitter</strong></TableCell>
              <TableCell><strong>Site</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eligibleExpenses.map((expense) => (
              <TableRow 
                key={expense._id}
                hover
                selected={selectedExpenses.has(expense._id)}
                onClick={() => handleSelectExpense(expense._id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedExpenses.has(expense._id)}
                    onChange={() => handleSelectExpense(expense._id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {expense.expenseNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {expense.submittedBy?.name || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {expense.submittedBy?.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {expense.site?.name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={expense.category} 
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(expense.expenseDate).toLocaleDateString('en-IN')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={expense.status.replace(/_/g, ' ').toUpperCase()}
                    size="small"
                    color="success"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Info Section */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: '#e3f2fd' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <InfoIcon color="info" />
          <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              How Batch Payment Works:
            </Typography>
            <Typography variant="body2" component="div">
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>Select the expenses you want to process</li>
                <li>Click "Process Expenses" to generate an OTP</li>
                <li>You'll receive a 6-digit OTP via email and SMS (valid for 5 minutes)</li>
                <li>Enter the OTP to process all selected expenses at once</li>
                <li>All submitters will be notified automatically</li>
              </ol>
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* OTP Modal */}
      <BatchPaymentOTPModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        otpData={otpData}
        selectedExpenses={Array.from(selectedExpenses)}
        onSuccess={handlePaymentSuccess}
      />
    </Box>
  );
};

export default BatchPaymentSelector;

