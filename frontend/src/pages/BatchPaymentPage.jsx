import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Home as HomeIcon,
  Payment as PaymentIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import BatchPaymentSelector from '../components/BatchPaymentSelector';

const BatchPaymentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [batchHistory, setBatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Check if user is authorized
  useEffect(() => {
    if (!user || !['finance', 'l3_approver'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch approved expenses
  useEffect(() => {
    fetchApprovedExpenses();
  }, []);

  const fetchApprovedExpenses = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/expenses/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            status: 'approved,approved_l3,approved_finance',
            limit: 1000
          }
        }
      );

      if (response.data.success) {
        setExpenses(response.data.data || []);
      } else {
        setError('Failed to load expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchHistory = async () => {
    setHistoryLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/batch-payments/history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBatchHistory(response.data.data.batchPayments || []);
      }
    } catch (err) {
      console.error('Error fetching batch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && batchHistory.length === 0) {
      fetchBatchHistory();
    }
  };

  const handlePaymentComplete = (results) => {
    // Refresh the expenses list
    fetchApprovedExpenses();
    
    // Show success message
    alert(`Successfully processed ${results.totalProcessed} expenses!`);
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink
          component={Link}
          to="/dashboard"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </MuiLink>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <PaymentIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Batch Payment Processing
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)' }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white', fontWeight: 'bold' }}>
          <PaymentIcon fontSize="large" sx={{ color: 'white' }} />
          Batch Payment Processing
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', fontSize: '1.1rem', opacity: 0.95 }}>
          Process multiple approved expenses with a single OTP for faster month-end processing
        </Typography>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            icon={<PaymentIcon />} 
            label="Process Payments" 
            iconPosition="start"
          />
          <Tab 
            icon={<HistoryIcon />} 
            label="Batch History" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {expenses.length > 0 ? (
            <BatchPaymentSelector 
              expenses={expenses}
              onPaymentComplete={handlePaymentComplete}
            />
          ) : (
            <Alert severity="info">
              No approved expenses available for payment processing at this time.
            </Alert>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : batchHistory.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Batch Payment History
              </Typography>
              {batchHistory.map((batch) => (
                <Paper 
                  key={batch._id} 
                  sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {batch.expenseCount} Expenses Processed
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(batch.createdAt).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      ₹{batch.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No batch payment history found.
            </Alert>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default BatchPaymentPage;

