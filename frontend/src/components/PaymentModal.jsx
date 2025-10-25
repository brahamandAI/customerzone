import React, { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip
} from '@mui/material';
import { BugReport } from '@mui/icons-material';
import { paymentAPI } from '../services/api';
import { runPaymentDiagnostics } from '../utils/paymentDiagnostics';

const PaymentModal = ({ open, onClose, expense, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  useEffect(() => {
    if (open && expense) {
      createOrder();
    }
  }, [open, expense]);

  // Check if Razorpay script is loaded
  useEffect(() => {
    const checkRazorpay = () => {
      if (typeof window !== 'undefined' && !window.Razorpay) {
        console.warn('Razorpay script not loaded. Please check if script is included in index.html');
      }
    };
    
    checkRazorpay();
  }, []);

  const createOrder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Full expense object:', expense);
      console.log('🔍 Expense ID:', expense?._id);
      console.log('🔍 Expense amount:', expense?.amount);
      console.log('🔍 Expense type:', typeof expense?.amount);
      
      // Validate expense data
      if (!expense?.id && !expense?._id) {
        throw new Error('Expense ID is missing');
      }
      
      if (!expense?.amount || expense.amount <= 0) {
        throw new Error('Invalid expense amount');
      }

      const requestData = {
        expenseId: expense.id || expense._id, // Use id from transformed object
        amount: Number(expense.amount),
        currency: 'INR'
      };

      console.log('📤 Sending request data:', requestData);

      const response = await paymentAPI.createOrder(requestData);

      console.log('✅ Order created successfully:', response.data);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Show detailed error message
      let errorMessage = 'Failed to create payment order. Please try again.';
      
      if (error.response) {
        console.log('Error response:', error.response);
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        }
        if (error.response.status === 403) {
          errorMessage = 'You are not authorized to make this payment.';
        }
        if (error.response.status === 404) {
          errorMessage = 'Expense not found.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handlePayment = () => {
    if (!order) return;
    if (!selectedPaymentMethod) {
      setError('Please select a payment method first');
      return;
    }

    // Check if Razorpay is loaded
    if (!window.Razorpay) {
      setError('Payment gateway is not loaded. Please refresh the page and try again.');
      return;
    }

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Rakshak Expense Management',
      description: `Payment for ${expense.title}`,
      order_id: order.id,
      method: selectedPaymentMethod,
      handler: async (response) => {
        try {
          setLoading(true);
          
          const verifyResponse = await paymentAPI.verifyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            expenseId: expense.id || expense._id
          });

          if (verifyResponse.data.success) {
            onPaymentSuccess(verifyResponse.data.payment);
            onClose();
          }
        } catch (error) {
          console.error('Payment verification failed:', error);
          setError('Payment verification failed. Please contact support.');
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: function() {
          console.log('Payment modal dismissed');
        }
      },
      prefill: {
        name: expense.submittedBy?.name || '',
        email: expense.submittedBy?.email || '',
      },
      theme: {
        color: '#008080'
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error opening Razorpay:', error);
      setError('Failed to open payment gateway. Please try again.');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedPaymentMethod(null);
      setError(null);
      onClose();
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Process Payment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete payment for expense: {expense?.expenseNumber}
            </Typography>
          </Box>
          <Tooltip title="Run Payment Diagnostics">
            <IconButton 
              onClick={() => runPaymentDiagnostics()}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <BugReport fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => runPaymentDiagnostics()}
                sx={{ textTransform: 'none' }}
              >
                Debug
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {loading && !order ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
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
                  <Typography variant="body2" color="text.secondary">
                    Expense Number:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {expense?.expenseNumber}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Title:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {expense?.title}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Category:
                  </Typography>
                  <Chip 
                    label={expense?.category} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(0,128,128,0.1)', color: '#008080' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Submitted By:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {expense?.submittedBy?.name}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Payment Amount */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Payment Amount
              </Typography>
              <Box sx={{ 
                p: 3, 
                bgcolor: 'rgba(76, 175, 80, 0.05)', 
                borderRadius: 2,
                border: '1px solid rgba(76, 175, 80, 0.2)',
                textAlign: 'center'
              }}>
                <Typography variant="h4" fontWeight={700} color="#4caf50">
                  ₹{expense?.amount?.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Amount to be processed
                </Typography>
              </Box>
            </Box>

            {/* Payment Method */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Payment Method
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose your preferred payment method:
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                {[
                  { id: 'card', label: 'Credit/Debit Cards', icon: '💳' },
                  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
                  { id: 'upi', label: 'UPI', icon: '📱' },
                  { id: 'wallet', label: 'Digital Wallets', icon: '💰' }
                ].map((method) => (
                  <Button
                    key={method.id}
                    variant={selectedPaymentMethod === method.id ? "contained" : "outlined"}
                    onClick={() => handlePaymentMethodSelect(method.id)}
                    sx={{
                      p: 2,
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      border: selectedPaymentMethod === method.id ? '2px solid #008080' : '1px solid #e0e0e0',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: selectedPaymentMethod === method.id ? 600 : 400,
                      color: selectedPaymentMethod === method.id ? '#008080' : '#666',
                      backgroundColor: selectedPaymentMethod === method.id ? 'rgba(0,128,128,0.05)' : 'transparent',
                      '&:hover': {
                        borderColor: '#008080',
                        backgroundColor: 'rgba(0,128,128,0.05)',
                        color: '#008080'
                      }
                    }}
                  >
                    <Typography variant="h5">{method.icon}</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'center', lineHeight: 1.2 }}>
                      {method.label}
                    </Typography>
                  </Button>
                ))}
              </Box>
              
              {selectedPaymentMethod && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,128,128,0.05)', borderRadius: 1 }}>
                  <Typography variant="body2" color="#008080" fontWeight={600}>
                    ✅ Selected: {
                      selectedPaymentMethod === 'card' ? 'Credit/Debit Cards' :
                      selectedPaymentMethod === 'netbanking' ? 'Net Banking' :
                      selectedPaymentMethod === 'upi' ? 'UPI' :
                      'Digital Wallets'
                    }
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePayment}
          variant="contained"
          disabled={loading || !order || !selectedPaymentMethod}
          sx={{
            background: 'linear-gradient(45deg, #008080 30%, #20B2AA 90%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(45deg, #006666 30%, #008080 90%)'
            },
            '&:disabled': {
              background: '#ccc',
              color: '#666'
            }
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
              Processing...
            </>
          ) : (
            selectedPaymentMethod ? 
              `Pay with ${selectedPaymentMethod === 'card' ? 'Card' : selectedPaymentMethod === 'netbanking' ? 'Net Banking' : selectedPaymentMethod === 'upi' ? 'UPI' : 'Wallet'}` 
              : 'Select Payment Method'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentModal; 