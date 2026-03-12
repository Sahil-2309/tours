const WooCommerceConfig = require('../models/WooCommerceConfig');
const Template = require('../models/Template');
const { testConnection } = require('../utils/woocommerceAPI');
const { generateStructuredContent } = require('../utils/geminiAPI');
const { marked } = require('marked');
const axios = require('axios');

const DEFAULT_GEMINI_MODEL = 'models/gemini-2.5-flash';

const getConfig = async (req, res) => {
  try {
    let config = await WooCommerceConfig.findOne({ isActive: true });

    if (!config) {
      if (process.env.WOOCOMMERCE_SITE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) {
        config = {
          siteUrl: process.env.WOOCOMMERCE_SITE_URL,
          consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
          consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
          source: 'environment',
          message: 'Configuration loaded from environment (.env)'
        };
      } else {
        return res.status(404).json({ success: false, message: 'No WooCommerce configuration found.' });
      }
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveConfig = async (req, res) => {
  try {
    const { siteUrl, consumerKey, consumerSecret } = req.body;
    await WooCommerceConfig.updateMany({}, { isActive: false });
    const config = await WooCommerceConfig.create({ siteUrl, consumerKey, consumerSecret, isActive: true });
    res.status(201).json({ success: true, message: 'WooCommerce configuration saved successfully', data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteConfig = async (req, res) => {
  try {
    const config = await WooCommerceConfig.findByIdAndDelete(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Configuration not found' });
    res.json({ success: true, message: 'WooCommerce configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

const generateAndCreateProduct = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      templateId,
      metaTitle,
      metaDescription,
      focusKeyword,
      slug,
      price,
      sku,
      stockQuantity,
      contentData,
      productType = 'simple',
      geminiModel = DEFAULT_GEMINI_MODEL
    } = req.body;

    console.log(`\n🚀 [generateAndCreateProduct] START — slug: ${slug}`);

    if (!templateId) return res.status(400).json({ success: false, message: 'templateId is required' });
    if (!metaTitle || !metaDescription || !focusKeyword || !slug) {
      return res.status(400).json({ success: false, message: 'SEO fields required: metaTitle, metaDescription, focusKeyword, slug' });
    }
    if (!price) return res.status(400).json({ success: false, message: 'price is required for WooCommerce products' });

    let t = Date.now();
    console.log(`   📄 [Step 1] Fetching template from DB...`);
    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    console.log(`   📄 [Step 1] Template fetched in ${Date.now() - t}ms`);

    const finalSku = sku || slug;
    const finalStock = parseInt(stockQuantity || 999);

    const prompt = `You are a WooCommerce product content generator for tour packages.

TEMPLATE TO FOLLOW FOR DESCRIPTION:
${template.template}

TOUR DATA:
${JSON.stringify(contentData || {})}`;

    t = Date.now();
    console.log(`   🤖 [Step 2] Calling Gemini AI...`);
    const aiData = await generateStructuredContent(prompt, geminiModel, WOO_PRODUCT_SCHEMA);

    console.log(`   🤖 [Step 2] Gemini done in ${Date.now() - t}ms`);
    console.log(`   🤖 [Step 2] short_description length: ${aiData.short_description?.length || 0} chars`);
    console.log(`   🤖 [Step 2] description length: ${aiData.description?.length || 0} chars`);

    const productData = {
      name: metaTitle,
      slug: slug,
      type: productType,
      status: 'draft',
      short_description: marked.parse(aiData.short_description || ''),
      description: marked.parse(aiData.description || ''),
      price: String(price),
      regular_price: String(price),
      sku: String(finalSku),
      stock_quantity: finalStock,
      manage_stock: true,
      meta_data: [
        { key: 'rank_math_title', value: metaTitle },
        { key: 'rank_math_description', value: metaDescription },
        { key: 'rank_math_focus_keyword', value: focusKeyword }
      ]
    };

    t = Date.now();
    console.log(`   🔑 [Step 3] Fetching WooCommerce config from DB...`);
    const wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    console.log(`   🔑 [Step 3] WooConfig fetched in ${Date.now() - t}ms`);

    const siteUrl = wooConfig?.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
    const consumerKey = wooConfig?.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = wooConfig?.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(500).json({ success: false, message: 'WooCommerce credentials not configured.' });
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    t = Date.now();
    console.log(`   🛒 [Step 4] Creating product in WooCommerce — ${siteUrl}...`);
    const wooResponse = await axios.post(
      `${siteUrl}/wp-json/wc/v3/products`,
      productData,
      { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
    );
    console.log(`   🛒 [Step 4] WooCommerce product created in ${Date.now() - t}ms`);

    const createdProduct = wooResponse.data;
    console.log(`✅ [generateAndCreateProduct] DONE — Total: ${Date.now() - startTime}ms | Product ID: ${createdProduct.id}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully in WooCommerce',
      data: {
        productId: createdProduct.id,
        productName: createdProduct.name,
        productUrl: createdProduct.permalink,
        price: createdProduct.price,
        slug: createdProduct.slug,
        status: createdProduct.status
      }
    });

  } catch (error) {
    console.error(`❌ [generateAndCreateProduct] FAILED after ${Date.now() - startTime}ms:`, error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
};

const getProductTypes = async (req, res) => {
  try {
    const wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    const siteUrl = wooConfig?.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
    const response = await axios.get(`${siteUrl}/wp-json/custom/v1/product-types`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching product types:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch product types' });
  }
};

module.exports = {
  getConfig,
  saveConfig,
  testWooConnection,
  deleteConfig,
  generateAndCreateProduct,
  getProductTypes
};