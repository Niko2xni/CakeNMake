const { createHash } = require('node:crypto');
const Blueprint = require('../models/Blueprint');
const Platform = require('../models/Platform');
const storage = require('../services/blueprintStorageService');
const checkout = require('../services/checkoutReservationService');
const pricing = require('../services/pricingService');

// Authenticated demo submission. Payment completion is a simulated client assertion,
// not proof of a real charge. Do not return storage identifiers or PDF URLs.
async function submitBlueprint(req, res) {
  const body = req.body || {};
  const { submissionId, designName, deliveryDate, designSnapshot, quoteSnapshot, pdfBase64 } = body;
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(submissionId || '')
    || typeof designName !== 'string' || !designName.trim() || designName.length > 200
    || typeof deliveryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)
    || Number.isNaN(new Date(deliveryDate).getTime())
    || !designSnapshot || typeof designSnapshot !== 'object' || Array.isArray(designSnapshot)
    || body.paymentMode !== 'simulated' || body.paymentCompleted !== true
    || typeof pdfBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(pdfBase64)
    || pdfBase64.length % 4 !== 0
    || (body.customerName != null && (typeof body.customerName !== 'string' || body.customerName.length > 200))) {
    return res.status(400).json({ message: 'Invalid blueprint submission or incomplete simulated payment.' });
  }
  const buffer = Buffer.from(pdfBase64, 'base64');
  if (buffer.length > storage.MAX_BLUEPRINT_BYTES || buffer.subarray(0, 5).toString() !== '%PDF-') {
    return res.status(400).json({ message: 'A PDF of at most 20 MiB is required.' });
  }
  if (quoteSnapshot != null && (typeof quoteSnapshot !== 'object' || Array.isArray(quoteSnapshot)
    || !Number.isSafeInteger(quoteSnapshot.totalMinor) || quoteSnapshot.totalMinor < 0
    || !Array.isArray(quoteSnapshot.lineItems))) {
    return res.status(400).json({ message: 'Invalid pricing quote snapshot.' });
  }
  const customerName = req.user?.displayName || body.customerName?.trim() || 'Guest';
  const submissionHash = createHash('sha256').update(JSON.stringify({ designName, deliveryDate, designSnapshot, quoteSnapshot: quoteSnapshot || null, customerName })).update(buffer).digest('hex');
  let record;
  let readySaved = false;
  try {
    const platform = await Platform.findOne({ slug: body.platformSlug || 'mamshie-bakery', isActive: true });
    if (!platform) return res.status(404).json({ message: 'Bakery not found.' });
    const key = { platform: platform._id, submissionId };
    const existing = await Blueprint.findOne(key);
    if (existing) {
      if (req.user && String(existing.customer) !== String(req.user._id)) return res.status(403).json({ message: 'Submission belongs to another account.' });
      if (existing.submissionHash !== submissionHash) return res.status(409).json({ message: 'Submission ID already belongs to a different blueprint.' });
      if (existing.status !== 'failed') {
        if (existing.status === 'ready') await checkout.ensureCheckoutReservation(existing);
        return res.status(existing.status === 'ready' ? 200 : 202).json({
          submissionId,
          status: existing.status,
          platformId: String(existing.platform),
        });
      }
      record = await Blueprint.findOneAndUpdate({ ...key, status: 'failed' }, { $set: { status: 'uploading', failureReason: null } }, { new: true });
      if (!record) return res.status(202).json({ submissionId, status: 'uploading', platformId: String(platform._id) });
    } else {
      const orderPricingSnapshot = { ...pricing.buildQuote(designSnapshot, await pricing.getActivePriceBook(platform._id)), calculatedAt: new Date() };
      if (quoteSnapshot && quoteSnapshot.totalMinor !== orderPricingSnapshot.totalMinor) return res.status(409).json({ message: 'Cake pricing changed. Refresh the quote before checking out.' });
      record = await Blueprint.create({ ...key, submissionHash, customer: req.user?._id || null, customerName, designName: designName.trim(), deliveryDate, designSnapshot, quoteSnapshot: quoteSnapshot || null, orderPricingSnapshot, paymentMode: 'simulated', paymentCompletedAt: new Date() });
    }
    record.pdf = await storage.uploadBlueprintPdf({ buffer, platformId: platform._id, blueprintId: record._id });
    record.status = 'ready';
    await record.save();
    readySaved = true;
    await checkout.ensureCheckoutReservation(record);
    return res.status(201).json({ submissionId, status: 'ready', platformId: String(platform._id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Submission already in progress. Retry with the same submission ID.' });
    if (record && !readySaved) {
      await Blueprint.updateOne({ _id: record._id }, { $set: { status: 'failed', failureReason: 'PDF storage failed.' } }).catch(() => {});
    }
    console.error('Blueprint submission failed:', error.message);
    return res.status(503).json({ message: 'Blueprint could not be stored. Retry with the same submission ID.' });
  }
}

module.exports = { submitBlueprint };
