const WooCommerceConfig = require('../models/WooCommerceConfig');
const { testConnection } = require('../utils/woocommerceAPI');

/**
 * Get WooCommerce configuration
 * Returns from database if exists, otherwise from .env
 */
const getConfig = async (req, res) => {
  try {
    let config = await WooCommerceConfig.findOne({ isActive: true });

    if (!config) {
      // Check if configured via .env
      if (process.env.WOOCOMMERCE_SITE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) {
        config = {
          siteUrl: process.env.WOOCOMMERCE_SITE_URL,
          consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
          consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
          source: 'environment',
          message: 'Configuration loaded from environment (.env)'
        };
      } else {
        return res.status(404).json({
          success: false,
          message: 'No WooCommerce configuration found. Add credentials to .env or configure via Settings.'
        });
      }
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
    const { siteUrl, consumerKey, consumerSecret } = req.body;

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
 */
const testWooConnection = async (req, res) => {
  try {
    const { siteUrl, consumerKey, consumerSecret } = req.body;
    const result = await testConnection(siteUrl, consumerKey, consumerSecret);

    if (req.body.configId) {
      await WooCommerceConfig.findByIdAndUpdate(req.body.configId, {
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
