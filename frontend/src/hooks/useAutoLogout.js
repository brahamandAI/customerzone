import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for auto-logout after user inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (from user preferences)
 */
const useAutoLogout = (timeoutMinutes = 30) => {
  const { user, logout } = useAuth();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = timeoutMs - 60000; // Show warning 1 minute before logout

  const handleLogout = useCallback(() => {
    if (user) {
      console.log('⏰ Auto-logout triggered due to inactivity');
      // Clear tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Show alert before logout
      alert('You have been logged out due to inactivity.');
      // Perform logout
      logout();
      window.location.href = '/login';
    }
  }, [user, logout]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Only set timers if user is logged in and timeout is enabled
    if (user && timeoutMinutes > 0) {
      // Set logout timer
      timeoutRef.current = setTimeout(() => {
        handleLogout();
      }, timeoutMs);

      // Optional: Set warning timer (1 minute before logout)
      // warningTimeoutRef.current = setTimeout(() => {
      //   console.log('⚠️ You will be logged out in 1 minute due to inactivity');
      // }, warningMs);
    }
  }, [user, timeoutMinutes, timeoutMs, handleLogout]);

  useEffect(() => {
    if (!user) return;

    // Events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'keypress'
    ];

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, resetTimer]);

  return { resetTimer };
};

export default useAutoLogout;

