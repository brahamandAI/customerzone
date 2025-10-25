import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';

const TestSubmit = () => {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    vendor: '',
    paymentMethod: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5001/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          expenseNumber: 'EXP_' + Date.now(),
          date: new Date().toISOString(),
          submitter: 'Test User',
          submitterId: 'test-user-id',
          site: 'test-site'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Expense submitted successfully!');
        setFormData({
          amount: '',
          category: '',
          description: '',
          vendor: '',
          paymentMethod: ''
        });
      } else {
        setMessage('❌ Error: ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          🧪 Test Expense Submit
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          This is a test form to verify expense submission functionality.
        </Typography>

        {message && (
          <Alert severity={message.includes('✅') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Amount (₹)"
            type="number"
            value={formData.amount}
            onChange={handleChange('amount')}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Category"
            value={formData.category}
            onChange={handleChange('category')}
            required
            placeholder="Fuel, Food, Travel, etc."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            required
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Vendor"
            value={formData.vendor}
            onChange={handleChange('vendor')}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Payment Method"
            value={formData.paymentMethod}
            onChange={handleChange('paymentMethod')}
            required
            placeholder="Cash, Card, UPI, etc."
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Submitting...
              </>
            ) : (
              'Submit Expense'
            )}
          </Button>
        </form>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            📋 Test Instructions:
          </Typography>
          <Typography variant="body2" component="div">
            1. Fill the form above<br/>
            2. Click "Submit Expense"<br/>
            3. Check if success message appears<br/>
            4. If error, check backend logs<br/>
            5. Test with different data
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default TestSubmit; 