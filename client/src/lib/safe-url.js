const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function safeExternalUrl(value, { allowedHosts } = {}) {
  if (typeof value !== 'string' || !value.trim() || CONTROL_CHARACTERS.test(value)) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;

    if (allowedHosts?.length) {
      const hostname = url.hostname.toLowerCase();
      const allowed = allowedHosts.some((host) => {
        const normalizedHost = host.toLowerCase();
        return hostname === normalizedHost || hostname.endsWith(`.${normalizedHost}`);
      });
      if (!allowed) return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function safeMediaUrl(value) {
  if (typeof value === 'string' && value.startsWith('blob:')) return value;
  return safeExternalUrl(value);
}

export function safeFirebasePhotoUrl(value) {
  return safeExternalUrl(value, {
    allowedHosts: ['googleusercontent.com', 'firebasestorage.googleapis.com'],
  });
}
