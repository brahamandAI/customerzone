const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function findDeletedUser() {
  try {
    console.log('🔍 Finding user deleted from UI but still in database...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Get total user count
    const totalCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalCount}`);

    // Step 2: Get active user count
    const activeCount = await User.countDocuments({ isActive: true });
    console.log(`📊 Active users: ${activeCount}`);

    // Step 3: Get inactive user count
    const inactiveCount = await User.countDocuments({ isActive: false });
    console.log(`📊 Inactive users: ${inactiveCount}`);

    // Step 4: Find all inactive users
    console.log('\n🔍 Finding inactive users (soft deleted):');
    const inactiveUsers = await User.find({ isActive: false })
      .select('name email employeeId role department createdAt updatedAt')
      .sort({ updatedAt: -1 });

    if (inactiveUsers.length === 0) {
      console.log('✅ No inactive users found - all users are active');
    } else {
      console.log(`📋 Found ${inactiveUsers.length} inactive user(s):`);
      inactiveUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. User Details:`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Employee ID: ${user.employeeId}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Department: ${user.department}`);
        console.log(`   - Created: ${user.createdAt}`);
        console.log(`   - Updated: ${user.updatedAt}`);
        console.log(`   - ID: ${user._id}`);
      });
    }

    // Step 5: Check for users with recent updates (likely the one deleted from UI)
    console.log('\n🔍 Finding recently updated users (potential UI deletions):');
    const recentUsers = await User.find()
      .select('name email employeeId role isActive updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10);

    console.log('📋 Recent user updates:');
    recentUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Employee ID: ${user.employeeId}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - isActive: ${user.isActive}`);
      console.log(`   - Updated: ${user.updatedAt}`);
      console.log(`   - ID: ${user._id}`);
    });

    // Step 6: Summary
    console.log('\n📋 SUMMARY:');
    console.log(`- Total users: ${totalCount}`);
    console.log(`- Active users: ${activeCount}`);
    console.log(`- Inactive users: ${inactiveCount}`);
    console.log(`- Difference: ${totalCount - activeCount} (should match inactive count)`);

    if (inactiveUsers.length > 0) {
      console.log('\n💡 To permanently delete these inactive users, run:');
      inactiveUsers.forEach(user => {
        console.log(`   await User.deleteOne({ _id: ObjectId("${user._id}") });`);
      });
    }

    console.log('\n🎉 Analysis completed!');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the analysis
findDeletedUser(); 