const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  async findUserByEmail(email, includePassword = false) {
    // Build the query
    let query = User.findOne({ email });
    if (includePassword) {
      query = query.select('+password');
    }
    // Populate site details
    query = query.populate('site', 'name code address');
    return query.exec();
  }

  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const user = new User({
      ...userData,
      password: hashedPassword,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        language: 'en',
        timezone: 'Asia/Kolkata',
        currency: 'INR'
      },
      permissions: {
        canCreateExpenses: true,
        canApproveExpenses: false,
        canManageUsers: false,
        canManageSites: false,
        canViewReports: false,
        canManageBudgets: false
      }
    });
    await user.save();
    // Populate site for response
    await user.populate('site', 'name code');
    // Return selected fields
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      site: user.site
    };
  }

  async updateLoginAttempts(userId, reset = false) {
    const update = reset
      ? { loginAttempts: 0, lockUntil: null }
      : { $inc: { loginAttempts: 1 }, lockUntil: new Date(Date.now() + 5 * 60 * 1000) }; // 5 minutes
    return User.findByIdAndUpdate(userId, update, { new: true });
  }

  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
  }
}

module.exports = new AuthService(); 