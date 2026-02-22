const WooCommerceConfig = require('../models/WooCommerceConfig');
const { testConnection } = require('../utils/woocommerceAPI');

/**
 * Get WooCommerce configuration
 */
const getConfig = async (req, res) => {
  try {
    const config = await WooCommerceConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No WooCommerce configuration found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Save or update WooCommerce configuration
 */
const saveConfig = async (req, res) => {
  try {
    let { siteUrl, consumerKey, consumerSecret } = req.body;
    siteUrl = (siteUrl || '').trim().replace(/\/+$/, '');

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        success: false,
        message: 'Site URL, Consumer Key, and Consumer Secret are required'
      });
    }

    await WooCommerceConfig.updateMany({}, { isActive: false });

    const config = await WooCommerceConfig.create({
      siteUrl,
      consumerKey,
      consumerSecret,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'WooCommerce configuration saved successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Test WooCommerce connection
 * Accepts (siteUrl, consumerKey, consumerSecret) OR (configId) to test with stored credentials
 */
const testWooConnection = async (req, res) => {
  try {
    let { siteUrl, consumerKey, consumerSecret, configId } = req.body;

    if (configId && (!consumerKey?.trim() || !consumerSecret?.trim())) {
      const storedConfig = await WooCommerceConfig.findById(configId);
      if (storedConfig) {
        siteUrl = storedConfig.siteUrl;
        consumerKey = storedConfig.consumerKey;
        consumerSecret = storedConfig.consumerSecret;
      }
    }

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        success: false,
        message: 'Site URL, consumer key, and consumer secret are required. Or provide configId to test with stored credentials.'
      });
    }

    const result = await testConnection(siteUrl, consumerKey, consumerSecret);

    if (configId) {
      await WooCommerceConfig.findByIdAndUpdate(configId, {
        lastTested: new Date(),
        testStatus: result.success ? 'success' : 'failed'
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete WooCommerce configuration
 */
const deleteConfig = async (req, res) => {
  try {
    const config = await WooCommerceConfig.findByIdAndDelete(req.params.id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'WooCommerce configuration deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getConfig,
  saveConfig,
  testWooConnection,
  deleteConfig
};
