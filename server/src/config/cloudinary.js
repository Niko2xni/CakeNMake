const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {string|null} - Public ID or null if not a Cloudinary URL
 */
const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/public_id.jpg
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the upload folder and get everything after it
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
      return null;
    }
    
    // Get the public ID (everything after 'upload')
    const publicIdWithExtension = pathParts.slice(uploadIndex + 1).join('/');
    
    // Remove version number if present (starts with 'v' followed by digits)
    let publicIdWithoutVersion = publicIdWithExtension;
    const versionMatch = publicIdWithExtension.match(/^v\d+\//);
    if (versionMatch) {
      publicIdWithoutVersion = publicIdWithExtension.substring(versionMatch[0].length);
    }
    
    // Remove file extension
    const lastDotIndex = publicIdWithoutVersion.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return publicIdWithoutVersion.substring(0, lastDotIndex);
    }
    
    return publicIdWithoutVersion;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
};

/**
 * Delete image from Cloudinary by URL
 * @param {string} url - Cloudinary image URL
 * @returns {Promise<boolean>} - True if deletion succeeded or URL was null, false otherwise
 */
const deleteImageByUrl = async (url) => {
  if (!url) {
    console.log('[DEBUG] deleteImageByUrl - No URL provided, returning true');
    return true;
  }
  
  try {
    console.log('[DEBUG] deleteImageByUrl - Attempting to delete:', url);
    const publicId = extractPublicId(url);
    if (!publicId) {
      console.warn('[DEBUG] deleteImageByUrl - Could not extract public ID from URL:', url);
      return false;
    }
    
    console.log('[DEBUG] deleteImageByUrl - Extracted public ID:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('[DEBUG] deleteImageByUrl - Cloudinary deletion result:', result);
    
    if (result.result === 'ok' || result.result === 'not found') {
      console.log('[DEBUG] deleteImageByUrl - Deletion successful');
      return true;
    }
    
    console.warn('[DEBUG] deleteImageByUrl - Cloudinary deletion failed:', result);
    return false;
  } catch (error) {
    console.error('[ERROR] deleteImageByUrl - Error deleting image from Cloudinary:', error);
    return false;
  }
};

module.exports = { cloudinary, deleteImageByUrl };
