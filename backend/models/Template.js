const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  template: {
    type: String,
    required: true
  },
  // Generic fields: Array of field names that Gemini will process
  // Example: ["title", "description", "features"]
  customFields: {
    type: [String],
    default: [],
    description: 'Custom fields from Excel that Gemini will use'
  },
  category: {
    type: String,
    enum: ['tours', 'products', 'blog', 'general'],
    default: 'general'
  },
  description: {
    type: String,
    default: ''
  },
  // SEO fields - mandatory for all templates
  seoFieldsRequired: {
    type: Boolean,
    default: true,
    description: 'If true, Meta Title, Meta Description, Focus Keywords, Slug are mandatory'
  },
  // For WooCommerce products
  productFields: {
    type: [String],
    default: [],
    description: 'Product-specific fields like price, sku, stock_quantity'
  },
  // Supported post types
  supportedPostTypes: {
    type: [String],
    enum: ['wordpress', 'woocommerce'],
    default: ['wordpress'],
    description: 'Array of supported post types for this template'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Template', templateSchema);
