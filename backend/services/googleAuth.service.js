const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Site = require('../models/Site');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuthService = {
  // Verify Google token
  async verifyGoogleToken(token) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  },

  // Get default site for new users
  async getDefaultSite() {
    try {
      // Find the first active site
      const defaultSite = await Site.findOne({ isActive: true }).sort({ createdAt: 1 });
      
      if (!defaultSite) {
        console.warn('⚠️  No active sites found. Creating a default site...');
        
        // Create a default site if none exists
        const defaultSiteData = {
          name: 'Default Site',
          code: 'DEFAULT-001',
          description: 'Default site for new users',
          location: {
            address: 'Default Address',
            city: 'Default City',
            state: 'Default State',
            pincode: '000000',
            country: 'India'
          },
          budget: {
            monthly: 100000,
            yearly: 1200000,
            alertThreshold: 80
          },
          isActive: true,
          createdBy: null // Will be set to the first admin user later
        };
        
        const newDefaultSite = new Site(defaultSiteData);
        await newDefaultSite.save();
        console.log('✅ Created default site for new users');
        return newDefaultSite;
      }
      
      return defaultSite;
    } catch (error) {
      console.error('Error getting default site:', error);
      throw new Error('Failed to get default site');
    }
  },

  // Find or create user from Google data
  async findOrCreateUser(googleData) {
    try {
      // Check if user exists with Google ID
      let user = await User.findOne({ googleId: googleData.googleId });
      
      if (!user) {
        // Check if user exists with email
        user = await User.findOne({ email: googleData.email });
        
        if (user) {
          // Update existing user with Google ID
          user.googleId = googleData.googleId;
          user.profilePicture = googleData.picture;
          
          // If user doesn't have an employeeId, generate one
          if (!user.employeeId) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            user.employeeId = `GOOGLE_${timestamp}_${randomSuffix}`;
            user.department = user.department || 'External';
          }
          
          await user.save();
        } else {
          // Get default site for new user
          const defaultSite = await this.getDefaultSite();
          
          // Generate a unique employeeId for Google OAuth users
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const employeeId = `GOOGLE_${timestamp}_${randomSuffix}`;
          
          // Create new user
          user = new User({
            name: googleData.name,
            email: googleData.email,
            googleId: googleData.googleId,
            profilePicture: googleData.picture,
            emailVerified: googleData.emailVerified,
            role: 'submitter', // Default role for Google sign-in
            site: defaultSite._id, // Assign to default site
            isActive: true,
            employeeId: employeeId, // Generate unique employeeId for Google OAuth users
            department: 'External', // Default department for Google OAuth users
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
        }
      }
      
      return user;
    } catch (error) {
      console.error('Error finding/creating user:', error);
      throw new Error('Failed to process user data');
    }
  },

  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
};

module.exports = googleAuthService;