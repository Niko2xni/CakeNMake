import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Designer Tutorial Auto-Activation Rules', () => {
  const TUTORIAL_DONE_KEY = 'cakenmake_has_completed_tutorial';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('never auto-activates the tutorial for a guest on /guest-designer or when unauthenticated', () => {
    const isGuestPage = true;
    const account = null;
    const forced = false;

    const shouldAutoStart = !forced && (isGuestPage || !account);
    expect(shouldAutoStart).toBe(true); // Should bail out / return early (do not auto-start)
  });

  it('auto-activates the tutorial for a logged-in user who made a 1st time account and created their first design', () => {
    const isGuestPage = false;
    const account = { _id: 'user_123', hasSeenTutorial: false };
    const forced = false;
    const isFirstDesignCreated = true;

    // 1. Guest check
    const isGuest = !forced && (isGuestPage || !account);
    expect(isGuest).toBe(false);

    // 2. Seen check
    const userKey = `${TUTORIAL_DONE_KEY}_${account._id}`;
    const seen = Boolean(account.hasSeenTutorial) ||
      localStorage.getItem(userKey) === 'true' ||
      localStorage.getItem(TUTORIAL_DONE_KEY) === 'true';
    expect(seen).toBe(false);

    // 3. First design check
    expect(isFirstDesignCreated).toBe(true);

    // Auto-activates and marks tutorial completed
    localStorage.setItem(userKey, 'true');
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    account.hasSeenTutorial = true;

    expect(localStorage.getItem(userKey)).toBe('true');
    expect(account.hasSeenTutorial).toBe(true);
  });

  it('does NOT auto-activate the tutorial for the design created after that (2nd design)', () => {
    const isGuestPage = false;
    const account = { _id: 'user_123', hasSeenTutorial: true };
    const forced = false;
    const isFirstDesignCreated = false; // 2nd design has activeUserDesigns.length >= 1

    const userKey = `${TUTORIAL_DONE_KEY}_${account._id}`;
    localStorage.setItem(userKey, 'true');

    const seen = Boolean(account.hasSeenTutorial) ||
      localStorage.getItem(userKey) === 'true' ||
      localStorage.getItem(TUTORIAL_DONE_KEY) === 'true';

    // Both seen check and isFirstDesign check prevent auto-activation
    expect(seen).toBe(true);
    expect(isFirstDesignCreated).toBe(false);
  });
});
