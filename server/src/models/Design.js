const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Untitled',
    required: true
  },
  config: {
    type: Object,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  thumbnailFallback: {
    type: String,
    default: null
  },
  lastEdited: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isTrashed: {
    type: Boolean,
    default: false
  },
  trashedAt: {
    type: Date,
    default: null
  },
  sentToBakery: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Update lastEdited timestamp before saving
designSchema.pre('save', function() {
  this.lastEdited = new Date();
});

module.exports = mongoose.model('Design', designSchema);
