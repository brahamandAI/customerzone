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
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Fade,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Search,
  HourglassTop,
  Verified
} from '@mui/icons-material';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { expenseAPI } from '../services/api';

const SLUG_CONFIG = {
  'awaiting-finance': {
    title: 'Awaiting Finance Payment',
    description: 'Expenses you approved at Super Admin (L3). Finance has not processed payment yet.',
    fetch: () => expenseAPI.getL3AwaitingFinance(),
    accent: '#0288d1',
    Icon: HourglassTop,
    statusLabel: 'With finance'
  },
  'payments-completed': {
    title: 'Payments Completed',
    description: 'Expenses you approved at L3 where payment has been processed or reimbursed.',
    fetch: () => expenseAPI.getL3PaymentsCompleted(),
    accent: '#00897b',
    Icon: Verified,
    statusLabel: 'Paid'
  }
};

const SuperAdminFinancePipelinePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { formatCurrency, formatDate } = useUserPreferences();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const config = SLUG_CONFIG[slug];

  const isL3 = user?.role?.toLowerCase() === 'l3_approver';

  const load = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const res = await config.fetch();
      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        throw new Error(res.data?.message || 'Failed to load');
      }
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (config && isL3) load();
  }, [config, isL3, load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((exp) => {
      const num = (exp.expenseNumber || '').toLowerCase();
      const title = (exp.title || '').toLowerCase();
      const sub = typeof exp.submittedBy === 'object'
        ? (exp.submittedBy?.name || '').toLowerCase()
        : String(exp.submittedBy || '').toLowerCase();
      const site = typeof exp.site === 'object'
        ? (exp.site?.name || '').toLowerCase()
        : String(exp.site || '').toLowerCase();
      return num.includes(q) || title.includes(q) || sub.includes(q) || site.includes(q);
    });
  }, [rows, search]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [filtered]
  );

  if (!isL3) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!config) {
    return <Navigate to="/dashboard" replace />;
  }

  const IconCmp = config.Icon;

  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const headerBg = darkMode ? '#252525' : '#eceff1';
  const zebraEven = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  const headCellSx = {
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
    bgcolor: headerBg,
    borderBottom: `2px solid ${config.accent}`,
    py: 1.75,
    px: 2,
    whiteSpace: 'nowrap'
  };

  const bodyCellSx = {
    py: 1.5,
    px: 2,
    fontSize: '0.875rem',
    borderBottom: `1px solid ${borderColor}`,
    verticalAlign: 'middle'
  };

  return (
    <Box
      className="super-admin-finance-page"
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: darkMode
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)',
        py: { xs: 2, sm: 3 },
        px: { xs: 1.5, sm: 2, md: 3 }
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          width: '100%',
          maxWidth: '100% !important'
        }}
      >
        <Fade in>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              width: '100%'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                mb: 2,
                flexShrink: 0,
                flexWrap: 'wrap'
              }}
            >
              <IconButton
                onClick={() => navigate('/dashboard')}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                }}
              >
                <ArrowBack />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 200 }}>
                <IconCmp sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" fontWeight={800} color="white" sx={{ fontSize: { xs: '1.35rem', sm: '2rem' } }}>
                    {config.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 'min(900px, 100%)' }}>
                    {config.description}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Refresh
              </Button>
            </Box>

            <Paper
              elevation={8}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                borderRadius: 2,
                flexShrink: 0,
                background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)'
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search number, title, submitter, site…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ flex: 1, minWidth: { xs: '100%', sm: 280 } }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
                  {' · '}
                  <strong>{formatCurrency(totalAmount)}</strong> total
                </Typography>
              </Box>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                {error}
              </Alert>
            )}

            <Paper
              elevation={8}
              sx={{
                borderRadius: 2,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)',
                border: `1px solid ${borderColor}`
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: `1px solid ${borderColor}`,
                  bgcolor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                  flexShrink: 0
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  Expense details
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 320 }}>
                  <CircularProgress sx={{ color: config.accent }} />
                </Box>
              ) : (
                <TableContainer
                  sx={{
                    flex: 1,
                    width: '100%',
                    maxHeight: { xs: 'calc(100vh - 300px)', md: 'calc(100vh - 280px)' },
                    overflow: 'auto',
                    px: 0
                  }}
                >
                  <Table
                    stickyHeader
                    size="medium"
                    sx={{
                      minWidth: 960,
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      '& .MuiTableCell-root': {
                        borderLeft: `1px solid ${borderColor}`,
                        '&:first-of-type': { borderLeft: 'none' }
                      }
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headCellSx}>Expense #</TableCell>
                        <TableCell sx={{ ...headCellSx, minWidth: 200 }}>Title / description</TableCell>
                        <TableCell sx={{ ...headCellSx, textAlign: 'right' }}>Amount</TableCell>
                        <TableCell sx={{ ...headCellSx }}>Site</TableCell>
                        <TableCell sx={{ ...headCellSx }}>Submitted by</TableCell>
                        <TableCell sx={{ ...headCellSx }}>Status</TableCell>
                        <TableCell sx={{ ...headCellSx }}>Expense date</TableCell>
                        {slug === 'payments-completed' && (
                          <TableCell sx={{ ...headCellSx }}>Payment date</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={slug === 'payments-completed' ? 8 : 7}
                            align="center"
                            sx={{ ...bodyCellSx, py: 8, border: 'none' }}
                          >
                            <Typography color="text.secondary">No expenses in this list.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((exp, index) => (
                          <TableRow
                            key={exp._id || exp.id}
                            hover
                            sx={{
                              bgcolor: index % 2 === 0 ? zebraEven : 'transparent',
                              transition: 'background-color 0.15s ease',
                              '&:hover': {
                                bgcolor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,128,128,0.06)'
                              }
                            }}
                          >
                            <TableCell sx={{ ...bodyCellSx, fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                              {exp.expenseNumber}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                              <Tooltip title={exp.description ? `${exp.title}\n\n${exp.description}` : exp.title || ''}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35, mb: 0.25 }}>
                                    {exp.title}
                                  </Typography>
                                  {exp.description && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: 1.4,
                                        maxWidth: 420
                                      }}
                                    >
                                      {exp.description}
                                    </Typography>
                                  )}
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                ...bodyCellSx,
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                                color: config.accent
                              }}
                            >
                              {formatCurrency(exp.amount)}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                              {typeof exp.site === 'object' ? exp.site?.name : exp.site || '—'}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                              {typeof exp.submittedBy === 'object'
                                ? exp.submittedBy?.name
                                : exp.submittedBy || '—'}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                              <Chip
                                size="small"
                                label={(exp.status || '').replace(/_/g, ' ')}
                                sx={{
                                  bgcolor: `${config.accent}20`,
                                  color: config.accent,
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  border: `1px solid ${config.accent}40`
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {exp.expenseDate
                                ? formatDate(new Date(exp.expenseDate))
                                : '—'}
                            </TableCell>
                            {slug === 'payments-completed' && (
                              <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                {exp.paymentDate
                                  ? formatDate(new Date(exp.paymentDate))
                                  : '—'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!loading && filtered.length > 0 && (
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: `2px solid ${borderColor}`,
                    bgcolor: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,128,128,0.06)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    flexShrink: 0
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Rows: <strong>{filtered.length}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total amount:{' '}
                    <strong style={{ color: config.accent, fontSize: '1.05rem' }}>{formatCurrency(totalAmount)}</strong>
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default SuperAdminFinancePipelinePage;
