import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useUserPreferences } from '../context/UserPreferencesContext';

const BatchPaymentUtrModal = ({ open, onClose, batchData, onSuccess }) => {
  const { formatCurrency } = useUserPreferences();
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [processingResults, setProcessingResults] = useState(null);

  const handleClose = () => {
    if (!loading) {
      setUtrNumber('');
      setPaymentRemarks('');
      setError('');
      setSuccess(false);
      setProcessingResults(null);
      onClose();
    }
  };

  const handleProcessPayment = async () => {
    if (!utrNumber || utrNumber.trim().length === 0) {
      setError('Please enter UTR number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/batch-payments/process-utr`,
        {
          expenseIds: batchData?.expenseIds || [],
          utrNumber: utrNumber.trim(),
          paymentRemarks: paymentRemarks.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setProcessingResults(response.data.data);
        setTimeout(() => {
          onSuccess(response.data.data);
          handleClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to process batch payment');
      }
    } catch (err) {
      console.error('Batch payment error:', err);
      setError(err.response?.data?.message || 'Failed to process batch payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!batchData) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, boxShadow: 24 } }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon />
          <span>Process Batch Payment</span>
        </Box>
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Batch Info */}
        <Box sx={{
          bgcolor: '#f5f5f5',
          p: 2,
          borderRadius: 1,
          mb: 2,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Batch Payment Details
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Number of Expenses:</Typography>
            <Typography variant="body2" fontWeight="bold">{batchData.expenseCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Total Amount:</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {formatCurrency(batchData.totalAmount)}
            </Typography>
          </Box>
        </Box>

        {success && processingResults ? (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">Payment is done</Typography>
            <Typography variant="caption">
              Successfully processed {processingResults.totalProcessed} expenses. UTR: {utrNumber}
            </Typography>
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Enter UTR Number"
              placeholder="e.g. 123456789012 or HDFC0R2402171234"
              value={utrNumber}
              onChange={(e) => { setUtrNumber(e.target.value); setError(''); }}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Payment Remarks (Optional)"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              disabled={loading}
              multiline
              rows={2}
              placeholder="Add any notes for this batch payment..."
            />
          </>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} disabled={loading} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={loading || !utrNumber?.trim()}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            sx={{
              background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #003333 0%, #004D4D 100%)' }
            }}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default BatchPaymentUtrModal;
