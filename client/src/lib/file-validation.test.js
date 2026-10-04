import { describe, expect, it } from 'vitest';
import {
  validateUploadedFile,
  hasBlockedExtension,
  sanitizeFileName,
} from './file-validation';

describe('validateUploadedFile', () => {
  it('accepts a matching MIME type and extension', () => {
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 100 })).toBeNull();
  });

  it('rejects extension and MIME mismatches', () => {
    expect(validateUploadedFile({ name: 'payload.html', type: 'image/png', size: 100 })).toMatch(/not allowed|does not match/);
  });

  it('rejects executable and script files', () => {
    expect(validateUploadedFile({ name: 'trojan.exe', type: 'application/x-msdownload', size: 100 })).toMatch(/not allowed/);
    expect(validateUploadedFile({ name: 'script.vbs', type: 'text/vbs', size: 100 })).toMatch(/not allowed/);
    expect(validateUploadedFile({ name: 'exploit.php', type: 'application/x-php', size: 100 })).toMatch(/not allowed/);
  });

  it('rejects double extension attacks', () => {
    expect(hasBlockedExtension('image.png.exe')).toBe(true);
    expect(hasBlockedExtension('cake.php.png')).toBe(true);
    expect(hasBlockedExtension('invoice.vbs.pdf')).toBe(true);
    expect(hasBlockedExtension('normal_photo.jpg')).toBe(false);
  });

  it('sanitizes malicious filenames and path traversal sequences', () => {
    expect(sanitizeFileName('../../etc/passwd.png')).toBe('passwd.png');
    expect(sanitizeFileName('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
    expect(sanitizeFileName('test\u0000payload.png')).toBe('testpayload.png');
    expect(sanitizeFileName('normal-cake.png')).toBe('normal-cake.png');
  });

  it('rejects empty and oversized files', () => {
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(validateUploadedFile({ name: 'cake.png', type: 'image/png', size: 11 * 1024 * 1024 })).toMatch(/smaller/);
  });
});

