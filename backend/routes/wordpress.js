const express = require('express');
const router = express.Router();
const {
  getConfig,
  saveConfig,
  testWPConnection,
  deleteConfig
} = require('../controllers/wordpressController');

// GET WordPress config
router.get('/config', getConfig);

// POST save WordPress config
router.post('/config', saveConfig);

// POST test WordPress connection
router.post('/test', testWPConnection);

// DELETE WordPress config
router.delete('/config/:id', deleteConfig);

module.exports = router;
