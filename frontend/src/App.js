import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExpenseForm from './pages/ExpenseForm';
import Approval from './pages/Approval';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';
import CreateSite from './pages/CreateSite';
import CreateCategory from './pages/CreateCategory';
import CreateUser from './pages/CreateUser';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import BudgetAlerts from './pages/BudgetAlerts';
import Help from './pages/Help';
import AdminPolicy from './pages/AdminPolicy';
import NavBar from './components/NavBar';
import TestSubmit from './components/TestSubmit';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import './App.css';
import './responsive.css';
import ManageUsers from './pages/ManageUsers';
import ManageSites from './pages/ManageSites';
import EditUser from './pages/EditUser';
import EditSite from './pages/EditSite';
import ResetPassword from './pages/ResetPassword';
import AllSitesApproval from './pages/AllSitesApproval';
import FinanceAIChat from './components/FinanceAIChat';
import PendingApprovalsPage from './pages/PendingApprovalsPage';
import TotalAmountPage from './pages/TotalAmountPage';
import TotalExpensesPage from './pages/TotalExpensesPage';
import ApprovedThisMonthPage from './pages/ApprovedThisMonthPage';
import BudgetUtilizationPage from './pages/BudgetUtilizationPage';
import TotalUsersPage from './pages/TotalUsersPage';
import TotalSitesPage from './pages/TotalSitesPage';
import SystemExpensesPage from './pages/SystemExpensesPage';
import PaymentProcessedPage from './pages/PaymentProcessedPage';
import PendingExpensesPage from './pages/PendingExpensesPage';
import BatchPaymentPage from './pages/BatchPaymentPage';

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login while saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function Layout() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const hideNav = !isAuthenticated || location.pathname === '/login';

  return (
    <>
      {!hideNav && <NavBar />}
      {/* Show Finance AI Chat only for finance/admin users */}
      {isAuthenticated && ['finance', 'admin', 'l3_approver', 'l4_approver'].includes(user?.role) && (
        <FinanceAIChat />
      )}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <PrivateRoute>
            <Navigate to="/dashboard" replace />
          </PrivateRoute>
        } />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/submit-expense" element={
          <PrivateRoute>
            <ExpenseForm />
          </PrivateRoute>
        } />
        
        <Route path="/expense-form" element={
          <PrivateRoute>
            <Navigate to="/submit-expense" replace />
          </PrivateRoute>
        } />
        
        <Route path="/test-submit" element={
          <PrivateRoute>
            <TestSubmit />
          </PrivateRoute>
        } />
        
        <Route path="/approval" element={
          <PrivateRoute>
            <Approval />
          </PrivateRoute>
        } />
        
        <Route path="/all-sites-approval" element={
          <PrivateRoute>
            <AllSitesApproval />
          </PrivateRoute>
        } />
        
        {/* Card Detail Pages */}
        <Route path="/pending-approvals" element={
          <PrivateRoute>
            <PendingApprovalsPage />
          </PrivateRoute>
        } />
        <Route path="/total-amount" element={
          <PrivateRoute>
            <TotalAmountPage />
          </PrivateRoute>
        } />
        <Route path="/total-expenses" element={
          <PrivateRoute>
            <TotalExpensesPage />
          </PrivateRoute>
        } />
        <Route path="/approved-this-month" element={
          <PrivateRoute>
            <ApprovedThisMonthPage />
          </PrivateRoute>
        } />
        <Route path="/budget-utilization" element={
          <PrivateRoute>
            <BudgetUtilizationPage />
          </PrivateRoute>
        } />
        <Route path="/total-users" element={
          <PrivateRoute>
            <TotalUsersPage />
          </PrivateRoute>
        } />
        <Route path="/total-sites" element={
          <PrivateRoute>
            <TotalSitesPage />
          </PrivateRoute>
        } />
        <Route path="/system-expenses" element={
          <PrivateRoute>
            <SystemExpensesPage />
          </PrivateRoute>
        } />
        <Route path="/payment-processed" element={
          <PrivateRoute>
            <PaymentProcessedPage />
          </PrivateRoute>
        } />
        <Route path="/pending-expenses" element={
          <PrivateRoute>
            <PendingExpensesPage />
          </PrivateRoute>
        } />
        
        <Route path="/batch-payment" element={
          <PrivateRoute>
            <BatchPaymentPage />
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminPanel />
          </PrivateRoute>
        } />
        
        <Route path="/admin/policy" element={
          <PrivateRoute>
            <AdminPolicy />
          </PrivateRoute>
        } />
        
        <Route path="/create-site" element={
          <PrivateRoute>
            <CreateSite />
          </PrivateRoute>
        } />
        
        <Route path="/create-category" element={
          <PrivateRoute>
            <CreateCategory />
          </PrivateRoute>
        } />
        
        <Route path="/create-user" element={
          <PrivateRoute>
            <CreateUser />
          </PrivateRoute>
        } />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        } />
        
        <Route path="/reports" element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        } />
        
        <Route path="/budget-alerts" element={
          <PrivateRoute>
            <BudgetAlerts />
          </PrivateRoute>
        } />
        
        <Route path="/help" element={
          <PrivateRoute>
            <Help />
          </PrivateRoute>
        } />

        <Route path="/manage-users" element={
          <PrivateRoute>
            <ManageUsers />
          </PrivateRoute>
        } />
        
        <Route path="/manage-sites" element={
          <PrivateRoute>
            <ManageSites />
          </PrivateRoute>
        } />
        
        <Route path="/edit-site/:siteId" element={
          <PrivateRoute>
            <EditSite />
          </PrivateRoute>
        } />
        
        <Route path="/edit-user/:userId" element={
          <PrivateRoute>
            <EditUser />
          </PrivateRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  // Debug: Log the client ID to console
  console.log('Google Client ID:', googleClientId);
  
  // Check if client ID is available
  if (!googleClientId) {
    console.error('❌ REACT_APP_GOOGLE_CLIENT_ID is not set in environment variables!');
    console.error('Please create frontend/.env file with REACT_APP_GOOGLE_CLIENT_ID');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UserPreferencesProvider>
              <SocketProvider>
                <Router>
                  <Layout />
                </Router>
              </SocketProvider>
            </UserPreferencesProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
