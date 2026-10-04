import { describe, expect, it } from 'vitest';
import { activeRestriction, suspensionExpiry } from './moderation';
describe('Moderation dates', () => {
  it('expires suspension at its exact server timestamp without expiring a ban', () => {
    const now = Date.parse('2026-10-04T00:00:00Z');
    expect(activeRestriction({ role: 'customer', restriction: { type: 'suspended', expiresAt: new Date(now).toISOString() } }, now)).toBeNull();
    expect(activeRestriction({ role: 'customer', restriction: { type: 'banned' } }, now).type).toBe('banned');
  });
  it('interprets custom expiry in Philippine time, independent of the computer timezone', () => {
    expect(suspensionExpiry('custom', '2026-10-05T08:30')).toBe('2026-10-05T00:30:00.000Z');
  });
});
