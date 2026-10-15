const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const thumbnailPrefix = (firebaseUid, designId) =>
  `cakenmake/users/${firebaseUid}/designs/${designId}/`;

const createThumbnailUploadSignature = ({ firebaseUid, designId }) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = thumbnailPrefix(firebaseUid, designId).replace(/\/$/, '');
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    signature,
    timestamp,
  };
};

const verifyThumbnailAsset = async ({ firebaseUid, designId, publicId, secureUrl }) => {
  const expectedPrefix = thumbnailPrefix(firebaseUid, designId);
  if (typeof publicId !== 'string' || !publicId.startsWith(expectedPrefix)) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(secureUrl);
  } catch {
    return null;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'res.cloudinary.com') return null;
  if (!parsedUrl.pathname.startsWith(`/${cloudName}/image/upload/`)) return null;

  const resource = await cloudinary.api.resource(publicId, { resource_type: 'image' });
  if (resource.public_id !== publicId || resource.resource_type !== 'image') return null;

  return { publicId, secureUrl: resource.secure_url || secureUrl };
};

const deleteTrustedThumbnail = async ({ asset, firebaseUid, designId }) => {
  const expectedPrefix = thumbnailPrefix(firebaseUid, designId);
  if (!asset?.trusted || asset.ownerUid !== firebaseUid) return false;
  if (!asset.publicId?.startsWith(expectedPrefix)) return false;

  try {
    const result = await cloudinary.uploader.destroy(asset.publicId, {
      invalidate: true,
      resource_type: 'image',
    });
    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    console.error('Trusted Cloudinary thumbnail cleanup failed:', error.message);
    return false;
  }
};

const templateFolder = 'cakenmake/templates';

const createTemplateUploadSignature = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = templateFolder;
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    signature,
    timestamp,
  };
};

module.exports = {
  cloudinary,
  createTemplateUploadSignature,
  createThumbnailUploadSignature,
  deleteTrustedThumbnail,
  thumbnailPrefix,
  verifyThumbnailAsset,
};
