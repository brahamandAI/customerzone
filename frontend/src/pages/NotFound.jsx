import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: darkMode 
        ? 'linear-gradient(120deg, #1a1a1a 60%, #2d2d2d 100%)' 
        : 'linear-gradient(120deg, #e3f2fd 60%, #fff 100%)' 
    }}>
      <Typography 
        variant="h1" 
        color={darkMode ? '#4fc3f7' : '#1976d2'} 
        fontWeight={900} 
        gutterBottom
      >
        404
      </Typography>
      <Typography 
        variant="h5" 
        color={darkMode ? '#b0b0b0' : 'text.secondary'} 
        gutterBottom
      >
        Page Not Found
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => navigate('/dashboard')} 
        sx={{ 
          mt: 3,
          backgroundColor: darkMode ? '#4fc3f7' : '#1976d2',
          '&:hover': {
            backgroundColor: darkMode ? '#0099cc' : '#1565c0'
          }
        }}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotFound; 