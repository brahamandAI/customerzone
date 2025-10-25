import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, MenuItem, Select, FormControl, InputLabel, Chip, Snackbar, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { siteAPI } from '../services/api';

const AdminPolicy = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [directorText, setDirectorText] = useState('{}');
  const [directorError, setDirectorError] = useState('');

  const [policy, setPolicy] = useState({
    duplicateWindowDays: 30,
    perCategoryLimits: { TRAVEL: 5000, FOOD: 600 },
    cashMax: 2000,
    requireDirectorAbove: { TRAVEL: 5000 },
    weekendDisallow: []
  });

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await siteAPI.getAll({ includeInactive: true });
        const siteList = res.data.data || [];
        setSites(siteList);
        if (!selectedSiteId) {
          // Prefer current user's site if available in list
          const userSiteId = user?.site?._id || user?.site;
          const defaultId = siteList.find(s => s._id === userSiteId)?._id || siteList[0]?._id || '';
          setSelectedSiteId(defaultId);
        }
      } catch (e) {
        console.error('Failed to load sites', e);
      }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!selectedSiteId) return;
      try {
        const res = await siteAPI.getPolicy(selectedSiteId);
        if (res.data.success) {
          setPolicy(res.data.data);
          setDirectorText(JSON.stringify(res.data.data?.requireDirectorAbove || {}));
          setDirectorError('');
        }
      } catch (e) {
        console.error('Failed to load policy', e);
      }
    };
    fetchPolicy();
  }, [selectedSiteId]);

  const handleLimitChange = (key) => (e) => {
    const value = e.target.value;
    setPolicy((prev) => ({ ...prev, perCategoryLimits: { ...prev.perCategoryLimits, [key]: Number(value) || 0 } }));
  };

  const handleSave = async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      // Validate and apply director JSON
      let parsedDirector = {};
      try {
        parsedDirector = directorText && directorText.trim().length > 0 ? JSON.parse(directorText) : {};
        setDirectorError('');
      } catch (e) {
        setDirectorError('Invalid JSON. Example: { "TRAVEL": 5000 }');
        setLoading(false);
        setSnackbar({ open: true, message: 'Invalid JSON in "Require Director Above"', severity: 'error' });
        return;
      }

      const payload = { ...policy, requireDirectorAbove: parsedDirector };
      await siteAPI.updatePolicy(selectedSiteId, payload);
      setSnackbar({ open: true, message: 'Policy updated', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update policy', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const categories = ['TRAVEL','FOOD','ACCOMMODATION','VEHICLE KM','FUEL','EQUIPMENT','MAINTENANCE','OFFICE SUPPLIES','MISCELLANEOUS'];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>Site Policy</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Site</InputLabel>
              <Select value={selectedSiteId} label="Site" onChange={(e) => setSelectedSiteId(e.target.value)}>
                {sites.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Duplicate Window (days)"
              type="number"
              fullWidth
              size="small"
              value={policy.duplicateWindowDays || 30}
              onChange={(e) => setPolicy((p) => ({ ...p, duplicateWindowDays: Number(e.target.value) || 0 }))}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Cash Max (₹)"
              type="number"
              fullWidth
              size="small"
              value={policy.cashMax || 0}
              onChange={(e) => setPolicy((p) => ({ ...p, cashMax: Number(e.target.value) || 0 }))}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 1 }}>Per-Category Limits (₹)</Typography>
            <Grid container spacing={2}>
              {categories.map((cat) => (
                <Grid item xs={12} sm={6} md={3} key={cat}>
                  <TextField
                    label={cat}
                    type="number"
                    fullWidth
                    size="small"
                    value={policy.perCategoryLimits?.[cat] || ''}
                    onChange={handleLimitChange(cat)}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Require Director Above (JSON)"
              fullWidth
              size="small"
              value={directorText}
              onChange={(e) => {
                setDirectorText(e.target.value);
                // Live hint: clear error when it becomes valid
                try {
                  if (e.target.value.trim().length === 0) {
                    setDirectorError('');
                  } else {
                    JSON.parse(e.target.value);
                    setDirectorError('');
                  }
                } catch {
                  setDirectorError('');
                }
              }}
              error={Boolean(directorError)}
              helperText={directorError || 'Example: { "TRAVEL": 5000, "FOOD": 1000 }'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Weekend Disallow (comma separated)"
              fullWidth
              size="small"
              value={(policy.weekendDisallow || []).join(',')}
              onChange={(e) => setPolicy((p) => ({ ...p, weekendDisallow: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))}
            />
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Policy'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPolicy;


