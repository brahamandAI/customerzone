/**
 * ObjectId strings for sites the user may use (submitter: primary site; L1/L2: `sites` + legacy `site`).
 */
export function getUserAssignedSiteIds(user) {
  if (!user) return [];
  const r = user.role;
  if ((r === 'l1_approver' || r === 'l2_approver') && Array.isArray(user.sites) && user.sites.length > 0) {
    return user.sites.map((s) => String(s._id || s));
  }
  if (user.site) {
    const id = user.site._id || user.site;
    return id ? [String(id)] : [];
  }
  return [];
}
