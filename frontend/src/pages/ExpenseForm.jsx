import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, FormControl, Select, MenuItem, Button, Fade, Zoom, Avatar, Card, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, Snackbar, Tabs, Tab } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, siteAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AttachmentViewer from '../components/AttachmentViewer';
import AIExpenseAssistant from '../components/AIExpenseAssistant';

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  
  // All hooks must be called before any conditional logic
  const [attachments, setAttachments] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [geo, setGeo] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [sites, setSites] = useState([]);
  const [viewAttachments, setViewAttachments] = useState(false);
  const [currentExpenseId, setCurrentExpenseId] = useState(null);
  const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
  const [fileUploadMessage, setFileUploadMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('error');
  const [showAlert, setShowAlert] = useState(false);
  
  // Helper function to show alerts
  const showAlertMessage = (message, severity = 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setShowAlert(true);
  };

  // Generate expense number helper function
  const generateExpenseNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
    const day = now.getDate().toString().padStart(2, '0'); // Day with leading zero
    const hours = now.getHours().toString().padStart(2, '0'); // Hours with leading zero
    const minutes = now.getMinutes().toString().padStart(2, '0'); // Minutes with leading zero
    
    // Generate sequential number based on current time
    const sequentialNumber = parseInt(hours + minutes);
    return `EXP-${sequentialNumber.toString().padStart(4, '0')}`; // Pad with zeros to make it 4 digits
  };
  
  // formData state - moved here to follow Rules of Hooks
  const [formData, setFormData] = useState({
    expenseNumber: generateExpenseNumber(),
    title: '',
    description: '',
    amount: '',
    currency: 'INR',
    category: 'Vehicle KM', // Default to Vehicle KM since this is a vehicle KM form
    subcategory: '',
    expenseDate: '',
    department: '',
    vehicleKm: {
      startKm: '',
      endKm: '',
      totalKm: '',
      vehicleNumber: '',
      purpose: '',
      route: {
        from: '',
        to: '',
        via: []
      },
      ratePerKm: 10
    },
    travel: {
      from: '',
      to: '',
      travelDate: '',
      returnDate: '',
      mode: '',
      bookingReference: '',
      passengerName: ''
    },
    accommodation: {
      hotelName: '',
      checkIn: '',
      checkOut: '',
      location: '',
      roomType: '',
      guestName: '',
      bookingReference: ''
    },
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountHolderName: ''
    }
  });

  // ALL useEffect hooks must be here before conditional logic
  // Fetch next expense number from backend
  useEffect(() => {
    // Try to capture location early (user allows once per session)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
    const fetchNextExpenseNumber = async () => {
      try {
        const response = await expenseAPI.getNextExpenseNumber();
        if (response.data.success) {
          setFormData(prev => ({
            ...prev,
            expenseNumber: response.data.data.expenseNumber
          }));
        }
      } catch (error) {
        console.error('Error fetching next expense number:', error);
        // Fallback to local generation if API fails
        setFormData(prev => ({
          ...prev,
          expenseNumber: generateExpenseNumber()
        }));
      }
    };

    fetchNextExpenseNumber();
  }, []);

  // Fetch sites based on user role
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await siteAPI.getAll();
        let availableSites = res.data.data || [];
        
        // Filter sites based on user role
        if (user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') {
          // Submitters, L1, and L2 approvers can only see their assigned site
          if (user?.site) {
            const userSite = user.site;
            
            // Handle both cases: userSite can be string, ObjectId, or populated site object
            let userSiteId;
            if (typeof userSite === 'string') {
              userSiteId = userSite;
            } else if (userSite && userSite._id) {
              userSiteId = userSite._id.toString();
            } else if (userSite && userSite.id) {
              userSiteId = userSite.id.toString();
            } else {
              userSiteId = null;
            }
            
            console.log('🔍 Filtering sites for user:', {
              userSiteId,
              userSiteType: typeof userSite,
              totalSites: availableSites.length
            });
            
            if (userSiteId) {
              availableSites = availableSites.filter(site => site._id.toString() === userSiteId.toString());
              console.log('✅ Filtered sites count:', availableSites.length);
            } else {
              availableSites = [];
            }
          } else {
            // If user has no site assigned, show no sites
            availableSites = [];
          }
        }
        // L3 approvers and finance can see all sites
        
        setSites(availableSites);
        
        // Auto-select user's site for submitters and L1/L2 approvers
        if ((user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') && user?.site) {
          const userSite = user.site;
          
          // Handle both cases: userSite can be string, ObjectId, or populated site object
          let userSiteId;
          if (typeof userSite === 'string') {
            userSiteId = userSite;
          } else if (userSite && userSite._id) {
            userSiteId = userSite._id.toString();
          } else if (userSite && userSite.id) {
            userSiteId = userSite.id.toString();
          } else {
            userSiteId = null;
          }
          
          console.log('🔍 Frontend site selection debug:', {
            userSiteId,
            userSiteType: typeof userSite,
            availableSites: availableSites.map(site => ({ id: site._id, name: site.name }))
          });
          
          if (userSiteId) {
            const matchingSite = availableSites.find(site => site._id.toString() === userSiteId.toString());
            if (matchingSite) {
              console.log('✅ Found matching site:', matchingSite.name);
            setFormData(prev => ({
              ...prev,
                siteId: matchingSite._id
            }));
            } else {
              console.log('❌ No matching site found for userSiteId:', userSiteId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching sites:', error);
        setSites([]);
      }
    };
    
    fetchSites();
  }, [user]);

  // Handle video stream when camera opens
  useEffect(() => {
    if (cameraOpen && stream && videoRef.current) {
      console.log('🎥 Setting video stream...');
      console.log('📹 Stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      })));
      
      videoRef.current.srcObject = stream;
      
      // Add event listeners for video
      const video = videoRef.current;
      
      const handleVideoLoad = () => {
        console.log('✅ Video loaded and ready');
        console.log('📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      const handleVideoError = (error) => {
        console.error('❌ Video error:', error);
      };
      
      const handleCanPlay = () => {
        console.log('✅ Video can play, ready for capture');
        console.log('📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      video.addEventListener('loadeddata', handleVideoLoad);
      video.addEventListener('error', handleVideoError);
      video.addEventListener('canplay', handleCanPlay);
      
      return () => {
        video.removeEventListener('loadeddata', handleVideoLoad);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [cameraOpen, stream]);

  // Auto-fill bank details from user profile if available
  useEffect(() => {
    if (user && user.bankDetails) {
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          accountNumber: user.bankDetails.accountNumber || '',
          ifscCode: user.bankDetails.ifscCode || '',
          bankName: user.bankDetails.bankName || '',
          accountHolderName: user.bankDetails.accountHolderName || ''
        }
      }));
    }
  }, [user]);

  // Cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Block L4 Approver from accessing this page - moved after all hooks
  if (user && ['l4_approver', 'L4_APPROVER'].includes(user?.role)) {
    navigate('/dashboard');
    return null;
  }

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  // Handle AI Assistant data extraction
  const handleAIExpenseDataExtracted = (extractedData) => {
    console.log('🎯 AI Assistant extracted data:', extractedData);
    
    setFormData(prev => ({
      ...prev,
      title: extractedData.title || prev.title,
      amount: extractedData.amount ? extractedData.amount.toString() : prev.amount,
      category: extractedData.category || prev.category,
      siteId: extractedData.siteId || prev.siteId,
      expenseDate: extractedData.date || prev.expenseDate,
      priority: extractedData.priority || prev.priority,
      paymentMethod: extractedData.paymentMethod || prev.paymentMethod,
      vendor: extractedData.vendor || prev.vendor,
      description: extractedData.description || prev.description
    }));
    
    // Handle attached files from AI Assistant
    if (extractedData.attachedFiles && extractedData.attachedFiles.length > 0) {
      console.log('📎 AI Assistant attached files:', extractedData.attachedFiles);
      const newAttachments = extractedData.attachedFiles.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        mimetype: file.type,
        originalName: file.name,
        source: 'ai-assistant',
        file: file
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    
    // Show success message
    const fileMessage = extractedData.attachedFiles && extractedData.attachedFiles.length > 0 
      ? ` with ${extractedData.attachedFiles.length} file(s)` 
      : '';
    setSuccess(`AI Assistant has filled your expense form${fileMessage}! Please review and submit.`);
    setOpenSnackbar(true);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      mimetype: file.type, // Add mimetype for AttachmentViewer
      originalName: file.name, // Add originalName for AttachmentViewer
      source: 'file',
      file: file // Add the actual file object
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleRemoveFile = (fileId) => {
    setAttachments(attachments.filter(file => file.id !== fileId));
  };

  const handleViewAttachments = () => {
    setViewAttachments(true);
  };

  const openCamera = async () => {
    try {
      console.log('🔍 Opening camera...');
      setCameraLoading(true);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      console.log('✅ Camera stream obtained:', mediaStream);
      console.log('📹 Stream tracks:', mediaStream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      })));
      setStream(mediaStream);
      setCameraOpen(true);
      
      // Force a small delay to ensure video element is ready
      setTimeout(() => {
        if (videoRef.current) {
          console.log('🎥 Video element ready, setting stream...');
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      
      let errorMessage = 'Camera access is required to take photos. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera API not supported in this browser.';
      } else {
        errorMessage += 'Please check your camera permissions and try again.';
      }
      
      // Show error and suggest file upload as alternative
      setFileUploadMessage(errorMessage + '\n\nWould you like to upload a photo file instead?');
      setShowFileUploadDialog(true);
    } finally {
      setCameraLoading(false);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    console.log('📸 Capturing photo...');
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas ref not available');
      showAlertMessage('Camera not ready. Please try again.');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.error('❌ Video not ready for capture');
      showAlertMessage('Camera not ready. Please wait a moment and try again.');
      return;
    }
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Video has no dimensions');
      showAlertMessage('Camera not ready. Please wait a moment and try again.');
      return;
    }
    
    try {
      const context = canvas.getContext('2d');

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      console.log('📐 Canvas size set to:', canvas.width, 'x', canvas.height);

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ Photo captured successfully, blob size:', blob.size);
          const fileName = `expense_photo_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          const newAttachment = {
            id: Date.now() + Math.random(),
            name: fileName,
            size: file.size,
            type: 'image/jpeg',
            mimetype: 'image/jpeg',
            originalName: fileName,
            source: 'camera',
            file: file
          };
          
          console.log('📎 Adding attachment:', newAttachment);
          setAttachments([...attachments, newAttachment]);
          closeCamera();
        } else {
          console.error('❌ Failed to create blob from canvas');
          showAlertMessage('Failed to capture photo. Please try again.');
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      showAlertMessage('Error capturing photo. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Validate required fields
    if (!formData.title || !formData.amount || !formData.category) {
      setError('Please fill in all required fields: Title, Amount, and Category');
      setLoading(false);
      return;
    }

    // Validate site selection for restricted roles
    if ((user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') && !formData.siteId) {
      setError('You must have an assigned site to submit expenses');
      setLoading(false);
      return;
    }

    // Additional validation for site access
    if (user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') {
      const userSite = user?.site;
      
      // Handle both cases: userSite can be string, ObjectId, or populated site object
      let userSiteId;
      if (typeof userSite === 'string') {
        userSiteId = userSite;
      } else if (userSite && userSite._id) {
        userSiteId = userSite._id.toString();
      } else if (userSite && userSite.id) {
        userSiteId = userSite.id.toString();
      } else {
        setError('No site assigned to user');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Frontend site validation debug:', {
        formDataSiteId: formData.siteId,
        userSiteId: userSiteId,
        formDataSiteIdType: typeof formData.siteId,
        userSiteIdType: typeof userSiteId,
        userSite: userSite
      });
      
      if (formData.siteId && formData.siteId.toString() !== userSiteId.toString()) {
        setError('You can only submit expenses for your assigned site');
        setLoading(false);
        return;
      }
    }
    
    try {
      // First upload attachments if any
      const uploadedFiles = [];
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          if (!attachment.file) continue;
          
          try {
            const uploadResult = await expenseAPI.upload(attachment.file);
            if (uploadResult.data.success) {
              uploadedFiles.push({
                filename: uploadResult.data.data.filename,
                originalName: uploadResult.data.data.originalName,
                path: uploadResult.data.data.path,
                size: uploadResult.data.data.size,
                mimetype: uploadResult.data.data.mimetype,
                isReceipt: attachment.isReceipt || false
              });
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload attachments');
          }
        }
      }

      // Prepare expense data using current user info
      const expenseData = {
        expenseNumber: formData.expenseNumber, // Use the sequential number from backend
        title: formData.title,
        description: formData.description || `Vehicle KM expense for ${formData.vehicleKm?.vehicleNumber || 'N/A'}`,
        amount: parseFloat(formData.amount || 0),
        currency: 'INR',
        category: formData.category || 'Vehicle KM', // Default to Vehicle KM if not selected
        expenseDate: new Date().toISOString(),
        submittedById: user?._id || 'current-user-id', // Use current logged in user
        siteId: formData.siteId || (() => {
          const userSite = user?.site;
          if (typeof userSite === 'string') {
            return userSite;
          } else if (userSite && userSite._id) {
            return userSite._id.toString();
          } else if (userSite && userSite.id) {
            return userSite.id.toString();
          }
          return undefined;
        })(), // Use selected site or user's site as fallback
        department: user?.department || formData.department || "Operations",
        vehicleKm: {
          startKm: 0,
          endKm: parseFloat(formData.vehicleKm?.totalKm || 0),
          totalKm: parseFloat(formData.vehicleKm?.totalKm || 0),
          vehicleNumber: formData.vehicleKm?.vehicleNumber || 'Unknown',
          purpose: formData.vehicleKm?.purpose || 'Business Travel',
          route: {
            from: formData.vehicleKm?.route?.from || 'Start',
            to: formData.vehicleKm?.route?.to || 'End',
            via: []
          },
          ratePerKm: 10
        },
        bankDetails: formData.bankDetails,
        attachments: uploadedFiles,
        location: geo || undefined
      };

      // Log the final payload for debugging
      console.log('User object:', user);
      console.log('User site:', user?.site);
      console.log('Site ID:', user?.site?._id || user?.site?.id);
      console.log('Expense Data Payload:', expenseData);

      // Submit expense using the API service
      const response = await expenseAPI.create(expenseData);
      
      if (response.data.success) {
        setSuccess('Expense submitted successfully!');
        setOpenSnackbar(true);
        
        // Show success message for 2 seconds before redirecting
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to submit expense');
      }

    } catch (error) {
      console.error('Submit error:', error);
      setError(error.message || 'Failed to submit expense');
      setOpenSnackbar(false);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Travel',
    'Food',
    'Accommodation',
    'Vehicle KM',
    'Fuel',
    'Equipment',
    'Maintenance',
    'Office Supplies',
    'Miscellaneous'
  ];



  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Bank Transfer',
    'Cheque',
    'Digital Payment'
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        animation: 'float 20s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }} />
      
      <Fade in timeout={1000}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <img 
                src="/rakshak-logo.png" 
                alt="Rakshak Securitas Logo" 
                style={{ height: '40px' }}
              />
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <ReceiptIcon />
              </Avatar>
            </Box>
            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Submit Expense Report
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* Main Form */}
            <Grid item xs={12} md={8}>
              <Zoom in style={{ transitionDelay: '200ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      {/* Add Expense Number field at the top */}
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          required
                          label="Expense Number"
                          value={formData.expenseNumber}
                          onChange={handleInputChange('expenseNumber')}
                          placeholder="Enter expense number"
                          helperText="Auto-generated unique expense number"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: darkMode ? '#e0e0e0' : '#333333',
                            },
                            '& .MuiFormHelperText-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                            },
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          required
                          label="Expense Title"
                          value={formData.title}
                          onChange={handleInputChange('title')}
                          placeholder="Enter expense title"
                          helperText="Enter a descriptive title for this expense"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: darkMode ? '#e0e0e0' : '#333333',
                            },
                            '& .MuiFormHelperText-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                            },
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <Select
                            value={formData.siteId || ''}
                            onChange={handleInputChange('siteId')}
                            required
                            displayEmpty
                            disabled={user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver'}
                            renderValue={(selected) => {
                              if (!selected) {
                                return <em style={{ color: darkMode ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)' }}>
                                  {user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver' 
                                    ? 'Your Assigned Site' 
                                    : 'Site'}
                                </em>;
                              }
                              const selectedSite = sites.find(site => site._id.toString() === selected.toString());
                              return selectedSite ? selectedSite.name : selected;
                            }}
                            sx={{
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '& .MuiSelect-icon': {
                                color: darkMode ? '#b0b0b0' : '#666666',
                              },
                              '&.Mui-disabled': {
                                backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
                                color: darkMode ? '#888888' : '#666666',
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                                  '& .MuiMenuItem-root': {
                                    color: darkMode ? '#e0e0e0' : '#333333',
                                    '&:hover': {
                                      bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                    },
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              <em>
                                {user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver' 
                                  ? 'Your Assigned Site' 
                                  : 'Site'}
                              </em>
                            </MenuItem>
                            {sites.map(site => (
                              <MenuItem key={site._id} value={site._id}>{site.name}</MenuItem>
                            ))}
                          </Select>
                          {(user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') && (
                            <Typography variant="caption" sx={{ 
                              color: darkMode ? '#888888' : '#666666', 
                              mt: 0.5, 
                              display: 'block',
                              fontStyle: 'italic'
                            }}>
                              {user?.site 
                                ? 'You can only submit expenses for your assigned site'
                                : 'You need to be assigned to a site to submit expenses. Please contact your administrator.'
                              }
                            </Typography>
                          )}
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <Select
                            value={formData.category || ''}
                            onChange={handleInputChange('category')}
                            required
                            displayEmpty
                            renderValue={(selected) => {
                              if (!selected) {
                                return <em style={{ color: darkMode ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)' }}>Category</em>;
                              }
                              return selected;
                            }}
                            sx={{
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '& .MuiSelect-icon': {
                                color: darkMode ? '#b0b0b0' : '#666666',
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                                  '& .MuiMenuItem-root': {
                                    color: darkMode ? '#e0e0e0' : '#333333',
                                    '&:hover': {
                                      bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                    },
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              <em>Category</em>
                            </MenuItem>
                            {categories.map((category) => (
                              <MenuItem key={category} value={category}>{category}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Amount (₹)"
                          type="number"
                          value={formData.amount}
                          onChange={handleInputChange('amount')}
                          required
                          InputProps={{
                            startAdornment: <Typography variant="body2" color={darkMode ? '#b0b0b0' : 'text.secondary'} sx={{ mr: 1 }}>₹</Typography>
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& fieldset': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? '#b0b0b0' : '#666666',
                              '&.Mui-focused': {
                                color: darkMode ? '#4fc3f7' : '#667eea',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: darkMode ? '#e0e0e0' : '#333333',
                            },
                          }}
                        />
                      </Grid>

                      {/* Vehicle KM Fields - Show only when category is Vehicle KM */}
                      {formData.category === 'Vehicle KM' && (
                        <>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Vehicle KM"
                              type="number"
                              value={formData.vehicleKm}
                              onChange={handleInputChange('vehicleKm')}
                              required
                              InputProps={{
                                endAdornment: <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>KM</Typography>
                              }}
                              helperText="Enter the total kilometers driven"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Allowed KM Limit"
                              type="number"
                              value="1000"
                              InputProps={{
                                readOnly: true,
                                endAdornment: <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>KM</Typography>
                              }}
                              helperText="Site's monthly KM limit"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: 'rgba(0, 128, 0, 0.1)',
                                  '& fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          </Grid>
                          {parseFloat(formData.vehicleKm) > 1000 && (
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Reason for Extra KM"
                                multiline
                                rows={2}
                                value={formData.extraKmReason}
                                onChange={handleInputChange('extraKmReason')}
                                required
                                placeholder="Please provide a detailed reason for exceeding the KM limit..."
                                helperText="Required when KM exceeds the site limit"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#ff9800' },
                                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                                  }
                                }}
                              />
                            </Grid>
                          )}
                        </>
                      )}
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Date"
                          type="date"
                           value={formData.expenseDate}
                           onChange={handleInputChange('expenseDate')}
                          required
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Vendor/Supplier"
                          value={formData.vendor}
                          onChange={handleInputChange('vendor')}
                           placeholder="Enter vendor/supplier name"
                           helperText="Enter the vendor or supplier name"
                           InputLabelProps={{
                             shrink: true,
                             style: {
                               color: darkMode ? '#b0b0b0' : '#666666',
                               fontSize: '0.875rem',
                               fontWeight: 500
                             }
                           }}
                           sx={{
                             '& .MuiOutlinedInput-root': {
                               backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                               color: darkMode ? '#e0e0e0' : '#333333',
                               borderRadius: 2,
                               paddingTop: '8px',
                               paddingBottom: '8px',
                               '& fieldset': {
                                 borderColor: darkMode ? '#333333' : '#e0e0e0',
                               },
                               '&:hover fieldset': {
                                 borderColor: darkMode ? '#4fc3f7' : '#667eea',
                               },
                               '&.Mui-focused fieldset': {
                                 borderColor: darkMode ? '#4fc3f7' : '#667eea',
                               },
                               '&.Mui-focused .MuiInputLabel-root': {
                                 color: darkMode ? '#4fc3f7' : '#667eea',
                               },
                             },
                             '& .MuiInputLabel-root': {
                               color: darkMode ? '#b0b0b0' : '#666666',
                               transform: 'translate(14px, 8px) scale(1)',
                               '&.Mui-focused': {
                                 color: darkMode ? '#4fc3f7' : '#667eea',
                                 transform: 'translate(14px, -9px) scale(0.75)',
                               },
                               '&.MuiInputLabel-shrink': {
                                 transform: 'translate(14px, -9px) scale(0.75)',
                               },
                             },
                             '& .MuiInputBase-input': {
                               color: darkMode ? '#e0e0e0' : '#333333',
                               padding: '12px 14px',
                               fontSize: '0.875rem',
                             },
                             '& .MuiFormHelperText-root': {
                               color: darkMode ? '#b0b0b0' : '#666666',
                               marginLeft: '14px',
                               marginRight: '14px',
                             },
                           }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <Select
                            value={formData.paymentMethod || ''}
                            onChange={handleInputChange('paymentMethod')}
                            required
                            displayEmpty
                            renderValue={(selected) => {
                              if (!selected) {
                                return <em style={{ color: darkMode ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)' }}>Payment Method</em>;
                              }
                              return selected;
                            }}
                            sx={{
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '& .MuiSelect-icon': {
                                color: darkMode ? '#b0b0b0' : '#666666',
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                                  '& .MuiMenuItem-root': {
                                    color: darkMode ? '#e0e0e0' : '#333333',
                                    '&:hover': {
                                      bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                    },
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              <em>Payment Method</em>
                            </MenuItem>
                            {paymentMethods.map((method) => (
                              <MenuItem key={method} value={method}>{method}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <Select
                            value={formData.priority || ''}
                            onChange={handleInputChange('priority')}
                            displayEmpty
                            renderValue={(selected) => {
                              if (!selected) {
                                return <em style={{ color: darkMode ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)' }}>Priority</em>;
                              }
                              return selected;
                            }}
                            sx={{
                              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                              color: darkMode ? '#e0e0e0' : '#333333',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#333333' : '#e0e0e0',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: darkMode ? '#4fc3f7' : '#667eea',
                              },
                              '& .MuiSelect-icon': {
                                color: darkMode ? '#b0b0b0' : '#666666',
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: darkMode ? '#2a2a2a' : '#ffffff',
                                  '& .MuiMenuItem-root': {
                                    color: darkMode ? '#e0e0e0' : '#333333',
                                    '&:hover': {
                                      bgcolor: darkMode ? '#333333' : '#f5f5f5',
                                    },
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              <em>Priority</em>
                            </MenuItem>
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="normal">Normal</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Description"
                          multiline
                          rows={4}
                          value={formData.description}
                          onChange={handleInputChange('description')}
                          required
                          placeholder="Provide detailed description of the expense..."
                        />
                      </Grid>
                      
                      {/* Bank Details Section */}
                      <Grid item xs={12}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Bank Details
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Account Number"
                          name="accountNumber"
                          value={formData.bankDetails.accountNumber}
                          onChange={e => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="IFSC Code"
                          name="ifscCode"
                          value={formData.bankDetails.ifscCode}
                          onChange={e => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifscCode: e.target.value } }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Bank Name"
                          name="bankName"
                          value={formData.bankDetails.bankName}
                          onChange={e => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }))}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Account Holder Name"
                          name="accountHolderName"
                          value={formData.bankDetails.accountHolderName}
                          onChange={e => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountHolderName: e.target.value } }))}
                          required
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            startIcon={<SaveIcon />}
                            sx={{ px: 4 }}
                          >
                            Save Draft
                          </Button>
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={<SendIcon />}
                            sx={{ 
                              px: 4,
                              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                              '&:hover': { background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)' }
                            }}
                            disabled={loading || ((user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') && !user?.site)}
                          >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 
                              ((user?.role === 'submitter' || user?.role === 'l1_approver' || user?.role === 'l2_approver') && !user?.site) 
                                ? 'No Site Assigned' 
                                : 'Submit for Approval'
                            }
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </form>
                </Paper>
              </Zoom>
            </Grid>

            {/* File Upload & Preview */}
            <Grid item xs={12} md={4}>
              <Zoom in style={{ transitionDelay: '400ms' }}>
                <Paper elevation={16} sx={{ 
                  p: 4, 
                  borderRadius: 3, 
                  background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: darkMode ? '1px solid rgba(51,51,51,0.3)' : '1px solid rgba(255,255,255,0.2)',
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                      <CloudUploadIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color="#667eea">
                      Attachments
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFileIcon />}
                        sx={{ flex: 1 }}
                      >
                        Upload Files
                        <input
                          type="file"
                          multiple
                          hidden
                          onChange={handleFileUpload}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={cameraLoading ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
                        onClick={openCamera}
                        disabled={cameraLoading}
                        sx={{ 
                          flex: 1,
                          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                          '&:hover': { background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)' }
                        }}
                      >
                        {cameraLoading ? 'Opening Camera...' : 'Take Photo'}
                      </Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                      Upload files or take photos of receipts, invoices, and documents
                    </Typography>
                  </Box>
                  
                  {attachments.length > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                          Uploaded Files ({attachments.length})
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleViewAttachments}
                          sx={{ 
                            color: '#667eea', 
                            borderColor: '#667eea',
                            '&:hover': { 
                              borderColor: '#5a6fd8',
                              backgroundColor: 'rgba(102, 126, 234, 0.04)'
                            }
                          }}
                        >
                          View All
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {attachments.map((file) => (
                          <Card key={file.id} sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {file.source === 'camera' ? (
                                <PhotoCameraIcon sx={{ color: '#667eea' }} />
                              ) : (
                                <AttachFileIcon sx={{ color: '#667eea' }} />
                              )}
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {file.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: darkMode ? '#b0b0b0' : '#666666' }}>
                                  {file.source === 'camera' ? 'Camera Photo' : 'Uploaded File'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                onClick={() => handleRemoveFile(file.id)}
                                sx={{ color: '#f44336', minWidth: 'auto' }}
                              >
                                <DeleteIcon />
                              </Button>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Camera Dialog */}
      <Dialog 
        open={cameraOpen} 
        onClose={closeCamera} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
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
          <CameraAltIcon />
          Take Photo
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ position: 'relative', width: '100%', height: 400 }}>
            {/* Camera Status Indicator */}
            {cameraOpen && (
              <Box sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 2,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {stream ? '📹 Camera Active' : '⏳ Initializing...'}
              </Box>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onLoadedMetadata={() => console.log('🎥 Video metadata loaded')}
              onCanPlay={() => console.log('🎥 Video can play')}
              onError={(e) => console.error('❌ Video error:', e)}
            />
            {/* Fallback message if video doesn't show */}
            {cameraOpen && !stream && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <Typography variant="h6">Camera Initializing...</Typography>
                <Typography variant="body2">Please wait while we set up your camera</Typography>
              </Box>
            )}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            {/* Loading overlay */}
            {cameraLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1
              }}>
                <Box sx={{ textAlign: 'center', color: 'white' }}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6">Opening Camera...</Typography>
                </Box>
              </Box>
            )}
            {/* Camera Controls Overlay */}
            <Box sx={{
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 2
            }}>
              <Button
                variant="contained"
                color="error"
                onClick={closeCamera}
                sx={{ 
                  borderRadius: '50%',
                  width: 60,
                  height: 60,
                  minWidth: 'auto'
                }}
              >
                ✕
              </Button>
              <Button
                variant="contained"
                onClick={capturePhoto}
                sx={{ 
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  minWidth: 'auto',
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  '&:hover': { background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)' }
                }}
              >
                <PhotoCameraIcon sx={{ fontSize: 32 }} />
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={closeCamera}
                sx={{ 
                  borderRadius: '50%',
                  width: 60,
                  height: 60,
                  minWidth: 'auto'
                }}
              >
                ✓
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Position your receipt or document in the camera view and click the camera button to capture
          </Typography>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          elevation={6} 
          variant="filled" 
          severity="success"
          sx={{ 
            width: '100%',
            fontSize: '1.1rem',
            '& .MuiAlert-icon': {
              fontSize: '2rem'
            }
          }}
        >
          ✅ Expense Report Submitted Successfully!
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Redirecting to dashboard...
          </Typography>
        </Alert>
      </Snackbar>

      {/* Attachment Viewer Dialog */}
      <Dialog
        open={viewAttachments}
        onClose={() => setViewAttachments(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <Typography variant="h6">
            Uploaded Attachments
          </Typography>
          <Button onClick={() => setViewAttachments(false)} sx={{ color: 'white' }}>
            ✕
          </Button>
        </DialogTitle>
                 <DialogContent sx={{ flexGrow: 1, p: 0 }}>
           <AttachmentViewer 
             attachments={attachments}
             onClose={() => setViewAttachments(false)}
             expenseId={null} // No expenseId for preview before submission
           />
         </DialogContent>
      </Dialog>

      {/* File Upload Confirmation Dialog */}
      <Dialog
        open={showFileUploadDialog}
        onClose={() => setShowFileUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          Camera Access Issue
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {fileUploadMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowFileUploadDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setShowFileUploadDialog(false);
              // Trigger file upload
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'image/*';
              fileInput.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e);
                }
              };
              fileInput.click();
            }}
            variant="contained"
            color="primary"
          >
            Upload Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={showAlert}
        autoHideDuration={4000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          elevation={6} 
          variant="filled" 
          severity={alertSeverity}
          sx={{ 
            width: '100%',
            fontSize: '1.1rem',
            '& .MuiAlert-icon': {
              fontSize: '2rem'
            }
          }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>

      {/* Show error alert if there's an error */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            position: 'fixed', 
            top: 16, 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: '300px'
          }}
        >
          {error}
        </Alert>
      )}

       {/* AI Expense Assistant */}
       <AIExpenseAssistant
         onExpenseDataExtracted={handleAIExpenseDataExtracted}
         user={user}
         sites={sites}
       />
    </Box>
  );
};

export default ExpenseForm; 