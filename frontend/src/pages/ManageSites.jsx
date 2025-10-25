import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, IconButton, Tooltip, CircularProgress, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import { useNavigate } from 'react-router-dom';
import { siteAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ManageSites = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredSites, setFilteredSites] = useState([]);

  useEffect(() => {
    async function fetchSites() {
      setLoading(true);
      try {
        const res = await siteAPI.getAll();
        setSites(res.data.data || []);
        setFilteredSites(res.data.data || []);
      } catch (err) {
        console.error('Error fetching sites:', err);
        setSites([]);
        setFilteredSites([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredSites(sites);
    } else {
      setFilteredSites(
        sites.filter(site =>
          site.name.toLowerCase().includes(search.toLowerCase()) ||
          site.code.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, sites]);

  const handleDelete = async (siteId) => {
    const site = sites.find(s => s._id === siteId);
    const siteName = site?.name || 'this site';
    
    // Show confirmation dialog with more details
    const confirmed = window.confirm(
      `Are you sure you want to delete "${siteName}"?\n\n` +
      `This action will:\n` +
      `• Remove the site from the system\n` +
      `• Cannot be undone\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );
    
    if (confirmed) {
      try {
        console.log('🗑️ Deleting site:', siteId);
        
        // First try soft delete
        const response = await siteAPI.delete(siteId);
        
        if (response.data.success) {
          console.log('✅ Site deleted successfully');
          
          // Show success message
          alert(`Site "${siteName}" has been deleted successfully!`);
          
        // Refresh the sites list
        const res = await siteAPI.getAll();
        setSites(res.data.data || []);
        setFilteredSites(res.data.data || []);
        }
      } catch (err) {
        console.error('❌ Error deleting site:', err);
        
        // Show detailed error message
        const errorMessage = err.response?.data?.message || 'Failed to delete site';
        alert(`Error deleting site: ${errorMessage}`);
        
        // If it's a dependency error, show helpful message
        if (errorMessage.includes('users associated') || errorMessage.includes('expenses associated')) {
          alert(
            `Cannot delete site because it has dependencies.\n\n` +
            `Please:\n` +
            `1. Reassign or delete all users from this site\n` +
            `2. Delete all expenses associated with this site\n` +
            `3. Then try deleting the site again.`
          );
        }
      }
    }
  };

  const columns = [
    { 
      field: 'name', 
      headerName: 'Site Name', 
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 1, color: '#4caf50' }} />
          <Typography variant="body2" fontWeight={500}>
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'code', 
      headerName: 'Site Code', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      )
    },
    { 
      field: 'isActive', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          size="small" 
          color={params.value ? 'success' : 'error'}
          variant="filled"
        />
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Created Date', 
      flex: 1,
      valueGetter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit Site">
            <IconButton 
              color="primary" 
              onClick={() => navigate(`/edit-site/${params.row._id}`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Site">
            <IconButton 
              color="error" 
              onClick={() => handleDelete(params.row._id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{
      minHeight: '100vh',
      background: darkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
      p: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src="/rakshak-logo.png"
              alt="Rakshak Securitas Logo"
              style={{ height: '40px' }}
            />
            <BusinessIcon sx={{ ml: 2, color: 'white', fontSize: 40 }} />
          </Box>
          <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Manage Sites
          </Typography>
        </Box>

        {/* Add New Site Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-site')}
            sx={{
              background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
              color: 'white',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: 2,
              '&:hover': {
                background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)'
              }
            }}
          >
            Add New Site
          </Button>

          {/* Search Box */}
          <TextField
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                borderRadius: 2,
                '&:hover': {
                  background: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)'
                }
              }
            }}
          />
        </Box>

        {/* Sites Data Grid */}
        <Paper elevation={16} sx={{
          borderRadius: 3,
          background: darkMode ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          border: darkMode ? '1px solid rgba(51,51,51,0.2)' : '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredSites}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              autoHeight
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  background: darkMode ? '#1a1a1a' : '#f5f5f5',
                  borderBottom: `2px solid ${darkMode ? '#333' : '#e0e0e0'}`,
                },
                '& .MuiDataGrid-row:hover': {
                  background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }
              }}
            />
          )}
        </Paper>

        {/* Summary */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Total Sites: {filteredSites.length} | Active Sites: {filteredSites.filter(site => site.isActive).length}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ManageSites;
