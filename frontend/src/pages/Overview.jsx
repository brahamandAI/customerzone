import React from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InsightsIcon from '@mui/icons-material/Insights';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const features = [
  { title: 'Multi-level approval workflow', icon: <TimelineIcon />, text: 'Route every claim through configurable approval levels with clear ownership.' },
  { title: 'Real-time budget monitoring', icon: <AccountBalanceWalletIcon />, text: 'Track approved, pending, and projected spend against budget instantly.' },
  { title: 'Advanced reporting and analytics', icon: <InsightsIcon />, text: 'Make faster decisions with category trends, site-level insights, and exports.' },
  { title: 'Secure and compliant platform', icon: <SecurityIcon />, text: 'Built-in controls, role access, and auditable action history for compliance.' }
];

const roleBenefits = [
  { role: 'Submitter', text: 'Create and track expenses with complete transparency.' },
  { role: 'Approver', text: 'Review requests faster with policy and budget checks.' },
  { role: 'Finance', text: 'Close payouts with clear audit trails and status visibility.' },
  { role: 'Admin', text: 'Manage users, sites, controls, and performance in one place.' }
];

const trustStats = [
  { label: 'Approval Visibility', value: '100%' },
  { label: 'Role-based Access', value: 'Granular' },
  { label: 'Audit Readiness', value: 'Enterprise' }
];

const testimonials = [
  {
    quote: 'Earlier approvals took days. Now our entire chain is transparent and much faster.',
    author: 'Regional Operations Lead'
  },
  {
    quote: 'Finance closure is smoother because every expense already has clean context and history.',
    author: 'Finance Controller'
  }
];

const Overview = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 15% 15%, #33c4bb 0%, #0f8c8c 35%, #085f66 100%)',
        py: 0
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          minHeight: '100vh',
          px: 0,
          py: 0
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 10, md: 16 },
            left: { xs: 12, md: 18 },
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <img src="/rakshak-logo.png" alt="Rakshak Securitas Logo" style={{ width: 30, height: 30 }} />
          <Typography sx={{ fontWeight: 800, color: '#005b63' }}>
            Rakshak Securitas
          </Typography>
        </Box>

        <Paper
          elevation={20}
          sx={{
            minHeight: '100%',
            borderRadius: 0,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(240,250,250,0.92))',
            backdropFilter: 'blur(12px)',
            border: 'none'
          }}
        >
          <Box sx={{ p: { xs: 3, md: 6 } }}>
            <Grid container spacing={4} alignItems="center" sx={{ mb: 5, mt: { xs: 4, md: 2 } }}>
              <Grid item xs={12} md={7}>
                <Chip label="Enterprise Expense Suite" sx={{ mb: 2, bgcolor: 'rgba(0,102,102,0.1)', color: '#005b63', fontWeight: 700 }} />

                <Typography
                  variant="h3"
                  sx={{ fontWeight: 900, color: '#003f45', mb: 2, fontSize: { xs: '2rem', md: '3.2rem' }, lineHeight: 1.15 }}
                >
                  Premium Expense Control with Speed, Clarity, and Compliance
                </Typography>
                <Typography variant="body1" sx={{ color: '#355b5b', maxWidth: 900, mb: 3 }}>
                  Transform expense operations with a polished workflow from submission to payment closure.
                  Designed for multi-level approvals, finance control, and audit-ready governance.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/login')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: '#006666',
                      px: 4,
                      py: 1.3,
                      borderRadius: 2.5,
                      boxShadow: '0 8px 20px rgba(0,102,102,0.35)',
                      '&:hover': { bgcolor: '#004d4d' }
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{ borderColor: '#006666', color: '#006666', px: 4, py: 1.3, borderRadius: 2.5 }}
                  >
                    Request Demo
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card sx={{ borderRadius: 4, p: 2, background: 'linear-gradient(160deg, #0f8f8f, #0b6f75)', color: '#fff' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 800, mb: 2 }}>Workflow Snapshot</Typography>
                    {['Submitter', 'L1 Review', 'L2 Validation', 'Finance Clearance', 'Payment Closed'].map((step) => (
                      <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#b6fff4' }} />
                        <Typography sx={{ fontSize: '0.95rem' }}>{step}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 5 }}>
              {features.map((item) => (
                <Grid item xs={12} sm={6} key={item.title}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0 8px 22px rgba(0,0,0,0.08)', height: '100%' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ color: '#006b73' }}>{item.icon}</Box>
                        <Typography sx={{ fontWeight: 800, color: '#004d4d' }}>{item.title}</Typography>
                      </Box>
                      <Typography sx={{ color: '#527373' }}>{item.text}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 5 }}>
              {trustStats.map((stat) => (
                <Grid item xs={12} sm={4} key={stat.label}>
                  <Paper sx={{ p: 2.2, borderRadius: 3, textAlign: 'center', border: '1px solid #d8eeee' }}>
                    <Typography sx={{ fontWeight: 900, color: '#006666', fontSize: '1.35rem' }}>{stat.value}</Typography>
                    <Typography sx={{ color: '#4c6f6f' }}>{stat.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h5" sx={{ fontWeight: 800, color: '#006666', mb: 2 }}>
              Built for Every Role
            </Typography>
            <Grid container spacing={2} sx={{ mb: 5 }}>
              {roleBenefits.map((item) => (
                <Grid item xs={12} md={6} key={item.role}>
                  <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid #d8eeee' }}>
                    <Typography sx={{ fontWeight: 700, color: '#004d4d' }}>{item.role}</Typography>
                    <Typography sx={{ color: '#4c6f6f', mt: 0.5 }}>{item.text}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2} sx={{ mb: 4 }}>
              {testimonials.map((item) => (
                <Grid item xs={12} md={6} key={item.author}>
                  <Paper sx={{ p: 2.2, borderRadius: 2.5, bgcolor: 'rgba(0,102,102,0.04)', border: '1px dashed #b5dede' }}>
                    <Typography sx={{ color: '#355b5b', fontStyle: 'italic' }}>"{item.quote}"</Typography>
                    <Typography sx={{ color: '#006666', mt: 1, fontWeight: 700 }}>{item.author}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Paper
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                bgcolor: '#005f66',
                color: '#fff',
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>Ready to simplify expense governance?</Typography>
                <Typography sx={{ opacity: 0.9, color: '#ffffff' }}>Sign in and run your entire approval cycle from one premium dashboard.</Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ bgcolor: '#fff', color: '#005f66', fontWeight: 700, '&:hover': { bgcolor: '#e8ffff' } }}
              >
                Go to Login
              </Button>
            </Paper>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Overview;
