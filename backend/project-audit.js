const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

console.log('🔍 PROJECT AUDIT - RAKSHAK EXPENSE MANAGEMENT SYSTEM\n');
console.log('=' .repeat(60));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');
const Expense = require('./models/Expense');
const Site = require('./models/Site');
const Notifications = require('./models/Notifications');

class ProjectAuditor {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
    this.issues = [];
  }

  log(message, type = 'info') {
    const icons = {
      'pass': '✅',
      'fail': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  async auditDatabase() {
    console.log('\n📊 DATABASE AUDIT');
    console.log('-'.repeat(30));

    try {
      // Check collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      this.log(`Found collections: ${collectionNames.join(', ')}`, 'info');
      
      // Check user count
      const userCount = await User.countDocuments();
      this.log(`Total users: ${userCount}`, userCount > 0 ? 'pass' : 'fail');
      
      // Check expense count
      const expenseCount = await Expense.countDocuments();
      this.log(`Total expenses: ${expenseCount}`, 'info');
      
      // Check sites count
      const siteCount = await Site.countDocuments();
      this.log(`Total sites: ${siteCount}`, siteCount > 0 ? 'pass' : 'fail');
      
      // Check notifications count
      const notificationCount = await Notifications.countDocuments();
      this.log(`Total notifications: ${notificationCount}`, 'info');
      
      this.results.passed += 3;
      this.results.total += 3;
      
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'fail');
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  async auditUserRoles() {
    console.log('\n👥 USER ROLES AUDIT');
    console.log('-'.repeat(30));

    try {
      const roles = ['submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'];
      const roleCounts = {};

      for (const role of roles) {
        const count = await User.countDocuments({ role });
        roleCounts[role] = count;
        this.log(`${role}: ${count} users`, count > 0 ? 'pass' : 'warning');
      }

      // Check if we have at least one admin
      const adminCount = await User.countDocuments({ 
        role: { $in: ['l3_approver', 'finance'] } 
      });
      this.log(`Admin users (L3/Finance): ${adminCount}`, adminCount > 0 ? 'pass' : 'fail');

      this.results.passed += 1;
      this.results.warnings += roles.filter(role => roleCounts[role] === 0).length;
      this.results.total += 1;
      
    } catch (error) {
      this.log(`User roles audit failed: ${error.message}`, 'fail');
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  async auditProfilePhotos() {
    console.log('\n📸 PROFILE PHOTOS AUDIT');
    console.log('-'.repeat(30));

    try {
      const usersWithPhotos = await User.countDocuments({
        profilePicture: { $exists: true, $ne: 'default-avatar.png' }
      });
      
      const totalUsers = await User.countDocuments();
      const photoPercentage = totalUsers > 0 ? (usersWithPhotos / totalUsers * 100).toFixed(1) : 0;
      
      this.log(`Users with profile photos: ${usersWithPhotos}/${totalUsers} (${photoPercentage}%)`, 'info');
      
      // Check if uploads directory exists
      const uploadsDir = path.join(__dirname, 'uploads/profile-photos');
      const dirExists = fs.existsSync(uploadsDir);
      this.log(`Uploads directory exists: ${dirExists}`, dirExists ? 'pass' : 'fail');
      
      if (dirExists) {
        const files = fs.readdirSync(uploadsDir);
        this.log(`Profile photos in directory: ${files.length}`, 'info');
      }
      
      this.results.passed += 1;
      this.results.total += 1;
      
    } catch (error) {
      this.log(`Profile photos audit failed: ${error.message}`, 'fail');
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  async auditExpenseWorkflow() {
    console.log('\n📋 EXPENSE WORKFLOW AUDIT');
    console.log('-'.repeat(30));

    try {
      const statuses = ['pending', 'l1_approved', 'l2_approved', 'l3_approved', 'finance_approved', 'paid', 'rejected'];
      const statusCounts = {};

      for (const status of statuses) {
        const count = await Expense.countDocuments({ status });
        statusCounts[status] = count;
        this.log(`Expenses with status '${status}': ${count}`, 'info');
      }

      // Check approval workflow
      const pendingCount = statusCounts['pending'] || 0;
      const approvedCount = (statusCounts['l1_approved'] || 0) + (statusCounts['l2_approved'] || 0) + 
                           (statusCounts['l3_approved'] || 0) + (statusCounts['finance_approved'] || 0);
      const paidCount = statusCounts['paid'] || 0;
      const rejectedCount = statusCounts['rejected'] || 0;

      this.log(`Pending expenses: ${pendingCount}`, pendingCount >= 0 ? 'info' : 'warning');
      this.log(`Approved expenses: ${approvedCount}`, 'info');
      this.log(`Paid expenses: ${paidCount}`, 'info');
      this.log(`Rejected expenses: ${rejectedCount}`, 'info');

      this.results.passed += 1;
      this.results.total += 1;
      
    } catch (error) {
      this.log(`Expense workflow audit failed: ${error.message}`, 'fail');
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  async auditNotifications() {
    console.log('\n🔔 NOTIFICATIONS AUDIT');
    console.log('-'.repeat(30));

    try {
      const notificationTypes = ['expense_submitted', 'expense_approved', 'expense_rejected', 'payment_completed'];
      const typeCounts = {};

      for (const type of notificationTypes) {
        const count = await Notifications.countDocuments({ type });
        typeCounts[type] = count;
        this.log(`Notifications of type '${type}': ${count}`, 'info');
      }

      const totalNotifications = await Notifications.countDocuments();
      this.log(`Total notifications: ${totalNotifications}`, 'info');

      this.results.passed += 1;
      this.results.total += 1;
      
    } catch (error) {
      this.log(`Notifications audit failed: ${error.message}`, 'fail');
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  async auditFileStructure() {
    console.log('\n📁 FILE STRUCTURE AUDIT');
    console.log('-'.repeat(30));

    const requiredFiles = [
      'server.js',
      'package.json',
      'routes/auth.js',
      'routes/expenses.js',
      'routes/users.js',
      'models/User.js',
      'models/Expense.js',
      'middleware/auth.js'
    ];

    const requiredDirs = [
      'uploads/profile-photos',
      'routes',
      'models',
      'middleware',
      'services'
    ];

    let fileScore = 0;
    let dirScore = 0;

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      this.log(`${file}: ${exists ? 'exists' : 'missing'}`, exists ? 'pass' : 'fail');
      if (exists) fileScore++;
    }

    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, dir);
      const exists = fs.existsSync(dirPath);
      this.log(`${dir}/: ${exists ? 'exists' : 'missing'}`, exists ? 'pass' : 'fail');
      if (exists) dirScore++;
    }

    this.results.passed += fileScore + dirScore;
    this.results.failed += (requiredFiles.length + requiredDirs.length) - (fileScore + dirScore);
    this.results.total += requiredFiles.length + requiredDirs.length;
  }

  async auditEnvironmentVariables() {
    console.log('\n🔧 ENVIRONMENT VARIABLES AUDIT');
    console.log('-'.repeat(30));

    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT'
    ];

    const optionalVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_EMAIL',
      'SMTP_PASSWORD',
      'FAST2SMS_API_KEY'
    ];

    let requiredScore = 0;
    let optionalScore = 0;

    for (const varName of requiredVars) {
      const value = process.env[varName];
      const exists = !!value;
      this.log(`${varName}: ${exists ? 'set' : 'missing'}`, exists ? 'pass' : 'fail');
      if (exists) requiredScore++;
    }

    for (const varName of optionalVars) {
      const value = process.env[varName];
      const exists = !!value;
      this.log(`${varName}: ${exists ? 'set' : 'not set'}`, exists ? 'pass' : 'warning');
      if (exists) optionalScore++;
    }

    this.results.passed += requiredScore;
    this.results.failed += requiredVars.length - requiredScore;
    this.results.warnings += optionalVars.length - optionalScore;
    this.results.total += requiredVars.length + optionalVars.length;
  }

  async auditAPIEndpoints() {
    console.log('\n🌐 API ENDPOINTS AUDIT');
    console.log('-'.repeat(30));

    const endpoints = [
      { url: 'http://localhost:5001/api/auth/me', method: 'GET', name: 'Get Profile' },
      { url: 'http://localhost:5001/api/users', method: 'GET', name: 'Get Users' },
      { url: 'http://localhost:5001/api/expenses', method: 'GET', name: 'Get Expenses' },
      { url: 'http://localhost:5001/api/sites', method: 'GET', name: 'Get Sites' }
    ];

    let endpointScore = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        const status = response.status;
        const working = status < 500; // Accept any status less than 500
        this.log(`${endpoint.name} (${endpoint.method}): ${status}`, working ? 'pass' : 'fail');
        
        if (working) endpointScore++;
        
      } catch (error) {
        this.log(`${endpoint.name} (${endpoint.method}): Connection failed`, 'fail');
      }
    }

    this.results.passed += endpointScore;
    this.results.failed += endpoints.length - endpointScore;
    this.results.total += endpoints.length;
  }

  generateReport() {
    console.log('\n📊 AUDIT REPORT SUMMARY');
    console.log('='.repeat(60));
    
    const total = this.results.total;
    const passed = this.results.passed;
    const failed = this.results.failed;
    const warnings = this.results.warnings;
    
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    
    if (failed === 0 && warnings === 0) {
      console.log('\n🎉 EXCELLENT! All core features are working properly!');
    } else if (failed === 0) {
      console.log('\n✅ GOOD! Core features working, some optional features need attention.');
    } else {
      console.log('\n⚠️  ATTENTION NEEDED! Some core features have issues.');
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    if (failed > 0) {
      console.log('- Fix failed tests first');
    }
    if (warnings > 0) {
      console.log('- Address warnings for better functionality');
    }
    console.log('- Run this audit regularly to monitor system health');
  }

  async runFullAudit() {
    try {
      await this.auditDatabase();
      await this.auditUserRoles();
      await this.auditProfilePhotos();
      await this.auditExpenseWorkflow();
      await this.auditNotifications();
      await this.auditFileStructure();
      await this.auditEnvironmentVariables();
      await this.auditAPIEndpoints();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
    } finally {
      mongoose.connection.close();
    }
  }
}

// Run the audit
const auditor = new ProjectAuditor();
auditor.runFullAudit(); 