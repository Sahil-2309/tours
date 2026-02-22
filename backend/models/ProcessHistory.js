const mongoose = require('mongoose');

const processHistorySchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  totalRows: {
    type: Number,
    required: true
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  postType: {
    type: String,
    enum: ['wordpress', 'woocommerce', 'both'],
    default: 'wordpress',
    description: 'Where the content was posted'
  },
  failedRows: [{
    rowNumber: Number,
    rowData: Object,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  successRows: [{
    rowNumber: Number,
    postType: String,
    seoTitle: String,
    postId: Number,
    postUrl: String,
    productId: Number,
    productUrl: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'partial'],
    default: 'processing'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProcessHistory', processHistorySchema);
