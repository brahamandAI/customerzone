import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  TextField
} from '@mui/material';
import { paymentAPI } from '../services/api';
import { useUserPreferences } from '../context/UserPreferencesContext';

const PaymentModal = ({ open, onClose, expense, onPaymentSuccess }) => {
  const { formatCurrency } = useUserPreferences();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);

  const handleClose = () => {
    if (!loading) {
      setUtrNumber('');
      setError(null);
      setPaymentDone(false);
      onClose();
    }
  };

  const handleSubmitPayment = async () => {
    if (!expense?.id && !expense?._id) {
      setError('Expense ID is missing');
      return;
    }
    if (!utrNumber || utrNumber.trim().length === 0) {
      setError('Please enter UTR number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await paymentAPI.verifyUtrPayment({
        expenseId: expense.id || expense._id,
        utrNumber: utrNumber.trim()
      });

      if (response.data.success) {
        setPaymentDone(true);
        onPaymentSuccess(response.data.payment);
        // Close after showing success for 1.5 seconds
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Payment failed');
      }
    } catch (err) {
      console.error('UTR payment error:', err);
      setError(err.response?.data?.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Process Payment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete payment for expense: {expense?.expenseNumber}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {paymentDone ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="success.main" fontWeight={600} gutterBottom>
              Payment is done
            </Typography>
            <Typography variant="body2" color="text.secondary">
              UTR: {utrNumber}
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Expense Details */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expense Details
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'rgba(0,128,128,0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(0,128,128,0.1)'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Expense Number:</Typography>
                  <Typography variant="body2" fontWeight={600}>{expense?.expenseNumber}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Title:</Typography>
                  <Typography variant="body2" fontWeight={600}>{expense?.title}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Chip label={expense?.category} size="small" sx={{ bgcolor: 'rgba(0,128,128,0.1)', color: '#008080' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Submitted By:</Typography>
                  <Typography variant="body2" fontWeight={600}>{expense?.submittedBy?.name}</Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Payment Amount */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Payment Amount</Typography>
              <Box sx={{ 
                p: 3, 
                bgcolor: 'rgba(76, 175, 80, 0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(76, 175, 80, 0.2)',
                textAlign: 'center'
              }}>
                <Typography variant="h4" fontWeight={700} color="#4caf50">
                  {formatCurrency(expense?.amount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Amount to be processed</Typography>
              </Box>
            </Box>

            {/* UTR Number Input */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Enter UTR Number
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the UTR/Reference number from your bank transfer
              </Typography>
              <TextField
                fullWidth
                label="UTR Number"
                placeholder="e.g. 1234567890123456"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                variant="outlined"
                size="medium"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#008080' },
                    '&.Mui-focused fieldset': { borderColor: '#008080', borderWidth: 2 }
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {!paymentDone && (
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={loading} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPayment}
            variant="contained"
            disabled={loading || !utrNumber?.trim()}
            sx={{
              background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
              color: 'white',
              '&:hover': { background: 'linear-gradient(45deg, #006666 30%, #008080 90%)' },
              '&:disabled': { background: '#ccc', color: '#666' }
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PaymentModal;

/* ========== RAZORPAY CODE (COMMENTED OUT - BYPASSED) ==========
 * Original Razorpay integration - kept for reference.
 * To re-enable: restore this code and remove UTR flow above.
 *
 * - createOrder() was called on modal open
 * - Payment method selection (card/netbanking/upi/wallet)
 * - window.Razorpay checkout opened
 * - verifyPayment() with orderId, paymentId, signature
 *
 * Razorpay script in index.html can also be commented out.
 * ============================================================= */
