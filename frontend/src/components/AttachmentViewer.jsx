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

/** Mongo subdocs use _id; some API shapes expose id only — normalize for download URLs */
const getAttachmentServerId = (attachment) => {
  if (!attachment) return null;
  const raw = attachment._id ?? attachment.id;
  if (raw == null) return null;
  return typeof raw === 'string' ? raw : String(raw);
};

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
      } else if (expenseId && getAttachmentServerId(attachment)) {
        // Handle server files
        const response = await expenseAPI.downloadAttachment(expenseId, getAttachmentServerId(attachment));
        
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
    setSelectedAttachment(attachment);
    setPreviewOpen(true);

    const isLocalFile = attachment.file || attachment.source === 'ai-assistant';

    if (isLocalFile && attachment.file) {
      if (attachment.mimetype && attachment.mimetype.includes('pdf')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedAttachment(prev => ({ ...prev, dataUrl: e.target.result }));
        };
        reader.readAsDataURL(attachment.file);
      } else {
        const objectUrl = URL.createObjectURL(attachment.file);
        setSelectedAttachment(prev => ({ ...prev, objectUrl }));
      }
      return;
    }

    if (!expenseId || !getAttachmentServerId(attachment)) {
      setSelectedAttachment(prev => ({ ...prev, objectUrl: null, dataUrl: null, previewError: true }));
      return;
    }

    try {
      const response = await expenseAPI.downloadAttachment(expenseId, getAttachmentServerId(attachment));
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Download failed');
      }
      const blob = new Blob([response.data], { type: attachment.mimetype || 'application/octet-stream' });
      // If server returned JSON error with 200 (misconfigured proxy), avoid feeding it to the PDF viewer
      if (attachment.mimetype?.includes('pdf') && blob.size > 0 && blob.size < 4096) {
        const peek = await blob.slice(0, 1).text();
        if (peek === '{' || peek === '<') {
          const full = await blob.text();
          if (full.trimStart().startsWith('{')) {
            try {
              const errJson = JSON.parse(full);
              throw new Error(errJson.message || 'File not available');
            } catch (e) {
              if (e.message && e.message !== full) throw e;
              throw new Error('File not available');
            }
          }
        }
      }
      const objectUrl = URL.createObjectURL(blob);
      setSelectedAttachment(prev => ({ ...prev, objectUrl }));
    } catch (error) {
      console.error('Error loading file for preview:', error);
      let fileNotFound = error?.response?.status === 404;
      let previewErrorMessage = fileNotFound
        ? 'File not found on server. It may have been removed or moved.'
        : error?.message;
      if (fileNotFound && error?.response?.data instanceof Blob) {
        try {
          const t = await error.response.data.text();
          const j = JSON.parse(t);
          if (j?.message) previewErrorMessage = j.message;
        } catch (_) {
          /* keep default */
        }
      }
      setSelectedAttachment(prev => ({
        ...prev,
        objectUrl: null,
        dataUrl: null,
        previewError: true,
        fileNotFound,
        previewErrorMessage
      }));
    }
  };

  // Alternative method: Open PDF in new window for preview
  const handleOpenPdfInNewWindow = async (attachment) => {
    const actionKey = (getAttachmentServerId(attachment) || 'local') + '_open';
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
      } else if (expenseId && getAttachmentServerId(attachment)) {
        const response = await expenseAPI.downloadAttachment(expenseId, getAttachmentServerId(attachment));
        const blob = new Blob([response.data], { type: attachment.mimetype || 'application/octet-stream' });
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
    const actionKey = (getAttachmentServerId(attachment) || 'local') + '_print';
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
      } else if (expenseId && getAttachmentServerId(attachment)) {
        const response = await expenseAPI.downloadAttachment(expenseId, getAttachmentServerId(attachment));
        const blob = new Blob([response.data], { type: attachment.mimetype || 'application/octet-stream' });
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
    if (mimetype.includes('document') || mimetype.includes('word')) return 'Word';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'Excel';
    if (mimetype.includes('text') || mimetype.includes('csv')) return 'Text';
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
          <Grid item xs={12} sm={6} md={4} key={getAttachmentServerId(attachment) || index}>
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
                      {attachment.originalName || attachment.name || `File ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFileType(attachment.mimetype)} • {formatFileSize(attachment.size)}
                    </Typography>
                  </Box>
                </Box>

                {/* File Details */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Uploaded: {attachment.uploadDate ? formatDate(attachment.uploadDate) : 'N/A'}
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
                                               {!selectedAttachment.fileNotFound && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => selectedAttachment && handleOpenPdfInNewWindow(selectedAttachment)}
                              startIcon={loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_open'] ? <CircularProgress size={16} /> : <ViewIcon />}
                              disabled={loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_open']}
                            >
                              {loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_open'] ? 'Opening...' : 'Open in New Window'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => selectedAttachment && handlePrint(selectedAttachment)}
                              startIcon={loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_print'] ? <CircularProgress size={16} /> : <PrintIcon />}
                              disabled={loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_print']}
                            >
                              {loadingActions[(getAttachmentServerId(selectedAttachment) || 'local') + '_print'] ? 'Preparing...' : 'Print'}
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
                        )}
                     </Box>
                     
                                                                 {/* PDF Preview - object + embed + iframe for max browser compatibility */}
                      <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 500 }}>
                        {(selectedAttachment.objectUrl || selectedAttachment.dataUrl) ? (
                          <Box sx={{ width: '100%', height: '100%', minHeight: '60vh' }}>
                            <object
                              data={`${selectedAttachment.objectUrl || selectedAttachment.dataUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                              type="application/pdf"
                              style={{ 
                                border: 'none', 
                                width: '100%', 
                                height: '100%',
                                minHeight: '60vh',
                                backgroundColor: '#525659'
                              }}
                              onError={() => handlePdfPreviewError()}
                            >
                              <embed
                                src={`${selectedAttachment.objectUrl || selectedAttachment.dataUrl}#toolbar=1&navpanes=1`}
                                type="application/pdf"
                                style={{ width: '100%', height: '60vh', border: 'none' }}
                              />
                            </object>
                          </Box>
                        ) : selectedAttachment.previewError ? (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            minHeight: 400,
                            p: 3,
                            textAlign: 'center',
                            bgcolor: '#f5f5f5'
                          }}>
                            <PdfViewIcon sx={{ fontSize: 64, mb: 2, color: '#ff4444' }} />
                            <Typography variant="h6" gutterBottom>
                              {selectedAttachment.fileNotFound ? 'File Not Found on Server' : 'PDF Preview Not Available'}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              {selectedAttachment.fileNotFound
                                ? (selectedAttachment.previewErrorMessage || 'This file is no longer on the server. Re-upload the attachment if needed.')
                                : (selectedAttachment.previewErrorMessage || 'Use "Open in New Window" to view, or download the file.')}
                            </Typography>
                            {!selectedAttachment.fileNotFound && (
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => selectedAttachment && handleOpenPdfInNewWindow(selectedAttachment)}
                                  startIcon={<ViewIcon />}
                                >
                                  Open in New Window
                                </Button>
                                <Button
                                  variant="outlined"
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
                            )}
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
                   <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                     {(selectedAttachment.objectUrl || selectedAttachment.dataUrl) ? (
                       <img
                         src={selectedAttachment.objectUrl || selectedAttachment.dataUrl}
                         alt={selectedAttachment.originalName}
                         style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
                         onError={(e) => {
                           e.target.style.display = 'none';
                           if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                         }}
                       />
                     ) : null}
                     <Box sx={{
                       display: selectedAttachment.objectUrl || selectedAttachment.dataUrl ? 'none' : 'flex',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyContent: 'center',
                       minHeight: 300,
                       color: 'text.secondary',
                       p: 3
                     }}>
                       <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                       <Typography variant="h6" gutterBottom>Loading image...</Typography>
                       <CircularProgress sx={{ my: 2 }} />
                     </Box>
                     <Box sx={{
                       display: 'none',
                       flexDirection: 'column',
                       alignItems: 'center',
                       justifyContent: 'center',
                       minHeight: 300,
                       color: 'text.secondary',
                       p: 3
                     }}>
                       <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                       <Typography variant="h6" gutterBottom>Image Preview Failed</Typography>
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