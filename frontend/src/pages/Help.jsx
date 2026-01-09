import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Fade, Zoom, Accordion, AccordionSummary, AccordionDetails, Button, TextField, Chip, Avatar, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpIcon from '@mui/icons-material/Help';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import SearchIcon from '@mui/icons-material/Search';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ChatIcon from '@mui/icons-material/Chat';
import { useTheme } from '../context/ThemeContext';

const Help = () => {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState('panel1');

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const faqs = [
    {
      question: "How do I submit an expense report?",
      answer: "Navigate to Expense Form, fill required fields, attach documents, and submit for approval."
    },
    {
      question: "What is the approval workflow?",
      answer: "Multi-level system: under ₹10K (Site Manager), ₹10K-50K (Regional Manager), above ₹50K (Finance Director)."
    },
    {
      question: "How do I set up budget alerts?",
      answer: "Go to Budget Alerts page, click 'Add Alert', specify site, category, threshold, and alert type."
    }
  ];

  const tutorials = [
    {
      title: "Getting Started",
      duration: "5:30",
      description: "Learn the basics of expense management"
    },
    {
      title: "Approval Process",
      duration: "8:15",
      description: "Step-by-step approval workflow guide"
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkMode 
          ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.01"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)', mb: 2 }}>
              Help & Support Center
            </Typography>
            
            <Paper elevation={16} sx={{ 
              maxWidth: 600, 
              mx: 'auto', 
              p: 2, 
              borderRadius: 3,
              background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SearchIcon sx={{ color: darkMode ? '#4fc3f7' : '#667eea' }} />
                <TextField
                  fullWidth
                  placeholder="Search for help articles, tutorials, or FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  variant="standard"
                  sx={{ 
                    '& .MuiInput-underline:before': { borderBottom: 'none' },
                    '& .MuiInputBase-input': {
                      color: darkMode ? '#e0e0e0' : '#333333',
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: darkMode ? '#b0b0b0' : '#666666',
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Paper>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: darkMode ? '#4fc3f7' : '#667eea', mr: 2 }}>
                      <VideoLibraryIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#4fc3f7' : '#667eea'}>
                      Video Tutorials
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {tutorials.map((tutorial, index) => (
                      <Card key={index} sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        background: darkMode ? '#2a2a2a' : '#ffffff',
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} color={darkMode ? '#e0e0e0' : '#333333'}>
                              {tutorial.title}
                            </Typography>
                            <Typography variant="caption" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                              {tutorial.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <PlayCircleIcon sx={{ fontSize: 16, color: darkMode ? '#4fc3f7' : '#667eea' }} />
                              <Typography variant="caption" color={darkMode ? '#4fc3f7' : '#667eea'}>
                                {tutorial.duration}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12} md={8}>
              <Zoom in style={{ transitionDelay: '400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                      <HelpIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color="#ff9800">
                      Frequently Asked Questions
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {faqs.map((faq, index) => (
                      <Accordion 
                        key={index}
                        expanded={expanded === `panel${index + 1}`}
                        onChange={handleAccordionChange(`panel${index + 1}`)}
                        sx={{ 
                          '&:before': { display: 'none' },
                          boxShadow: 'none',
                          background: darkMode ? '#2a2a2a' : '#ffffff',
                          border: darkMode ? '1px solid #333333' : '1px solid rgba(0,0,0,0.1)',
                          borderRadius: 2,
                          mb: 1,
                          '& .MuiAccordionSummary-root': {
                            color: darkMode ? '#e0e0e0' : '#333333',
                          },
                          '& .MuiAccordionDetails-root': {
                            color: darkMode ? '#b0b0b0' : 'text.secondary',
                          },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#e0e0e0' : '#333333' }} />}>
                          <Typography variant="body1" fontWeight={500} color={darkMode ? '#e0e0e0' : '#333333'}>
                            {faq.question}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'}>
                            {faq.answer}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12}>
              <Zoom in style={{ transitionDelay: '600ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid #333333' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                      <ContactSupportIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color="#4caf50">
                      Contact Support
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 3, textAlign: 'center', background: darkMode ? '#2a2a2a' : '#ffffff' }}>
                        <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                          <EmailIcon />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600} gutterBottom color={darkMode ? '#e0e0e0' : '#333333'}>
                          Email Support
                        </Typography>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} gutterBottom>
                          support@rakshaksecuritas.com
                        </Typography>
                        <Chip label="Within 24 hours" size="small" />
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 3, textAlign: 'center', background: darkMode ? '#2a2a2a' : '#ffffff' }}>
                        <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                          <PhoneIcon />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600} gutterBottom color={darkMode ? '#e0e0e0' : '#333333'}>
                          Phone Support
                        </Typography>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} gutterBottom>
                          +91 1800-123-4567
                        </Typography>
                        <Chip label="9 AM - 6 PM IST" size="small" />
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ p: 3, textAlign: 'center', background: darkMode ? '#2a2a2a' : '#ffffff' }}>
                        <Avatar sx={{ bgcolor: '#4caf50', mx: 'auto', mb: 2 }}>
                          <ChatIcon />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600} gutterBottom color={darkMode ? '#e0e0e0' : '#333333'}>
                          Live Chat
                        </Typography>
                        <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} gutterBottom>
                          Available on this page
                        </Typography>
                        <Chip label="Instant response" size="small" />
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Box>
  );
};

export default Help; 