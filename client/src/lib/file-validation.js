const DEFAULT_ALLOWED_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
};

function extensionOf(filename = '') {
  const dot = filename.lastIndexOf('.');
  return dot > -1 ? filename.slice(dot + 1).toLowerCase() : '';
}

export function validateUploadedFile(file, {
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxBytes = 10 * 1024 * 1024,
} = {}) {
  if (!file || typeof file.name !== 'string') return 'Choose a valid file.';
  if (!Number.isFinite(file.size) || file.size <= 0) return 'The selected file is empty.';
  if (file.size > maxBytes) return `The selected file must be smaller than ${Math.ceil(maxBytes / 1024 / 1024)} MB.`;

  const extensions = allowedTypes[file.type];
  if (!extensions || !extensions.includes(extensionOf(file.name))) {
    return 'The file type does not match an allowed format.';
  }

  return null;
}

export { DEFAULT_ALLOWED_TYPES };
