const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a site name'],
    trim: true,
    maxlength: [100, 'Site name cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a site code'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Site code cannot be more than 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Please add site address'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Please add city'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please add state'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Please add pincode'],
      match: [/^\d{6}$/, 'Please add a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  contact: {
    phone: {
      type: String,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please add a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    manager: {
      name: String,
      phone: String,
      email: String
    }
  },
  budget: {
    monthly: {
      type: Number,
      required: [true, 'Please add monthly budget'],
      min: [0, 'Budget cannot be negative']
    },
    yearly: {
      type: Number,
      required: [true, 'Please add yearly budget'],
      min: [0, 'Budget cannot be negative']
    },
    categories: {
      travel: {
        type: Number,
        default: 0,
        min: [0, 'Budget cannot be negative']
      },
      food: {
        type: Number,
        default: 0,
        min: [0, 'Budget cannot be negative']
      },
      accommodation: {
        type: Number,
        default: 0,
        min: [0, 'Budget cannot be negative']
      },
      vehicleKm: {
        type: Number,
        default: 0,
        min: [0, 'Budget cannot be negative']
      },
      miscellaneous: {
        type: Number,
        default: 0,
        min: [0, 'Budget cannot be negative']
      }
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: [0, 'Alert threshold cannot be negative'],
      max: [100, 'Alert threshold cannot be more than 100']
    }
  },
  vehicleKmLimit: {
    type: Number,
    default: 1000,
    min: [0, 'Vehicle KM limit cannot be negative']
  },
  operatingHours: {
    start: {
      type: String,
      default: '09:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time format (HH:MM)']
    },
    end: {
      type: String,
      default: '18:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time format (HH:MM)']
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  workingDays: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  departments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    head: {
      type: String,
      trim: true
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, 'Department budget cannot be negative']
    }
  }],
  expenseCategories: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    requiresApproval: {
      type: Boolean,
      default: true
    },
    approvalLimit: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  approvalWorkflow: {
    l1Threshold: {
      type: Number,
      default: 1000,
      min: [0, 'Approval threshold cannot be negative']
    },
    l2Threshold: {
      type: Number,
      default: 5000,
      min: [0, 'Approval threshold cannot be negative']
    },
    l3Threshold: {
      type: Number,
      default: 10000,
      min: [0, 'Approval threshold cannot be negative']
    },
    autoApprovalLimit: {
      type: Number,
      default: 500,
      min: [0, 'Auto approval limit cannot be negative']
    }
  },
  settings: {
    allowWeekendExpenses: {
      type: Boolean,
      default: false
    },
    allowHolidayExpenses: {
      type: Boolean,
      default: false
    },
    requireReceiptForAmount: {
      type: Number,
      default: 100,
      min: [0, 'Receipt requirement amount cannot be negative']
    },
    maxExpenseAmount: {
      type: Number,
      default: 50000,
      min: [0, 'Maximum expense amount cannot be negative']
    },
    expenseRetentionPeriod: {
      type: Number,
      default: 7, // years
      min: [1, 'Retention period must be at least 1 year']
    }
  },
  expensePolicy: {
    duplicateWindowDays: { type: Number, default: 30 },
    perCategoryLimits: {
      type: Map,
      of: Number,
      default: {}
    },
    cashMax: { type: Number, default: 2000 },
    requireDirectorAbove: {
      type: Map,
      of: Number,
      default: {}
    },
    weekendDisallow: { type: [String], default: [] }
  },
  statistics: {
    totalExpenses: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    monthlySpend: {
      type: Number,
      default: 0
    },
    yearlySpend: {
      type: Number,
      default: 0
    },
    lastExpenseDate: Date,
    averageExpenseAmount: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
siteSchema.virtual('fullAddress').get(function() {
  if (!this.location) {
    return '';
  }
  const { address, city, state, pincode, country } = this.location;
  return `${address || ''}, ${city || ''}, ${state || ''} ${pincode || ''}, ${country || ''}`;
});

// Virtual for budget utilization percentage
siteSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget || !this.statistics) return 0;
  if (this.budget.monthly === 0) return 0;
  return Math.round((this.statistics.monthlySpend / this.budget.monthly) * 100);
});

// Virtual for remaining budget
siteSchema.virtual('remainingBudget').get(function() {
  if (!this.budget || !this.statistics) return 0;
  return Math.max(0, this.budget.monthly - this.statistics.monthlySpend);
});

// Virtual for budget status
siteSchema.virtual('budgetStatus').get(function() {
  if (!this.budget) return 'healthy';
  const utilization = this.budgetUtilization;
  if (utilization >= 100) return 'exceeded';
  if (utilization >= this.budget.alertThreshold) return 'warning';
  return 'healthy';
});

// Virtual for operating status
siteSchema.virtual('isOperating').get(function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Add null check for workingDays
  if (!this.workingDays || !Array.isArray(this.workingDays)) {
    return false;
  }
  
  // Add null check for operatingHours
  if (!this.operatingHours || !this.operatingHours.start || !this.operatingHours.end) {
    return false;
  }
  
  return this.workingDays.includes(currentDay) && 
         currentTime >= this.operatingHours.start && 
         currentTime <= this.operatingHours.end;
});

// Indexes for performance
siteSchema.index({ code: 1 });
siteSchema.index({ name: 1 });
siteSchema.index({ isActive: 1 });
siteSchema.index({ 'location.city': 1 });
siteSchema.index({ 'location.state': 1 });
siteSchema.index({ createdBy: 1 });

// Pre-save middleware to update updatedAt and updatedBy
siteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to validate budget thresholds
siteSchema.pre('save', function(next) {
  const { l1Threshold, l2Threshold, l3Threshold } = this.approvalWorkflow;
  
  if (l1Threshold >= l2Threshold) {
    return next(new Error('L1 threshold must be less than L2 threshold'));
  }
  
  if (l2Threshold >= l3Threshold) {
    return next(new Error('L2 threshold must be less than L3 threshold'));
  }
  
  next();
});

// Method to check if site is within budget
siteSchema.methods.isWithinBudget = function(amount) {
  return (this.statistics.monthlySpend + amount) <= this.budget.monthly;
};

// Method to get approval level required for amount
siteSchema.methods.getRequiredApprovalLevel = function(amount) {
  const { autoApprovalLimit, l1Threshold, l2Threshold, l3Threshold } = this.approvalWorkflow;
  
  if (amount <= autoApprovalLimit) return 0;
  if (amount <= l1Threshold) return 1;
  if (amount <= l2Threshold) return 2;
  if (amount <= l3Threshold) return 3;
  return 3; // Anything above L3 threshold still requires L3 approval
};

// Method to update statistics
siteSchema.methods.updateStatistics = function(expenseAmount, isNewExpense = true) {
  if (isNewExpense) {
    this.statistics.totalExpenses += 1;
    this.statistics.totalAmount += expenseAmount;
    this.statistics.monthlySpend += expenseAmount;
    this.statistics.yearlySpend += expenseAmount;
    this.statistics.lastExpenseDate = new Date();
  }
  
  if (this.statistics.totalExpenses > 0) {
    this.statistics.averageExpenseAmount = this.statistics.totalAmount / this.statistics.totalExpenses;
  }
  
  return this.save();
};

// Method to reset monthly statistics
siteSchema.methods.resetMonthlyStats = function() {
  this.statistics.monthlySpend = 0;
  return this.save();
};

// Method to check if budget alert should be sent
siteSchema.methods.shouldSendBudgetAlert = function() {
  return this.budgetUtilization >= this.budget.alertThreshold;
};

// Method to get active departments
siteSchema.methods.getActiveDepartments = function() {
  return this.departments.filter(dept => dept.isActive !== false);
};

// Method to get active expense categories
siteSchema.methods.getActiveExpenseCategories = function() {
  return this.expenseCategories.filter(cat => cat.isActive === true);
};

// Static method to get sites by location
siteSchema.statics.getSitesByLocation = function(city, state) {
  const query = {};
  if (city) query['location.city'] = new RegExp(city, 'i');
  if (state) query['location.state'] = new RegExp(state, 'i');
  query.isActive = true;
  
  return this.find(query);
};

// Static method to get sites with budget alerts
siteSchema.statics.getSitesWithBudgetAlerts = function() {
  return this.find({
    isActive: true,
    $expr: {
      $gte: [
        { $divide: ['$statistics.monthlySpend', '$budget.monthly'] },
        { $divide: ['$budget.alertThreshold', 100] }
      ]
    }
  });
};

// Static method to get sites by manager
siteSchema.statics.getSitesByManager = function(managerEmail) {
  return this.find({
    'contact.manager.email': managerEmail,
    isActive: true
  });
};

module.exports = mongoose.model('Site', siteSchema, 'sites', {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}); 