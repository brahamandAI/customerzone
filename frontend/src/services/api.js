import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error mapping
    const err = error?.response?.data;
    const code = err?.errorCode || 'NETWORK_ERROR';
    const codeToMessage = {
      AUTH_REQUIRED: 'Please login to continue.',
      PERMISSION_DENIED: 'You do not have permission for this action.',
      NOT_FOUND: 'Requested data was not found.',
      VALIDATION_ERROR: 'Please fix the highlighted fields.',
      DUPLICATE: 'This item already exists.',
      INVALID_ID: 'Invalid reference provided.',
      INTERNAL_ERROR: 'Something went wrong. Please try again.',
      NETWORK_ERROR: 'Please check your internet connection.'
    };
    error.userMessage = err?.message || codeToMessage[code] || codeToMessage.INTERNAL_ERROR;

    if (error.response?.status === 401) {
      // Clear both token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location.href to force a full page reload
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  googleSignIn: (data) => api.post('/auth/google', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetToken, password) => api.post(`/auth/reset-password/${resetToken}`, { password }),
  sendOtp: (email) => api.post('/auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
};

// Expense API calls
export const expenseAPI = {
  create: (data) => api.post('/expenses/create', data),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/expenses/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getNextExpenseNumber: () => api.get('/expenses/next-number'),
  getPendingApprovals: () => api.get('/expenses/pending'),
  approveExpense: (id, data) => api.put(`/expenses/${id}/approve`, data),
  rejectExpense: (id, data) => api.put(`/expenses/${id}/approve`, data),
  getAll: () => api.get('/expenses/all'),
  getById: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  // Attachments methods
  getAttachments: (expenseId) => api.get(`/expenses/${expenseId}/attachments`),
  downloadAttachment: (expenseId, attachmentId) => api.get(`/expenses/${expenseId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  }),
};

// Dashboard API calls
export const dashboardAPI = {
  getOverview: (params = {}) => api.get('/dashboard/overview', { params }),
  getStats: (params) => api.get('/dashboard/expense-stats', { params }),
  getBudgetOverview: () => api.get('/dashboard/budget-overview'),
  getPendingApprovals: () => api.get('/dashboard/pending-approvals'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// User API calls
export const userAPI = {
  createUser: (data) => api.post('/users/create', data),
  getUsers: () => api.get('/users/all'),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  changePassword: (id, data) => api.post(`/users/${id}/change-password`, data),
};

// Site API calls
export const siteAPI = {
  getAll: (params) => api.get('/sites/all', { params }),
  getById: (id) => api.get(`/sites/${id}`),
  create: (data) => api.post('/sites/create', data),
  update: (id, data) => api.put(`/sites/${id}`, data),
  delete: (id, hardDelete = false) => api.delete(`/sites/${id}?hardDelete=${hardDelete}`),
  updateBudget: (id, data) => api.put(`/sites/${id}/budget`, data),
  getBudgetAlerts: () => api.get('/sites/budget-alerts'),
  getPolicy: (id) => api.get(`/sites/${id}/policy`),
  updatePolicy: (id, data) => api.put(`/sites/${id}/policy`, data),
};

// Payment API calls
export const paymentAPI = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getHistory: (params) => api.get('/payments/history', { params }),
  refundPayment: (data) => api.post('/payments/refund', data),
};

// Notification API calls
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  sendCustom: (data) => api.post('/notifications/send', data),
};

// Report API calls
export const reportAPI = {
  getExpenseSummary: (params) => api.get('/reports/expense-summary', { params }),
  getExpenseDetails: (params) => api.get('/reports/expense-details', { params }),
  getBudgetUtilization: (params) => api.get('/reports/budget-utilization', { params }),
  getVehicleKM: (params) => api.get('/reports/vehicle-km', { params }),
  getApprovalAnalytics: (params) => api.get('/reports/approval-analytics', { params }),
  getBarData: (params) => api.get('/reports/expense-summary', { params }), // Use expense summary for bar data
  getPieData: (params) => api.get('/reports/expense-summary', { params }), // Use expense summary for pie data
};

// Category API calls
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Approval API calls
export const approvalAPI = {
  getPending: () => api.get('/expenses/pending')
};

export default api; 