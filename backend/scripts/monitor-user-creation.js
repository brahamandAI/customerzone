const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('./models/User');
    const Site = require('./models/Site');
    
    console.log('🔍 Monitoring User Creation...\n');
    console.log('⏰ Starting monitoring at:', new Date().toLocaleString());
    console.log('📝 Create a new user now and I will detect it...\n');
    
    // Get initial count
    const initialCount = await User.countDocuments();
    console.log(`📊 Initial user count: ${initialCount}`);
    
    // Get the most recent user before monitoring
    const initialLatestUser = await User.findOne({})
      .sort({ createdAt: -1 })
      .select('name email role createdAt');
    
    if (initialLatestUser) {
      console.log(`👤 Latest user before monitoring: ${initialLatestUser.name} (${initialLatestUser.email}) - ${initialLatestUser.createdAt}`);
    }
    
    console.log('\n🔄 Monitoring for new users...\n');
    
    // Monitor for new users every 5 seconds
    const interval = setInterval(async () => {
      try {
        const currentCount = await User.countDocuments();
        
        if (currentCount > initialCount) {
          console.log('🎉 NEW USER DETECTED!');
          console.log(`📊 User count increased from ${initialCount} to ${currentCount}`);
          
          // Get the newest user
          const newestUser = await User.findOne({})
            .populate('site', 'name code')
            .sort({ createdAt: -1 })
            .select('name email role employeeId department site createdAt isActive');
          
          if (newestUser) {
            console.log('\n👤 New User Details:');
            console.log(`Name: ${newestUser.name}`);
            console.log(`Email: ${newestUser.email}`);
            console.log(`Role: ${newestUser.role}`);
            console.log(`Employee ID: ${newestUser.employeeId}`);
            console.log(`Department: ${newestUser.department}`);
            console.log(`Site: ${newestUser.site ? newestUser.site.name : 'No site assigned'}`);
            console.log(`Created: ${newestUser.createdAt}`);
            console.log(`Active: ${newestUser.isActive}`);
            console.log('\n✅ User successfully created in database!');
          }
          
          clearInterval(interval);
          mongoose.connection.close();
          return;
        }
        
        // Show current time
        const now = new Date();
        process.stdout.write(`\r⏰ ${now.toLocaleTimeString()} - Monitoring... (${currentCount} users)`);
        
      } catch (error) {
        console.error('Error monitoring:', error);
        clearInterval(interval);
        mongoose.connection.close();
      }
    }, 5000);
    
    // Stop monitoring after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      console.log('\n\n⏰ Monitoring stopped after 5 minutes');
      console.log('💡 No new users detected');
      mongoose.connection.close();
    }, 300000);
    
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.connection.close();
  }); 