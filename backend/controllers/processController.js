const Template = require('../models/Template');
const WordPressConfig = require('../models/WordPressConfig');
const WooCommerceConfig = require('../models/WooCommerceConfig');
const ProcessHistory = require('../models/ProcessHistory');
const { parseExcel } = require('../utils/excelParser');
const { generateContent } = require('../utils/geminiAPI');
const { createPost } = require('../utils/wordpressAPI');
const { createProduct } = require('../utils/woocommerceAPI');
const { marked } = require('marked');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const DEFAULT_GEMINI_MODEL = 'models/gemini-2.5-flash';

// ─────────────────────────────────────────────
// Gemini call helper — model dynamic
// ─────────────────────────────────────────────
const callGemini = async (prompt, model = DEFAULT_GEMINI_MODEL) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }]
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.data?.candidates?.[0]?.content?.parts?.[0]) {
    return response.data.candidates[0].content.parts[0].text;
  }

  throw new Error('Invalid response from Gemini API');
};

const extractJSON = (text) => {
  let str = text;
  if (str.includes('```json')) str = str.split('```json')[1].split('```')[0];
  else if (str.includes('```')) str = str.split('```')[1].split('```')[0];
  return JSON.parse(str.trim());
};

// ─────────────────────────────────────────────
// WooCommerce product generator
// ─────────────────────────────────────────────
const generateWooCommerceProduct = async (template, rowData, productType = 'simple', geminiModel = DEFAULT_GEMINI_MODEL) => {
  const price = rowData.product?.['Price'] || rowData.content?.['Price'] || '';
  const sku = rowData.product?.['SKU'] || rowData.seo?.['Slug'] || '';
  const stockQuantity = parseInt(rowData.product?.['Stock Quantity'] || rowData.content?.['Stock Quantity'] || 999);

  if (!price) throw new Error('Price field is required for WooCommerce products');

  const contentForDescription = JSON.stringify(rowData.content);

  const prompt = `You are a WooCommerce product content generator for tour packages.

TEMPLATE TO FOLLOW FOR DESCRIPTION:
${template.template}

TOUR DATA:
${contentForDescription}

SEO DATA:
- Title: ${rowData.seo['Meta Title']}
- Meta Description: ${rowData.seo['Meta Description']}
- Focus Keyword: ${rowData.seo['Focus Keywords']}

STRICT RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation, no extra text
2. Fill EXACTLY these 2 fields and nothing else:
   - short_description: max 155 chars sales teaser based on tour data
   - description: complete HTML description using the TEMPLATE structure above (use <h2>, <h3>, <p>, <ul>, <strong> — NO markdown)
3. DO NOT add any other fields
4. Output ONLY the JSON object`;

  // ✅ geminiModel pass karo
  const rawText = await callGemini(prompt, geminiModel);
  const aiData = extractJSON(rawText);

  const product = {
    name: rowData.seo['Meta Title'],
    slug: rowData.seo['Slug'],
    type: productType,
    status: 'draft',
    short_description: aiData.short_description || '',
    description: aiData.description || '',
    price: String(price),
    regular_price: String(price),
    sku: String(sku),
    stock_quantity: stockQuantity,
    manage_stock: true,
    meta_data: [
      { key: 'rank_math_title', value: rowData.seo['Meta Title'] },
      { key: 'rank_math_description', value: rowData.seo['Meta Description'] },
      { key: 'rank_math_focus_keyword', value: rowData.seo['Focus Keywords'] }
    ]
  };

  return product;
};

// ─────────────────────────────────────────────
// Main process Excel handler
// ─────────────────────────────────────────────
const processExcel = async (req, res) => {
  try {
    const { templateId, postType, wooProductType, geminiModel } = req.body; // ✅ geminiModel add
    const { wpSiteUrl, wpUsername, wpAppPassword } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const configuredPostType = postType || 'wordpress';
    const configuredProductType = wooProductType || 'simple';
    const configuredGeminiModel = geminiModel || DEFAULT_GEMINI_MODEL; // ✅

    let wpConfig = null;
    let wooConfig = null;

    if (configuredPostType === 'wordpress' || configuredPostType === 'both') {
      if (!wpSiteUrl || !wpUsername || !wpAppPassword) {
        return res.status(400).json({
          success: false,
          message: 'WordPress credentials required. Please configure WordPress Settings first.'
        });
      }
      wpConfig = { siteUrl: wpSiteUrl, username: wpUsername, appPassword: wpAppPassword };
    }

    if (configuredPostType === 'woocommerce' || configuredPostType === 'both') {
      wooConfig = await WooCommerceConfig.findOne({ isActive: true });

      if (!wooConfig) {
        if (process.env.WOOCOMMERCE_SITE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) {
          wooConfig = {
            siteUrl: process.env.WOOCOMMERCE_SITE_URL,
            consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
            consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET
          };
        } else {
          return res.status(404).json({
            success: false,
            message: 'WooCommerce configuration not found. Add credentials to .env or configure via Settings.'
          });
        }
      }
    }

    const excelData = parseExcel(file.buffer);
    if (excelData.length === 0) return res.status(400).json({ success: false, message: 'Excel file is empty' });

    const processHistory = await ProcessHistory.create({
      fileName: file.originalname,
      templateId: template._id,
      templateName: template.name,
      totalRows: excelData.length,
      status: 'processing',
      postType: configuredPostType,
      wooProductType: configuredProductType,
      geminiModel: configuredGeminiModel // ✅ DB mein save karo
    });

    res.json({
      success: true,
      message: 'Processing started',
      processId: processHistory._id,
      totalRows: excelData.length
    });

    processRows(excelData, template, wpConfig, wooConfig, processHistory._id, configuredPostType, configuredProductType, configuredGeminiModel);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Row processor
// ─────────────────────────────────────────────
const processRows = async (rows, template, wpConfig, wooConfig, processHistoryId, postType = 'wordpress', wooProductType = 'simple', geminiModel = DEFAULT_GEMINI_MODEL) => {
  let successCount = 0;
  let failedCount = 0;
  const failedRows = [];
  const successRows = [];

  for (let i = 0; i < rows.length; i++) {
    const processDoc = await ProcessHistory.findById(processHistoryId);
    if (processDoc?.shouldStop) {
      console.log('🛑 Processing stopped by user');
      break;
    }

    const rowNumber = i + 1;
    const rowData = rows[i];

    const missingFields = ['Meta Title', 'Meta Description', 'Focus Keywords', 'Slug'].filter(
      field => !rowData.seo?.[field]
    );

    if (missingFields.length > 0) {
      failedCount++;
      failedRows.push({
        rowNumber,
        rowData,
        error: `Missing SEO fields: ${missingFields.join(', ')}`
      });
      await ProcessHistory.findByIdAndUpdate(processHistoryId, { successCount, failedCount, successRows, failedRows });
      continue;
    }

    // ─── WordPress ───
    let wpResult = null;
    let wpError = null;

    if (postType === 'wordpress' || postType === 'both') {
      try {
        // ✅ geminiModel pass karo generateContent mein
        const markdownContent = await generateContent(template.template, rowData.content, geminiModel);
        const htmlContent = marked(markdownContent);

        const seoMeta = {
          _yoast_wpseo_title: rowData.seo['Meta Title'],
          _yoast_wpseo_metadesc: rowData.seo['Meta Description'],
          _yoast_wpseo_focuskw: rowData.seo['Focus Keywords']
        };

        if (rowData.seo['OG Image URL']) {
          seoMeta._yoast_wpseo_opengraph_image = rowData.seo['OG Image URL'];
        }

        const postData = {
          title: rowData.seo['Meta Title'],
          content: htmlContent,
          slug: rowData.seo['Slug'],
          meta: seoMeta
        };

        wpResult = await createPost(wpConfig, postData);
        console.log(`✅ Row ${rowNumber} - WordPress post created: ${wpResult.postUrl}`);
      } catch (error) {
        wpError = error.message;
        console.log(`❌ Row ${rowNumber} - WordPress failed: ${error.message}`);
      }
    }

    // ─── WooCommerce ───
    let wooResult = null;
    let wooError = null;

    if (postType === 'woocommerce' || postType === 'both') {
      try {
        // ✅ geminiModel pass karo
        const productData = await generateWooCommerceProduct(template, rowData, wooProductType, geminiModel);

        const siteUrl = wooConfig.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
        const consumerKey = wooConfig.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = wooConfig.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

        if (!siteUrl || !consumerKey || !consumerSecret) {
          throw new Error('WooCommerce credentials not configured');
        }

        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        const wooResponse = await axios.post(
          `${siteUrl}/wp-json/wc/v3/products`,
          productData,
          { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
        );

        const created = wooResponse.data;
        wooResult = {
          productId: created.id,
          productUrl: created.permalink,
          price: created.price,
          slug: created.slug
        };

        console.log(`✅ Row ${rowNumber} - WooCommerce product created: ${created.name} (ID: ${created.id})`);
      } catch (error) {
        wooError = error.message;
        console.log(`❌ Row ${rowNumber} - WooCommerce failed: ${error.message}`);
      }
    }

    const rowFailed = (postType === 'both')
      ? (!wpResult && !wooResult)
      : (postType === 'wordpress' ? !wpResult : !wooResult);

    if (rowFailed) {
      failedCount++;
      const errors = [];
      if (wpError) errors.push(`WordPress: ${wpError}`);
      if (wooError) errors.push(`WooCommerce: ${wooError}`);
      failedRows.push({ rowNumber, rowData, error: errors.join(' | ') });
    } else {
      successCount++;
      const entry = {
        rowNumber,
        postType,
        seoTitle: rowData.seo['Meta Title']
      };
      if (wpResult) { entry.postId = wpResult.postId; entry.postUrl = wpResult.postUrl; }
      if (wooResult) { entry.productId = wooResult.productId; entry.productUrl = wooResult.productUrl; }
      if (wpError) entry.wpError = wpError;
      if (wooError) entry.wooError = wooError;
      successRows.push(entry);
    }

    await ProcessHistory.findByIdAndUpdate(processHistoryId, { successCount, failedCount, successRows, failedRows });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const processDoc = await ProcessHistory.findById(processHistoryId);
  let finalStatus = 'completed';

  if (processDoc?.shouldStop) finalStatus = 'stopped';
  else if (failedCount === 0) finalStatus = 'completed';
  else if (successCount === 0) finalStatus = 'failed';
  else finalStatus = 'partial';

  await ProcessHistory.findByIdAndUpdate(processHistoryId, {
    status: finalStatus,
    completedAt: new Date()
  });

  console.log(`✅ Done: ${successCount} success, ${failedCount} failed — ${finalStatus}`);
};

const getProcessStatus = async (req, res) => {
  try {
    const process = await ProcessHistory.findById(req.params.id);
    if (!process) return res.status(404).json({ success: false, message: 'Process not found' });
    res.json({ success: true, data: process });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllProcessHistory = async (req, res) => {
  try {
    const history = await ProcessHistory.find().sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const retryFailedRows = async (req, res) => {
  try {
    const { processId } = req.body;
    const originalProcess = await ProcessHistory.findById(processId);

    if (!originalProcess) return res.status(404).json({ success: false, message: 'Process not found' });
    if (originalProcess.failedRows.length === 0) return res.status(400).json({ success: false, message: 'No failed rows to retry' });

    const template = await Template.findById(originalProcess.templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const postType = originalProcess.postType || 'wordpress';
    const wooProductType = originalProcess.wooProductType || 'simple';
    const geminiModel = originalProcess.geminiModel || DEFAULT_GEMINI_MODEL; // ✅ DB se lo

    let wpConfig = null;
    let wooConfig = null;

    if (postType === 'wordpress' || postType === 'both') {
      wpConfig = await WordPressConfig.findOne({ isActive: true });
    }
    if (postType === 'woocommerce' || postType === 'both') {
      wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    }

    const retryProcess = await ProcessHistory.create({
      fileName: `${originalProcess.fileName} (Retry)`,
      templateId: template._id,
      templateName: template.name,
      totalRows: originalProcess.failedRows.length,
      status: 'processing',
      postType,
      wooProductType,
      geminiModel // ✅ retry mein bhi same model
    });

    res.json({ success: true, message: 'Retry started', processId: retryProcess._id, totalRows: originalProcess.failedRows.length });

    const failedRowsData = originalProcess.failedRows.map(fr => fr.rowData);
    processRows(failedRowsData, template, wpConfig, wooConfig, retryProcess._id, postType, wooProductType, geminiModel);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const stopProcess = async (req, res) => {
  try {
    const { processId } = req.body;
    const process = await ProcessHistory.findById(processId);

    if (!process) return res.status(404).json({ success: false, message: 'Process not found' });
    if (process.status !== 'processing') return res.status(400).json({ success: false, message: 'Process is not currently running' });

    await ProcessHistory.findByIdAndUpdate(processId, { shouldStop: true });
    res.json({ success: true, message: 'Stop command sent. Processing will stop after current row.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  processExcel,
  getProcessStatus,
  getAllProcessHistory,
  retryFailedRows,
  stopProcess
};
