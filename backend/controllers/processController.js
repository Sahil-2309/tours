const Template = require('../models/Template');
const WordPressConfig = require('../models/WordPressConfig');
const WooCommerceConfig = require('../models/WooCommerceConfig');
const ProcessHistory = require('../models/ProcessHistory');
const { parseExcel } = require('../utils/excelParser');
const { generateContent } = require('../utils/geminiAPI');
const { createPost } = require('../utils/wordpressAPI');
const { createProduct } = require('../utils/woocommerceAPI');
const { marked } = require('marked');

/**
 * Process Excel file and create WordPress posts or WooCommerce products
 */
const processExcel = async (req, res) => {
  try {
    const { templateId, postType } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get template
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Determine post type - from request or Excel
    let configuredPostType = postType || 'wordpress';
    
    // Get appropriate config based on post type
    let wpConfig = null;
    let wooConfig = null;
    
    if (configuredPostType === 'wordpress' || configuredPostType === 'both') {
      wpConfig = await WordPressConfig.findOne({ isActive: true });
      if (!wpConfig) {
        return res.status(404).json({
          success: false,
          message: 'WordPress configuration not found. Please configure WordPress first.'
        });
      }
    }
    
    if (configuredPostType === 'woocommerce' || configuredPostType === 'both') {
      wooConfig = await WooCommerceConfig.findOne({ isActive: true });
      if (!wooConfig) {
        return res.status(404).json({
          success: false,
          message: 'WooCommerce configuration not found. Please configure WooCommerce first.'
        });
      }
    }
    
    // Parse Excel with SEO separation
    const excelData = parseExcel(file.buffer);
    
    if (excelData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }
    
    // Create process history record
    const processHistory = await ProcessHistory.create({
      fileName: file.originalname,
      templateId: template._id,
      templateName: template.name,
      totalRows: excelData.length,
      status: 'processing',
      postType: configuredPostType
    });
    
    // Send immediate response with process ID
    res.json({
      success: true,
      message: 'Processing started',
      processId: processHistory._id,
      totalRows: excelData.length
    });
    
    // Process rows asynchronously
    processRows(excelData, template, wpConfig, wooConfig, processHistory._id, configuredPostType);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Process rows asynchronously for both WordPress and WooCommerce
 */
const processRows = async (rows, template, wpConfig, wooConfig, processHistoryId, postType = 'wordpress') => {
  let successCount = 0;
  let failedCount = 0;
  const failedRows = [];
  const successRows = [];
  
  for (let i = 0; i < rows.length; i++) {
    try {
      const rowNumber = i + 1;
      const rowData = rows[i];
      
      // Validate SEO fields
      const missingFields = ['Meta Title', 'Meta Description', 'Focus Keywords', 'Slug'].filter(
        field => !rowData.seo[field]
      );
      
      if (missingFields.length > 0) {
        throw new Error(`Missing SEO fields: ${missingFields.join(', ')}`);
      }
      
      // Generate content using Gemini API with template and DATA content fields
      const markdownContent = await generateContent(template.template, rowData.content);
      const htmlContent = marked(markdownContent);
      
      // Build SEO meta object
      const seoMeta = {
        _yoast_wpseo_title: rowData.seo['Meta Title'],
        _yoast_wpseo_metadesc: rowData.seo['Meta Description'],
        _yoast_wpseo_focuskw: rowData.seo['Focus Keywords']
      };
      
      // Add optional SEO fields if present
      if (rowData.seo['OG Image URL']) {
        seoMeta._yoast_wpseo_opengraph_image = rowData.seo['OG Image URL'];
      }
      
      let wpResult = null;
      let wooResult = null;

      // Handle WordPress posts
      if (postType === 'wordpress' || postType === 'both') {
        const postData = {
          title: rowData.seo['Meta Title'],
          content: htmlContent,
          slug: rowData.seo['Slug'],
          meta: seoMeta
        };

        wpResult = await createPost(wpConfig, postData);
        console.log(`✅ Row ${rowNumber} - WordPress post created: ${wpResult.postUrl}`);
      }

      // Handle WooCommerce products
      if (postType === 'woocommerce' || postType === 'both') {
        // Price is required for WooCommerce
        if (!rowData.product['Price']) {
          throw new Error('Price field is required for WooCommerce products');
        }

        const productData = {
          title: rowData.seo['Meta Title'],
          name: rowData.seo['Meta Title'],
          description: htmlContent,
          price: rowData.product['Price'],
          regularPrice: rowData.product['Regular Price'] || rowData.product['Price'],
          salePrice: rowData.product['Sale Price'] || null,
          sku: rowData.product['SKU'] || rowData.seo['Slug'],
          stockQuantity: rowData.product['Stock Quantity'] || 999,
          meta: [{
            key: '_yoast_wpseo_title',
            value: rowData.seo['Meta Title']
          }, {
            key: '_yoast_wpseo_metadesc',
            value: rowData.seo['Meta Description']
          }, {
            key: '_yoast_wpseo_focuskw',
            value: rowData.seo['Focus Keywords']
          }]
        };

        wooResult = await createProduct(wooConfig, productData);
        console.log(`✅ Row ${rowNumber} - WooCommerce product created: ${wooResult.productUrl}`);
      }

      successCount++;
      const successRowEntry = {
        rowNumber,
        postType,
        seoTitle: rowData.seo['Meta Title']
      };
      if (wpResult) {
        successRowEntry.postId = wpResult.postId;
        successRowEntry.postUrl = wpResult.postUrl;
      }
      if (wooResult) {
        successRowEntry.productId = wooResult.productId;
        successRowEntry.productUrl = wooResult.productUrl;
      }
      successRows.push(successRowEntry);
      
      // Update progress after each successful row
      await ProcessHistory.findByIdAndUpdate(processHistoryId, {
        successCount,
        failedCount,
        successRows,
        failedRows
      });
      
      // Add delay to avoid rate limits (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      failedCount++;
      failedRows.push({
        rowNumber: i + 1,
        rowData: rows[i],
        error: error.message
      });
      
      console.log(`❌ Row ${i + 1} failed: ${error.message}`);
      
      // Update progress after each failed row
      await ProcessHistory.findByIdAndUpdate(processHistoryId, {
        successCount,
        failedCount,
        successRows,
        failedRows
      });
    }
  }
  
  // Update process history with final status
  await ProcessHistory.findByIdAndUpdate(processHistoryId, {
    status: failedCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'partial'),
    completedAt: new Date()
  });
  
  console.log(`✅ Processing completed: ${successCount} success, ${failedCount} failed`);
};

/**
 * Get process status
 */
const getProcessStatus = async (req, res) => {
  try {
    const process = await ProcessHistory.findById(req.params.id);
    
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    res.json({
      success: true,
      data: process
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all process history
 */
const getAllProcessHistory = async (req, res) => {
  try {
    const history = await ProcessHistory.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Retry failed rows
 */
const retryFailedRows = async (req, res) => {
  try {
    const { processId } = req.body;
    
    // Get original process history
    const originalProcess = await ProcessHistory.findById(processId);
    if (!originalProcess) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    if (originalProcess.failedRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No failed rows to retry'
      });
    }
    
    // Get template
    const template = await Template.findById(originalProcess.templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Get configuration based on post type
    let wpConfig = null;
    let wooConfig = null;
    const postType = originalProcess.postType || 'wordpress';
    
    if (postType === 'wordpress' || postType === 'both') {
      wpConfig = await WordPressConfig.findOne({ isActive: true });
    }
    
    if (postType === 'woocommerce' || postType === 'both') {
      wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    }
    
    if (!wpConfig && !wooConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    // Create new process history for retry
    const retryProcess = await ProcessHistory.create({
      fileName: `${originalProcess.fileName} (Retry)`,
      templateId: template._id,
      templateName: template.name,
      totalRows: originalProcess.failedRows.length,
      status: 'processing',
      postType: postType
    });
    
    res.json({
      success: true,
      message: 'Retry started',
      processId: retryProcess._id,
      totalRows: originalProcess.failedRows.length
    });
    
    // Extract failed row data
    const failedRowsData = originalProcess.failedRows.map(fr => fr.rowData);
    
    // Process failed rows
    processRows(failedRowsData, template, wpConfig, wooConfig, retryProcess._id, postType);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  processExcel,
  getProcessStatus,
  getAllProcessHistory,
  retryFailedRows
};
