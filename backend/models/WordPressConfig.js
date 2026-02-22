const mongoose = require('mongoose');

const wordpressConfigSchema = new mongoose.Schema({
  siteUrl: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true
  },
  appPassword: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTested: {
    type: Date
  },
  testStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WordPressConfig', wordpressConfigSchema);
