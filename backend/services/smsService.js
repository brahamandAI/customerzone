const axios = require('axios');

class SMSService {
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY;
    this.senderId = process.env.FAST2SMS_SENDER_ID || 'RAKSHAK';
    this.baseUrl = 'https://www.fast2sms.com/dev/bulkV2';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('✅ SMS service initialized with Fast2SMS');
    } else {
      console.log('⚠️ SMS service disabled - FAST2SMS_API_KEY not configured');
    }
  }

  async sendExpenseNotification(phoneNumber, expenseData) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping SMS notification');
      return false;
    }

    if (!phoneNumber) {
      console.log('⚠️ No phone number provided for SMS notification');
      return false;
    }

    try {
      const message = this.generateExpenseNotificationMessage(expenseData);
      
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: message,
        language: 'english',
        route: 'q',
        numbers: phoneNumber,
        flash: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        console.log('✅ SMS notification sent successfully to:', phoneNumber);
        console.log('📱 SMS Message ID:', response.data.request_id);
        return true;
      } else {
        console.error('❌ SMS sending failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendExpenseStatusUpdate(phoneNumber, expenseData, action, approverName) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping SMS notification');
      return false;
    }

    if (!phoneNumber) {
      console.log('⚠️ No phone number provided for SMS notification');
      return false;
    }

    try {
      const message = this.generateStatusUpdateMessage(expenseData, action, approverName);
      
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: message,
        language: 'english',
        route: 'q',
        numbers: phoneNumber,
        flash: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        console.log('✅ Status update SMS sent successfully to:', phoneNumber);
        console.log('📱 SMS Message ID:', response.data.request_id);
        return true;
      } else {
        console.error('❌ SMS sending failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendBudgetAlert(phoneNumber, siteData, budgetUtilization) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping SMS notification');
      return false;
    }

    if (!phoneNumber) {
      console.log('⚠️ No phone number provided for SMS notification');
      return false;
    }

    try {
      const message = this.generateBudgetAlertMessage(siteData, budgetUtilization);
      
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: message,
        language: 'english',
        route: 'q',
        numbers: phoneNumber,
        flash: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        console.log('✅ Budget alert SMS sent successfully to:', phoneNumber);
        console.log('📱 SMS Message ID:', response.data.request_id);
        return true;
      } else {
        console.error('❌ SMS sending failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  generateExpenseNotificationMessage(expenseData) {
    return `New expense ${expenseData.expenseNumber} requires your approval. Amount: Rs.${expenseData.amount}, Category: ${expenseData.category}, Site: ${expenseData.site}, Submitter: ${expenseData.submitter}. Please login to review. - Rakshak Expense System`;
  }

  generateStatusUpdateMessage(expenseData, action, approverName) {
    const actionText = action === 'approved' ? 'APPROVED' : 'REJECTED';
    return `Your expense ${expenseData.expenseNumber} has been ${actionText} by ${approverName}. Amount: Rs.${expenseData.amount}. Check dashboard for details. - Rakshak Expense System`;
  }

  generateBudgetAlertMessage(siteData, budgetUtilization) {
    const alertType = budgetUtilization >= 95 ? 'CRITICAL' : 'WARNING';
    return `${alertType} BUDGET ALERT: ${siteData.siteName} has used ${budgetUtilization}% of monthly budget. Current: Rs.${siteData.currentMonthExpenses}, Budget: Rs.${siteData.monthlyBudget}. Please review expenses. - Rakshak Expense System`;
  }

  async sendBulkNotifications(phoneNumbers, message) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping bulk SMS notification');
      return false;
    }

    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log('⚠️ No phone numbers provided for bulk SMS notification');
      return false;
    }

    try {
      // Fast2SMS allows up to 100 numbers per request
      const batchSize = 100;
      const results = [];

      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);
        const numbers = batch.join(',');
        
        const response = await axios.post(this.baseUrl, {
          authorization: this.apiKey,
          message: message,
          language: 'english',
          route: 'q',
          numbers: numbers,
          flash: 0
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.return === true) {
          console.log(`✅ Bulk SMS batch ${Math.floor(i/batchSize) + 1} sent successfully`);
          results.push({ success: true, batch: Math.floor(i/batchSize) + 1, requestId: response.data.request_id });
        } else {
          console.error(`❌ Bulk SMS batch ${Math.floor(i/batchSize) + 1} failed:`, response.data.message);
          results.push({ success: false, batch: Math.floor(i/batchSize) + 1, error: response.data.message });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Bulk SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendBatchPaymentOTP({ phone, otp, expenseCount }) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping OTP SMS');
      return false;
    }

    if (!phone) {
      console.log('⚠️ No phone number provided for OTP SMS');
      return false;
    }

    try {
      const message = `Your Batch Payment OTP is: ${otp}. Valid for 5 minutes. ${expenseCount} expenses. Do NOT share this OTP. - Rakshak Expense System`;
      
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: message,
        language: 'english',
        route: 'q',
        numbers: phone,
        flash: 1 // Flash message for OTP
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        console.log('✅ Batch OTP SMS sent successfully to:', phone);
        console.log('📱 SMS Message ID:', response.data.request_id);
        return true;
      } else {
        console.error('❌ OTP SMS sending failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ OTP SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  async sendPaymentProcessedNotification({ phone, expenseNumber, amount }) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS service is disabled - skipping payment notification SMS');
      return false;
    }

    if (!phone) {
      console.log('⚠️ No phone number provided for payment notification SMS');
      return false;
    }

    try {
      const message = `Payment Processed! Expense ${expenseNumber}, Amount: Rs.${amount.toLocaleString('en-IN')} has been successfully processed. - Rakshak Expense System`;
      
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: message,
        language: 'english',
        route: 'q',
        numbers: phone,
        flash: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        console.log('✅ Payment notification SMS sent successfully to:', phone);
        console.log('📱 SMS Message ID:', response.data.request_id);
        return true;
      } else {
        console.error('❌ Payment notification SMS sending failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Payment notification SMS service error:', error.response?.data || error.message);
      return false;
    }
  }

  async testConnection() {
    if (!this.isEnabled) {
      return { success: false, message: 'SMS service is disabled - FAST2SMS_API_KEY not configured' };
    }

    try {
      // Send a test message to a dummy number (this will fail but we can check if API is accessible)
      const response = await axios.post(this.baseUrl, {
        authorization: this.apiKey,
        message: 'Test message from Rakshak Expense System',
        language: 'english',
        route: 'q',
        numbers: '9999999999', // Dummy number
        flash: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return === true) {
        return { success: true, message: 'SMS service is working correctly' };
      } else {
        return { success: false, message: `SMS service test failed: ${response.data.message}` };
      }
    } catch (error) {
      // If it's an authentication error, the service is working but credentials are wrong
      if (error.response?.data?.message?.includes('authorization')) {
        return { success: false, message: 'SMS service is accessible but API key is invalid' };
      }
      return { success: false, message: `SMS service test failed: ${error.message}` };
    }
  }

  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      apiKey: this.apiKey ? 'Configured' : 'Not configured',
      senderId: this.senderId,
      baseUrl: this.baseUrl
    };
  }
}

module.exports = new SMSService(); 