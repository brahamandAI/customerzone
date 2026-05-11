const express = require('express');

/** Block expense creation when admin turned off canCreateExpenses (L1/L2 only). Submitters always allowed. */
function assertCanCreateExpense(req, res) {
  const r = req.user?.role;
  if (r === 'submitter') return true;
  if (['l1_approver', 'l2_approver'].includes(r)) {
    if (req.user.permissions && req.user.permissions.canCreateExpenses === false) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to create expenses. Ask your administrator to enable "Can Create Expenses".'
      });
      return false;
    }
  }
  return true;
}
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Site = require('../models/Site');
const ApprovalHistory = require('../models/ApprovalHistory');
const PendingApprover = require('../models/PendingApprovers');
const Comment = require('../models/Comments');
const fileStorage = require('../utils/fileStorage');
const { siteIdAllowedForUser, expenseSiteMatchForApprover } = require('../utils/userSiteAccess');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const policyService = require('../services/policy.service');

// Configure multer - use path relative to backend dir so uploads are always in same location
const backendUploadDir = path.join(__dirname, '..', 'uploads', 'expense-attachments');
if (!fs.existsSync(backendUploadDir)) {
  fs.mkdirSync(backendUploadDir, { recursive: true });
}

const expenseStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, backendUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'expense-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadExpenseFile = multer({
  storage: expenseStorage,
  limits: {
    fileSize: (Number(process.env.UPLOAD_MAX_MB || 100)) * 1024 * 1024 // default 100MB; configurable via env
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types (images, PDFs, Office, text, etc.)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv', 'application/csv',
      'application/octet-stream' // generic binary for unknown types
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'), false);
    }
  }
});

// Function to cleanup expired reservations
const cleanupExpiredReservations = async () => {
  try {
    const result = await Expense.deleteMany({
      status: 'reserved',
      isActive: false,
      reservationExpiry: { $lt: new Date() }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired expense number reservations`);
    }
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
  }
};

// Cleanup expired reservations every 10 minutes
setInterval(cleanupExpiredReservations, 10 * 60 * 1000);

// Function to generate sequential expense number
const generateSequentialExpenseNumber = async () => {
  try {
    // Find the highest expense number
    const highestExpense = await Expense.findOne(
      { expenseNumber: { $regex: /^EXP-\d{4}$/ } },
      { expenseNumber: 1 }
    ).sort({ expenseNumber: -1 });

    let nextNumber = 1;
    
    if (highestExpense) {
      // Extract the number from the highest expense number
      const currentNumber = parseInt(highestExpense.expenseNumber.replace('EXP-', ''));
      nextNumber = currentNumber + 1;
    }

    // Ensure the number is within 1-9999 range
    if (nextNumber > 9999) {
      nextNumber = 1; // Reset to 1 if we reach 9999
    }

    // Format as 4-digit string with leading zeros
    return `EXP-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating sequential expense number:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now();
    const fallbackNumber = (timestamp % 9999) + 1;
    return `EXP-${fallbackNumber.toString().padStart(4, '0')}`;
  }
};

// Function to reserve an expense number (prevent duplicates)
const reserveExpenseNumber = async (expenseNumber, userId) => {
  try {
    // Check if number is already reserved or used
    const existingReservation = await Expense.findOne({ 
      expenseNumber: expenseNumber 
    });

    if (existingReservation) {
      return false; // Number already taken
    }

    // Create a temporary reservation (expires in 30 minutes)
    const reservation = new Expense({
      expenseNumber: expenseNumber,
      clientId: 'TEMP_RESERVATION',
      clientName: 'TEMP_RESERVATION',
      description: 'Temporary reservation',
      amount: 0,
      category: 'Miscellaneous',
      expenseDate: new Date(),
      submittedBy: userId,
      site: '000000000000000000000000', // Dummy site ID
      department: 'TEMP',
      status: 'reserved',
      isActive: false, // Mark as inactive so it doesn't show in normal queries
      reservationExpiry: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    await reservation.save();
    return true; // Successfully reserved
  } catch (error) {
    console.error('Error reserving expense number:', error);
    return false;
  }
};

// Get next sequential expense number
router.get('/next-number', protect, authorize('submitter', 'l1_approver', 'l2_approver'), async (req, res) => {
  if (!assertCanCreateExpense(req, res)) return;
  try {
    const nextExpenseNumber = await generateSequentialExpenseNumber();
    
    // Try to reserve this number for the user
    const reserved = await reserveExpenseNumber(nextExpenseNumber, req.user._id);
    
    if (!reserved) {
      // If reservation failed, try the next number
      const nextNumber = parseInt(nextExpenseNumber.replace('EXP-', '')) + 1;
      const alternativeNumber = `EXP-${nextNumber.toString().padStart(4, '0')}`;
      const alternativeReserved = await reserveExpenseNumber(alternativeNumber, req.user._id);
      
      if (alternativeReserved) {
        return res.status(200).json({
          success: true,
          data: {
            expenseNumber: alternativeNumber
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Unable to reserve expense number'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        expenseNumber: nextExpenseNumber
      }
    });
  } catch (error) {
    console.error('Error getting next expense number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate expense number',
      error: error.message
    });
  }
});

// File upload route
router.post('/upload', protect, authorize('submitter', 'l1_approver', 'l2_approver'), uploadExpenseFile.single('file'), async (req, res) => {
  if (!assertCanCreateExpense(req, res)) return;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    
    // Validate file
    const validation = fileStorage.validateFile(file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        errors: validation.errors
      });
    }

    // Save file using file storage utility
    const result = await fileStorage.saveFile(file, 'expense');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save file',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// Create new expense
router.post('/create', protect, authorize('submitter', 'l1_approver', 'l2_approver'), async (req, res) => {
  if (!assertCanCreateExpense(req, res)) return;
  try {
    const {
      expenseNumber,
      clientId,
      clientName,
      description,
      amount,
      currency,
      category,
      subcategory,
      expenseDate,
      submittedById,
      siteId,
      department,
      vehicleKm,
      travel,
      accommodation,
      attachments,
      location,
      selectedL1Approver
    } = req.body;

    // Validate required fields
    if (!expenseNumber || !clientId || !clientName || !amount || !category || !expenseDate || !submittedById || !siteId || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    // Validate site access for restricted roles (L1/L2 may have multiple sites)
    const userRole = req.user.role;
    if (userRole === 'submitter' || userRole === 'l1_approver' || userRole === 'l2_approver') {
      if (!siteIdAllowedForUser(req.user, siteId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only submit expenses for a site assigned to you'
        });
      }
    }

    // Check for duplicate expense number (exclude reserved/temporary expenses)
    const existingExpense = await Expense.findOne({ 
      expenseNumber,
      status: { $ne: 'reserved' }, // Exclude reserved expenses
      isActive: true // Only check active expenses
    });

    if (existingExpense) {
      return res.status(400).json({
        success: false,
        message: 'This expense number already exists. Please use a different number.'
      });
    }

    // Create new expense with Mongoose
    const newExpense = new Expense({
        expenseNumber,
        clientId,
        clientName,
        description,
        amount: parseFloat(amount),
        currency: currency || 'INR',
        category,
        subcategory,
        expenseDate: new Date(expenseDate),
        submissionDate: new Date(),
      submittedBy: submittedById,
      site: siteId,
        department,
        selectedL1Approver: selectedL1Approver || null,
        vehicleKm: vehicleKm ? {
          startKm: vehicleKm.startKm,
          endKm: vehicleKm.endKm,
          totalKm: vehicleKm.totalKm,
          vehicleNumber: vehicleKm.vehicleNumber,
          purpose: vehicleKm.purpose,
          route: vehicleKm.route,
          ratePerKm: vehicleKm.ratePerKm || 10,
          exceedsLimit: vehicleKm.exceedsLimit || false,
          exceedReason: vehicleKm.exceedReason
        } : undefined,
        travel: travel ? {
          from: travel.from,
          to: travel.to,
          travelDate: travel.travelDate ? new Date(travel.travelDate) : null,
          returnDate: travel.returnDate ? new Date(travel.returnDate) : null,
          mode: travel.mode,
          bookingReference: travel.bookingReference,
          passengerName: travel.passengerName
        } : undefined,
        accommodation: accommodation ? {
          hotelName: accommodation.hotelName,
          checkIn: accommodation.checkIn ? new Date(accommodation.checkIn) : null,
          checkOut: accommodation.checkOut ? new Date(accommodation.checkOut) : null,
          location: accommodation.location,
          roomType: accommodation.roomType,
          guestName: accommodation.guestName,
          bookingReference: accommodation.bookingReference
        } : undefined,
        attachments: attachments || [],
        location: location && location.lat && location.lng ? {
          type: 'Point',
          coordinates: [Number(location.lng), Number(location.lat)],
          accuracy: location.accuracy ? Number(location.accuracy) : undefined
        } : undefined,
              status: 'submitted',
        requiredApprovalLevel: 4, // Set to 4 for L1 -> L2 -> L3 -> Finance workflow
        currentApprovalLevel: 0,
      isActive: true, // Mark as active for real expense
      reimbursement: {
        // If bankDetails is provided in req.body, use it; otherwise, fetch from user profile
        bankDetails: req.body.bankDetails || undefined
      }
    });

    // Clean up any temporary reservation for this expense number
    await Expense.deleteOne({ 
      expenseNumber: expenseNumber, 
      status: 'reserved',
      isActive: false 
    });

    // If bankDetails not provided, fetch from user profile and set
    if (!req.body.bankDetails) {
      const submitter = await User.findById(submittedById);
      if (submitter && submitter.bankDetails) {
        newExpense.reimbursement.bankDetails = submitter.bankDetails;
          }
    }

    // Fraud & policy evaluation before save
    try {
      // Compute receipt hash if any attachment exists
      let receiptHash = null;
      if (Array.isArray(newExpense.attachments) && newExpense.attachments.length > 0) {
        const primary = newExpense.attachments.find(a => a.isReceipt) || newExpense.attachments[0];
        if (primary?.path) {
          try {
            const normalized = primary.path.replace(/^[./\\]+/, '');
            const absPath = path.isAbsolute(primary.path)
              ? primary.path
              : path.join(process.cwd(), normalized);
            const filePath = fs.existsSync(absPath) ? absPath : (fs.existsSync(primary.path) ? primary.path : null);
            if (filePath) {
              const fileBuffer = fs.readFileSync(filePath);
              receiptHash = policyService.computeReceiptHash(fileBuffer);
            }
          } catch (e) {
            console.warn('Receipt hash compute failed:', e.message);
          }
        }
      }

      const normalizedKey = policyService.computeNormalizedKey({
        amount: newExpense.amount,
        date: newExpense.expenseDate,
        vendor: newExpense.clientId
      });

      newExpense.receiptHash = receiptHash;
      newExpense.normalizedKey = normalizedKey;

      const evaluation = await policyService.evaluateExpense({
        ...newExpense.toObject(),
        receiptHash,
        normalizedKey
      });

      newExpense.policyFlags = evaluation.flags;
      newExpense.riskScore = evaluation.riskScore;

      if (evaluation.nextAction === 'ESCALATE') {
        newExpense.status = 'under_review';
      }
    } catch (e) {
      console.error('⚠️ Policy evaluation failed, proceeding without flags:', e.message);
    }

    await newExpense.save();

    // Assign L1 approvers for the site (legacy `site` or multi `sites`)
    const l1Approvers = await User.find({
      role: 'l1_approver',
      isActive: true,
      $or: [{ site: siteId }, { sites: siteId }]
    });
    console.log('🧭 L1 assignment debug:', {
      expenseId: newExpense._id.toString(),
      siteId: siteId?.toString?.() || siteId,
      l1Count: l1Approvers.length,
      l1Ids: l1Approvers.map(a => a._id.toString())
    });
    let createdPA = 0;
    for (const approver of l1Approvers) {
      try {
        await PendingApprover.create({
          level: 1,
          approver: approver._id,
          expense: newExpense._id,
          status: 'pending'
        });
        createdPA += 1;
      } catch (e) {
        console.warn('⚠️ PendingApprover create failed:', e.message);
      }
    }
    const paCount = await PendingApprover.countDocuments({ expense: newExpense._id });
    console.log('🧭 L1 assignment result:', { createdPA, paCount });

    // Populate the expense with user and site details
    const populatedExpense = await Expense.findById(newExpense._id)
      .populate('submittedBy', 'name email department')
      .populate('site', 'name code');

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Prepare notification data
    const notificationData = {
      expenseId: newExpense._id,
      expenseNumber: newExpense.expenseNumber,
      clientId: newExpense.clientId,
      clientName: newExpense.clientName,
      submitter: populatedExpense.submittedBy.name,
      submitterEmail: populatedExpense.submittedBy.email,
      site: populatedExpense.site.name,
      department: newExpense.department,
      amount: newExpense.amount,
      category: newExpense.category,
      policyFlags: newExpense.policyFlags || [],
      riskScore: newExpense.riskScore || 0,
      timestamp: new Date()
    };

    // Emit Socket.IO events synchronously (fast, in-memory)
    io.to('role-l1_approver')
      .to('role-l2_approver')
      .to('role-l3_approver')
      .emit('new_expense_submitted', notificationData);

    const budgetUpdateData = {
      siteId: populatedExpense.site._id,
      siteName: populatedExpense.site.name,
      expenseAmount: newExpense.amount,
      timestamp: new Date()
    };
    io.to('budget-alerts').emit('expense-created', budgetUpdateData);
    console.log('📊 Budget update emitted for new expense:', budgetUpdateData);

    // Send response immediately — do not block on email/SMS
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: populatedExpense
    });

    // Fire-and-forget: send email/SMS only to the selected L1 approver (if chosen), else all L1 approvers
    const notifyApprovers = selectedL1Approver
      ? l1Approvers.filter(a => a._id.toString() === selectedL1Approver.toString())
      : l1Approvers;

    console.log(`📧 Sending notifications to ${notifyApprovers.length} L1 approver(s) (background)...`);
    for (const approver of notifyApprovers) {
      if (approver.preferences?.notifications?.email) {
        emailService.sendExpenseNotification(approver, notificationData)
          .catch(err => console.error(`❌ Email failed for ${approver.email}:`, err.message));
      }
      if (approver.preferences?.notifications?.sms && approver.phone) {
        smsService.sendExpenseNotification(approver.phone, notificationData)
          .catch(err => console.error(`❌ SMS failed for ${approver.phone}:`, err.message));
      }
    }

  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all expenses
router.get('/all', protect, async (req, res) => {
  try {
    const user = req.user;
    let query = { isActive: true, isDeleted: false };

    // Role-based filtering
    if (user.role === 'submitter') {
      // Submitters can only see their own expenses
      query.submittedBy = user._id;
    } else if (user.role === 'l1_approver' || user.role === 'l2_approver') {
      const em = expenseSiteMatchForApprover(user);
      if (em) Object.assign(query, em);
    }
    // L3 approvers and Finance can see all expenses (no additional filtering)

    console.log('🔍 Expenses query for user role:', user.role, 'Query:', query);

    const expenses = await Expense.find(query)
      .select('expenseNumber clientId clientName amount category expenseDate submittedBy site status policyFlags riskScore approvalHistory exportedToExcel exportedAt exportedBy exportCount selectedL1Approver')
      .populate('submittedBy', 'name email department bankDetails')
      .populate('site', 'name code fullAddress budgetUtilization remainingBudget budgetStatus isOperating')
      .populate('approvalHistory.approver', 'name email role')
      .sort({ createdAt: -1 });

    console.log('📊 Found expenses count:', expenses.length);

    res.json({
      success: true,
      data: expenses
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get expenses by submitter
router.get('/submitter/:submitterId', async (req, res) => {
  try {
    const { submitterId } = req.params;
    
    const expenses = await Expense.find({ 
      submittedBy: submitterId,
      isActive: true,
      isDeleted: false
    })
    .populate('site', 'name code')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: expenses
    });

  } catch (error) {
    console.error('Error fetching submitter expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get expenses rejected by current user (at their level)
router.get('/rejected-by-me', protect, authorize('l1_approver', 'l2_approver', 'l3_approver', 'finance'), async (req, res) => {
  try {
    const userId = req.user._id;

    const rejectedExpenses = await Expense.find({
      status: 'rejected',
      'approvalHistory.approver': userId,
      'approvalHistory.action': 'rejected',
      isActive: true,
      isDeleted: false
    })
    .populate('submittedBy', 'name email department')
    .populate('site', 'name code')
    .populate('approvalHistory.approver', 'name email role')
    .sort({ updatedAt: -1 });

    // Filter to only those where current user was the one who rejected
    const filtered = rejectedExpenses.filter(exp => {
      const rejectedEntry = exp.approvalHistory?.find(
        h => h.action === 'rejected' && h.approver?._id?.toString() === userId.toString()
      );
      return !!rejectedEntry;
    });

    res.json({
      success: true,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching rejected expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// L3 Super Admin: expenses this user approved at L3, still with Finance (awaiting payment)
router.get('/l3-awaiting-finance', protect, authorize('l3_approver'), async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({
      status: 'approved_l3',
      approvalHistory: {
        $elemMatch: {
          approver: userId,
          level: 3,
          action: 'approved'
        }
      },
      isActive: true,
      isDeleted: false
    })
      .populate('submittedBy', 'name email department')
      .populate('site', 'name code')
      .populate('approvalHistory.approver', 'name email role')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching L3 awaiting finance expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// L3 Super Admin: expenses this user approved at L3 where payment is completed
router.get('/l3-payments-completed', protect, authorize('l3_approver'), async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({
      status: { $in: ['payment_processed', 'reimbursed'] },
      approvalHistory: {
        $elemMatch: {
          approver: userId,
          level: 3,
          action: 'approved'
        }
      },
      isActive: true,
      isDeleted: false
    })
      .populate('submittedBy', 'name email department')
      .populate('site', 'name code')
      .populate('approvalHistory.approver', 'name email role')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching L3 payments completed expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get expenses for approval (pending expenses)
router.get('/pending', protect, authorize('l1_approver', 'l2_approver', 'l3_approver', 'finance'), async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    
    // Get expenses where user is a pending approver
    const pendingApprovals = await PendingApprover.find({
      approver: userId,
      status: 'pending'
    }).select('expense');

    const pendingExpenseIds = pendingApprovals.map(pa => pa.expense);
    
    // Role-based filtering (include 'returned' - expenses sent back for correction)
    let statusFilter = {};
    if (userRole === 'l1_approver') {
      statusFilter = { status: { $in: ['submitted', 'under_review', 'returned'] } };
    } else if (userRole === 'l2_approver') {
      statusFilter = { status: { $in: ['approved_l1', 'returned'] } };
    } else if (userRole === 'l3_approver') {
      statusFilter = { status: { $in: ['approved_l2', 'returned'] } };
    } else if (userRole === 'finance') {
      statusFilter = { status: { $in: ['approved_l3', 'returned'] } };
    } else {
      statusFilter = { status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2', 'approved_l3', 'returned'] } };
    }
    
    const expenses = await Expense.find({
      _id: { $in: pendingExpenseIds },
      ...statusFilter,
      isActive: true,
      isDeleted: false
    })
    .populate('submittedBy', 'name email department bankDetails')
    .populate('site', 'name code')
    .populate('pendingApprovers.approver', 'name email role')
    .populate('approvalHistory.approver', 'name email role')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: expenses
    });

  } catch (error) {
    console.error('Error fetching pending expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get expense by ID
router.get('/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    
    const expense = await Expense.findById(expenseId)
      .select('+policyFlags +riskScore +attachments +approvalHistory +pendingApprovers')
      .populate('submittedBy', 'name email department bankDetails')
      .populate('site', 'name code')
      .populate('approvalHistory.approver', 'name email role')
      .populate('pendingApprovers.approver', 'name email role');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get expense attachments
router.get('/:expenseId/attachments', protect, async (req, res) => {
  try {
    const { expenseId } = req.params;
    
    const expense = await Expense.findById(expenseId).select('attachments');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense.attachments
    });
  } catch (error) {
    console.error('Error fetching expense attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense attachments'
    });
  }
});

// Download attachment file
router.get('/:expenseId/attachments/:attachmentId/download', protect, async (req, res) => {
  try {
    const { expenseId, attachmentId } = req.params;
    
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const attachment = expense.attachments.id(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Resolve file path - handle both absolute (new uploads) and relative (legacy) paths
    let filePath = attachment.path;
    if (!path.isAbsolute(filePath)) {
      const normalized = filePath.replace(/^[./\\]+/, '').replace(/\\/g, '/');
      const candidates = [
        path.join(process.cwd(), normalized),
        path.join(__dirname, '..', normalized),
        path.join(backendUploadDir, path.basename(normalized))
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          filePath = candidate;
          break;
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${attachment.path}`);
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set headers for file download and CORS
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // For PDFs, allow iframe embedding for preview
    if (attachment.mimetype && attachment.mimetype.includes('pdf')) {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
    } else {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading attachment'
    });
  }
});

// Update expense status (approval/rejection)
router.put('/:expenseId/approve', protect, authorize('l1_approver', 'l2_approver', 'l3_approver', 'finance'), async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { 
      level, 
      approver, 
      approverId: approverIdFromBody, 
      comments, 
      modifiedAmount, 
      modificationReason,
      action, // 'approve', 'reject', or 'payment'
      paymentAmount,
      paymentDate
    } = req.body;

    console.log('🚀 Approval request received:', {
      expenseId,
      action,
      level,
      approverId: approverIdFromBody,
      user: req.user?.name,
      userRole: req.user?.role
    });

    // Prefer authenticated user ID if available
    const approverId = req.user?.id || req.user?._id || approverIdFromBody;
    if (!approverId) {
      console.error('❌ No approver ID found');
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required for approval.'
      });
    }

    const expense = await Expense.findById(expenseId)
      .populate('submittedBy', 'name email')
      .populate('site', 'name code');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Create approval history record
    const approvalHistoryRecord = new ApprovalHistory({
      level: typeof level === 'string' ? parseInt(level.replace('L', '')) : parseInt(level),
      approver: approverId,
      expense: expenseId,
      action: action === 'approve' ? 'approved' : action === 'payment' ? 'payment_processed' : 'rejected',
      comments: comments || '',
      date: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : undefined,
      modificationReason,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined
    });

    await approvalHistoryRecord.save();

    // Add approval history entry to the expense document
    const approvalHistoryEntry = {
      approver: approverId,
      action: action === 'approve' ? 'approved' : action === 'payment' ? 'payment_processed' : 'rejected',
      date: new Date(),
      comments: comments || '',
      level: typeof level === 'string' ? parseInt(level.replace('L', '')) : parseInt(level),
      modifiedAmount: modifiedAmount ? parseFloat(modifiedAmount) : undefined,
      modificationReason,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined
    };

    console.log('➕ Adding approval history entry to expense:', approvalHistoryEntry);

    // Update expense status and other fields
    const levelNum = typeof level === 'string' ? parseInt(level.replace('L', '')) : parseInt(level);
    
    // For reject: return to previous approver (level 2+) or fully reject (level 1)
    const rejectStatus = levelNum >= 2 ? 'returned' : 'rejected';

    const updateData = {
      status: action === 'reject' ? rejectStatus : 
              action === 'payment' ? 'payment_processed' :
              levelNum === 1 ? 'approved_l1' :
              levelNum === 2 ? 'approved_l2' :
              levelNum === 3 ? 'approved_l3' :
              levelNum === 4 ? 'approved_finance' : 'submitted',
      currentApprovalLevel: action === 'reject' ? expense.currentApprovalLevel : levelNum,
      $push: { approvalHistory: approvalHistoryEntry }
    };

    // Add modified amount if provided
    if (modifiedAmount !== undefined && modifiedAmount !== null) {
      updateData.amount = parseFloat(modifiedAmount);
      updateData.modificationReason = modificationReason;
    }

    // Add payment details if payment action
    if (action === 'payment') {
      updateData.paymentAmount = paymentAmount ? parseFloat(paymentAmount) : parseFloat(modifiedAmount || expense.amount);
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      updateData.paymentProcessedBy = approverId;
    }

    // Update the expense
    console.log('📝 Updating expense with data:', updateData);
    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      updateData,
      { new: true }
    )
    .populate('submittedBy', 'name email')
    .populate('site', 'name code')
    .populate('approvalHistory.approver', 'name email role');

    console.log('✅ Expense updated successfully:', {
      expenseId: updatedExpense._id,
      expenseNumber: updatedExpense.expenseNumber,
      status: updatedExpense.status,
      currentApprovalLevel: updatedExpense.currentApprovalLevel
    });

    // Update site statistics when expense is approved (L3 final approval or payment)
    if ((action === 'approve' && levelNum === 3) || action === 'payment') {
      try {
        const Site = require('../models/Site');
        const site = await Site.findById(updatedExpense.site._id);
        
        if (site) {
          // Update site statistics
          const expenseAmount = modifiedAmount || updatedExpense.amount;
          await site.updateStatistics(expenseAmount, true);
          
          console.log('✅ Site statistics updated for expense approval:', {
            siteId: site._id,
            siteName: site.name,
            expenseAmount: expenseAmount,
            newMonthlySpend: site.statistics.monthlySpend,
            newBudgetUtilization: site.budgetUtilization
          });

          // Emit budget update event for real-time updates
          const io = req.app.get('io');
          const budgetUpdateData = {
            siteId: site._id,
            siteName: site.name,
            budgetUtilization: site.budgetUtilization,
            monthlySpend: site.statistics.monthlySpend,
            remainingBudget: site.remainingBudget,
            timestamp: new Date()
          };
          
          // Emit to budget alerts room
          io.to('budget-alerts').emit('budget-updated', budgetUpdateData);
          io.to('budget-alerts').emit('site-budget-changed', budgetUpdateData);
          
          console.log('📊 Budget update emitted:', budgetUpdateData);
        }
      } catch (error) {
        console.error('❌ Error updating site statistics:', error);
      }
    }

    // Send email and SMS notifications to submitter about status update
    console.log('📧 Sending status update notifications to submitter...');
    try {
      const submitter = updatedExpense.submittedBy;
      const approverUser = await User.findById(approverId);
      const approverName = approverUser ? approverUser.name : 'System';
      
      // Prepare expense data for notifications
      const expenseNotificationData = {
        expenseNumber: updatedExpense.expenseNumber,
        clientId: updatedExpense.clientId,
        clientName: updatedExpense.clientName,
        amount: modifiedAmount || updatedExpense.amount,
        category: updatedExpense.category,
        site: updatedExpense.site.name,
        submitterEmail: submitter.email
      };

      // Send email notification to submitter if enabled
      if (submitter.preferences?.notifications?.email) {
        console.log(`📧 Sending status update email to submitter: ${submitter.email}`);
        await emailService.sendExpenseStatusUpdate(expenseNotificationData, action, approverName);
      }

      // Send SMS notification to submitter if enabled
      if (submitter.preferences?.notifications?.sms && submitter.phone) {
        console.log(`📱 Sending status update SMS to submitter: ${submitter.phone}`);
        await smsService.sendExpenseStatusUpdate(submitter.phone, expenseNotificationData, action, approverName);
      }
    } catch (error) {
      console.error('❌ Failed to send status update notifications:', error);
    }

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Get user role for socket notifications
    const userRole = req.user.role;

    // Prepare notification data
    const notificationData = {
      expenseId: updatedExpense._id,
      expenseNumber: updatedExpense.expenseNumber,
      clientId: updatedExpense.clientId,
      clientName: updatedExpense.clientName,
      amount: updatedExpense.amount,
      status: updatedExpense.status,
      submitter: updatedExpense.submittedBy.name,
      site: updatedExpense.site.name,
      approver: approver,
      level: level,
      action: action,
      timestamp: new Date()
    };

    // Emit notifications based on action and level
    if (action === 'approve') {
      console.log('Emitting approval notification for level:', levelNum);
      
      const socketData = {
        ...notificationData,
        status: updatedExpense.status, // Use actual expense status instead of hardcoded 'approved'
        amount: modifiedAmount || updatedExpense.amount,
        category: updatedExpense.category,
        siteName: updatedExpense.site.name,
        siteId: updatedExpense.site._id,
        timestamp: new Date()
      };
      
      console.log('Socket data to be emitted:', socketData);

      // Normalize role names to lowercase
      const l1Room = 'role-l1_approver';
      const l2Room = 'role-l2_approver';
      const l3Room = 'role-l3_approver';

      // Always emit to the specific user's room
      if (approverId) {
        const userRoom = `user-${approverId}`;
        console.log('📡 Emitting to specific approver room:', userRoom);
        io.to(userRoom).emit('expense-updated', socketData);
        console.log('✅ Emitted to user room:', userRoom);
      }

      // Emit to appropriate role rooms
      if (levelNum === 1) {
        console.log('📡 L1 Approval - Emitting to rooms:', { l1Room, l2Room });
        // Notify L1 approvers about their approval
        io.to(l1Room).emit('expense-updated', socketData);
        console.log('✅ Emitted to L1 room:', l1Room);
        // Notify L2 approvers about pending approval
        io.to(l2Room).emit('expense_approved_l1', socketData);
        console.log('✅ Emitted to L2 room:', l2Room);
      } else if (levelNum === 2) {
        console.log('📡 L2 Approval - Emitting to rooms:', { l2Room, l3Room });
        // Notify L2 approvers about their approval
        io.to(l2Room).emit('expense-updated', socketData);
        console.log('✅ Emitted to L2 room:', l2Room);
        // Notify L3 approvers about pending approval
        io.to(l3Room).emit('expense_approved_l2', socketData);
        console.log('✅ Emitted to L3 room:', l3Room);
      } else if (levelNum === 3) {
        console.log('📡 L3 Approval - Emitting to room:', l3Room);
        // Notify L3 approvers about final approval
        io.to(l3Room).emit('expense-updated', socketData);
        console.log('✅ Emitted to L3 room:', l3Room);
        // Notify submitter
        io.to(`user-${updatedExpense.submittedBy._id}`).emit('expense_approved_final', socketData);
        console.log('✅ Emitted to submitter:', `user-${updatedExpense.submittedBy._id}`);
      }

      // Broadcast to all connected clients that need to update their dashboards
      console.log('📡 Broadcasting expense update to all relevant rooms');
      io.emit('dashboard-update', socketData);
      console.log('✅ Broadcasted dashboard-update event');
    } else if (action === 'payment') {
      // Handle payment processing
      console.log('Emitting payment notification for L3:', levelNum);
      
      const submitterId =
        updatedExpense.submittedBy?._id ?? updatedExpense.submittedBy;
      const socketData = {
        ...notificationData,
        status: 'payment_processed',
        submittedById: submitterId,
        amount: paymentAmount || modifiedAmount || updatedExpense.amount,
        category: updatedExpense.category,
        siteName: updatedExpense.site.name,
        siteId: updatedExpense.site._id,
        paymentAmount: paymentAmount || modifiedAmount || updatedExpense.amount,
        paymentDate: paymentDate || new Date(),
        timestamp: new Date()
      };
      
      console.log('Payment socket data to be emitted:', socketData);

      // Emit to L3 approvers (finance team)
      const l3Room = 'role-l3_approver';
      
      // Emit to specific approver
      if (approverId) {
        const userRoom = `user-${approverId}`;
        console.log('Emitting payment to specific approver:', userRoom);
        io.to(userRoom).emit('expense-updated', socketData);
      }

      // Emit to L3 room
      io.to(l3Room).emit('expense-updated', socketData);
      
      // Emit payment processed event to L3 approver
      io.to(l3Room).emit('expense_payment_processed', socketData);
      
      // Notify submitter about payment
      io.to(`user-${updatedExpense.submittedBy._id}`).emit('expense_payment_processed', socketData);

      // Broadcast update
      console.log('Broadcasting payment update to all relevant rooms');
      io.emit('dashboard-update', socketData);
    } else {
      // Handle rejection
      const socketData = {
        ...notificationData,
        status: 'rejected',
        amount: modifiedAmount || updatedExpense.amount,
        category: updatedExpense.category,
        siteName: updatedExpense.site.name,
        siteId: updatedExpense.site._id,
        timestamp: new Date()
      };
      
      console.log('Emitting rejection notification:', socketData);
      
      // Normalize role name to lowercase
      const roleRoom = `role-${userRole.toLowerCase()}`;
      console.log('Emitting to role room:', roleRoom);
      
      // Emit to specific approver
      if (approverId) {
        const userRoom = `user-${approverId}`;
        console.log('Emitting to specific approver:', userRoom);
        io.to(userRoom).emit('expense-updated', socketData);
      }

      // Emit to role room
      io.to(roleRoom).emit('expense-updated', socketData);

      // Notify submitter
      io.to(`user-${updatedExpense.submittedBy._id}`).emit('expense_rejected', socketData);

      // Broadcast update
      console.log('Broadcasting expense rejection to all relevant rooms');
      io.emit('dashboard-update', socketData);
    }

    // After updating the expense and before sending response, handle next level PendingApprover creation
    if (action === 'approve') {
      if (levelNum === 1) {
        // Remove L1 PendingApprover for this expense and approver
        await PendingApprover.deleteMany({ expense: expenseId, level: 1, approver: approverId });
        // L2 approvers assigned to this expense's site (legacy `site` or multi `sites`)
        const expenseSiteRef = updatedExpense.site?._id || updatedExpense.site;
        const l2Approvers = await User.find({
          role: 'l2_approver',
          isActive: true,
          $or: [{ site: expenseSiteRef }, { sites: expenseSiteRef }]
        });
        for (const approver of l2Approvers) {
          await PendingApprover.create({
            level: 2,
            approver: approver._id,
            expense: expenseId,
            status: 'pending'
          });
        }
        // Notify L2 approvers via email/SMS
        try {
          const notifyData = {
            expenseNumber: updatedExpense.expenseNumber,
            clientId: updatedExpense.clientId,
            clientName: updatedExpense.clientName,
            submitter: updatedExpense.submittedBy?.name,
            submitterEmail: updatedExpense.submittedBy?.email,
            site: updatedExpense.site?.name,
            department: updatedExpense.department,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            policyFlags: updatedExpense.policyFlags || [],
            riskScore: updatedExpense.riskScore || 0,
            timestamp: new Date()
          };
          for (const a of l2Approvers) {
            if (a?.preferences?.notifications?.email && a.email) {
              await emailService.sendExpenseNotification(a, notifyData);
            }
            if (a?.preferences?.notifications?.sms && a.phone) {
              await smsService.sendExpenseNotification(a.phone, notifyData);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to notify L2 approvers:', e.message);
        }
      } else if (levelNum === 2) {
        // Remove L2 PendingApprover for this expense and approver
        await PendingApprover.deleteMany({ expense: expenseId, level: 2, approver: approverId });
        // Create L3 PendingApprover(s) for Super Admin approval
        const l3Approvers = await User.find({ role: 'l3_approver', isActive: true });
        for (const approver of l3Approvers) {
          await PendingApprover.create({
            level: 3,
            approver: approver._id,
            expense: expenseId,
            status: 'pending'
          });
        }
        // Notify L3 approvers via email/SMS
        try {
          const notifyData = {
            expenseNumber: updatedExpense.expenseNumber,
            clientId: updatedExpense.clientId,
            clientName: updatedExpense.clientName,
            submitter: updatedExpense.submittedBy?.name,
            submitterEmail: updatedExpense.submittedBy?.email,
            site: updatedExpense.site?.name,
            department: updatedExpense.department,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            policyFlags: updatedExpense.policyFlags || [],
            riskScore: updatedExpense.riskScore || 0,
            timestamp: new Date()
          };
          for (const a of l3Approvers) {
            if (a?.preferences?.notifications?.email && a.email) {
              await emailService.sendExpenseNotification(a, notifyData);
            }
            if (a?.preferences?.notifications?.sms && a.phone) {
              await smsService.sendExpenseNotification(a.phone, notifyData);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to notify L3 approvers:', e.message);
        }
      } else if (levelNum === 3) {
        // Remove L3 PendingApprover for this expense and approver
        await PendingApprover.deleteMany({ expense: expenseId, level: 3, approver: approverId });
        // Create Finance PendingApprover(s) for payment processing
        const financeApprovers = await User.find({ role: 'finance', isActive: true });
        for (const approver of financeApprovers) {
          await PendingApprover.create({
            level: 4,
            approver: approver._id,
            expense: expenseId,
            status: 'pending'
          });
        }
        // Notify Finance via email/SMS
        try {
          const notifyData = {
            expenseNumber: updatedExpense.expenseNumber,
            clientId: updatedExpense.clientId,
            clientName: updatedExpense.clientName,
            submitter: updatedExpense.submittedBy?.name,
            submitterEmail: updatedExpense.submittedBy?.email,
            site: updatedExpense.site?.name,
            department: updatedExpense.department,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            policyFlags: updatedExpense.policyFlags || [],
            riskScore: updatedExpense.riskScore || 0,
            timestamp: new Date()
          };
          for (const a of financeApprovers) {
            if (a?.preferences?.notifications?.email && a.email) {
              await emailService.sendExpenseNotification(a, notifyData);
            }
            if (a?.preferences?.notifications?.sms && a.phone) {
              await smsService.sendExpenseNotification(a.phone, notifyData);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to notify Finance:', e.message);
        }
              } else if (levelNum === 4) {
          // Remove Finance PendingApprover for this expense and approver
          await PendingApprover.deleteMany({ expense: expenseId, level: 4, approver: approverId });
        }
    } else if (action === 'payment') {
      // Remove L3 PendingApprover for this expense and approver (payment completes the process)
      await PendingApprover.deleteMany({ expense: expenseId, level: 3, approver: approverId });
    } else if (action === 'reject') {
      await PendingApprover.deleteMany({ expense: expenseId });

      // Return to previous approver for correction (L2+ rejections)
      if (levelNum >= 2) {
        const prevLevel = levelNum - 1;
        const prevApproval = (expense.approvalHistory || []).find(
          h => h.level === prevLevel && (h.action === 'approved' || h.action === 'payment_processed')
        );
        const previousApproverId = prevApproval?.approver?._id ?? prevApproval?.approver;

        if (previousApproverId) {
          await PendingApprover.create({
            level: prevLevel,
            approver: previousApproverId,
            expense: expenseId,
            status: 'pending'
          });
          console.log(`↩️ Expense returned to level ${prevLevel} approver for correction`);
        } else {
          // Fallback: fully reject if no previous approver found
          await Expense.findByIdAndUpdate(expenseId, { status: 'rejected' });
        }
      }
    }

    const responseData = {
      success: true,
      message: action === 'payment' ? 'Payment processed successfully' : 
               `Expense ${action === 'reject' ? 'rejected' : 'approved'} successfully`,
      data: updatedExpense
    };

    console.log('📤 Sending success response:', {
      success: responseData.success,
      message: responseData.message,
      expenseId: updatedExpense._id,
      expenseNumber: updatedExpense.expenseNumber,
      status: updatedExpense.status
    });

    res.json(responseData);

  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Mark expenses as exported to Excel
router.post('/mark-exported', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { expenseIds } = req.body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one expense ID'
      });
    }

    const now = new Date();

    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      {
        $set: {
          exportedToExcel: true,
          exportedAt: now,
          exportedBy: req.user._id
        },
        $inc: { exportCount: 1 }
      }
    );

    return res.json({
      success: true,
      message: `${expenseIds.length} expense(s) marked as exported`,
      exportedAt: now
    });
  } catch (error) {
    console.error('Error marking expenses as exported:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark expenses as exported'
    });
  }
});

module.exports = router;