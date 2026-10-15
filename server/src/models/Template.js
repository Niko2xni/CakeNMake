const mongoose = require('mongoose');

const templateViewSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  angle: {
    type: String,
    default: '',
  },
  cloudinaryPublicId: {
    type: String,
    default: '',
  },
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  longDescription: {
    type: String,
    default: '',
    trim: true,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TemplateSection',
    required: true,
  },
  priceMinor: {
    type: Number,
    default: 0,
  },
  specs: [{
    label: String,
    value: String,
  }],
  views: [templateViewSchema],
  thumbnail: {
    type: String,
    default: '',
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  order: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Template', templateSchema);
