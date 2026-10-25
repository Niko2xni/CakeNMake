const Blueprint = require('../models/Blueprint');
const { cloudinary } = require('../config/cloudinary');
const { blueprintPublicId } = require('../services/blueprintStorageService');

async function listBlueprints(req, res) {
  try {
    const records = await Blueprint.find({ platform: req.platformId })
      .select('customerName designName deliveryDate quoteSnapshot.totalMinor quoteSnapshot.currency status failureReason createdAt')
      .sort({ createdAt: -1 }).limit(200).lean();
    return res.json(records.map((record) => ({
      id: record._id, customerName: record.customerName, designName: record.designName,
      deliveryDate: record.deliveryDate, totalMinor: record.quoteSnapshot?.totalMinor ?? null,
      currency: record.quoteSnapshot?.currency || 'PHP', status: record.status,
      failureReason: record.failureReason, createdAt: record.createdAt,
    })));
  } catch (error) {
    return res.status(500).json({ message: 'Could not load blueprints.' });
  }
}

async function getBlueprintAccess(req, res) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid blueprint ID.' });
  try {
    const record = await Blueprint.findOne({ _id: req.params.id, platform: req.platformId });
    if (!record) return res.status(404).json({ message: 'Blueprint not found.' });
    const accessibleStatuses = ['ready', 'in_production', 'completed', 'complete'];
    if (!accessibleStatuses.includes(record.status) || !record.pdf) return res.status(409).json({ message: 'Blueprint PDF is not ready.' });
    if (record.pdf.publicId !== blueprintPublicId(req.platformId, record._id)
      || record.pdf.resourceType !== 'raw' || record.pdf.deliveryType !== 'private') {
      return res.status(409).json({ message: 'Blueprint storage reference is invalid.' });
    }
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const url = cloudinary.utils.private_download_url(record.pdf.publicId, '', {
      resource_type: 'raw', type: 'private', expires_at: expiresAt,
      attachment: req.query.download === 'true',
    });
    res.set('Cache-Control', 'no-store');
    return res.json({ url, expiresAt });
  } catch (error) {
    return res.status(503).json({ message: 'Could not access the blueprint PDF.' });
  }
}

module.exports = { listBlueprints, getBlueprintAccess };
