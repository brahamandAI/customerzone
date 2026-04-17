/**
 * Seed sites from Rakshak office/branch list (deduped, typos fixed).
 * Run from backend folder: node scripts/seed-sites-rakshak-list.js
 *
 * Requires MONGODB_URI in backend/.env
 * Uses first active l3_approver (or finance) as createdBy — override with SEED_CREATED_BY_USER_ID
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Site = require('../models/Site');
const User = require('../models/User');

/** Unique display names; city/state/pin for India defaults */
const SITE_ROWS = [
  { name: 'Panchkula', city: 'Panchkula', state: 'Haryana', pincode: '134109' },
  { name: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { name: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { name: 'Banking Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  { name: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  { name: 'Lucknow', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
  { name: 'Roorkee', city: 'Roorkee', state: 'Uttarakhand', pincode: '247667' },
  { name: 'Kolkata', city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  { name: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { name: 'Plaza 106 Gurugram', city: 'Gurugram', state: 'Haryana', pincode: '122002' },
  { name: 'Noida Corporate', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  { name: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { name: 'Jodhpur', city: 'Jodhpur', state: 'Rajasthan', pincode: '342001' },
  { name: 'Sonipat', city: 'Sonipat', state: 'Haryana', pincode: '131001' },
  { name: 'Dwarka Sec 11', city: 'New Delhi', state: 'Delhi', pincode: '110075' },
  { name: 'South Delhi', city: 'New Delhi', state: 'Delhi', pincode: '110017' },
  { name: 'AIIMS', city: 'New Delhi', state: 'Delhi', pincode: '110029' },
  { name: 'Delhi Sec 17', city: 'New Delhi', state: 'Delhi', pincode: '110017' },
  { name: 'Noida Office', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  { name: 'Odisha', city: 'Bhubaneswar', state: 'Odisha', pincode: '751001' },
  { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
  { name: 'MP', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  { name: 'Satna', city: 'Satna', state: 'Madhya Pradesh', pincode: '485001' },
  { name: 'Damoh', city: 'Damoh', state: 'Madhya Pradesh', pincode: '470661' },
  { name: 'Chhatarpur', city: 'Chhatarpur', state: 'Madhya Pradesh', pincode: '471001' },
  { name: 'Sitex Pitampura', city: 'Delhi', state: 'Delhi', pincode: '110034' },
  { name: 'Dewas', city: 'Dewas', state: 'Madhya Pradesh', pincode: '455001' },
  { name: 'Pithampur', city: 'Pithampur', state: 'Madhya Pradesh', pincode: '454775' },
  { name: 'Narmadapuram', city: 'Narmadapuram', state: 'Madhya Pradesh', pincode: '461001' },
  { name: 'Datia', city: 'Datia', state: 'Madhya Pradesh', pincode: '475661' },
  { name: 'Mandla', city: 'Mandla', state: 'Madhya Pradesh', pincode: '481661' },
  { name: 'Narsinghpur', city: 'Narsinghpur', state: 'Madhya Pradesh', pincode: '487001' },
  { name: 'Umaria', city: 'Umaria', state: 'Madhya Pradesh', pincode: '484661' },
  { name: 'Anuppur', city: 'Anuppur', state: 'Madhya Pradesh', pincode: '484224' },
  { name: 'Shahdol', city: 'Shahdol', state: 'Madhya Pradesh', pincode: '484001' },
  { name: 'Rewa', city: 'Rewa', state: 'Madhya Pradesh', pincode: '486001' },
  { name: 'Chhindwara', city: 'Chhindwara', state: 'Madhya Pradesh', pincode: '480001' },
  { name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh', pincode: '160001' },
  { name: 'Banking', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  { name: 'Dwarka Sec 17', city: 'New Delhi', state: 'Delhi', pincode: '110075' }
];

const DEFAULT_MONTHLY = 500000;
const DEFAULT_YEARLY = 6000000;

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  await mongoose.connect(mongoUri);

  let createdBy = process.env.SEED_CREATED_BY_USER_ID;
  if (createdBy) {
    createdBy = new mongoose.Types.ObjectId(createdBy);
  } else {
    const admin =
      (await User.findOne({ role: 'l3_approver', isActive: true }).select('_id')) ||
      (await User.findOne({ role: 'finance', isActive: true }).select('_id'));
    if (!admin) {
      console.error('No l3_approver or finance user found. Create one or set SEED_CREATED_BY_USER_ID.');
      process.exit(1);
    }
    createdBy = admin._id;
    console.log('Using createdBy:', createdBy.toString());
  }

  let inserted = 0;
  let skipped = 0;

  let codeNum = 1;
  async function nextFreeCode() {
    for (;;) {
      const code = `RS${String(codeNum).padStart(3, '0')}`;
      const taken = await Site.findOne({ code });
      if (!taken) return code;
      codeNum += 1;
    }
  }

  for (let i = 0; i < SITE_ROWS.length; i++) {
    const row = SITE_ROWS[i];

    const dupName = await Site.findOne({ name: row.name });
    if (dupName) {
      console.log('Skip (name exists):', row.name);
      skipped += 1;
      continue;
    }

    const code = await nextFreeCode();

    await Site.create({
      name: row.name,
      code,
      location: {
        address: row.name,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        country: 'India'
      },
      budget: {
        monthly: DEFAULT_MONTHLY,
        yearly: DEFAULT_YEARLY
      },
      createdBy
    });
    console.log('Created:', code, row.name);
    inserted += 1;
    codeNum += 1;
  }

  console.log('\nDone. Inserted:', inserted, 'Skipped:', skipped);
  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
