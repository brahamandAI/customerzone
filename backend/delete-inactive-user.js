const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function deleteInactiveUser() {
  try {
    console.log('🗑️ Permanently deleting inactive user...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Get current counts
    const totalCount = await User.countDocuments();
    const activeCount = await User.countDocuments({ isActive: true });
    const inactiveCount = await User.countDocuments({ isActive: false });
    
    console.log(`📊 Before deletion:`);
    console.log(`- Total users: ${totalCount}`);
    console.log(`- Active users: ${activeCount}`);
    console.log(`- Inactive users: ${inactiveCount}`);

    // Step 2: Find the inactive user
    const inactiveUser = await User.findOne({ isActive: false });
    
    if (!inactiveUser) {
      console.log('✅ No inactive users found');
      return;
    }

    console.log(`\n🔍 Found inactive user:`);
    console.log(`- Name: ${inactiveUser.name}`);
    console.log(`- Email: ${inactiveUser.email}`);
    console.log(`- Employee ID: ${inactiveUser.employeeId}`);
    console.log(`- Role: ${inactiveUser.role}`);
    console.log(`- ID: ${inactiveUser._id}`);

    // Step 3: Permanently delete the user
    console.log('\n🗑️ Performing permanent deletion...');
    const deleteResult = await User.deleteOne({ _id: inactiveUser._id });
    
    if (deleteResult.deletedCount === 1) {
      console.log('✅ User permanently deleted from database');
    } else {
      console.log('❌ Failed to delete user');
      return;
    }

    // Step 4: Verify deletion
    const afterTotalCount = await User.countDocuments();
    const afterActiveCount = await User.countDocuments({ isActive: true });
    const afterInactiveCount = await User.countDocuments({ isActive: false });
    
    console.log(`\n📊 After deletion:`);
    console.log(`- Total users: ${afterTotalCount}`);
    console.log(`- Active users: ${afterActiveCount}`);
    console.log(`- Inactive users: ${afterInactiveCount}`);

    // Step 5: Try to find the deleted user
    const deletedUser = await User.findById(inactiveUser._id);
    console.log(`\n🔍 Deleted user still exists: ${deletedUser ? 'YES' : 'NO'}`);

    if (!deletedUser) {
      console.log('✅ User permanently removed from database');
    } else {
      console.log('❌ User still exists in database');
    }

    // Step 6: Summary
    console.log('\n📋 SUMMARY:');
    console.log(`- Users deleted: ${totalCount - afterTotalCount}`);
    console.log(`- Database count: ${afterTotalCount}`);
    console.log(`- UI should show: ${afterActiveCount} users`);

    console.log('\n🎉 Permanent deletion completed!');

  } catch (error) {
    console.error('❌ Deletion failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the deletion
deleteInactiveUser(); 