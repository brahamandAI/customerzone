import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Finance AI Service
class FinanceAIService {
  // Get pending payments data
  async getPendingPayments(siteId = null) {
    try {
      const url = siteId 
        ? `${API_BASE_URL}/finance/pending-payments?siteId=${siteId}`
        : `${API_BASE_URL}/finance/pending-payments`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      throw error;
    }
  }

  // Get travel expenses by user
  async getTravelExpensesByUser(period = 'quarter') {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/travel-expenses?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching travel expenses:', error);
      throw error;
    }
  }

  // Get monthly expense trend
  async getMonthlyExpenseTrend(months = 6) {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/monthly-trend?months=${months}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching monthly trend:', error);
      throw error;
    }
  }

  // Get category breakdown
  async getCategoryBreakdown(period = 'month') {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/category-breakdown?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      throw error;
    }
  }

  // Get site-specific data
  async getSiteData(siteId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/site-data/${siteId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching site data:', error);
      throw error;
    }
  }

  // Get user expense analysis
  async getUserExpenseAnalysis(userId = null, period = 'quarter') {
    try {
      const url = userId 
        ? `${API_BASE_URL}/finance/user-analysis/${userId}?period=${period}`
        : `${API_BASE_URL}/finance/user-analysis?period=${period}`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching user analysis:', error);
      throw error;
    }
  }

  // Get budget utilization
  async getBudgetUtilization(siteId = null) {
    try {
      const url = siteId 
        ? `${API_BASE_URL}/finance/budget-utilization?siteId=${siteId}`
        : `${API_BASE_URL}/finance/budget-utilization`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching budget utilization:', error);
      throw error;
    }
  }

  // Process natural language query
  async processQuery(query) {
    try {
      const response = await axios.post(`${API_BASE_URL}/finance/ai-query`, {
        query: query
      });
      return response.data;
    } catch (error) {
      console.error('Error processing AI query:', error);
      throw error;
    }
  }

  // Get expense statistics
  async getExpenseStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await axios.get(`${API_BASE_URL}/finance/stats?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }

  // Get payment processing status
  async getPaymentStatus(expenseId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/payment-status/${expenseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }

  // Get approval workflow status
  async getApprovalWorkflowStatus(expenseId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/approval-status/${expenseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval status:', error);
      throw error;
    }
  }

  // Generate custom report
  async generateCustomReport(reportConfig) {
    try {
      const response = await axios.post(`${API_BASE_URL}/finance/generate-report`, reportConfig);
      return response.data;
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Get real-time alerts
  async getRealTimeAlerts() {
    try {
      const response = await axios.get(`${API_BASE_URL}/finance/alerts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time alerts:', error);
      throw error;
    }
  }

  // Export data
  async exportData(exportConfig) {
    try {
      const response = await axios.post(`${API_BASE_URL}/finance/export`, exportConfig, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

export default new FinanceAIService();
