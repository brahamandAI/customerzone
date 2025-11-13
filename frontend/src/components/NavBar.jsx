import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, IconButton, Divider, Chip, Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ApprovalIcon from '@mui/icons-material/Approval';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PaymentIcon from '@mui/icons-material/Payment';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useTheme } from '@mui/material/styles';
import { config } from '../config';

const NavBar = () => {
  const { user, logout, getUserRole, hasPermission, getRoleDisplayName, updateUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  
  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileNavClick = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  // Role-based navigation items
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, show: true },
    { label: 'Submit Expense', path: '/submit-expense', icon: <ReceiptIcon />, show: user && ['submitter', 'SUBMITTER'].includes(user?.role) },
    { label: 'Reports', path: '/reports', icon: <ReceiptIcon />, show: user && !['submitter', 'SUBMITTER'].includes(user?.role) },
    // Show Approvals for L1, L2, and L3 approvers (but not submitters)
    { label: (user?.role?.toLowerCase() === 'finance') ? 'Payment Processing' : 'Approvals', path: '/approval', icon: <ApprovalIcon />, show: user && !['submitter', 'SUBMITTER'].includes(user?.role) },
    // Batch Payment - Only for Finance and L3 Approver
    { label: '🔐 Batch Payment', path: '/batch-payment', icon: <PaymentIcon />, show: user && ['finance', 'l3_approver'].includes(user?.role?.toLowerCase()) },
    // L2 and L3 approvers can see admin panel (but not Finance)
    { label: 'Admin', path: '/admin', icon: <AdminPanelSettingsIcon />, show: hasPermission('l2_approver') && user?.role?.toLowerCase() !== 'finance' },
  ].filter(item => item.show);

  return (
    <>
      <AppBar position="static" sx={{ 
        background: 'linear-gradient(45deg, #004D4D 30%, #006666 90%)',
        boxShadow: '0 4px 20px rgba(0, 77, 77, 0.4)',
        color: 'white'
      }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="/rakshak-logo.png" 
              alt="Rakshak Securitas Logo"
              style={{
                width: 40,
                height: 40,
                marginRight: 12,
                filter: 'brightness(0) invert(1)'
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1 }}>
              Rakshak Securitas
            </Typography>
          </Box>
          
          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            {navItems.map(item => (
              <Button
                key={item.path}
                component={NavLink}
                to={item.path}
                color="inherit"
                startIcon={item.icon}
                sx={{
                  fontWeight: location.pathname === item.path ? 800 : 500,
                  position: 'relative',
                  color: '#fff',
                  fontSize: 16,
                  px: 2,
                  '&:after': location.pathname === item.path ? {
                    content: '""',
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    bottom: 2,
                    height: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #ffeb3b 0%, #43a047 100%)',
                    transition: 'all 0.3s',
                  } : {},
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            sx={{ display: { xs: 'block', md: 'none' }, color: 'white' }}
            onClick={handleMobileMenuToggle}
            className="mobile-menu-button"
          >
            <MenuIcon />
          </IconButton>

          {/* User Menu */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
            <NotificationBell />
            
            {/* Desktop User Info */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={handleMenu}
                sx={{ color: 'white' }}
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.875rem'
                  }}
                  src={!photoLoadError && user?.profilePicture ? `${config.apiBaseUrl}/users/profile-photo/${user.profilePicture}` : undefined}
                  onError={(e) => {
                    setPhotoLoadError(true);
                  }}
                  crossOrigin="anonymous"
                >
                  {user?.name?.charAt(0) || <AccountCircleIcon />}
                </Avatar>
              </IconButton>
              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                {user?.name || 'User'}
              </Typography>
              <Chip 
                label={getRoleDisplayName(user?.role)} 
                size="small" 
                sx={{ 
                  bgcolor: '#4caf50', 
                  color: 'white',
                  fontSize: '0.7rem',
                  height: 20,
                  '& .MuiChip-label': {
                    px: 1
                  }
                }} 
              />
            </Box>

            {/* Mobile User Icon Only */}
            <IconButton
              sx={{ display: { xs: 'block', md: 'none' }, color: 'white' }}
              onClick={handleMenu}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  fontSize: '0.875rem'
                }}
                src={!photoLoadError && user?.profilePicture ? `http://localhost:5001/api/users/profile-photo/${user.profilePicture}` : undefined}
                onError={(e) => {
                  setPhotoLoadError(true);
                }}
                crossOrigin="anonymous"
              >
                {user?.name?.charAt(0) || <AccountCircleIcon />}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(135deg, #004D4D 0%, #006666 100%)',
            color: 'white'
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Menu
          </Typography>
        </Box>
        
        <List sx={{ pt: 1 }}>
          {navItems.map(item => (
            <ListItem
              key={item.path}
              button
              onClick={() => handleMobileNavClick(item.path)}
              sx={{
                color: location.pathname === item.path ? '#ffeb3b' : 'white',
                backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
        
        <List>
          <ListItem button onClick={handleProfile}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItem>
          
          <ListItem button onClick={handleSettings}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
          
          <ListItem button onClick={handleLogout}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 2
          }
        }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default NavBar; 