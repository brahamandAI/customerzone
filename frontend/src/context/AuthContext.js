import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validate token and initialize user
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      setIsLoading(false);
      return;
    }

    try {
      // Try to get current user profile to validate token
      const response = await authAPI.getProfile();
      if (response.data.success) {
        const userData = response.data.user;
        
        // Debug logging
        console.log('🔍 DEBUG: Backend user data:', userData);
        console.log('🔍 DEBUG: Backend profile picture:', userData.profilePicture);
        
        // Only preserve profile picture from localStorage if backend doesn't have one
        const storedUserData = JSON.parse(storedUser);
        console.log('🔍 DEBUG: Stored user data:', storedUserData);
        console.log('🔍 DEBUG: Stored profile picture:', storedUserData.profilePicture);
        
        if (storedUserData.profilePicture && !userData.profilePicture) {
          userData.profilePicture = storedUserData.profilePicture;
          console.log('🔍 DEBUG: Preserved profile picture from localStorage');
        }
        
        console.log('🔍 DEBUG: Final user data:', userData);
        console.log('Token validated, user data:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize user from localStorage
  useEffect(() => {
    validateToken();
  }, []);

  const login = (userData, token) => {
    console.log('Logging in user with data:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('token', token);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Update user data (for profile picture updates)
  const updateUser = (updatedUserData) => {
    console.log('🔍 DEBUG: updateUser called with:', updatedUserData);
    console.log('🔍 DEBUG: Profile picture in updateUser:', updatedUserData.profilePicture);
    setUser(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
    console.log('🔍 DEBUG: User updated in context and localStorage');
  };

  // Refresh token periodically
  useEffect(() => {
    if (isAuthenticated && user) {
      const refreshInterval = setInterval(async () => {
        try {
          const response = await authAPI.getProfile();
          if (response.data.success) {
            const userData = response.data.data;
            
            // Only preserve profile picture from current user state if backend doesn't have one
            if (user.profilePicture && !userData.profilePicture) {
              userData.profilePicture = user.profilePicture;
            }
            
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('Token refreshed successfully');
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Don't logout on refresh failure, just log the error
        }
      }, 5 * 60 * 1000); // Refresh every 5 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [isAuthenticated, user]);

  const getUserRole = () => {
    const role = (user?.role || 'submitter').toUpperCase();
    console.log('Current user role:', role);
    return role;
  };

  const hasPermission = (requiredRole) => {
    const userRole = getUserRole().toLowerCase();
    const roleHierarchy = {
      'submitter': 1,
      'l1_approver': 2,
      'l2_approver': 3,
      'l3_approver': 4,
      'finance': 5
    };
    
    const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    console.log(`Checking permission: ${userRole} >= ${requiredRole} = ${hasPermission}`);
    return hasPermission;
  };

  const canApproveLevel = (level) => {
    const userRole = getUserRole().toLowerCase();
    // Finance can only approve level 4
    if (userRole === 'finance') {
      return level === 4;
    }
    return userRole === `l${level}_approver`;
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'submitter': 'Expense Submitter',
      'l1_approver': 'Regional Manager',
      'l2_approver': 'Admin',
      'l3_approver': 'Super Admin',
      'finance': 'Finance'
    };
    return roleNames[role] || role;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    getUserRole,
    hasPermission,
    canApproveLevel,
    getRoleDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 