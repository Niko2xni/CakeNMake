const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  entries: { type: [mongoose.Schema.Types.Mixed], default: [] },
  cooldownUntil: { type: Date, default: null },
});
module.exports = mongoose.model('ChatGate', schema);
