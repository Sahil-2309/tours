const mongoose = require('mongoose');

const woocommerceConfigSchema = new mongoose.Schema({
  siteUrl: {
    type: String,
    required: true,
    trim: true
  },
  consumerKey: {
    type: String,
    required: true
  },
  consumerSecret: {
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
  },
  defaultCategory: {
    type: Number,
    description: 'Default WooCommerce product category ID'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WooCommerceConfig', woocommerceConfigSchema);
