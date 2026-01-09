const crypto = require('crypto');
const dayjs = require('dayjs');
const Expense = require('../models/Expense');
const Site = require('../models/Site');
const NodeGeocoder = require('node-geocoder');

function computeReceiptHash(bufferOrString) {
  if (!bufferOrString) return null;
  const hash = crypto.createHash('sha256');
  hash.update(bufferOrString);
  return hash.digest('hex');
}

function normalizeVendor(vendor) {
  if (!vendor || typeof vendor !== 'string') return '';
  return vendor.replace(/\s+/g, ' ').trim().toUpperCase();
}

function computeNormalizedKey({ amount, date, vendor }) {
  const amt = Number(amount || 0).toFixed(2);
  const d = dayjs(date || new Date()).format('YYYY-MM-DD');
  const v = normalizeVendor(vendor || '');
  return `${amt}|${d}|${v}`;
}

async function findDuplicates({ receiptHash, normalizedKey, submittedBy, expenseDate, excludeId, windowDays = 30 }) {
  const search = { isActive: true, isDeleted: false };
  if (excludeId) search._id = { $ne: excludeId };

  const exact = receiptHash
    ? await Expense.findOne({ ...search, receiptHash })
    : null;

  // Soft duplicate within window
  let soft = null;
  if (normalizedKey) {
    const start = dayjs(expenseDate).subtract(windowDays, 'day').toDate();
    const end = dayjs(expenseDate).add(1, 'day').toDate();
    soft = await Expense.findOne({
      ...search,
      normalizedKey,
      submittedBy,
      expenseDate: { $gte: start, $lt: end }
    });
  }

  return { exact, soft };
}

function evaluateAgainstRules(expenseLike, site, rules = {}) {
  const flags = [];
  let riskScore = 0;

  const category = expenseLike.category || '';
  const amount = Number(expenseLike.amount || 0);

  const cfg = {
    duplicateWindowDays: 30,
    perCategoryLimits: {},
    cashMax: 2000,
    requireDirectorAbove: {},
    weekendDisallow: [],
    ...rules
  };

  const siteSettings = site?.settings || {};

  // Over-limit per category
  const categoryKey = category?.toUpperCase?.() || category;
  const limit = cfg.perCategoryLimits[categoryKey] || null;
  if (limit && amount > limit) {
    flags.push('OVER_LIMIT_TRAVEL');
    riskScore += 30;
  }

  // Cash cap
  if ((expenseLike.paymentMethod === 'Cash' || expenseLike.paymentMethod === 'CASH') && cfg.cashMax && amount > cfg.cashMax) {
    flags.push('CASH_OVER_CAP');
    riskScore += 20;
  }

  // Weekend disallow
  try {
    const d = expenseLike.expenseDate ? new Date(expenseLike.expenseDate) : new Date();
    const day = d.getDay(); // 0=Sun,6=Sat
    const isWeekend = day === 0 || day === 6;
    if (isWeekend && Array.isArray(cfg.weekendDisallow) && cfg.weekendDisallow.map(x => String(x).toUpperCase()).includes(categoryKey)) {
      flags.push('SUSPECT');
      riskScore += 10;
    }
  } catch {}

  // Director escalation threshold
  let directorEscalate = false;
  const dirThreshold = cfg.requireDirectorAbove[categoryKey] || null;
  if (dirThreshold && amount > dirThreshold) {
    directorEscalate = true;
  }

  // Site global max
  if (siteSettings.maxExpenseAmount && amount > siteSettings.maxExpenseAmount) {
    flags.push('SUSPECT');
    riskScore += 20;
  }

  // Cap risk
  if (riskScore > 100) riskScore = 100;

  // Decide next action
  const nextAction = (riskScore >= 70 || directorEscalate || flags.includes('OVER_LIMIT_TRAVEL')) ? 'ESCALATE' : 'NORMAL';

  return { flags, riskScore, nextAction };
}

async function evaluateExpense(expenseLike, options = {}) {
  const site = await Site.findById(expenseLike.site).lean();
  const receiptHash = expenseLike.receiptHash || null;
  const normalizedKey = expenseLike.normalizedKey || computeNormalizedKey({
    amount: expenseLike.amount,
    date: expenseLike.expenseDate,
    vendor: expenseLike.title // simple vendor proxy
  });

  // Build site rules first (for duplicate window size)
  const siteRulesForWindow = site?.expensePolicy ? {
    duplicateWindowDays: site.expensePolicy.duplicateWindowDays,
  } : {};

  const duplicates = await findDuplicates({
    receiptHash,
    normalizedKey,
    submittedBy: expenseLike.submittedBy,
    expenseDate: expenseLike.expenseDate,
    excludeId: expenseLike._id,
    windowDays: siteRulesForWindow.duplicateWindowDays || 30
  });

  const flags = [];
  let riskScore = 0;
  if (duplicates.exact) { flags.push('DUPLICATE_RECEIPT'); riskScore += 70; }
  if (duplicates.soft) { flags.push('SOFT_DUPLICATE'); riskScore += 40; }

  const siteRules = site?.expensePolicy ? {
    duplicateWindowDays: site.expensePolicy.duplicateWindowDays,
    perCategoryLimits: site.expensePolicy.perCategoryLimits instanceof Map
      ? Object.fromEntries(site.expensePolicy.perCategoryLimits)
      : (site.expensePolicy.perCategoryLimits || {}),
    cashMax: site.expensePolicy.cashMax,
    requireDirectorAbove: site.expensePolicy.requireDirectorAbove instanceof Map
      ? Object.fromEntries(site.expensePolicy.requireDirectorAbove)
      : (site.expensePolicy.requireDirectorAbove || {}),
    weekendDisallow: site.expensePolicy.weekendDisallow || []
  } : {};

  const combinedRules = { ...siteRules, ...(options.rules || {}) };

  const ruleEval = evaluateAgainstRules(expenseLike, site, combinedRules);

  // Geo validation (optional; run if coordinates present)
  try {
    if (expenseLike.location?.coordinates?.length === 2) {
      const [lng, lat] = expenseLike.location.coordinates;
      const geocoder = NodeGeocoder({ provider: 'openstreetmap' });
      const res = await geocoder.reverse({ lat, lon: lng });
      const city = res?.[0]?.city || res?.[0]?.state || res?.[0]?.county;
      // Example rule: For Travel, require site city match (if site has location)
      if (expenseLike.category === 'Travel' && site?.location?.city) {
        const siteCity = String(site.location.city).toLowerCase();
        if (city && String(city).toLowerCase() !== siteCity) {
          ruleEval.flags.push('LOCATION_MISMATCH');
          ruleEval.riskScore += 20;
        }
      }
      // Distance threshold demo: if site has coordinates, check within 5km
      const sCoords = site?.location?.coordinates;
      if (sCoords?.latitude && sCoords?.longitude) {
        const toRad = (d) => d * Math.PI / 180;
        const R = 6371; // km
        const dLat = toRad(lat - sCoords.latitude);
        const dLon = toRad(lng - sCoords.longitude);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(sCoords.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distKm = R * c;
        if (distKm > 5 && expenseLike.category === 'Travel') {
          ruleEval.flags.push('DISTANCE_EXCEEDED');
          ruleEval.riskScore += 20;
        }
      }
    }
  } catch {}
  const combinedFlags = [...new Set([...flags, ...ruleEval.flags])];
  const combinedRisk = Math.min(100, riskScore + ruleEval.riskScore);
  const nextAction = combinedRisk >= 70 || combinedFlags.includes('OVER_LIMIT_TRAVEL') ? 'ESCALATE' : 'NORMAL';

  return {
    receiptHash,
    normalizedKey,
    flags: combinedFlags,
    riskScore: combinedRisk,
    nextAction
  };
}

module.exports = {
  computeReceiptHash,
  computeNormalizedKey,
  findDuplicates,
  evaluateExpense
};


