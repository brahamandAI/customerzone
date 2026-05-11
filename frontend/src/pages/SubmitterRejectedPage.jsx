import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination,
  Alert,
  CircularProgress,
  Fade,
  Zoom
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  Visibility,
  Search,
  Refresh,
  Person,
  Business,
  Category as CategoryIcon,
  Schedule,
  AttachMoney,
  Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { expenseAPI } from '../services/api';

const getLastRejection = (exp) => {
  const hist = exp.approvalHistory || [];
  const rej = [...hist].reverse().find((h) => h.action === 'rejected');
  return rej;
};

const SubmitterRejectedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { formatCurrency, formatDate } = useUserPreferences();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await expenseAPI.getAll();
      if (!response.data.success) throw new Error(response.data.message || 'Failed to load');
      const data = response.data.data || [];
      const mine = data.filter((exp) => {
        const sid = exp.submittedBy?._id || exp.submittedBy;
        return sid && user?._id && String(sid) === String(user._id);
      });
      const rejected = mine.filter((exp) => exp.status === 'rejected');
      setRows(rejected);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (user?.role && String(user.role).toLowerCase() !== 'submitter') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (exp) =>
        exp.clientId?.toLowerCase().includes(q) ||
        exp.clientName?.toLowerCase().includes(q) ||
        exp.expenseNumber?.toLowerCase().includes(q) ||
        exp.category?.toLowerCase().includes(q) ||
        getLastRejection(exp)?.comments?.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageRows = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const stats = useMemo(() => {
    const total = rows.length;
    const totalAmount = rows.reduce((s, e) => s + (e.amount || 0), 0);
    return { total, totalAmount };
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, rows.length]);

  const bg = darkMode
    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';

  if (loading && rows.length === 0 && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: bg, py: 4 }}>
      <Container maxWidth="xl">
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <IconButton onClick={() => navigate('/dashboard')} sx={{ color: darkMode ? '#fff' : '#333' }}>
                <ArrowBack />
              </IconButton>
              <Avatar sx={{ bgcolor: '#f44336', width: 48, height: 48 }}>
                <Cancel sx={{ fontSize: 28 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" fontWeight={700} color={darkMode ? '#fff' : '#333'}>
                  Rejected expenses
                </Typography>
                <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
                  Expenses rejected by an approver (e.g. L1). Review the reason and submit a new expense with corrections.
                </Typography>
              </Box>
              <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => navigate('/submit-expense')}>
                New expense
              </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Zoom in style={{ transitionDelay: '100ms' }}>
                  <Card sx={{ background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#f44336' }}>
                          <Cancel />
                        </Avatar>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color={darkMode ? '#fff' : '#333'}>
                            {stats.total}
                          </Typography>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                            Total rejected
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Zoom in style={{ transitionDelay: '200ms' }}>
                  <Card sx={{ background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#ff9800' }}>
                          <AttachMoney />
                        </Avatar>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color={darkMode ? '#fff' : '#333'}>
                            {formatCurrency(stats.totalAmount)}
                          </Typography>
                          <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                            Amount (rejected)
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, mb: 3, background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by title, expense #, category, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: darkMode ? '#b0b0b0' : '#666' }} />
                }}
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>
                  Refresh
                </Button>
              </Box>
            </Paper>
          </Box>
        </Fade>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Fade in timeout={800}>
          <Paper sx={{ background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Expense</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Site</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Expense date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Rejected by</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Reject reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: darkMode ? '#fff' : '#333' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No rejected expenses.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((exp) => {
                      const rej = getLastRejection(exp);
                      const by = rej?.approver?.name || rej?.approver?.email || '—';
                      const reason = (rej?.comments || rej?.comment || '').trim() || '—';
                      return (
                        <TableRow key={exp._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                              {exp.clientId}
                            </Typography>
                            <Typography variant="caption" color={darkMode ? '#b0b0b0' : '#666'}>
                              {exp.clientName}
                            </Typography>
                            <Chip label={exp.expenseNumber} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                          </TableCell>
                          <TableCell>{exp.category || '—'}</TableCell>
                          <TableCell>{exp.site?.name || '—'}</TableCell>
                          <TableCell align="right">{formatCurrency(exp.amount)}</TableCell>
                          <TableCell>{exp.expenseDate ? formatDate(exp.expenseDate) : '—'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 14, bgcolor: '#667eea' }}>
                                {typeof by === 'string' ? by.charAt(0) : '?'}
                              </Avatar>
                              <Typography variant="body2">{by}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Tooltip title={reason}>
                              <Typography variant="body2" sx={{ lineHeight: 1.35 }} noWrap>
                                {reason}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelected(exp);
                                  setDialogOpen(true);
                                }}
                                sx={{ color: '#2196f3' }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
              </Box>
            )}
          </Paper>
        </Fade>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { background: darkMode ? 'rgba(45,45,45,0.98)' : '#fff' }
          }}
        >
          <DialogTitle sx={{ color: darkMode ? '#fff' : '#333' }}>Rejected expense details</DialogTitle>
          <DialogContent>
            {selected && (
              <Box sx={{ mt: 1 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Status: REJECTED
                  </Typography>
                  {getLastRejection(selected) && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Reason:</strong> {(getLastRejection(selected)?.comments || getLastRejection(selected)?.comment || '—').trim()}
                    </Typography>
                  )}
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Expense number
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selected.expenseNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(selected.amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Client ID
                    </Typography>
                    <Typography variant="body1">{selected.clientId}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Client Name
                    </Typography>
                    <Typography variant="body1">{selected.clientName}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body2">{selected.description || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      <CategoryIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Category
                    </Typography>
                    <Typography variant="body1">{selected.category || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      <Business sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Site
                    </Typography>
                    <Typography variant="body1">{selected.site?.name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      <Schedule sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Expense date
                    </Typography>
                    <Typography variant="body1">
                      {selected.expenseDate ? formatDate(selected.expenseDate) : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      <Person sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Rejected by
                    </Typography>
                    <Typography variant="body1">
                      {getLastRejection(selected)?.approver?.name || getLastRejection(selected)?.approver?.email || '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
            <Button variant="contained" onClick={() => navigate('/submit-expense')}>
              Submit new expense
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SubmitterRejectedPage;
