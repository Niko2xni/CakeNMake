const { randomUUID } = require('node:crypto');
const { cloudinary } = require('../config/cloudinary');
const { findAccessibleConversation, httpError } = require('../services/conversationAccessService');
const { assertCustomerMayAct } = require('../services/moderationService');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function decodeImage(image) {
  const match = typeof image === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4 !== 0) throw httpError(400, 'INVALID_IMAGE', 'Choose a JPEG, PNG, or WebP image.');
  if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw httpError(413, 'IMAGE_TOO_LARGE', 'Image must be at most 5 MiB.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw httpError(413, 'IMAGE_TOO_LARGE', 'Image must be at most 5 MiB.');
  const valid = match[1] === 'png'
    ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === 'jpeg'
      ? buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      : buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw httpError(400, 'INVALID_IMAGE', 'Image content does not match its file type.');
  return buffer;
}

async function uploadImage(req, res) {
  try {
    const { kind, conversationId, image } = req.body || {};
    if (!['avatar', 'chat'].includes(kind)) throw httpError(400, 'INVALID_IMAGE_KIND', 'Invalid image upload purpose.');
    if (kind === 'chat') {
      if (req.user.role === 'customer') await assertCustomerMayAct(req.user);
      const conversation = await findAccessibleConversation(req.user, conversationId);
      if (conversation.status !== 'open') throw httpError(403, 'CONVERSATION_CLOSED', 'This conversation is closed.');
    }
    const buffer = decodeImage(image);
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw httpError(503, 'IMAGE_UPLOAD_UNAVAILABLE', 'Image uploads are not configured.');
    }
    // Use the trusted account ID, never client-supplied ownership or filenames.
    const folder = kind === 'avatar'
      ? `cakenmake/avatars/${req.user._id}`
      : `cakenmake/chat-attachments/${conversationId}/${req.user._id}`;
    const asset = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        resource_type: 'image', type: 'upload', public_id: `${folder}/${randomUUID()}`,
        overwrite: false, allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], timeout: 60000,
      }, (error, result) => error ? reject(error) : resolve(result));
      stream.on('error', reject);
      stream.end(buffer);
    });
    const url = new URL(asset.secure_url);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || asset.resource_type !== 'image') throw new Error('Unexpected image upload result.');
    return res.status(201).json({ secureUrl: asset.secure_url });
  } catch (error) {
    if (!error.status) console.error('Image upload failed:', error.message);
    return res.status(error.status || 503).json({ code: error.code || 'IMAGE_UPLOAD_FAILED', message: error.status ? error.message : 'Image could not be uploaded. Please try again.' });
  }
}

module.exports = { decodeImage, uploadImage, MAX_IMAGE_BYTES };
