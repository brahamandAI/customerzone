import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Badge, IconButton, Menu, MenuItem, Typography, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { notifications, unreadCount, markNotificationAsRead } = useSocket();
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'new_expense') {
      navigate(`/expenses/${notification.data.expenseId}`);
    } else if (notification.type === 'budget_alert') {
      // Always go to summary page for budget alerts
      navigate('/budget-alerts');
    }
    
    handleClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: '350px',
          },
        }}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2">No notifications</Typography>
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                backgroundColor: notification.read ? 'inherit' : 'action.hover',
                display: 'block',
                py: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                color={notification.type === 'budget_alert' ? 'error' : 'primary'}
                gutterBottom
              >
                {notification.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {notification.message}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </Typography>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBell; 