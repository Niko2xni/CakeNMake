export function activeRestriction(account, now = Date.now()) {
  const value = account?.restriction;
  if (account?.role !== 'customer' || !value || value.type === 'none') return null;
  if (value.type === 'suspended' && value.expiresAt && new Date(value.expiresAt).getTime() <= now) return null;
  return value;
}
export function philippineTime(value) {
  return value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'No expiry';
}
export function suspensionExpiry(days, custom, now = Date.now()) {
  return days === 'custom' ? new Date(`${custom}:00+08:00`).toISOString() : new Date(now + Number(days) * 86400000).toISOString();
}
