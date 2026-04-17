/**
 * Compare seed-users-rakshak.json with DB: prints which emails/employeeIds already exist.
 * Run: node scripts/check-seed-users-in-db.js   (from backend, with MONGODB_URI in .env)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');

const DATA_PATH = path.join(__dirname, 'data', 'seed-users-rakshak.json');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  if (!fs.existsSync(DATA_PATH)) {
    console.error('Missing:', DATA_PATH);
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  await mongoose.connect(mongoUri);

  const inDb = [];
  const notInDb = [];

  for (const row of rows) {
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    const employeeId = String(row.employeeId || '').trim();
    const name = String(row.name || '').trim();
    const byEmail = email ? await User.findOne({ email }).select('email employeeId name') : null;
    const byEmp = !byEmail && employeeId ? await User.findOne({ employeeId }).select('email employeeId name') : null;
    const found = byEmail || byEmp;
    const line = { name, employeeId, email, site: row.site };
    if (found) inDb.push(line);
    else notInDb.push(line);
  }

  await mongoose.disconnect();

  console.log('--- Already in DB (', inDb.length, ') ---');
  inDb.forEach((r) => console.log(`  ${r.employeeId}\t${r.email}\t${r.name}`));
  console.log('--- Not in DB yet (', notInDb.length, ') ---');
  notInDb.forEach((r) => console.log(`  ${r.employeeId}\t${r.email}\t${r.name}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
