// Google Apps Script to create Rakshak Expense Management Features Sheet
// Copy this code to Google Apps Script (script.google.com)

function createRakshakExpenseSheet() {
  // Create new spreadsheet
  var spreadsheet = SpreadsheetApp.create('Rakshak Expense Management Features');
  var sheet = spreadsheet.getActiveSheet();
  
  // Set headers
  sheet.getRange('A1').setValue('Feature/Topic');
  sheet.getRange('B1').setValue('Description');
  sheet.getRange('C1').setValue('Link');
  
  // Style headers
  var headerRange = sheet.getRange('A1:C1');
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#008080');
  headerRange.setFontColor('white');
  headerRange.setFontSize(12);
  
  // Data array
  var data = [
    ['LOGIN SYSTEM', 'Modern animated login page with Password and OTP login options. Supports Google OAuth, role-based access, forgot password, and demo credentials for testing. Features interactive particles, form animations, and mobile-responsive design.', 'https://customerzone.in/login'],
    
    ['DASHBOARD', 'Role-based dashboard showing expense statistics, budget utilization, pending approvals, and recent activity. Different views for Submitter, L1/L2/L3 Approvers, and Finance users with real-time updates and quick action buttons.', ''],
    
    ['EXPENSE SUBMISSION', 'Submit expenses with camera integration for receipts, GPS location capture, multiple categories (Travel, Food, Fuel, etc.), and AI-powered form filling. Supports voice input and natural language processing for easy expense entry.', ''],
    
    ['AI EXPENSE ASSISTANT', 'Voice and text-based AI assistant that extracts expense data from natural language. Supports commands like "₹500 taxi expense for Delhi site" and automatically fills expense forms with intelligent data extraction.', ''],
    
    ['MULTI-LEVEL APPROVAL', '4-level approval workflow: L1 (Regional Manager) → L2 (Admin) → L3 (Super Admin) → Finance. Automatic routing based on amount thresholds and policy rules with email notifications at each level.', ''],
    
    ['FRAUD DETECTION', 'Advanced fraud prevention system detecting duplicate receipts, soft duplicates, and suspicious patterns. Uses SHA256 hashing, normalized keys, and risk scoring (0-100) with automatic escalation for high-risk expenses.', ''],
    
    ['POLICY VALIDATION', 'Automated policy enforcement with configurable rules: per-category limits, cash caps, director thresholds, weekend restrictions, and distance validation. Flags violations and escalates to appropriate approval levels.', ''],
    
    ['GEO-TAGGING GPS', 'GPS location capture with reverse geocoding to verify expense locations. Detects location mismatches, distance violations, and ensures travel expenses are within policy limits using 2dsphere indexing.', ''],
    
    ['BUDGET MANAGEMENT', 'Site-wise budget allocation with monthly/yearly tracking, utilization monitoring, and automated alerts. Real-time budget consumption tracking with projected vs approved spending analysis.', ''],
    
    ['VEHICLE KM TRACKING', 'Track vehicle expenses with kilometer limits per site. Automatic validation of fuel and maintenance expenses against vehicle usage with approval workflow for excess usage.', ''],
    
    ['REAL-TIME NOTIFICATIONS', 'Socket.io powered real-time notifications for expense status updates, approvals, rejections, and budget alerts. Email and SMS notifications with user preference management.', ''],
    
    ['COMPREHENSIVE REPORTING', 'Advanced reporting system with expense summaries, budget utilization, approval analytics, and vehicle KM reports. Supports CSV export, date filtering, and role-based report access.', ''],
    
    ['ROLE-BASED ACCESS', '5 user roles: Submitter, L1 Approver, L2 Approver, L3 Approver (Super Admin), Finance. Each role has specific permissions and access to different features and data.', ''],
    
    ['SITE MANAGEMENT', 'Multi-site support with site-specific budgets, policies, and user assignments. Each site can have custom expense policies, approval workflows, and budget allocations.', ''],
    
    ['USER MANAGEMENT', 'Complete user lifecycle management with profile creation, role assignment, site allocation, and permission management. Supports profile photos, bank details, and notification preferences.', ''],
    
    ['ADMIN PANEL', 'Comprehensive admin interface for system management including user creation, site management, policy configuration, and system analytics. Accessible to L2/L3 approvers only.', ''],
    
    ['POLICY CONFIGURATION', 'Site-specific policy management with configurable rules: duplicate detection windows, per-category limits, cash caps, director escalation thresholds, and weekend restrictions.', ''],
    
    ['PAYMENT PROCESSING', 'Razorpay integration for digital payments with order creation, payment verification, and transaction tracking. Supports multiple payment methods and refund management.', ''],
    
    ['AUDIT TRAIL', 'Complete activity logging with audit trails for all user actions, expense modifications, approvals, and system events. Ensures compliance and provides forensic capabilities.', ''],
    
    ['SECURITY FEATURES', 'Enterprise-grade security with JWT authentication, bcrypt password hashing, rate limiting, input validation, XSS protection, and secure API endpoints.', ''],
    
    ['FILE MANAGEMENT', 'Secure file upload system with multiple format support, size validation, virus scanning, and receipt attachment management. Supports images, PDFs, and documents.', ''],
    
    ['ERROR HANDLING', 'User-friendly error management system converting technical errors into simple, actionable messages. Provides clear guidance without exposing sensitive system information.', ''],
    
    ['RESPONSIVE DESIGN', 'Mobile-first responsive design with Material-UI components, dark/light theme support, and optimized performance across all devices and screen sizes.', ''],
    
    ['GOOGLE OAUTH', 'Single sign-on integration with Google OAuth for seamless authentication. Supports automatic user creation and role assignment based on email domains.', ''],
    
    ['OTP LOGIN', 'Secure OTP-based login system with email delivery, time-based expiration, and one-time use tokens. Alternative to password-based authentication for enhanced security.', ''],
    
    ['FORGOT PASSWORD', 'Self-service password reset with email verification, secure token generation, and time-limited reset links. Works in both development and production environments.', ''],
    
    ['CAMERA INTEGRATION', 'Native camera integration for receipt capture with image compression, format validation, and direct upload to expense forms. Supports both mobile and desktop cameras.', ''],
    
    ['VOICE RECOGNITION', 'Web Speech API integration with support for Indian English accent, noise reduction, and real-time voice-to-text conversion for hands-free expense entry.', ''],
    
    ['NATURAL LANGUAGE', 'Advanced NLP for parsing expense data from natural language input. Extracts amounts, categories, dates, payment methods, and descriptions from conversational text.', ''],
    
    ['HINGLISH SUPPORT', 'Mixed Hindi-English language support for voice and text input. Recognizes Hinglish expressions like "₹500 ka expense hua" and "cash se pay kiya".', ''],
    
    ['BUDGET ALERTS', 'Automated budget monitoring with configurable thresholds, email alerts, and real-time notifications. Tracks monthly/yearly consumption and sends proactive warnings.', ''],
    
    ['EXPENSE CATEGORIES', 'Comprehensive categorization system: Travel, Food, Accommodation, Vehicle KM, Fuel, Equipment, Maintenance, Office Supplies, Miscellaneous with subcategory support.', ''],
    
    ['APPROVAL HISTORY', 'Complete approval workflow tracking with timestamps, approver details, comments, and status changes. Provides full audit trail for compliance and analysis.', ''],
    
    ['PENDING APPROVERS', 'Dynamic approval assignment system that automatically routes expenses to appropriate approvers based on amount, category, and policy rules.', ''],
    
    ['COMMENTS SYSTEM', 'Collaborative commenting system for expenses allowing approvers and submitters to add notes, request clarifications, and provide feedback throughout the approval process.', ''],
    
    ['NOTIFICATION PREFERENCES', 'Granular notification control allowing users to configure email, SMS, and push notification preferences for different types of events and updates.', ''],
    
    ['DARK MODE', 'Modern dark theme support with automatic system detection and user preference persistence. Optimized for reduced eye strain and better user experience.', ''],
    
    ['SEARCH FUNCTIONALITY', 'Advanced search capabilities across expenses, users, and sites with filters, date ranges, amount ranges, and status-based filtering for efficient data retrieval.', ''],
    
    ['EXPORT FEATURES', 'Data export functionality with CSV download support for reports, expense lists, and analytics data. Supports custom date ranges and filtered exports.', ''],
    
    ['HEALTH MONITORING', 'System health monitoring with uptime tracking, database connection status, memory usage monitoring, and performance metrics for system reliability.', ''],
    
    ['RATE LIMITING', 'API protection with configurable rate limits per endpoint, IP-based throttling, and abuse prevention. Protects against brute force attacks and system overload.', ''],
    
    ['ENVIRONMENT CONFIG', 'Flexible configuration management with environment-based settings, secure credential storage, and development/production environment separation.', ''],
    
    ['LOGGING SYSTEM', 'Comprehensive logging with Winston logger, multiple log levels, file rotation, and structured JSON logging for debugging and monitoring.', ''],
    
    ['DATABASE INDEXING', 'Optimized MongoDB indexing for performance with compound indexes on frequently queried fields, geospatial indexes for location data, and text indexes for search.', ''],
    
    ['SOCKET REALTIME', 'Real-time communication using Socket.io with room-based messaging, role-based notifications, and live status updates for collaborative expense management.', ''],
    
    ['MIDDLEWARE AUTH', 'Robust authentication middleware with JWT verification, role-based access control, permission checking, and secure route protection.', ''],
    
    ['API VALIDATION', 'Comprehensive input validation using Joi and express-validator with sanitization, type checking, and business rule validation for data integrity.', ''],
    
    ['ERROR RECOVERY', 'Graceful error handling with automatic retry mechanisms, fallback options, and user-friendly error messages to ensure system reliability.', ''],
    
    ['BACKUP SYSTEM', 'Automated data backup strategies with MongoDB backup scripts, environment variable backup, and disaster recovery procedures for data protection.', ''],
    
    ['PERFORMANCE OPT', 'System performance optimization with database query optimization, caching strategies, image compression, and lazy loading for enhanced user experience.', ''],
    
    ['MOBILE SUPPORT', 'Full mobile application support with responsive design, touch-friendly interfaces, mobile-specific features, and PWA capabilities for native-like experience.', '']
  ];
  
  // Add data to sheet
  var dataRange = sheet.getRange(2, 1, data.length, 3);
  dataRange.setValues(data);
  
  // Format columns
  sheet.setColumnWidth(1, 200); // Feature/Topic column
  sheet.setColumnWidth(2, 500); // Description column  
  sheet.setColumnWidth(3, 250); // Link column
  
  // Set text wrapping for description column
  sheet.getRange('B:B').setWrap(true);
  
  // Alternate row colors
  for(var i = 2; i <= data.length + 1; i++) {
    if(i % 2 == 0) {
      sheet.getRange(i + ':' + i).setBackground('#f8f9fa');
    }
  }
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Add filters
  sheet.getRange('A1:C' + (data.length + 1)).createFilter();
  
  // Get sheet URL
  var url = spreadsheet.getUrl();
  Logger.log('Sheet created successfully: ' + url);
  
  return url;
}

// Function to search features (for bot integration)
function searchFeature(searchTerm) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var results = [];
  
  searchTerm = searchTerm.toLowerCase();
  
  for(var i = 1; i < data.length; i++) {
    var feature = data[i][0].toLowerCase();
    var description = data[i][1].toLowerCase();
    
    if(feature.includes(searchTerm) || description.includes(searchTerm)) {
      results.push({
        feature: data[i][0],
        description: data[i][1],
        link: data[i][2]
      });
    }
  }
  
  return results;
}

// Test search function
function testSearch() {
  var results = searchFeature('login');
  Logger.log(results);
}
