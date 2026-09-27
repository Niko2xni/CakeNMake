import { describe, expect, it } from 'vitest';
import { safeExternalUrl, safeFirebasePhotoUrl, safeMediaUrl } from './safe-url';

describe('safe URL helpers', () => {
  it('accepts HTTPS URLs and normalizes them', () => {
    expect(safeExternalUrl('https://example.com/document.pdf')).toBe('https://example.com/document.pdf');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://example.com', 'https://user:pass@example.com'])('rejects unsafe external URL %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });

  it('allows only approved Firebase photo hosts', () => {
    expect(safeFirebasePhotoUrl('https://lh3.googleusercontent.com/avatar')).toBeTruthy();
    expect(safeFirebasePhotoUrl('https://googleusercontent.com.evil.example/avatar')).toBeNull();
  });

  it('allows local object URLs for media previews', () => {
    expect(safeMediaUrl('blob:https://app.example/id')).toBe('blob:https://app.example/id');
  });
});
