const mongoose = require('mongoose');

function normalizeObjectId(x) {
  if (!x) return null;
  if (x._id) return x._id;
  return x;
}

/**
 * Site ObjectIds assigned to this user (L1/L2: `sites` + legacy `site`; others: `site` only).
 */
function getAssignedSiteObjectIds(user) {
  if (!user) return [];
  const r = user.role;
  const seen = new Set();
  const out = [];

  const add = (x) => {
    const n = normalizeObjectId(x);
    if (!n) return;
    const s = n.toString();
    if (seen.has(s)) return;
    seen.add(s);
    out.push(n instanceof mongoose.Types.ObjectId ? n : new mongoose.Types.ObjectId(s));
  };

  if (r === 'l1_approver' || r === 'l2_approver') {
    if (Array.isArray(user.sites) && user.sites.length) {
      user.sites.forEach((s) => add(s));
    }
    add(user.site);
  } else {
    add(user.site);
  }

  return out;
}

function siteIdAllowedForUser(user, siteId) {
  const sid = normalizeObjectId(siteId);
  if (!sid) return false;
  const allowed = getAssignedSiteObjectIds(user).map((id) => id.toString());
  return allowed.includes(sid.toString());
}

/**
 * Fragment for Expense queries: { site: id } or { site: { $in: ids } }. L1/L2 only.
 */
function expenseSiteMatchForApprover(user) {
  const r = user?.role;
  if (r !== 'l1_approver' && r !== 'l2_approver') return null;
  const ids = getAssignedSiteObjectIds(user);
  if (ids.length === 0) return null;
  if (ids.length === 1) return { site: ids[0] };
  return { site: { $in: ids } };
}

/**
 * Merge site scope into an existing match object (mutates copy).
 */
function mergeExpenseSiteForApprover(match, user) {
  const extra = expenseSiteMatchForApprover(user);
  if (!extra) return { ...match };
  return { ...match, ...extra };
}

module.exports = {
  getAssignedSiteObjectIds,
  siteIdAllowedForUser,
  expenseSiteMatchForApprover,
  mergeExpenseSiteForApprover,
  normalizeObjectId
};
