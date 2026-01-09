const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
              this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  async sendExpenseNotification(approver, expenseData) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: approver.email,
        subject: `🔔 New Expense Approval Required - ${expenseData.expenseNumber}`,
        html: this.generateExpenseNotificationHTML(expenseData),
        text: this.generateExpenseNotificationText(expenseData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email notification sent successfully to:', approver.email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      return false;
    }
  }

  async sendExpenseStatusUpdate(expenseData, action, approverName) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: expenseData.submitterEmail,
        subject: `📋 Expense ${action} - ${expenseData.expenseNumber}`,
        html: this.generateStatusUpdateHTML(expenseData, action, approverName),
        text: this.generateStatusUpdateText(expenseData, action, approverName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Status update email sent successfully to:', expenseData.submitterEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send status update email:', error);
      return false;
    }
  }

  async sendBudgetAlert(siteData, budgetUtilization) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: siteData.managerEmail,
        subject: `⚠️ Budget Alert - ${siteData.siteName}`,
        html: this.generateBudgetAlertHTML(siteData, budgetUtilization),
        text: this.generateBudgetAlertText(siteData, budgetUtilization)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Budget alert email sent successfully to:', siteData.managerEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send budget alert email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: userEmail,
        subject: '🔐 Password Reset Request - Rakshak Expense System',
        html: this.generatePasswordResetHTML(resetUrl),
        text: this.generatePasswordResetText(resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully to:', userEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  async sendOtpEmail(userEmail, otp) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: userEmail,
        subject: '🔐 Your One-Time Login Code (OTP)',
        html: this.generateOtpHTML(otp),
        text: this.generateOtpText(otp)
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully to:', userEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }

  generateOtpHTML(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Login OTP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #008080; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .code { font-size: 28px; letter-spacing: 6px; font-weight: 800; background: white; padding: 12px 20px; text-align: center; border-radius: 10px; border: 1px solid #e0e0e0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 One-Time Login Code</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Use the OTP below to login to Rakshak Expense Management System. This code is valid for 5 minutes.</p>
            <p class="code">${otp}</p>
            <p>If you did not request this code, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Rakshak Expense Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOtpText(otp) {
    return `
One-Time Login Code (OTP)

Use this code to login. It is valid for 5 minutes:

${otp}

If you did not request this, please ignore this email.
    `;
  }

  generateExpenseNotificationHTML(expenseData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Expense Approval Required</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .expense-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1976d2; }
          .button { display: inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Expense Approval Required</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A new expense has been submitted and requires your approval.</p>
            
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Expense Number:</strong> ${expenseData.expenseNumber}</p>
              <p><strong>Title:</strong> ${expenseData.title}</p>
              <p><strong>Submitter:</strong> ${expenseData.submitter}</p>
              <p><strong>Amount:</strong> ₹${expenseData.amount}</p>
              <p><strong>Category:</strong> ${expenseData.category}</p>
              <p><strong>Site:</strong> ${expenseData.site}</p>
              <p><strong>Department:</strong> ${expenseData.department}</p>
              <p><strong>Submitted Date:</strong> ${new Date(expenseData.timestamp).toLocaleString('en-IN')}</p>
            </div>
            
            <p>Please log in to the system to review and approve/reject this expense.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/approval" class="button">Review Expense</a>
            </p>
            
            <p>If you have any questions, please contact the system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Rakshak Expense Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateExpenseNotificationText(expenseData) {
    return `
New Expense Approval Required

A new expense has been submitted and requires your approval.

Expense Details:
- Expense Number: ${expenseData.expenseNumber}
- Title: ${expenseData.title}
- Submitter: ${expenseData.submitter}
- Amount: ₹${expenseData.amount}
- Category: ${expenseData.category}
- Site: ${expenseData.site}
- Department: ${expenseData.department}
- Submitted Date: ${new Date(expenseData.timestamp).toLocaleString('en-IN')}

Please log in to the system to review and approve/reject this expense.

Login URL: ${process.env.FRONTEND_URL}/approval

This is an automated notification from Rakshak Expense Management System.
Please do not reply to this email.
    `;
  }

  generateStatusUpdateHTML(expenseData, action, approverName) {
    const actionColor = action === 'approved' ? '#4caf50' : '#f44336';
    const actionIcon = action === 'approved' ? '✅' : '❌';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Expense ${action}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${actionColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .expense-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${actionColor}; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${actionIcon} Expense ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your expense has been <strong>${action}</strong> by ${approverName}.</p>
            
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Expense Number:</strong> ${expenseData.expenseNumber}</p>
              <p><strong>Title:</strong> ${expenseData.title}</p>
              <p><strong>Amount:</strong> ₹${expenseData.amount}</p>
              <p><strong>Category:</strong> ${expenseData.category}</p>
              <p><strong>Site:</strong> ${expenseData.site}</p>
              <p><strong>Status:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>
              <p><strong>Processed Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
            </div>
            
            <p>You can view the complete details in your dashboard.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Rakshak Expense Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateStatusUpdateText(expenseData, action, approverName) {
    return `
Expense ${action.charAt(0).toUpperCase() + action.slice(1)}

Your expense has been ${action} by ${approverName}.

Expense Details:
- Expense Number: ${expenseData.expenseNumber}
- Title: ${expenseData.title}
- Amount: ₹${expenseData.amount}
- Category: ${expenseData.category}
- Site: ${expenseData.site}
- Status: ${action.charAt(0).toUpperCase() + action.slice(1)}
- Processed Date: ${new Date().toLocaleString('en-IN')}

You can view the complete details in your dashboard.

This is an automated notification from Rakshak Expense Management System.
Please do not reply to this email.
    `;
  }

  generateBudgetAlertHTML(siteData, budgetUtilization) {
    const alertColor = budgetUtilization >= 95 ? '#f44336' : '#ff9800';
    const alertIcon = budgetUtilization >= 95 ? '🚨' : '⚠️';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Budget Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${alertColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${alertColor}; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alertIcon} Budget Alert</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A budget alert has been triggered for your site.</p>
            
            <div class="alert-details">
              <h3>Budget Details:</h3>
              <p><strong>Site:</strong> ${siteData.siteName}</p>
              <p><strong>Budget Utilization:</strong> ${budgetUtilization}%</p>
              <p><strong>Current Month Expenses:</strong> ₹${siteData.currentMonthExpenses}</p>
              <p><strong>Monthly Budget:</strong> ₹${siteData.monthlyBudget}</p>
              <p><strong>Remaining Budget:</strong> ₹${siteData.remainingBudget}</p>
            </div>
            
            <p>Please review your site's expenses and budget allocation.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Rakshak Expense Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateBudgetAlertText(siteData, budgetUtilization) {
    return `
Budget Alert

A budget alert has been triggered for your site.

Budget Details:
- Site: ${siteData.siteName}
- Budget Utilization: ${budgetUtilization}%
- Current Month Expenses: ₹${siteData.currentMonthExpenses}
- Monthly Budget: ₹${siteData.monthlyBudget}
- Remaining Budget: ₹${siteData.remainingBudget}

Please review your site's expenses and budget allocation.

This is an automated notification from Rakshak Expense Management System.
Please do not reply to this email.
    `;
  }

  generatePasswordResetHTML(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #008080; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for the Rakshak Expense Management System.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #008080;">${resetUrl}</p>
            
            <div class="warning">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This link will expire in 10 minutes</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>For security reasons, this link can only be used once</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Rakshak Expense Management System.</p>
            <p>Please do not reply to this email.</p>
            <p>© 2025 Rakshak Securitas. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetText(resetUrl) {
    return `
Password Reset Request

We received a request to reset your password for the Rakshak Expense Management System.

To reset your password, please click the following link:
${resetUrl}

Important:
- This link will expire in 10 minutes
- If you didn't request this password reset, please ignore this email
- For security reasons, this link can only be used once

If you have any questions, please contact your system administrator.

This is an automated notification from Rakshak Expense Management System.
Please do not reply to this email.

© 2025 Rakshak Securitas. All rights reserved.
    `;
  }

  async sendBatchPaymentOTP({ email, name, otp, expenseCount, totalAmount }) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: email,
        subject: `🔐 Batch Payment OTP - ${expenseCount} Expenses`,
        html: this.generateBatchOTPHTML({ name, otp, expenseCount, totalAmount }),
        text: this.generateBatchOTPText({ name, otp, expenseCount, totalAmount })
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Batch OTP email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send batch OTP email:', error);
      return false;
    }
  }

  generateBatchOTPHTML({ name, otp, expenseCount, totalAmount }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #004D4D 0%, #006666 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .otp-box { background: white; border: 3px dashed #004D4D; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
    .otp-code { font-size: 36px; font-weight: bold; color: #004D4D; letter-spacing: 8px; margin: 10px 0; }
    .info-box { background: #e8f5f5; border-left: 4px solid #004D4D; padding: 15px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 30px; background: #004D4D; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Batch Payment OTP</h1>
      <p>Rakshak Securitas Expense Management</p>
    </div>
    
    <div class="content">
      <h2>Hello ${name},</h2>
      
      <p>You have requested to process a batch payment for <strong>${expenseCount} expenses</strong>.</p>
      
      <div class="info-box">
        <h3>📊 Batch Payment Details:</h3>
        <ul>
          <li><strong>Number of Expenses:</strong> ${expenseCount}</li>
          <li><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</li>
          <li><strong>Valid For:</strong> 5 minutes</li>
        </ul>
      </div>
      
      <div class="otp-box">
        <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
        <div class="otp-code">${otp}</div>
        <p style="margin: 0; font-size: 12px; color: #999;">This OTP is valid for 5 minutes only</p>
      </div>
      
      <div class="warning">
        <h4>⚠️ Important Security Information:</h4>
        <ul>
          <li>Do NOT share this OTP with anyone</li>
          <li>Rakshak will never ask for your OTP over phone or email</li>
          <li>This OTP expires in 5 minutes</li>
          <li>You have 3 attempts to enter the correct OTP</li>
        </ul>
      </div>
      
      <p>If you did not request this OTP, please ignore this email or contact your system administrator immediately.</p>
      
      <p style="margin-top: 30px;">
        <strong>Best regards,</strong><br>
        Rakshak Securitas Team
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from Rakshak Expense Management System.</p>
      <p>© ${new Date().getFullYear()} Rakshak Securitas. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  generateBatchOTPText({ name, otp, expenseCount, totalAmount }) {
    return `
BATCH PAYMENT OTP
Rakshak Securitas Expense Management
=====================================

Hello ${name},

You have requested to process a batch payment.

BATCH DETAILS:
- Number of Expenses: ${expenseCount}
- Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Valid For: 5 minutes

YOUR OTP CODE: ${otp}

SECURITY INFORMATION:
⚠️ Do NOT share this OTP with anyone
⚠️ Rakshak will never ask for your OTP
⚠️ This OTP expires in 5 minutes
⚠️ You have 3 attempts to enter the correct OTP

If you did not request this OTP, please contact your system administrator immediately.

Best regards,
Rakshak Securitas Team

---
This is an automated email from Rakshak Expense Management System.
© ${new Date().getFullYear()} Rakshak Securitas. All rights reserved.
    `;
  }

  async sendPaymentProcessedNotification({ email, expenseNumber, amount, siteName }) {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Rakshak Expense System'}" <${process.env.EMAIL_FROM || process.env.SMTP_EMAIL}>`,
        to: email,
        subject: `✅ Payment Processed - ${expenseNumber}`,
        html: this.generatePaymentProcessedHTML({ expenseNumber, amount, siteName }),
        text: this.generatePaymentProcessedText({ expenseNumber, amount, siteName })
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Payment processed email sent to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send payment processed email:', error);
      return false;
    }
  }

  generatePaymentProcessedHTML({ expenseNumber, amount, siteName }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
    .amount { font-size: 28px; font-weight: bold; color: #28a745; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Processed</h1>
      <p>Rakshak Securitas</p>
    </div>
    
    <div class="content">
      <div class="success-box">
        <h2>🎉 Your payment has been processed!</h2>
        <p><strong>Expense Number:</strong> ${expenseNumber}</p>
        <p class="amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        ${siteName ? `<p><strong>Site:</strong> ${siteName}</p>` : ''}
      </div>
      
      <p>Your expense has been successfully processed and the payment will be credited to your account soon.</p>
      
      <p style="margin-top: 30px;">
        <strong>Best regards,</strong><br>
        Finance Team<br>
        Rakshak Securitas
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Rakshak Securitas. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  generatePaymentProcessedText({ expenseNumber, amount, siteName }) {
    return `
PAYMENT PROCESSED
Rakshak Securitas
=================

✅ Your payment has been processed!

Expense Number: ${expenseNumber}
Amount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
${siteName ? `Site: ${siteName}` : ''}

Your expense has been successfully processed and the payment will be credited to your account soon.

Best regards,
Finance Team
Rakshak Securitas

---
© ${new Date().getFullYear()} Rakshak Securitas. All rights reserved.
    `;
  }

  async testConnection() {
    if (!this.transporter) {
      return { success: false, message: 'Email transporter not initialized' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      return { success: false, message: `Email service test failed: ${error.message}` };
    }
  }
}

module.exports = new EmailService(); 