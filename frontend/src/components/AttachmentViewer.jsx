import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Description as PdfIcon,
  Image as ImageIcon,
  FilePresent as FileIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfViewIcon,
  PhotoCamera as CameraIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { expenseAPI } from '../services/api';

const AttachmentViewer = ({ expenseId, attachments = [], onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [attachmentList, setAttachmentList] = useState(Array.isArray(attachments) ? attachments : []);
  const [loadingActions, setLoadingActions] = useState({});

  // Listen for download messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data === 'download-pdf' && selectedAttachment) {
        handleDownload(selectedAttachment);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedAttachment]);

  // Fetch attachments if not provided
  useEffect(() => {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      if (expenseId) {
        fetchAttachments();
      } else {
        setAttachmentList([]);
      }
    } else {
      setAttachmentList(attachments);
    }
  }, [expenseId, attachments]);

  const fetchAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getAttachments(expenseId);
      if (response.data.success) {
        setAttachmentList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      // Check if this is a local file (from file upload) or server file
      const isLocalFile = attachment.file || attachment.source === 'ai-assistant';
      
      if (isLocalFile) {
        // Handle local files (from file upload or AI assistant)
        if (attachment.file) {
          const url = window.URL.createObjectURL(attachment.file);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.originalName || attachment.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else if (expenseId && attachment._id) {
        // Handle server files
        const response = await expenseAPI.downloadAttachment(expenseId, attachment._id);
        
        // Create blob and download
        const blob = new Blob([response.data], { type: attachment.mimetype });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Cannot download: No file data available');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download file');
    }
  };

  const handlePreview = async (attachment) => {
    console.log('🔍 Preview debug - Attachment:', attachment);
    console.log('🔍 Preview debug - ExpenseId:', expenseId);
    console.log('🔍 Preview debug - Has file:', !!attachment.file);
    console.log('🔍 Preview debug - Source:', attachment.source);
    console.log('🔍 Preview debug - MimeType:', attachment.mimetype);
    
    setSelectedAttachment(attachment);
    setPreviewOpen(true);
    
    // Check if this is a local file (from file upload) or server file
    const isLocalFile = attachment.file || attachment.source === 'ai-assistant';
    
    if (isLocalFile && attachment.file) {
      console.log('🔍 Handling local file');
      // Handle local files (from file upload or AI assistant)
      if (attachment.mimetype && attachment.mimetype.includes('pdf')) {
        console.log('🔍 Local PDF file - using FileReader');
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('🔍 FileReader completed');
          setSelectedAttachment(prev => ({
            ...prev,
            dataUrl: e.target.result
          }));
        };
        reader.readAsDataURL(attachment.file);
      } else {
        console.log('🔍 Local non-PDF file - using object URL');
        // For non-PDF files, create object URL
        const objectUrl = URL.createObjectURL(attachment.file);
        setSelectedAttachment(prev => ({
          ...prev,
          objectUrl: objectUrl
        }));
      }
    } else if (expenseId && attachment._id && attachment.mimetype && attachment.mimetype.includes('pdf')) {
      console.log('🔍 Server PDF file - using API');
      // For server PDFs, try to get the file as blob and create object URL
      try {
        const response = await expenseAPI.downloadAttachment(expenseId, attachment._id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setSelectedAttachment(prev => ({
          ...prev,
          objectUrl: objectUrl
        }));
      } catch (error) {
        console.error('Error loading PDF for preview:', error);
        // Fallback to direct URL
        setSelectedAttachment(prev => ({
          ...prev,
          objectUrl: null,
          previewError: true
        }));
      }
    } else if (expenseId && attachment._id) {
      console.log('🔍 Server non-PDF file - using API');
      // For non-PDF server files, try to get the file as blob
      try {
        const response = await expenseAPI.downloadAttachment(expenseId, attachment._id);
        const blob = new Blob([response.data], { type: attachment.mimetype });
        const objectUrl = URL.createObjectURL(blob);
        setSelectedAttachment(prev => ({
          ...prev,
          objectUrl: objectUrl
        }));
      } catch (error) {
        console.error('Error loading file for preview:', error);
        setSelectedAttachment(prev => ({
          ...prev,
          objectUrl: null,
          previewError: true
        }));
      }
    } else {
      console.log('🔍 No valid preview method found - showing error');
      // No valid preview method found
      setSelectedAttachment(prev => ({
        ...prev,
        objectUrl: null,
        dataUrl: null,
        previewError: true
      }));
    }
  };

  // Alternative method: Open PDF in new window for preview
  const handleOpenPdfInNewWindow = async (attachment) => {
    const actionKey = (attachment._id || attachment.id || 'local') + '_open';
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      // Check if this is a local file (from file upload) or server file
      const isLocalFile = attachment.file || attachment.source === 'ai-assistant';
      
      if (isLocalFile && attachment.file) {
        // Handle local files
        const objectUrl = URL.createObjectURL(attachment.file);
        const newWindow = window.open(objectUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.focus();
          // Clean up the object URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 5000);
        }
      } else if (expenseId && attachment._id) {
        // Get the PDF as blob using authenticated API
        const response = await expenseAPI.downloadAttachment(expenseId, attachment._id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        
        const newWindow = window.open(objectUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.focus();
          // Clean up the object URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 5000);
        }
      } else if (attachment.dataUrl) {
        const newWindow = window.open(attachment.dataUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.focus();
        }
      } else {
        throw new Error('Cannot open file: No file data available');
      }
    } catch (error) {
      console.error('Error opening PDF in new window:', error);
      setError('Failed to open PDF in new window. Please try downloading instead.');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handlePrint = async (attachment) => {
    const actionKey = (attachment._id || attachment.id || 'local') + '_print';
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      // Check if this is a local file (from file upload) or server file
      const isLocalFile = attachment.file || attachment.source === 'ai-assistant';
      
      if (isLocalFile && attachment.file) {
        // Handle local files
        const objectUrl = URL.createObjectURL(attachment.file);
        const printWindow = window.open(objectUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up the object URL after printing
            setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
            }, 5000);
          };
        }
      } else if (expenseId && attachment._id) {
        // Get the PDF as blob using authenticated API
        const response = await expenseAPI.downloadAttachment(expenseId, attachment._id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        
        const printWindow = window.open(objectUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up the object URL after printing
            setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
            }, 5000);
          };
        }
      } else if (attachment.dataUrl) {
        const printWindow = window.open(attachment.dataUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        throw new Error('Cannot print file: No file data available');
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      setError('Failed to print PDF. Please try downloading instead.');
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handlePdfPreviewError = () => {
    setSelectedAttachment(prev => ({
      ...prev,
      objectUrl: null,
      previewError: true
    }));
  };

  const handleClosePreview = () => {
    // Clean up object URL to prevent memory leaks
    if (selectedAttachment && selectedAttachment.objectUrl) {
      URL.revokeObjectURL(selectedAttachment.objectUrl);
    }
    setSelectedAttachment(null);
    setPreviewOpen(false);
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return <FileIcon />;
    if (mimetype.includes('pdf')) return <PdfIcon />;
    if (mimetype.includes('image')) return <ImageIcon />;
    return <FileIcon />;
  };

  const getFileType = (mimetype) => {
    if (!mimetype) return 'Document';
    if (mimetype.includes('pdf')) return 'PDF';
    if (mimetype.includes('image')) return 'Image';
    if (mimetype.includes('document') || mimetype.includes('word')) return 'Document';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'Spreadsheet';
    if (mimetype.includes('text')) return 'Text';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return 'Archive';
    return 'File';
  };

  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop().toUpperCase();
    return ext || 'Unknown';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (attachmentList.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
        <FileIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          No Attachments
        </Typography>
        <Typography variant="body2">
          No files have been uploaded for this expense.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Attachments ({attachmentList.length})
        </Typography>
        <Chip 
          label={`Total: ${formatFileSize(Array.isArray(attachmentList) ? attachmentList.reduce((sum, att) => sum + (att.size || 0), 0) : 0)}`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Attachments Grid */}
      <Grid container spacing={2}>
        {Array.isArray(attachmentList) ? attachmentList.map((attachment, index) => (
          <Grid item xs={12} sm={6} md={4} key={attachment._id || index}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                  '& .attachment-actions': {
                    opacity: 1
                  }
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* File Icon and Type */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: (attachment.mimetype && attachment.mimetype.includes('pdf')) ? '#ff4444' : 
                             (attachment.mimetype && attachment.mimetype.includes('image')) ? '#4caf50' : '#2196f3',
                    color: 'white',
                    mr: 1
                  }}>
                    {getFileIcon(attachment.mimetype)}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {attachment.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFileType(attachment.mimetype)} • {formatFileSize(attachment.size)}
                    </Typography>
                  </Box>
                </Box>

                {/* File Details */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Uploaded: {formatDate(attachment.uploadDate)}
                  </Typography>
                  {attachment.isReceipt && (
                    <Chip 
                      label="Receipt" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>

                {/* Actions */}
                <Box 
                  className="attachment-actions"
                  sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease-in-out'
                  }}
                >
                  <Tooltip title="Preview">
                    <IconButton 
                      size="small" 
                      onClick={() => handlePreview(attachment)}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Download">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDownload(attachment)}
                      sx={{ 
                        bgcolor: 'success.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'success.dark' }
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )) : null}
      </Grid>

            {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={handleClosePreview} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden'
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedAttachment && getFileIcon(selectedAttachment.mimetype)}
            <Typography variant="h6">
              {selectedAttachment?.originalName}
            </Typography>
          </Box>
                     <IconButton onClick={handleClosePreview} sx={{ color: 'white' }}>
             <CloseIcon />
           </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ flexGrow: 1, p: 0 }}>
          {selectedAttachment && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                             {/* File Info */}
               <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.05)' }}>
                 <Grid container spacing={1}>
                   <Grid item xs={6}>
                     <Typography variant="caption" color="text.secondary">Size:</Typography>
                     <Typography variant="body2">{formatFileSize(selectedAttachment.size)}</Typography>
                   </Grid>
                   <Grid item xs={6}>
                     <Typography variant="caption" color="text.secondary">Type:</Typography>
                     <Typography variant="body2">
                       {selectedAttachment.isReceipt ? 'Receipt' : `${getFileType(selectedAttachment.mimetype)} Document`}
                     </Typography>
                   </Grid>
                 </Grid>
               </Box>

              <Divider />

                             {/* File Preview */}
               <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                 {(selectedAttachment.mimetype && selectedAttachment.mimetype.includes('pdf')) ? (
                   <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                     {/* PDF Preview Header */}
                     <Box sx={{ 
                       p: 2, 
                       bgcolor: 'rgba(0,0,0,0.05)', 
                       borderBottom: '1px solid rgba(0,0,0,0.1)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'space-between'
                     }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <PdfViewIcon sx={{ color: '#ff4444' }} />
                         <Typography variant="body1" fontWeight={600}>
                           PDF Preview - {selectedAttachment.originalName}
                         </Typography>
                       </Box>
                                               <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => selectedAttachment && handleOpenPdfInNewWindow(selectedAttachment)}
                            startIcon={loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_open'] ? <CircularProgress size={16} /> : <ViewIcon />}
                            disabled={loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_open']}
                          >
                            {loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_open'] ? 'Opening...' : 'Open in New Window'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => selectedAttachment && handlePrint(selectedAttachment)}
                            startIcon={loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_print'] ? <CircularProgress size={16} /> : <PrintIcon />}
                            disabled={loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_print']}
                          >
                            {loadingActions[(selectedAttachment._id || selectedAttachment.id || 'local') + '_print'] ? 'Preparing...' : 'Print'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => selectedAttachment && handleDownload(selectedAttachment)}
                            startIcon={<DownloadIcon />}
                          >
                            Download
                          </Button>
                        </Box>
                     </Box>
                     
                                                                 {/* PDF iframe with proper styling */}
                      <Box sx={{ flexGrow: 1, position: 'relative' }}>
                        {(selectedAttachment.objectUrl || selectedAttachment.dataUrl) ? (
                          <iframe
                            src={`${selectedAttachment.objectUrl || selectedAttachment.dataUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                            style={{ 
                              border: 'none', 
                              width: '100%', 
                              height: '100%',
                              minHeight: '600px',
                              backgroundColor: '#f5f5f5'
                            }}
                            title={selectedAttachment.originalName}
                            onError={(e) => {
                              console.error('PDF preview failed:', e);
                              handlePdfPreviewError();
                            }}
                          />
                        ) : selectedAttachment.previewError ? (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            p: 3,
                            textAlign: 'center',
                            bgcolor: '#f5f5f5'
                          }}>
                            <PdfViewIcon sx={{ fontSize: 64, mb: 2, color: '#ff4444' }} />
                            <Typography variant="h6" gutterBottom>
                              PDF Preview Not Available
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              The PDF preview could not be loaded. This may be due to browser security restrictions.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => selectedAttachment && handleDownload(selectedAttachment)}
                                startIcon={<DownloadIcon />}
                              >
                                Download PDF
                              </Button>
                              <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => selectedAttachment && handlePrint(selectedAttachment)}
                                startIcon={<PrintIcon />}
                              >
                                Print PDF
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            p: 3,
                            textAlign: 'center',
                            bgcolor: '#f5f5f5'
                          }}>
                            <CircularProgress size={48} sx={{ mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                              Loading PDF Preview...
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Please wait while we prepare the PDF for viewing.
                            </Typography>
                          </Box>
                                                 )}
                       </Box>
                   </Box>
                 ) : (selectedAttachment.mimetype && selectedAttachment.mimetype.includes('image')) ? (
                   <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                     <img
                       src={expenseId ? `http://localhost:5001/api/expenses/${expenseId}/attachments/${selectedAttachment._id}/download` : 
                            selectedAttachment.dataUrl}
                       alt={selectedAttachment.originalName}
                       style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                       onError={(e) => {
                         console.error('Image preview failed:', e);
                         e.target.style.display = 'none';
                         if (e.target.nextSibling) {
                           e.target.nextSibling.style.display = 'flex';
                         }
                       }}
                     />
                     <Box sx={{
                       display: 'none',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyContent: 'center',
                       height: '100%',
                       color: 'text.secondary',
                       p: 3
                     }}>
                       <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                       <Typography variant="h6" gutterBottom>
                         Image Preview Failed
                       </Typography>
                       <Typography variant="body2" textAlign="center" sx={{ mb: 2 }}>
                         Unable to load image preview. Please download to view.
                       </Typography>
                       <Button
                         variant="contained"
                         color="primary"
                         onClick={() => selectedAttachment && handleDownload(selectedAttachment)}
                         startIcon={<DownloadIcon />}
                       >
                         Download Image
                       </Button>
                     </Box>
                   </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <FileIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      Preview Not Available
                    </Typography>
                    <Typography variant="body2" textAlign="center">
                      This file type cannot be previewed. Please download to view.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        
                         <DialogActions sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.05)' }}>
          <Button onClick={handleClosePreview}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttachmentViewer; 