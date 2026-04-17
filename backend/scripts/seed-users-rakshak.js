/**
 * Seed users from scripts/data/seed-users-rakshak.json (Rakshak employee list).
 * Address city/state/pin is derived from Site name via getLocationForSiteName.
 *
 * Run after sites: npm run seed:sites
 * From backend: npm run seed:users
 *
 * Requires MONGODB_URI in backend/.env
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Site = require('../models/Site');
const { getLocationForSiteName } = require('./lib/siteLocationByName');

const DATA_PATH = path.join(__dirname, 'data', 'seed-users-rakshak.json');

/** Spreadsheet Site column → Site.name in DB (seed-sites-rakshak-list) */
const SHEET_SITE_TO_DB = {
  'Gurugram 106': 'Plaza 106 Gurugram'
};

function resolveDbSiteName(sheetSite) {
  const s = String(sheetSite || '').trim();
  return SHEET_SITE_TO_DB[s] || s;
}

function buildAddress(row, sheetSite, dbSiteName) {
  const loc = getLocationForSiteName(dbSiteName) || getLocationForSiteName(sheetSite);
  const street = String(row.address || '').trim();
  const city = String(row.city || '').trim();
  const pinRaw = String(row.pincode != null ? row.pincode : '').replace(/\D/g, '');
  const pin = pinRaw.slice(0, 6);

  if (street || city || pin) {
    return {
      street: street || (loc ? loc.street : `Rakshak Securitas, ${dbSiteName}`),
      city: city || (loc ? loc.city : ''),
      state: loc ? loc.state : 'India',
      zipCode: pin || (loc ? loc.pincode : '110001'),
      country: 'India'
    };
  }
  if (loc) {
    return {
      street: loc.street,
      city: loc.city,
      state: loc.state,
      zipCode: loc.pincode,
      country: 'India'
    };
  }
  return {
    street: `Rakshak Securitas, ${dbSiteName}`,
    city: dbSiteName,
    state: 'India',
    zipCode: '110001',
    country: 'India'
  };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapRole(label) {
  const t = String(label || '').trim().toLowerCase();
  if (t === 'submitter') return 'submitter';
  if (t === 'level 1' || t === 'l1' || t === 'level1') return 'l1_approver';
  if (t === 'level 2' || t === 'l2' || t === 'level2') return 'l2_approver';
  if (t === 'level 3' || t === 'l3' || t === 'level3') return 'l3_approver';
  if (t === 'finance') return 'finance';
  return 'submitter';
}

async function findSiteByName(siteName) {
  const n = String(siteName || '').trim();
  if (!n) return null;
  const escaped = escapeRegex(n);
  return Site.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense';
  if (!fs.existsSync(DATA_PATH)) {
    console.error('Missing data file:', DATA_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('No rows in', DATA_PATH);
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    const employeeId = String(row.employeeId || '').trim();
    const siteName = String(row.site || '').trim();
    const dbSiteName = resolveDbSiteName(siteName);
    const name = String(row.name || '').trim();
    const password = String(row.password || '').trim();
    const mobile = String(row.mobile || '').replace(/\s/g, '');
    const department = String(row.department || 'Operations').trim();
    const role = mapRole(row.role);

    if (!email || !employeeId || !name || !password) {
      errors.push({ index: i, reason: 'missing email, employeeId, name, or password', row });
      continue;
    }

    const dupEmail = await User.findOne({ email }).select('_id');
    if (dupEmail) {
      console.log('[skip] email exists:', email);
      skipped++;
      continue;
    }
    const dupEmp = await User.findOne({ employeeId }).select('_id');
    if (dupEmp) {
      console.log('[skip] employeeId exists:', employeeId);
      skipped++;
      continue;
    }

    let siteId = null;
    if (role !== 'l3_approver' && role !== 'finance') {
      const site = await findSiteByName(dbSiteName);
      if (!site) {
        console.error('[error] site not found for name:', dbSiteName, '(sheet:', siteName, ') | user:', email);
        errors.push({ index: i, reason: 'site not found', siteName: dbSiteName, email });
        continue;
      }
      siteId = site._id;
    }

    const address = buildAddress(row, siteName, dbSiteName);

    const bankDetails = {
      accountNumber: row.accountNumber ? String(row.accountNumber).trim() : undefined,
      ifscCode: row.ifsc ? String(row.ifsc).trim() : undefined,
      bankName: row.bankName ? String(row.bankName).trim() : undefined,
      accountHolderName: name
    };
    if (!bankDetails.accountNumber) delete bankDetails.accountNumber;
    if (!bankDetails.ifscCode) delete bankDetails.ifscCode;
    if (!bankDetails.bankName) delete bankDetails.bankName;

    const doc = {
      name,
      email,
      password,
      role,
      employeeId,
      department,
      phone: mobile || undefined,
      address,
      bankDetails: Object.keys(bankDetails).length ? bankDetails : undefined,
      isActive: true,
      isEmailVerified: true
    };
    if (siteId) doc.site = siteId;

    try {
      await User.create(doc);
      created++;
      console.log('[ok]', employeeId, email, siteName, '→', dbSiteName);
    } catch (e) {
      console.error('[fail]', email, e.message);
      errors.push({ index: i, reason: e.message, email });
    }
  }

  await mongoose.disconnect();

  console.log('---');
  console.log('Created:', created, '| Skipped:', skipped, '| Errors:', errors.length);
  if (errors.length) {
    console.log('First errors:', errors.slice(0, 5));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
