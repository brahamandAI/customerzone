import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { config } from '../config';
import axios from 'axios';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  /** Brief toast when Finance completes payment (submitter user room). */
  const [paymentAckToast, setPaymentAckToast] = useState({ open: false, message: '' });
  const socketRef = useRef(null);
  const { user } = useAuth();

  // Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching notifications for user:', user._id);
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.data?.notifications) {
        setNotifications(response.data.data.notifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    // Skip if no user or socket already exists
    if (!user || socketRef.current) {
      console.log('Socket initialization skipped:', { 
        hasUser: !!user, 
        hasSocket: !!socketRef.current 
      });
      return;
    }

    console.log('Creating new socket connection for user:', user._id);
    const newSocket = io(config.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Allow fallback to polling
      auth: { userId: user._id, role: user.role },
      timeout: 20000, // 20 second timeout
      forceNew: true // Force new connection
    });

    // Store socket reference first
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      console.log('👤 User ID:', user._id);
      console.log('👤 User Role:', user.role);
      
      // Join rooms
      const roleRoom = `role-${user.role.toLowerCase()}`;
      const userRoom = `user-${user._id}`;
      const budgetRoom = 'budget-alerts';
      console.log('🎧 Joining rooms:', { roleRoom, userRoom, budgetRoom });
      
      newSocket.emit('join-role-room', roleRoom);
      newSocket.emit('join-user-room', userRoom);
      newSocket.emit('join-room', budgetRoom); // Join budget alerts room
      
      console.log('✅ Joined role room:', roleRoom);
      console.log('✅ Joined user room:', userRoom);
      console.log('✅ Joined budget alerts room:', budgetRoom);

      // Fetch initial data
      fetchNotifications();
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection failed:', {
        error: error.message,
        userId: user._id,
        role: user.role
      });
      
      // Try to reconnect after a delay
      setTimeout(() => {
        if (socketRef.current && !socketRef.current.connected) {
          console.log('Attempting to reconnect socket...');
          socketRef.current.connect();
        }
      }, 5000);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', { reason, socketId: newSocket.id });
      if (reason === 'transport close' || reason === 'ping timeout') {
        console.log('Attempting reconnection...');
        newSocket.connect();
      }
    });

    // Handle connection timeout
    newSocket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });

    // Handle notifications
    newSocket.on('new_expense_submitted', (expense) => {
      console.log('New expense notification:', expense.expenseNumber);
      setNotifications(prev => [{
        id: expense.expenseId,
        type: 'new_expense',
        title: 'New Expense Submitted',
        message: `New expense #${expense.expenseNumber} submitted by ${expense.submitter}`,
        data: expense,
        timestamp: new Date(expense.timestamp),
        read: false
      }, ...prev]);
    });

    newSocket.on('expense-updated', (data) => {
      console.log('Expense update notification:', data.expenseNumber);
      
      // Format status for better display
      let statusText = data.status;
      if (data.status === 'approved_l1') {
        statusText = 'Approved by L1';
      } else if (data.status === 'approved_l2') {
        statusText = 'Approved by L2';
      } else if (data.status === 'approved_l3') {
        statusText = 'Approved by L3';
      } else if (data.status === 'approved_finance') {
        statusText = 'Approved by Finance';
      } else if (data.status === 'payment_processed') {
        statusText = 'Payment Processed';
      } else if (data.status === 'rejected') {
        statusText = 'Rejected';
      } else {
        statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
      }
      
      setNotifications(prev => [{
        id: data.expenseId,
        type: data.status.includes('approved') || data.status === 'payment_processed' ? 'expense_approved' : 'expense_rejected',
        title: `Expense ${statusText}`,
        message: `Expense #${data.expenseNumber} ${statusText} - ₹${data.amount.toLocaleString()}`,
        data: data,
        timestamp: new Date(data.timestamp),
        read: false
      }, ...prev]);
    });

    newSocket.on('budget_exceeded_alert', (alert) => {
      console.log('Budget alert notification:', alert.site);
      setNotifications(prev => [{
        id: alert.expenseId,
        type: 'budget_alert',
        title: 'Budget Alert',
        message: `${alert.budgetType.charAt(0).toUpperCase() + alert.budgetType.slice(1)} budget exceeded for site ${alert.site}`,
        data: alert,
        timestamp: new Date(alert.timestamp),
        read: false
      }, ...prev]);
    });

    newSocket.on('expense_payment_processed', (data) => {
      const submitterId =
        data.submittedById != null ? String(data.submittedById) : null;
      const me = user?._id != null ? String(user._id) : '';
      if (!submitterId || submitterId !== me) {
        return;
      }

      const expenseId = data.expenseId != null ? String(data.expenseId) : '';
      const num = data.expenseNumber ?? '';
      const rawAmt = data.paymentAmount ?? data.amount;
      const amt =
        rawAmt != null && !Number.isNaN(Number(rawAmt))
          ? Number(rawAmt).toLocaleString('en-IN')
          : String(rawAmt ?? '');
      const message = `Expense #${num} — ₹${amt} paid by Finance.`;
      console.log('Payment processed notification:', expenseId, message);
      setNotifications((prev) =>
        [
          {
            id: `payment-${expenseId}-${Date.now()}`,
            type: 'payment_acknowledged',
            title: 'Payment received',
            message,
            data: { ...data, expenseId },
            timestamp: new Date(data.timestamp || Date.now()),
            read: false
          },
          ...prev
        ].slice(0, 50)
      );
      setPaymentAckToast({ open: true, message });
    });

    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket:', socketRef.current.id);
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user]); // Only depend on user

  // Utility functions
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const closePaymentAckToast = () => {
    setPaymentAckToast((t) => ({ ...t, open: false }));
  };

  const value = {
    socket,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    unreadCount: notifications.filter(n => !n.read).length,
    paymentAckToast,
    closePaymentAckToast
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 