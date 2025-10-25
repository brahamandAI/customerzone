require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const User = require('./models/User');
const PendingApprover = require('./models/PendingApprovers');

async function backfill() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Filter: expenses that should be with L1 but are missing any PendingApprover rows
  const candidates = await Expense.find({
    isActive: true,
    isDeleted: false,
    status: { $in: ['submitted', 'under_review'] }
  }).select('_id site expenseNumber status');

  let checked = 0;
  let created = 0;
  for (const exp of candidates) {
    checked += 1;
    const existing = await PendingApprover.countDocuments({ expense: exp._id, level: 1 });
    if (existing > 0) continue;

    // Find active L1s for the expense site
    const l1s = await User.find({ role: 'l1_approver', site: exp.site, isActive: true }).select('_id');
    if (!l1s.length) {
      console.log('No L1s for site; skipped:', exp.expenseNumber, exp.site?.toString?.() || exp.site);
      continue;
    }

    for (const l1 of l1s) {
      await PendingApprover.create({
        level: 1,
        approver: l1._id,
        expense: exp._id,
        status: 'pending'
      });
      created += 1;
    }
    console.log('Backfilled L1 PendingApprover for:', exp.expenseNumber, 'L1 count:', l1s.length);
  }

  console.log('Backfill summary:', { checked, created });
  await mongoose.disconnect();
}

backfill().catch((e) => { console.error('Backfill failed:', e); process.exit(1); });


