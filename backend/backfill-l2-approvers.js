require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const User = require('./models/User');
const PendingApprover = require('./models/PendingApprovers');

async function backfillL2Approvers() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('🔍 Finding all L2 approvers...');
  const l2Approvers = await User.find({ role: 'l2_approver', isActive: true }).select('_id name email');
  console.log('📊 Found L2 approvers:', l2Approvers.length);
  l2Approvers.forEach(approver => {
    console.log(`  - ${approver.name} (${approver.email})`);
  });

  if (l2Approvers.length === 0) {
    console.log('❌ No L2 approvers found. Please create L2 approvers first.');
    await mongoose.disconnect();
    return;
  }

  // Find all expenses that are approved by L1 but don't have L2 approvers assigned
  console.log('🔍 Finding expenses that need L2 approvers...');
  const expenses = await Expense.find({
    isActive: true,
    isDeleted: false,
    status: 'approved_l1'
  }).select('_id expenseNumber title site status');

  console.log('📊 Found expenses needing L2 approval:', expenses.length);

  let totalAssigned = 0;
  for (const expense of expenses) {
    console.log(`\n🔍 Processing expense: ${expense.expenseNumber} - ${expense.title}`);
    
    // Check if L2 approvers are already assigned
    const existingL2Assignments = await PendingApprover.find({
      expense: expense._id,
      level: 2
    }).select('approver');
    
    if (existingL2Assignments.length > 0) {
      console.log(`  ✅ Already has ${existingL2Assignments.length} L2 assignments`);
      continue;
    }

    // Assign all L2 approvers to this expense
    let assigned = 0;
    for (const approver of l2Approvers) {
      try {
        await PendingApprover.create({
          level: 2,
          approver: approver._id,
          expense: expense._id,
          status: 'pending'
        });
        assigned++;
        totalAssigned++;
        console.log(`  ✅ Assigned to ${approver.name}`);
      } catch (error) {
        console.log(`  ❌ Failed to assign to ${approver.name}: ${error.message}`);
      }
    }
    
    console.log(`  📊 Assigned ${assigned} L2 approvers to this expense`);
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(`📊 Total L2 assignments created: ${totalAssigned}`);
  console.log(`📊 Expenses processed: ${expenses.length}`);
  console.log(`📊 L2 approvers: ${l2Approvers.length}`);

  await mongoose.disconnect();
}

backfillL2Approvers().catch((error) => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
