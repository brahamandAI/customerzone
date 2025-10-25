import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  ListItemAvatar,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const FinanceAIChat = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sample data for charts (in real app, this would come from API)
  const sampleData = {
    pendingPayments: [
      { site: 'Site A', amount: 45000, count: 12 },
      { site: 'Site B', amount: 32000, count: 8 },
      { site: 'Site C', amount: 28000, count: 15 },
      { site: 'Site D', amount: 15000, count: 5 }
    ],
    travelExpenses: [
      { user: 'John Doe', amount: 25000, trips: 8 },
      { user: 'Jane Smith', amount: 18000, trips: 6 },
      { user: 'Mike Johnson', amount: 22000, trips: 10 },
      { user: 'Sarah Wilson', amount: 16000, trips: 4 }
    ],
    monthlyExpenses: [
      { month: 'Jan', amount: 120000 },
      { month: 'Feb', amount: 135000 },
      { month: 'Mar', amount: 98000 },
      { month: 'Apr', amount: 145000 },
      { month: 'May', amount: 110000 },
      { month: 'Jun', amount: 125000 }
    ],
    categoryBreakdown: [
      { name: 'Travel', value: 35, color: '#8884d8' },
      { name: 'Food', value: 25, color: '#82ca9d' },
      { name: 'Accommodation', value: 20, color: '#ffc658' },
      { name: 'Equipment', value: 15, color: '#ff7300' },
      { name: 'Others', value: 5, color: '#8dd1e1' }
    ]
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // AI Response Generator
  const generateAIResponse = async (userMessage) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerMessage = userMessage.toLowerCase();
    let response = { type: 'text', content: '', data: null, chartType: null };

    if (lowerMessage.includes('pending payment') || lowerMessage.includes('pending payments')) {
      response = {
        type: 'chart',
        content: `Here are the pending payments across all sites:\n\nTotal Pending: ₹120,000 across 40 expenses`,
        data: sampleData.pendingPayments,
        chartType: 'bar',
        chartTitle: 'Pending Payments by Site'
      };
    } else if (lowerMessage.includes('travel expense') || lowerMessage.includes('highest travel')) {
      response = {
        type: 'chart',
        content: `Here are the users with highest travel expenses this quarter:\n\nJohn Doe has the highest travel expenses with ₹25,000`,
        data: sampleData.travelExpenses,
        chartType: 'bar',
        chartTitle: 'Travel Expenses by User'
      };
    } else if (lowerMessage.includes('monthly') || lowerMessage.includes('trend')) {
      response = {
        type: 'chart',
        content: `Here's the monthly expense trend for the last 6 months:\n\nAverage monthly expense: ₹122,500`,
        data: sampleData.monthlyExpenses,
        chartType: 'line',
        chartTitle: 'Monthly Expense Trend'
      };
    } else if (lowerMessage.includes('category') || lowerMessage.includes('breakdown')) {
      response = {
        type: 'chart',
        content: `Here's the expense breakdown by category:\n\nTravel expenses account for 35% of total expenses`,
        data: sampleData.categoryBreakdown,
        chartType: 'pie',
        chartTitle: 'Expense Category Breakdown'
      };
    } else if (lowerMessage.includes('site a')) {
      response = {
        type: 'text',
        content: `Site A Details:\n\n• Total Pending Payments: ₹45,000\n• Number of Pending Expenses: 12\n• Average Expense Amount: ₹3,750\n• Most Common Category: Travel (40%)\n• Last Payment Processed: 2 days ago`
      };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      response = {
        type: 'text',
        content: `I can help you with:\n\n📊 **Analytics & Reports**\n• Show pending payments for any site\n• Display expense trends and patterns\n• Generate category breakdowns\n\n👥 **User Analysis**\n• Find users with highest expenses\n• Track individual spending patterns\n• Compare expense behaviors\n\n🏢 **Site Management**\n• Site-wise expense summaries\n• Payment status tracking\n• Budget utilization reports\n\n💡 **Try asking:**\n• "Show me pending payments for Site A"\n• "Which user has the highest travel expenses?"\n• "Show monthly expense trend"\n• "Give me category breakdown"`
      };
    } else {
      response = {
        type: 'text',
        content: `I understand you're asking about "${userMessage}". Let me help you with that.\n\nYou can ask me about:\n• Pending payments and expenses\n• User expense analysis\n• Site-wise reports\n• Monthly trends and patterns\n• Category breakdowns\n\nTry asking something like "Show me pending payments" or "Which user has the highest travel expenses?"`
      };
    }

    setIsLoading(false);
    return response;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Generate AI response
    const aiResponse = await generateAIResponse(userMessage);
    
    const aiMsg = {
      id: Date.now() + 1,
      type: 'ai',
      content: aiResponse.content,
      data: aiResponse.data,
      chartType: aiResponse.chartType,
      chartTitle: aiResponse.chartTitle,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMsg]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const renderChart = (data, chartType, title) => {
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="site" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" name="Amount (₹)" />
            <Bar dataKey="count" fill="#82ca9d" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return null;
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: isUser ? '#667eea' : '#4caf50',
              width: 32,
              height: 32,
              mr: 1
            }}
          >
            {isUser ? <PersonIcon /> : <AIIcon />}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {isUser ? 'You' : 'Finance AI'} • {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Box>
        
        <Paper
          sx={{
            p: 2,
            maxWidth: '80%',
            bgcolor: isUser ? '#667eea' : (darkMode ? '#2a2a2a' : '#f5f5f5'),
            color: isUser ? 'white' : 'inherit',
            borderRadius: 2
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {message.content}
          </Typography>
          
          {message.chartType && message.data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {message.chartTitle}
              </Typography>
              {renderChart(message.data, message.chartType, message.chartTitle)}
            </Box>
          )}
        </Paper>
      </ListItem>
    );
  };

  const quickQuestions = [
    "Show me pending payments for Site A",
    "Which user has the highest travel expenses?",
    "Show monthly expense trend",
    "Give me category breakdown"
  ];

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Finance AI Chat"
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#667eea',
          '&:hover': { bgcolor: '#5a6fd8' }
        }}
      >
        <AIIcon />
      </Fab>

      {/* Chat Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#667eea', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AIIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Finance AI Assistant</Typography>
          </Box>
          <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ flexGrow: 1, p: 0 }}>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Main Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <AIIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Welcome to Finance AI Assistant! 🤖
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Ask me anything about expenses, payments, and financial reports
                    </Typography>
                    
                    <Grid container spacing={2} justifyContent="center">
                      {quickQuestions.map((question, index) => (
                        <Grid item key={index}>
                          <Chip
                            label={question}
                            onClick={() => setInputText(question)}
                            sx={{ cursor: 'pointer' }}
                            variant="outlined"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {messages.map(renderMessage)}
                    {isLoading && (
                      <ListItem sx={{ justifyContent: 'center' }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          AI is thinking...
                        </Typography>
                      </ListItem>
                    )}
                    <div ref={messagesEndRef} />
                  </List>
                )}
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    ref={inputRef}
                    fullWidth
                    multiline
                    maxRows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about expenses, payments, reports..."
                    disabled={isLoading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading}
                    sx={{
                      bgcolor: '#667eea',
                      color: 'white',
                      '&:hover': { bgcolor: '#5a6fd8' },
                      '&:disabled': { bgcolor: '#ccc' }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Sidebar with Quick Actions */}
            <Box sx={{ width: 250, borderLeft: 1, borderColor: 'divider', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <List dense>
                <ListItem button onClick={() => setInputText("Show me pending payments")}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#ff9800' }}>
                      <MoneyIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Pending Payments" 
                    secondary="View all pending expenses"
                  />
                </ListItem>
                
                <ListItem button onClick={() => setInputText("Show monthly expense trend")}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#4caf50' }}>
                      <TrendingUpIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Monthly Trend" 
                    secondary="Expense patterns over time"
                  />
                </ListItem>
                
                <ListItem button onClick={() => setInputText("Give me category breakdown")}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#9c27b0' }}>
                      <AssessmentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Category Analysis" 
                    secondary="Expense breakdown by category"
                  />
                </ListItem>
                
                <ListItem button onClick={() => setInputText("Which user has the highest travel expenses?")}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#2196f3' }}>
                      <BusinessIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="User Analysis" 
                    secondary="Top spenders and patterns"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FinanceAIChat;
