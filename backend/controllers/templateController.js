const Template = require('../models/Template');

/**
 * Get all templates
 */
const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get single template by ID
 */
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create new template
 */
const createTemplate = async (req, res) => {
  try {
    const { name, template, category, description, supportedPostTypes } = req.body;
    
    const newTemplate = await Template.create({
      name,
      template,
      category,
      description,
      supportedPostTypes: Array.isArray(supportedPostTypes) && supportedPostTypes.length > 0
        ? supportedPostTypes
        : ['wordpress']
    });
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update template
 */
const updateTemplate = async (req, res) => {
  try {
    const { name, template, category, description, isActive, supportedPostTypes } = req.body;
    
    const updateFields = { name, template, category, description, isActive };
    if (Array.isArray(supportedPostTypes) && supportedPostTypes.length > 0) {
      updateFields.supportedPostTypes = supportedPostTypes;
    }
    
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );
    
    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete template
 */
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
