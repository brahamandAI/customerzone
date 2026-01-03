const mongoose = require('mongoose');

// Unlock the locked account
async function unlockAccount() {
  try {
    // Connect to MongoDB using the same connection string as backend
    await mongoose.connect('mongodb+srv://rakshaksecuritas:rakshak123@cluster0.2wmxzb7.mongodb.net/rakshak-expense-management?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
    const User = require('./backend/models/User');
    
    // Find the locked user
    const lockedUser = await User.findOne({ 
      email: 'admin@rakshaksecuritas.com',
      isLocked: true 
    });
    
    if (lockedUser) {
      console.log('🔍 Found locked user:', lockedUser.name);
      console.log('🔓 Unlocking account...');
      
      // Unlock the account
      lockedUser.isLocked = false;
      lockedUser.loginAttempts = 0;
      lockedUser.lockUntil = undefined;
      
      await lockedUser.save();
      console.log('✅ Account unlocked successfully!');
      console.log('📧 Email:', lockedUser.email);
      console.log('👤 Name:', lockedUser.name);
      console.log('🎭 Role:', lockedUser.role);
      console.log('🏢 Site:', lockedUser.site?.name || 'No Site');
      
    } else {
      console.log('❌ No locked user found with email: admin@rakshaksecuritas.com');
      
      // List all users to see what's available
      const allUsers = await User.find({}).select('name email role isLocked loginAttempts');
      console.log('\n👥 All Users:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Locked: ${user.isLocked}`);
        console.log(`   Login Attempts: ${user.loginAttempts}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

unlockAccount();
