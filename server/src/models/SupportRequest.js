const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['appeal', 'order'], required: true },
  restriction: { type: mongoose.Schema.Types.ObjectId, default: null },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  orderType: { type: String, enum: ['reservation', 'blueprint'], default: 'reservation' },
  openKey: { type: String, default: null },
  status: { type: String, enum: ['waiting_staff', 'waiting_customer', 'resolved'], default: 'waiting_staff' },
  messages: [{ author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, text: { type: String, maxlength: 2000 }, at: Date }],
}, { timestamps: true });
schema.index({ openKey: 1 }, { unique: true, partialFilterExpression: { openKey: { $type: 'string' } } });
module.exports = mongoose.model('SupportRequest', schema);
