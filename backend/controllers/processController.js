const Template = require('../models/Template');
const WordPressConfig = require('../models/WordPressConfig');
const WooCommerceConfig = require('../models/WooCommerceConfig');
const ProcessHistory = require('../models/ProcessHistory');
const { parseExcel } = require('../utils/excelParser');
const { generateContent, generateStructuredContent } = require('../utils/geminiAPI');
const { createPost } = require('../utils/wordpressAPI');
const { createProduct } = require('../utils/woocommerceAPI');
const { marked } = require('marked');
const axios = require('axios');

const DEFAULT_GEMINI_MODEL = 'models/gemini-2.5-flash';

// ─────────────────────────────────────────────
// Gemini helper — structured output (no JSON parsing issues)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Gemini Schema
// ─────────────────────────────────────────────
const WOO_PRODUCT_SCHEMA = {
  type: "OBJECT",
  properties: {
    short_description: { type: "STRING" },
    description: { type: "STRING" }
  },
  required: ["short_description", "description"]
};

// ─────────────────────────────────────────────
// WooCommerce product generator
// ─────────────────────────────────────────────
const generateWooCommerceProduct = async (template, rowData, productType = 'simple', geminiModel = DEFAULT_GEMINI_MODEL) => {
  const price = rowData.product?.['Price'] || rowData.content?.['Price'] || '';
  const sku = rowData.product?.['SKU'] || rowData.seo?.['Slug'] || '';
  const stockQuantity = parseInt(rowData.product?.['Stock Quantity'] || rowData.content?.['Stock Quantity'] || 999);

  if (!price) throw new Error('Price field is required for WooCommerce products');

  const prompt = `You are a strict JSON data generator for WooCommerce products.
Return a valid JSON object with EXACTLY two string keys: "short_description" and "description".

REQUIREMENT 1: "short_description"
Write a 100-120 word SEO-friendly overview highlighting the journey for "${rowData.seo['Meta Title']}". Mention key attractions and natural beauty. This is for the product short description. Use the focus keyword "${rowData.seo['Focus Keywords']}" naturally.

REQUIREMENT 2: "description"
Write the detailed tour itinerary formatted purely in MARKDOWN (no HTML) following this exact user template:
${template.template}

TOUR DATA PLACEMENTS FOR TEMPLATE:
${JSON.stringify(rowData.content)}
`;

  t = Date.now();
  console.log(`      🤖 [WooGen] Calling Gemini for product generation...`);
  const aiData = await generateStructuredContent(prompt, geminiModel, WOO_PRODUCT_SCHEMA);
  console.log(`      🤖 [WooGen] Gemini done in ${Date.now() - t}ms`);
  console.log(`      🤖 [WooGen] short_description: ${aiData.short_description?.length || 0} chars | description: ${aiData.description?.length || 0} chars`);

  const product = {
    name: rowData.seo['Meta Title'],
    slug: rowData.seo['Slug'],
    type: productType,
    status: 'draft',
    short_description: marked.parse(aiData.short_description || ''),
    description: marked.parse(aiData.description || ''),
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
    const { templateId, postType, wooProductType, geminiModel } = req.body;
    const { wpSiteUrl, wpUsername, wpAppPassword } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const configuredPostType = postType || 'wordpress';
    const configuredProductType = wooProductType || 'simple';
    const configuredGeminiModel = geminiModel || DEFAULT_GEMINI_MODEL;

    // Check for concurrent processing
    const activeProcess = await ProcessHistory.findOne({ status: 'processing' });
    if (activeProcess) {
      return res.status(400).json({
        success: false,
        message: 'A file is already being processed. Please wait for it to finish or cancel it from the History page.'
      });
    }

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

    console.log(`\n📊 [processExcel] File: ${file.originalname} | Rows: ${excelData.length} | Type: ${configuredPostType} | Model: ${configuredGeminiModel}`);

    const processHistory = await ProcessHistory.create({
      fileName: file.originalname,
      templateId: template._id,
      templateName: template.name,
      totalRows: excelData.length,
      status: 'processing',
      postType: configuredPostType,
      wooProductType: configuredProductType,
      geminiModel: configuredGeminiModel
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

  console.log(`\n⚙️  [processRows] START — Total rows: ${rows.length} | postType: ${postType} | model: ${geminiModel}`);
  const batchStart = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const rowStart = Date.now();
    const rowNumber = i + 1;
    const rowData = rows[i];

    console.log(`\n─────────────────────────────────────`);
    console.log(`📝 [Row ${rowNumber}/${rows.length}] START — "${rowData.seo?.['Meta Title'] || 'N/A'}"`);

    // ─── Stop check ───
    let t = Date.now();
    console.log(`   🔍 [Row ${rowNumber}] Checking stop flag in DB...`);
    const processDoc = await ProcessHistory.findById(processHistoryId);
    console.log(`   🔍 [Row ${rowNumber}] Stop check done in ${Date.now() - t}ms`);

    if (processDoc?.shouldStop) {
      console.log('🛑 Processing stopped by user');
      break;
    }

    // ─── Validation ───
    const missingFields = ['Meta Title', 'Meta Description', 'Focus Keywords', 'Slug'].filter(
      field => !rowData.seo?.[field]
    );

    // Warn about missing template placeholders (but do NOT block the row — Gemini handles them)
    const placeholderRegex = /\{([^}]+)\}/g;
    const templateContent = template.template || '';
    let match;
    const requiredPlaceholders = new Set();
    while ((match = placeholderRegex.exec(templateContent)) !== null) {
      if (match[1]) requiredPlaceholders.add(match[1]);
    }

    const missingPlaceholders = Array.from(requiredPlaceholders).filter(field => {
      return !(
        (rowData.content && rowData.content[field] !== undefined) ||
        (rowData.seo && rowData.seo[field] !== undefined) ||
        (rowData.product && rowData.product[field] !== undefined)
      );
    });

    if (missingPlaceholders.length > 0) {
      console.log(`   ⚠️  [Row ${rowNumber}] Template placeholders not matched (Gemini will handle): ${missingPlaceholders.join(', ')}`);
    }

    if (missingFields.length > 0) {
      console.log(`   ⚠️  [Row ${rowNumber}] Skipped — Missing: ${missingFields.join(', ')}`);
      failedCount++;
      failedRows.push({ rowNumber, rowData, error: `Missing required data: ${missingFields.join(', ')}` });
      await ProcessHistory.findByIdAndUpdate(processHistoryId, { successCount, failedCount, successRows, failedRows });
      continue;
    }

    // ─── WordPress ───
    let wpResult = null;
    let wpError = null;

    if (postType === 'wordpress' || postType === 'both') {
      try {
        t = Date.now();
        console.log(`   📰 [Row ${rowNumber}] [WP Step 1] Calling generateContent (Gemini for WP)...`);
        const markdownContent = await generateContent(template.template, rowData.content, geminiModel);
        console.log(`   📰 [Row ${rowNumber}] [WP Step 1] generateContent done in ${Date.now() - t}ms`);

        t = Date.now();
        console.log(`   📰 [Row ${rowNumber}] [WP Step 2] Converting markdown to HTML...`);
        const htmlContent = marked.parse(markdownContent);
        console.log(`   📰 [Row ${rowNumber}] [WP Step 2] marked.parse() done in ${Date.now() - t}ms`);

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

        t = Date.now();
        console.log(`   📰 [Row ${rowNumber}] [WP Step 3] Creating WordPress post...`);
        wpResult = await createPost(wpConfig, postData);
        console.log(`   📰 [Row ${rowNumber}] [WP Step 3] WordPress post created in ${Date.now() - t}ms — ${wpResult.postUrl}`);
      } catch (error) {
        wpError = error.message;
        console.log(`   ❌ [Row ${rowNumber}] WordPress FAILED: ${error.message}`);
      }
    }

    // ─── WooCommerce ───
    let wooResult = null;
    let wooError = null;

    if (postType === 'woocommerce' || postType === 'both') {
      try {
        t = Date.now();
        console.log(`   🛒 [Row ${rowNumber}] [Woo Step 1] Generating WooCommerce product (Gemini)...`);
        const productData = await generateWooCommerceProduct(template, rowData, wooProductType, geminiModel);
        console.log(`   🛒 [Row ${rowNumber}] [Woo Step 1] Product generated in ${Date.now() - t}ms`);

        const siteUrl = wooConfig.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
        const consumerKey = wooConfig.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = wooConfig.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

        if (!siteUrl || !consumerKey || !consumerSecret) {
          throw new Error('WooCommerce credentials not configured');
        }

        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        t = Date.now();
        console.log(`   🛒 [Row ${rowNumber}] [Woo Step 2] POSTing product to WooCommerce API...`);
        const wooResponse = await axios.post(
          `${siteUrl}/wp-json/wc/v3/products`,
          productData,
          { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
        );
        console.log(`   🛒 [Row ${rowNumber}] [Woo Step 2] WooCommerce API responded in ${Date.now() - t}ms`);

        const created = wooResponse.data;
        wooResult = {
          productId: created.id,
          productUrl: created.permalink,
          price: created.price,
          slug: created.slug
        };

        console.log(`   🛒 [Row ${rowNumber}] Product created — ID: ${created.id} | URL: ${created.permalink}`);
      } catch (error) {
        wooError = error.message;
        console.log(`   ❌ [Row ${rowNumber}] WooCommerce FAILED: ${error.message}`);
      }
    }

    // ─── Result ───
    const rowFailed = (postType === 'both')
      ? (!wpResult && !wooResult)
      : (postType === 'wordpress' ? !wpResult : !wooResult);

    if (rowFailed) {
      failedCount++;
      const errors = [];
      if (wpError) errors.push(`WordPress: ${wpError}`);
      if (wooError) errors.push(`WooCommerce: ${wooError}`);
      failedRows.push({ rowNumber, rowData, error: errors.join(' | ') });
      console.log(`   ❌ [Row ${rowNumber}] FAILED — ${errors.join(' | ')}`);
    } else {
      successCount++;
      const entry = { rowNumber, postType, seoTitle: rowData.seo['Meta Title'] };
      if (wpResult) { entry.postId = wpResult.postId; entry.postUrl = wpResult.postUrl; }
      if (wooResult) { entry.productId = wooResult.productId; entry.productUrl = wooResult.productUrl; }
      if (wpError) entry.wpError = wpError;
      if (wooError) entry.wooError = wooError;
      successRows.push(entry);
      console.log(`   ✅ [Row ${rowNumber}] SUCCESS`);
    }

    // ─── DB Update ───
    t = Date.now();
    console.log(`   💾 [Row ${rowNumber}] Saving progress to DB...`);
    await ProcessHistory.findByIdAndUpdate(processHistoryId, { successCount, failedCount, successRows, failedRows });
    console.log(`   💾 [Row ${rowNumber}] DB saved in ${Date.now() - t}ms`);

    console.log(`⏱️  [Row ${rowNumber}] Total row time: ${Date.now() - rowStart}ms`);

    // ─── Delay ───
    console.log(`   ⏳ [Row ${rowNumber}] Waiting 1s before next row...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ─── Final ───
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

  console.log(`\n🏁 [processRows] DONE — ${successCount} success | ${failedCount} failed | Status: ${finalStatus} | Total time: ${Date.now() - batchStart}ms`);
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
    const geminiModel = originalProcess.geminiModel || DEFAULT_GEMINI_MODEL;

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
      geminiModel
    });

    console.log(`\n🔄 [retryFailedRows] Retrying ${originalProcess.failedRows.length} rows | model: ${geminiModel}`);

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

// Stop ALL currently active processes (Emergency Kill Switch)
const stopAllProcesses = async (req, res) => {
  try {
    const activeProcesses = await ProcessHistory.find({ status: 'processing' });

    if (activeProcesses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active processes found to stop.'
      });
    }

    const updatePromises = activeProcesses.map(process =>
      ProcessHistory.findByIdAndUpdate(process._id, { shouldStop: true })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Successfully sent stop signal to ${activeProcesses.length} active process(es).`,
      stoppedCount: activeProcesses.length
    });
  } catch (error) {
    console.error('Error stopping all processes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop processes'
    });
  }
};

module.exports = {
  processExcel,
  getProcessStatus,
  getAllProcessHistory,
  retryFailedRows,
  stopProcess,
  stopAllProcesses
};