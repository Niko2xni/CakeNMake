import { afterEach, expect, it, vi } from 'vitest';
import { prepareCakeReference } from './cakeReferenceImage';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('rejects unsupported and oversized files before decoding', async () => {
  await expect(prepareCakeReference({ type: 'image/svg+xml', size: 1 })).rejects.toThrow('JPEG');
  await expect(prepareCakeReference({ type: 'image/png', size: 11 * 1024 * 1024 })).rejects.toThrow('10 MB');
});
it('resizes, removes metadata by re-encoding, and releases its temporary URL', async () => {
  const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:temporary', revokeObjectURL: revoke });
  vi.stubGlobal('Image', class { naturalWidth = 2000; naturalHeight = 1000; decode = async () => {}; });
  const context = { fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = { getContext: () => context, toDataURL: vi.fn(() => 'data:image/jpeg;base64,/9j/2Q==') };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas);
  const prepared = await prepareCakeReference({ type: 'image/png', size: 100, name: 'cake.png' });
  expect(canvas.width).toBe(768); expect(canvas.height).toBe(384);
  expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.78);
  expect(prepared.data).toMatch(/^data:image\/jpeg/);
  expect(revoke).toHaveBeenCalledWith('blob:temporary');
});
