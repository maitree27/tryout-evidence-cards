/** True when the person born on `dobIso` (yyyy-mm-dd) is at least 18 on `today`. The database enforces the same rule. */
export function isAdult(dobIso: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobIso)) return false;
  const [y, m, d] = dobIso.split("-").map(Number);
  const dob = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dob.getTime()) || dob.getUTCMonth() !== m - 1) return false; // e.g. 31 Feb
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return dob.getTime() <= cutoff.getTime();
}
