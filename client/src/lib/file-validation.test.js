import { describe, expect, it } from 'vitest';
import { validateUploadedFile } from './file-validation';

describe('validateUploadedFile', () => {
  it('accepts a matching MIME type and extension', () => {
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 100 })).toBeNull();
  });

  it('rejects extension and MIME mismatches', () => {
    expect(validateUploadedFile({ name: 'payload.html', type: 'image/png', size: 100 })).toMatch(/does not match/);
  });

  it('rejects empty and oversized files', () => {
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 11 * 1024 * 1024 })).toMatch(/smaller/);
  });
});
