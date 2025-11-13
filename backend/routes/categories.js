const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Site = require('../models/Site');

// Get all categories from all sites
router.get('/', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const sites = await Site.find({ isActive: true }).populate('expenseCategories');
    
    // Collect all unique categories from all sites
    const allCategories = [];
    const categoryMap = new Map();
    
    sites.forEach(site => {
      if (site.expenseCategories && site.expenseCategories.length > 0) {
        site.expenseCategories.forEach(category => {
          if (!categoryMap.has(category.name)) {
            categoryMap.set(category.name, {
              id: category._id,
              name: category.name,
              description: category.description,
              isActive: category.isActive,
              siteId: site._id,
              siteName: site.name
            });
            allCategories.push(categoryMap.get(category.name));
          }
        });
      }
    });

    res.json({
      success: true,
      data: allCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get categories by site
router.get('/site/:siteId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId).populate('expenseCategories');
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    res.json({
      success: true,
      data: site.expenseCategories || []
    });
  } catch (error) {
    console.error('Error fetching site categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new category for a site
router.post('/', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { siteId, name, description, isActive = true } = req.body;

    if (!siteId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Site ID and category name are required'
      });
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if category already exists
    const existingCategory = site.expenseCategories.find(cat => 
      cat.name.toLowerCase() === name.toLowerCase()
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Add new category
    site.expenseCategories.push({
      name,
      description,
      isActive
    });

    await site.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: site.expenseCategories[site.expenseCategories.length - 1]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update category
router.put('/:categoryId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, isActive } = req.body;

    // Find site that contains this category
    const site = await Site.findOne({
      'expenseCategories._id': categoryId
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update the category
    const categoryIndex = site.expenseCategories.findIndex(cat => 
      cat._id.toString() === categoryId
    );

    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (name) site.expenseCategories[categoryIndex].name = name;
    if (description !== undefined) site.expenseCategories[categoryIndex].description = description;
    if (isActive !== undefined) site.expenseCategories[categoryIndex].isActive = isActive;

    await site.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: site.expenseCategories[categoryIndex]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete category
router.delete('/:categoryId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find site that contains this category
    const site = await Site.findOne({
      'expenseCategories._id': categoryId
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Remove the category
    site.expenseCategories = site.expenseCategories.filter(cat => 
      cat._id.toString() !== categoryId
    );

    await site.save();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 