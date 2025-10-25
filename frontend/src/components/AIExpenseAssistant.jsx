import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  VolumeUp as VolumeUpIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import aiService from '../services/aiService';

const AIExpenseAssistant = ({ onExpenseDataExtracted, user, sites }) => {
  const { darkMode } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileInputRef] = useState(useRef(null));
  
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'hi-IN'; // Hindi language support
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        addMessage('AI Assistant', 'I\'m listening... Please describe your expense.', 'ai');
      };
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInputText(finalTranscript);
          processExpenseInput(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        addMessage('AI Assistant', 'Sorry, I couldn\'t hear you clearly. Please try again.', 'ai');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (sender, text, type = 'user') => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, type, timestamp: new Date() }]);
  };

  // File handling functions
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      if (file.size > maxSize) {
        addMessage('AI Assistant', `File ${file.name} is too large. Maximum size is 10MB.`, 'ai');
        return false;
      }
      
      if (!allowedTypes.includes(file.type)) {
        addMessage('AI Assistant', `File type ${file.type} is not supported.`, 'ai');
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
      addMessage('AI Assistant', `✅ Attached ${validFiles.length} file(s): ${validFiles.map(f => f.name).join(', ')}`, 'ai');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    addMessage('AI Assistant', `🗑️ Removed file: ${attachedFiles[index].name}`, 'ai');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType === 'text/plain' || fileType === 'text/csv') return '📃';
    return '📎';
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // AI-powered expense data extraction
  const processExpenseInput = async (input) => {
    setIsProcessing(true);
    addMessage('User', input, 'user');
    
    try {
      // Check if user is confirming with "yes", "हाँ", "ok", etc.
      const lowerInput = input.toLowerCase().trim();
      console.log('🔍 Processing input:', { input, lowerInput, extractedData: !!extractedData });
      
      if (lowerInput === 'yes' || lowerInput === 'हाँ' || lowerInput === 'ok' || lowerInput === 'हां' || lowerInput === 'y' || lowerInput === 'हा') {
        console.log('✅ Confirmation detected, calling handleConfirmExpense');
        if (extractedData) {
          try {
            handleConfirmExpense();
            console.log('✅ handleConfirmExpense completed successfully');
          } catch (confirmError) {
            console.error('❌ Error in handleConfirmExpense:', confirmError);
            addMessage('AI Assistant', 'Sorry, there was an error filling the form. Please try again.', 'ai');
          }
          return;
        } else {
          console.log('❌ No extractedData available for confirmation');
          addMessage('AI Assistant', 'No expense data to confirm. Please provide expense details first.', 'ai');
          return;
        }
      }
      
      // Extract expense data using AI/ML processing
      console.log('🔍 Extracting expense data for input:', input);
      const newExtractedData = await extractExpenseData(input);
      console.log('🔍 Extracted data:', newExtractedData);
      
             if (newExtractedData) {
         setExtractedData(newExtractedData);
         const confidenceText = newExtractedData.confidence >= 80 ? '✅ High confidence' : 
                               newExtractedData.confidence >= 60 ? '⚠️ Medium confidence' : '❓ Low confidence';
         
         addMessage('AI Assistant', `I've extracted the following expense details:\n\n` +
           `💰 Amount: ₹${newExtractedData.amount}\n` +
           `${newExtractedData.category ? `📂 Category: ${newExtractedData.category}\n` : ''}` +
           `🏢 Site: ${newExtractedData.siteName}\n` +
           `📅 Date: ${newExtractedData.date}\n` +
           `${newExtractedData.priority ? `⚡ Priority: ${newExtractedData.priority}\n` : ''}` +
           `${newExtractedData.paymentMethod ? `💳 Payment Method: ${newExtractedData.paymentMethod}\n` : ''}` +
           `${newExtractedData.vendor ? `🏪 Vendor: ${newExtractedData.vendor}\n` : ''}` +
           `${newExtractedData.title && newExtractedData.title !== input.substring(0, 50) ? `📝 Title: ${newExtractedData.title}\n` : ''}` +
           `${newExtractedData.description && newExtractedData.description !== input ? `📄 Description: ${newExtractedData.description}\n` : ''}` +
           `🎯 Confidence: ${confidenceText} (${newExtractedData.confidence}%)\n\n` +
           `Would you like me to fill the form with this data?\n\n` +
           `💡 Say "yes", "हाँ", or "ok" to confirm`, 'ai');
       } else {
         const suggestions = aiService.getSuggestions(user, sites);
         addMessage('AI Assistant', `I couldn't understand the expense details. Please try again with more specific information.\n\n` +
           `💡 Try these examples:\n${suggestions.slice(0, 3).map(s => `• ${s}`).join('\n')}`, 'ai');
       }
    } catch (error) {
      console.error('❌ Error processing expense:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        input: input
      });
      addMessage('AI Assistant', 'Sorry, I encountered an error while processing your expense. Please try again.', 'ai');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI-powered data extraction logic
  const extractExpenseData = async (input) => {
    try {
      const extractedData = await aiService.extractExpenseData(input, user, sites);
      return extractedData;
    } catch (error) {
      console.error('Error extracting expense data:', error);
      return null;
    }
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      processExpenseInput(inputText.trim());
      setInputText('');
    }
  };

  const handleConfirmExpense = () => {
    console.log('🔍 handleConfirmExpense called with:', { 
      extractedData: !!extractedData, 
      onExpenseDataExtracted: !!onExpenseDataExtracted,
      extractedDataDetails: extractedData,
      attachedFiles: attachedFiles.length
    });
    
    try {
      if (extractedData && onExpenseDataExtracted) {
        // Include attached files in the extracted data
        const dataWithFiles = {
          ...extractedData,
          attachedFiles: attachedFiles
        };
        
        console.log('✅ Calling onExpenseDataExtracted with data:', dataWithFiles);
        onExpenseDataExtracted(dataWithFiles);
        setExtractedData(null);
        setAttachedFiles([]); // Clear attached files after filling form
        addMessage('AI Assistant', `✅ Expense data has been filled in the form! ${attachedFiles.length > 0 ? `(${attachedFiles.length} file(s) attached)` : ''} Please review and submit.`, 'ai');
        console.log('✅ Form filled successfully');
      } else {
        console.log('❌ Missing data or callback:', { 
          hasExtractedData: !!extractedData, 
          hasCallback: !!onExpenseDataExtracted 
        });
        addMessage('AI Assistant', '❌ No expense data available to fill. Please provide expense details first.', 'ai');
      }
    } catch (error) {
      console.error('❌ Error in handleConfirmExpense:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        extractedData: extractedData
      });
      addMessage('AI Assistant', '❌ Sorry, there was an error filling the form. Please try again.', 'ai');
    }
  };

  const handleReset = () => {
    setMessages([]);
    setExtractedData(null);
    setInputText('');
    setAttachedFiles([]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="AI Assistant"
        onClick={() => setShowAssistant(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)'
          }
        }}
      >
        <AIIcon />
      </Fab>

      {/* AI Assistant Dialog */}
      <Dialog
        open={showAssistant}
        onClose={() => setShowAssistant(false)}
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
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <AIIcon />
          AI Expense Assistant
          <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.8 }}>
            Speak or type to submit expenses
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ flexGrow: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Messages Area */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AIIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                 <Typography variant="h6" gutterBottom>
                   AI Expense Assistant में आपका स्वागत है! 🎉
                 </Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                   बोलें या लिखें: "₹1,200 टैक्सी खर्च दिल्ली साइट के लिए"
                 </Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                   🌐 Supports: English, Hindi, Hinglish (Mixed Language)
                 </Typography>
                                 <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                   {aiService.getSuggestions(user, sites).slice(0, 4).map((example) => (
                     <Chip
                       key={example}
                       label={example}
                       size="small"
                       onClick={() => processExpenseInput(example)}
                       sx={{ cursor: 'pointer' }}
                     />
                   ))}
                 </Box>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                      p: 0,
                      mb: 2
                    }}
                  >
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      maxWidth: '80%'
                    }}>
                      {message.type === 'ai' && (
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <AIIcon fontSize="small" />
                        </Avatar>
                      )}
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          bgcolor: message.type === 'user' ? 'primary.main' : 'grey.100',
                          color: message.type === 'user' ? 'white' : 'text.primary',
                          borderRadius: 2,
                          maxWidth: '100%'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                          {message.text}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                          {message.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Paper>
                      {message.type === 'user' && (
                        <Avatar sx={{ bgcolor: 'grey.500', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                      )}
                    </Box>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          {/* Extracted Data Display */}
          {extractedData && (
            <Card sx={{ m: 2, bgcolor: 'success.light', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Extracted Expense Data
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1 }}>
                  <Typography variant="body2">💰 Amount: ₹{extractedData.amount}</Typography>
                  {extractedData.category && (
                    <Typography variant="body2">📂 Category: {extractedData.category}</Typography>
                  )}
                  <Typography variant="body2">🏢 Site: {extractedData.siteName}</Typography>
                  <Typography variant="body2">📅 Date: {extractedData.date}</Typography>
                  {extractedData.priority && (
                    <Typography variant="body2">⚡ Priority: {extractedData.priority}</Typography>
                  )}
                  {extractedData.paymentMethod && (
                    <Typography variant="body2">💳 Payment Method: {extractedData.paymentMethod}</Typography>
                  )}
                  {extractedData.vendor && (
                    <Typography variant="body2">🏪 Vendor: {extractedData.vendor}</Typography>
                  )}
                  {extractedData.title && extractedData.title !== inputText.substring(0, 50) && (
                    <Typography variant="body2">📝 Title: {extractedData.title}</Typography>
                  )}
                  {extractedData.description && extractedData.description !== inputText && (
                    <Typography variant="body2">📄 Description: {extractedData.description}</Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleConfirmExpense}
                  sx={{ mt: 2, bgcolor: 'white', color: 'success.main' }}
                >
                  Fill Form with This Data
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {/* File Attachments Display */}
            {attachedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  📎 Attached Files ({attachedFiles.length}):
                </Typography>
                <List dense sx={{ p: 0, maxHeight: 120, overflow: 'auto' }}>
                  {attachedFiles.map((file, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        p: 1,
                        mb: 0.5,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{getFileIcon(file.type)}</span>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {file.name}
                            </Typography>
                          </Box>
                        }
                        secondary={formatFileSize(file.size)}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removeFile(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Hidden file input */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              />
              
              <IconButton
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  }
                }}
              >
                <AttachFileIcon />
              </IconButton>

              <TextField
                fullWidth
                placeholder="अपना खर्च टाइप करें या बोलने के लिए माइक पर क्लिक करें..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={isProcessing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3
                  }
                }}
              />
              
              <IconButton
                color={isListening ? 'error' : 'primary'}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || !recognitionRef.current}
                sx={{
                  bgcolor: isListening ? 'error.main' : 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: isListening ? 'error.dark' : 'primary.dark'
                  }
                }}
              >
                {isListening ? <StopIcon /> : <MicIcon />}
              </IconButton>
              
              <IconButton
                color="primary"
                onClick={handleSubmit}
                disabled={!inputText.trim() || isProcessing}
              >
                <SendIcon />
              </IconButton>
              
              <IconButton
                color="secondary"
                onClick={handleReset}
                disabled={isProcessing}
              >
                <RefreshIcon />
              </IconButton>
            </Box>
            
            {isProcessing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Processing your expense...
                </Typography>
              </Box>
            )}
            
            {!recognitionRef.current && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Voice recognition not supported in this browser. You can still type your expenses.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            Try: "₹500 fuel expense for {user?.site?.name || 'your site'}"
          </Typography>
          <Button onClick={() => setShowAssistant(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIExpenseAssistant;
