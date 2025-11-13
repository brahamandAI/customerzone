import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ManageUsers = () => {
  const { darkMode } = useTheme();
  console.log('Component Rendered');
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await userAPI.getUsers();
        setUsers(res.data.data || []);
        setFilteredUsers(res.data.data || []);
      } catch (err) {
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter(u =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.employeeId.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, users]);

  // Debug: Print filtered users to console
  console.log('Filtered Users:', filteredUsers);

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 1 },
    { field: 'employeeId', headerName: 'Employee ID', flex: 1 },
    { field: 'department', headerName: 'Department', flex: 1 },
    { field: 'site', headerName: 'Site', flex: 1, valueGetter: (params) => {
      if (!params || !params.row) return '';
      const site = params.row.site;
      if (typeof site === 'object' && site && site.name) return site.name;
      if (typeof site === 'string') return site;
      if (params.row.siteId) return params.row.siteId;
      return '';
    } },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton color="primary" onClick={() => navigate(`/edit-user/${params.row._id}`)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row._id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      console.log('🗑️ Attempting to delete user:', userId);
      const response = await userAPI.deleteUser(userId);
      console.log('✅ Delete response:', response);
      
      // Update the local state to remove the deleted user
      setUsers(prevUsers => prevUsers.filter(u => u._id !== userId));
      setFilteredUsers(prevFiltered => prevFiltered.filter(u => u._id !== userId));
      
      // Show success message
      alert('User deleted successfully');
      
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      
      // Show more specific error message
      let errorMessage = 'Failed to delete user';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 1200, 
      mx: 'auto', 
      p: 3,
      background: darkMode ? '#1a1a1a' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        mb: 3,
        background: darkMode ? '#2a2a2a' : '#ffffff',
        border: darkMode ? '1px solid #333333' : '1px solid #e0e0e0'
      }}>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="h4" color="primary" fontWeight={700} gutterBottom sx={{ color: darkMode ? '#4fc3f7' : 'primary.main' }}>
              Manage Users
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-user')}>
              Add User
            </Button>
          </Grid>
        </Grid>
        <TextField
          label="Search users"
          variant="outlined"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          sx={{ 
            mb: 2,
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={row => row._id}
            autoHeight
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-root': {
                backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                color: darkMode ? '#e0e0e0' : '#333333',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
                color: darkMode ? '#e0e0e0' : '#333333',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: darkMode ? '#333333' : '#f5f5f5',
                color: darkMode ? '#e0e0e0' : '#333333',
                borderBottom: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
              },
              '& .MuiDataGrid-columnHeader': {
                color: darkMode ? '#e0e0e0' : '#333333',
              },
              '& .MuiDataGrid-row': {
                '&:hover': {
                  backgroundColor: darkMode ? '#333333' : '#f5f5f5',
                },
              },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: darkMode ? '#333333' : '#f5f5f5',
                color: darkMode ? '#e0e0e0' : '#333333',
                borderTop: darkMode ? '1px solid #333333' : '1px solid #e0e0e0',
              },
              '& .MuiTablePagination-root': {
                color: darkMode ? '#e0e0e0' : '#333333',
              },
              '& .MuiTablePagination-select': {
                color: darkMode ? '#e0e0e0' : '#333333',
              },
              '& .MuiTablePagination-selectIcon': {
                color: darkMode ? '#e0e0e0' : '#333333',
              },
            }}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ManageUsers; 