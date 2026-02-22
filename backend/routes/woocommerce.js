const express = require('express');
const router = express.Router();
const {
  getConfig,
  saveConfig,
  testWooConnection,
  deleteConfig
} = require('../controllers/woocommerceController');

// GET WooCommerce config
router.get('/config', getConfig);

// POST save WooCommerce config
router.post('/config', saveConfig);

// POST test WooCommerce connection
router.post('/test', testWooConnection);

// DELETE WooCommerce config
router.delete('/config/:id', deleteConfig);

module.exports = router;
