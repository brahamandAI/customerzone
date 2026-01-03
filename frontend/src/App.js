import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import TestSubmit from './components/TestSubmit';
import FinanceAIChat from './components/FinanceAIChat';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './App.css';
import './responsive.css';

// Lazy load all pages for code splitting (reduces initial bundle size significantly)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExpenseForm = lazy(() => import('./pages/ExpenseForm'));
const Approval = lazy(() => import('./pages/Approval'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CreateSite = lazy(() => import('./pages/CreateSite'));
const CreateCategory = lazy(() => import('./pages/CreateCategory'));
const CreateUser = lazy(() => import('./pages/CreateUser'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const BudgetAlerts = lazy(() => import('./pages/BudgetAlerts'));
const Help = lazy(() => import('./pages/Help'));
const AdminPolicy = lazy(() => import('./pages/AdminPolicy'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const ManageSites = lazy(() => import('./pages/ManageSites'));
const EditUser = lazy(() => import('./pages/EditUser'));
const EditSite = lazy(() => import('./pages/EditSite'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AllSitesApproval = lazy(() => import('./pages/AllSitesApproval'));
const PendingApprovalsPage = lazy(() => import('./pages/PendingApprovalsPage'));
const TotalAmountPage = lazy(() => import('./pages/TotalAmountPage'));
const TotalExpensesPage = lazy(() => import('./pages/TotalExpensesPage'));
const ApprovedThisMonthPage = lazy(() => import('./pages/ApprovedThisMonthPage'));
const BudgetUtilizationPage = lazy(() => import('./pages/BudgetUtilizationPage'));
const TotalUsersPage = lazy(() => import('./pages/TotalUsersPage'));
const TotalSitesPage = lazy(() => import('./pages/TotalSitesPage'));
const SystemExpensesPage = lazy(() => import('./pages/SystemExpensesPage'));
const PaymentProcessedPage = lazy(() => import('./pages/PaymentProcessedPage'));
const PendingExpensesPage = lazy(() => import('./pages/PendingExpensesPage'));
const BatchPaymentPage = lazy(() => import('./pages/BatchPaymentPage'));

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

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
      <Suspense fallback={<LoadingFallback />}>
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
      </Suspense>
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
            <SocketProvider>
              <Router>
                <Layout />
              </Router>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
