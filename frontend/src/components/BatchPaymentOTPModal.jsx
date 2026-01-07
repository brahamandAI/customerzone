import React, { useState, useEffect } from 'react';
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
  LinearProgress,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import {
  LockOutlined,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useUserPreferences } from '../context/UserPreferencesContext';

const BatchPaymentOTPModal = ({ open, onClose, otpData, selectedExpenses, onSuccess }) => {
  const { formatCurrency } = useUserPreferences();
  const [otp, setOtp] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [processingResults, setProcessingResults] = useState(null);

  // Countdown timer
  useEffect(() => {
    if (!open || !otpData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('OTP has expired. Please generate a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, otpData]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOtp('');
      setPaymentRemarks('');
      setError('');
      setSuccess(false);
      setProcessingResults(null);
      setTimeLeft(300);
    }
  }, [open]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyAndProcess = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/batch-payments/verify-and-process`,
        {
          otpId: otpData.otpId,
          otp,
          paymentRemarks: paymentRemarks.trim() || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setProcessingResults(response.data.data);
        
        // Call success callback after 2 seconds
        setTimeout(() => {
          onSuccess(response.data.data);
          handleClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to process batch payment');
      }
    } catch (err) {
      console.error('Batch payment processing error:', err);
      setError(err.response?.data?.message || 'Failed to process batch payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOtp('');
      setPaymentRemarks('');
      setError('');
      setSuccess(false);
      setProcessingResults(null);
      onClose();
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setOtp(value);
      setError(''); // Clear error on typing
    }
  };

  if (!otpData) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockOutlined />
          <span>Verify OTP & Process Payment</span>
        </Box>
        <IconButton 
          onClick={handleClose} 
          disabled={loading}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Timer */}
        {timeLeft > 0 && !success && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <TimerIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                Time remaining: {formatTime(timeLeft)}
              </Typography>
              <Chip 
                label={`${Math.round((timeLeft / 300) * 100)}%`}
                size="small"
                color={timeLeft < 60 ? 'error' : timeLeft < 180 ? 'warning' : 'success'}
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(timeLeft / 300) * 100}
              color={timeLeft < 60 ? 'error' : timeLeft < 180 ? 'warning' : 'success'}
            />
          </Box>
        )}

        {/* Batch Info */}
        <Box sx={{ 
          bgcolor: '#f5f5f5', 
          p: 2, 
          borderRadius: 1, 
          mb: 2,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            📊 Batch Payment Details
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Number of Expenses:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {otpData.expenseCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Total Amount:</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {formatCurrency(otpData.totalAmount)}
            </Typography>
          </Box>
        </Box>

        {/* Success Message */}
        {success && processingResults && (
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" fontWeight="bold">
              Payment Processing Completed!
            </Typography>
            <Typography variant="caption">
              Successfully processed {processingResults.totalProcessed} out of {otpData.expenseCount} expenses.
            </Typography>
            {processingResults.totalFailed > 0 && (
              <Typography variant="caption" display="block" color="error">
                {processingResults.totalFailed} expenses failed to process.
              </Typography>
            )}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* OTP Input */}
        {!success && (
          <>
            <TextField
              fullWidth
              label="Enter OTP"
              value={otp}
              onChange={handleOtpChange}
              disabled={loading || timeLeft === 0}
              placeholder="000000"
              inputProps={{
                maxLength: 6,
                style: { 
                  fontSize: 24, 
                  letterSpacing: 8, 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }
              }}
              sx={{ mb: 2 }}
              helperText={
                timeLeft === 0 
                  ? 'OTP has expired' 
                  : 'Enter the 6-digit OTP sent to your email/phone'
              }
              error={timeLeft === 0 || !!error}
            />

            <TextField
              fullWidth
              label="Payment Remarks (Optional)"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              disabled={loading}
              multiline
              rows={2}
              placeholder="Add any notes or remarks for this batch payment..."
              helperText="Optional notes about this batch payment"
            />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                ⚠️ <strong>Important:</strong> Do NOT share this OTP with anyone. 
                You have 3 attempts to enter the correct OTP.
              </Typography>
            </Alert>
          </>
        )}

        {/* Processing Results Details */}
        {success && processingResults && processingResults.failed && processingResults.failed.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Failed Expenses ({processingResults.failed.length}):
              </Typography>
              {processingResults.failed.map((failed, index) => (
                <Typography key={index} variant="caption" display="block">
                  • {failed.expenseNumber}: {failed.reason}
                </Typography>
              ))}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        {!success && (
          <>
            <Button 
              onClick={handleClose}
              disabled={loading}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAndProcess}
              disabled={loading || !otp || otp.length !== 6 || timeLeft === 0}
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{
                background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #003333 0%, #004D4D 100%)',
                }
              }}
            >
              {loading ? 'Processing...' : 'Verify & Process Payment'}
            </Button>
          </>
        )}
        {success && (
          <Button
            onClick={handleClose}
            variant="contained"
            color="success"
            fullWidth
          >
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BatchPaymentOTPModal;

