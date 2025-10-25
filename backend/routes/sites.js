const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Site = require('../models/Site');

// Create new site with budget configuration
router.post('/create', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const {
      name,
      code,
      location,
      contactPerson,
      phone,
      email,
      budget,
      vehicleKmLimit,
      categoryBudgets,
      createdBy
    } = req.body;

    // Validate required fields
    if (
      !name || !code ||
      !location || !location.address || !location.city || !location.state || !location.pincode ||
      !budget || !budget.monthly || !budget.yearly ||
      !createdBy
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if site already exists
    const existingSite = await Site.findOne({ code });
    if (existingSite) {
      return res.status(400).json({
        success: false,
        message: 'Site with this code already exists'
      });
    }

    // Create new site
    const newSite = new Site({
      name,
      code,
      location,
      contactPerson,
      phone,
      email,
      budget,
      vehicleKmLimit,
      categoryBudgets,
      createdBy
    });

    await newSite.save();

    res.status(201).json({
      success: true,
      message: 'Site created successfully with budget configuration',
      data: newSite
    });

  } catch (error) {
    console.error('Error creating site:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all sites with budget information
router.get('/all', async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    let query = {};
    if (!includeInactive) {
      query.isActive = true; // Only show active sites by default
    }
    
    const sites = await Site.find(query)
      .select('name code isActive createdAt location budget')
      .sort({ createdAt: -1 }); // Sort by newest first

    console.log(`📋 Fetched ${sites.length} sites (includeInactive: ${includeInactive})`);

    res.json({
      success: true,
      data: sites
    });

  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get site budget alerts
router.get('/budget-alerts', async (req, res) => {
  try {
    const sites = await Site.find({ isActive: true });
    
    const alerts = sites
      .filter(site => site.shouldAlert)
      .map(site => ({
        siteId: site._id,
        clientId: site.clientId,
        clientName: site.clientName,
        utilizationPercentage: site.utilizationPercentage,
        budgetAlertThreshold: site.budgetAlertThreshold,
        remainingBudget: site.remainingBudget,
        totalBudget: site.totalBudget,
        categoryBudgets: site.categoryBudgets
      }));

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update site budget
router.put('/:siteId/budget', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { monthlyBudget, budgetAlertThreshold, categoryBudgets, vehicleKmLimit } = req.body;

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Update budget fields
    if (monthlyBudget !== undefined) site.monthlyBudget = monthlyBudget;
    if (budgetAlertThreshold !== undefined) site.budgetAlertThreshold = budgetAlertThreshold;
    if (categoryBudgets !== undefined) site.categoryBudgets = categoryBudgets;
    if (vehicleKmLimit !== undefined) site.vehicleKmLimit = vehicleKmLimit;

    await site.save();

    res.json({
      success: true,
      message: 'Site budget updated successfully',
      data: site
    });

  } catch (error) {
    console.error('Error updating site budget:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get site by ID
router.get('/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    res.json({
      success: true,
      data: site
    });

  } catch (error) {
    console.error('Error fetching site:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update site
router.put('/:siteId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId } = req.params;
    const updateData = req.body;
    
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if code is being updated and if it already exists
    if (updateData.code && updateData.code !== site.code) {
      const existingSite = await Site.findOne({ code: updateData.code });
      if (existingSite) {
        return res.status(400).json({
          success: false,
          message: 'Site with this code already exists'
        });
      }
    }

    // Update site fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        site[key] = updateData[key];
      }
    });

    await site.save();

    res.json({
      success: true,
      message: 'Site updated successfully',
      data: site
    });

  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete site
router.delete('/:siteId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId } = req.params;
    const { hardDelete = false } = req.query; // Allow hard delete option
    
    console.log('🗑️ Deleting site:', { siteId, hardDelete });
    
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if site has any associated users or expenses
    const User = require('../models/User');
    const Expense = require('../models/Expense');
    
    const usersWithSite = await User.find({ site: siteId });
    const expensesWithSite = await Expense.find({ site: siteId });
    
    console.log('🔍 Site dependencies:', {
      usersCount: usersWithSite.length,
      expensesCount: expensesWithSite.length
    });
    
    if (usersWithSite.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete site. There are ${usersWithSite.length} users associated with this site. Please reassign or delete these users first.`
      });
    }
    
    if (expensesWithSite.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete site. There are ${expensesWithSite.length} expenses associated with this site. Please delete these expenses first.`
      });
    }

    if (hardDelete === 'true') {
      // Hard delete - completely remove from database
      await Site.findByIdAndDelete(siteId);
      console.log('🗑️ Hard deleted site:', siteId);
    } else {
    // Soft delete by setting isActive to false
    site.isActive = false;
    await site.save();
      console.log('🗑️ Soft deleted site:', siteId);
    }

    res.json({
      success: true,
      message: hardDelete === 'true' ? 'Site permanently deleted' : 'Site deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting site:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get site expense policy
router.get('/:siteId/policy', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId).lean();
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }
    const policy = site.expensePolicy || {
      duplicateWindowDays: 30,
      perCategoryLimits: {},
      cashMax: 2000,
      requireDirectorAbove: {},
      weekendDisallow: []
    };
    res.json({ success: true, data: policy });
  } catch (error) {
    console.error('Error fetching site policy:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update site expense policy
router.put('/:siteId/policy', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId } = req.params;
    const update = req.body || {};

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }

    // Initialize if missing
    if (!site.expensePolicy) {
      site.expensePolicy = {};
    }

    // Merge allowed keys only
    const allowedKeys = ['duplicateWindowDays', 'perCategoryLimits', 'cashMax', 'requireDirectorAbove', 'weekendDisallow'];
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(update, key)) {
        site.expensePolicy[key] = update[key];
      }
    }

    await site.save();
    res.json({ success: true, message: 'Policy updated', data: site.expensePolicy });
  } catch (error) {
    console.error('Error updating site policy:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 
 