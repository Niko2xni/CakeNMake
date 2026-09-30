const { cloudinary } = require('../config/cloudinary');

const MAX_BLUEPRINT_BYTES = 20 * 1024 * 1024;

// IDs are assigned by the backend, never taken from an uploaded filename.
function blueprintPublicId(platformId, blueprintId) {
  const validId = /^[a-f0-9]{24}$/i;
  if (!validId.test(String(platformId)) || !validId.test(String(blueprintId))) {
    throw new Error('Blueprint storage requires valid bakery and blueprint IDs.');
  }
  return `cakenmake/blueprints/${platformId}/${blueprintId}.pdf`;
}

async function uploadBlueprintPdf({ buffer, platformId, blueprintId }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.length > MAX_BLUEPRINT_BYTES) {
    throw new Error('Blueprint PDF must be a nonempty buffer of at most 20 MiB.');
  }
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Blueprint upload must contain a PDF file.');
  }
  const publicId = blueprintPublicId(platformId, blueprintId);
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'raw',
      type: 'private',
      public_id: publicId,
      overwrite: false,
      timeout: 60000,
    }, (error, asset) => {
      if (error) reject(error);
      else resolve(asset);
    });
    stream.on('error', reject);
    stream.end(buffer);
  });
  if (result?.public_id !== publicId || result.resource_type !== 'raw' || result.type !== 'private'
    || !Number.isSafeInteger(result.bytes) || result.bytes <= 0) {
    throw new Error('Cloudinary did not confirm a private blueprint PDF upload.');
  }
  // Return identifiers only. Access is issued later by staff-authorized routes.
  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    deliveryType: result.type,
    bytes: result.bytes,
    uploadedAt: new Date(),
  };
}

module.exports = { MAX_BLUEPRINT_BYTES, blueprintPublicId, uploadBlueprintPdf };
