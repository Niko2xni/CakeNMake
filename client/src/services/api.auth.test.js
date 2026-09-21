import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: firebaseMocks.getIdToken,
    },
  },
}));

import { accountApi, bakeryApi } from './api';

describe('authenticated account API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    firebaseMocks.getIdToken.mockReset();
    firebaseMocks.getIdToken.mockResolvedValue('firebase-id-token');
  });

  it('sends the current Firebase ID token when synchronizing an account', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ user: { role: 'customer' } }),
    });

    await accountApi.sync();

    expect(firebaseMocks.getIdToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/account\/sync$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer firebase-id-token',
        }),
      }),
    );
  });

  it('preserves backend error codes and status values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended.',
      }),
    });

    await expect(accountApi.getMe()).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
      status: 403,
      message: 'This account has been suspended.',
    });
  });

  it('authenticates bakery requests without sending a client-controlled platform slug', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });

    await bakeryApi.getReservations('confirmed');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/bakery\/reservations\?status=confirmed$/);
    expect(url).not.toContain('platformSlug');
    expect(options.headers.Authorization).toBe('Bearer firebase-id-token');
  });
});
