const WordPressConfig = require('../models/WordPressConfig');
const { testConnection } = require('../utils/wordpressAPI');

/**
 * Get WordPress configuration
 */
const getConfig = async (req, res) => {
  try {
    const config = await WordPressConfig.findOne({ isActive: true });
    
    if (!config) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No WordPress configuration found'
      });
    }
    
    // Don't send password to frontend
    const configData = config.toObject();
    delete configData.appPassword;
    
    res.json({
      success: true,
      data: configData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Save or update WordPress configuration
 */
const saveConfig = async (req, res) => {
  try {
    let { siteUrl, username, appPassword } = req.body;
    siteUrl = (siteUrl || '').trim().replace(/\/+$/, '');

    const existingConfig = await WordPressConfig.findOne({ isActive: true });
    const finalPassword = (appPassword && String(appPassword).trim()) || (existingConfig?.appPassword);

    if (!finalPassword) {
      return res.status(400).json({
        success: false,
        message: 'Application password is required. Enter it when saving for the first time or when updating.'
      });
    }

    // Deactivate all existing configs
    await WordPressConfig.updateMany({}, { isActive: false });

    // Create new config
    const config = await WordPressConfig.create({
      siteUrl,
      username,
      appPassword: finalPassword,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'WordPress configuration saved successfully',
      data: {
        _id: config._id,
        siteUrl: config.siteUrl,
        username: config.username,
        isActive: config.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Test WordPress connection
 * Accepts either: (siteUrl, username, appPassword) OR (configId) to test with stored credentials
 */
const testWPConnection = async (req, res) => {
  try {
    let { siteUrl, username, appPassword, configId } = req.body;

    if (configId && (!appPassword || !appPassword.trim())) {
      const storedConfig = await WordPressConfig.findById(configId);
      if (storedConfig) {
        siteUrl = storedConfig.siteUrl;
        username = storedConfig.username;
        appPassword = storedConfig.appPassword;
      }
    }

    if (!siteUrl || !username || !appPassword) {
      return res.status(400).json({
        success: false,
        message: 'Site URL, username, and application password are required. Or provide configId to test with stored credentials.'
      });
    }

    const result = await testConnection(siteUrl, username, appPassword);

    if (configId) {
      await WordPressConfig.findByIdAndUpdate(configId, {
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
 * Delete WordPress configuration
 */
const deleteConfig = async (req, res) => {
  try {
    const config = await WordPressConfig.findByIdAndDelete(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'WordPress configuration deleted successfully'
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
  testWPConnection,
  deleteConfig
};
