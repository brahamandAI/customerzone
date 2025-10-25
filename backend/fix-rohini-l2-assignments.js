require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Site = require('./models/Site');
const User = require('./models/User');
const PendingApprover = require('./models/PendingApprovers');

async function fixRohiniL2Assignments() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('🔍 Finding all L2 approvers...');
  const l2Approvers = await User.find({ role: 'l2_approver', isActive: true }).select('_id name email');
  console.log('📊 Found L2 approvers:', l2Approvers.length);

  console.log('🔍 Finding Rohini site...');
  const rohiniSite = await Site.findOne({ name: /rohini/i });
  if (!rohiniSite) {
    console.log('❌ Rohini site not found');
    await mongoose.disconnect();
    return;
  }
  console.log('📍 Rohini site found:', rohiniSite.name);

  console.log('🔍 Finding Rohini expenses with approved_l1 status...');
  const rohiniExpenses = await Expense.find({
    site: rohiniSite._id,
    status: 'approved_l1',
    isActive: true,
    isDeleted: false
  }).populate('site', 'name code');

  console.log('📊 Rohini approved_l1 expenses found:', rohiniExpenses.length);

  let totalAssigned = 0;
  for (const expense of rohiniExpenses) {
    console.log(`\n🔍 Processing expense: ${expense.expenseNumber} - ${expense.title}`);
    
    // Check current L2 assignments
    const existingL2Assignments = await PendingApprover.find({
      expense: expense._id,
      level: 2
    }).populate('approver', 'name email');
    
    console.log(`  Current L2 assignments: ${existingL2Assignments.length}`);
    
    // Find missing L2 approvers
    const assignedApproverIds = existingL2Assignments
      .filter(pa => pa.approver && pa.approver._id)
      .map(pa => pa.approver._id.toString());
    const missingApprovers = l2Approvers.filter(approver => 
      !assignedApproverIds.includes(approver._id.toString())
    );
    
    console.log(`  Missing L2 approvers: ${missingApprovers.length}`);
    
    // Assign missing L2 approvers
    let assigned = 0;
    for (const approver of missingApprovers) {
      try {
        await PendingApprover.create({
          level: 2,
          approver: approver._id,
          expense: expense._id,
          status: 'pending'
        });
        assigned++;
        totalAssigned++;
        console.log(`    ✅ Assigned to ${approver.name}`);
      } catch (error) {
        console.log(`    ❌ Failed to assign to ${approver.name}: ${error.message}`);
      }
    }
    
    console.log(`  📊 Assigned ${assigned} new L2 approvers to this expense`);
  }

  console.log(`\n🎉 Fix complete!`);
  console.log(`📊 Total new L2 assignments created: ${totalAssigned}`);
  console.log(`📊 Rohini expenses processed: ${rohiniExpenses.length}`);

  await mongoose.disconnect();
}

fixRohiniL2Assignments().catch(console.error);
