/**
 * Who may open Submit Expense (nav, dashboard, form).
 * - Submitter: always
 * - L1 / L2: unless admin turned off "Can Create Expenses"
 * - Super Admin (L3) & Finance: never — wrong role for employee expense submission
 */
export function canUserSubmitExpense(user) {
  if (!user) return false;
  const r = String(user.role || '').toLowerCase();
  if (r === 'submitter') return true;
  if (r === 'l3_approver' || r === 'finance') return false;
  if (r === 'l1_approver' || r === 'l2_approver') {
    return user.permissions?.canCreateExpenses !== false;
  }
  return false;
}
