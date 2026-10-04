const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'msi', 'scr', 'com', 'jar', 'apk', 'sh', 'vbs', 'ps1',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'php', 'phtml', 'py', 'pyc', 'pl',
  'pm', 'rb', 'dll', 'sys', 'drv', 'cpl', 'hta', 'wsf', 'wsh', 'reg', 'lnk',
  'iso', 'dmg', 'bin', 'deb', 'rpm', 'shtml', 'svg', 'xhtml', 'htm', 'html',
  'asp', 'aspx', 'jsp', 'cgi', 'vbe', 'jse', 'ws', 'wsc', 'inf', 'scf', 'pif',
  'bas'
];

const DEFAULT_ALLOWED_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
};

function extensionOf(filename = '') {
  const dot = filename.lastIndexOf('.');
  return dot > -1 ? filename.slice(dot + 1).toLowerCase().trim() : '';
}

export function sanitizeFileName(name) {
  if (typeof name !== 'string') return 'file';
  let clean = name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  clean = clean.split(/[/\\]+/).pop() || 'file';
  clean = clean.replace(/^\.+/, '').replace(/\.\.+/g, '.');
  clean = clean.trim();
  return clean.slice(0, 200) || 'file';
}

export function hasBlockedExtension(filename = '') {
  if (typeof filename !== 'string' || !filename.trim()) return true;
  if (/[\u0000-\u001F\u007F-\u009F]/.test(filename)) return true;
  const segments = filename.toLowerCase().split('.');
  if (segments.length <= 1) return false;
  for (let i = 1; i < segments.length; i++) {
    const ext = segments[i].trim();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return true;
    }
  }
  return false;
}

export function validateUploadedFile(file, {
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxBytes = 10 * 1024 * 1024,
} = {}) {
  if (!file || typeof file.name !== 'string') return 'Choose a valid file.';
  if (!Number.isFinite(file.size) || file.size <= 0) return 'The selected file is empty.';
  if (file.size > maxBytes) return `The selected file must be smaller than ${Math.ceil(maxBytes / 1024 / 1024)} MB.`;

  if (hasBlockedExtension(file.name)) {
    return 'This file type is not allowed for security reasons.';
  }

  const extensions = allowedTypes[file.type];
  if (!extensions || !extensions.includes(extensionOf(file.name))) {
    return 'The file type does not match an allowed format.';
  }

  return null;
}

export { BLOCKED_EXTENSIONS, DEFAULT_ALLOWED_TYPES };

