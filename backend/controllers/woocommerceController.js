const WooCommerceConfig = require('../models/WooCommerceConfig');
const Template = require('../models/Template');
const { testConnection } = require('../utils/woocommerceAPI');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

/**
 * Get WooCommerce configuration
 */
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
        return res.status(404).json({
          success: false,
          message: 'No WooCommerce configuration found.'
        });
      }
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete WooCommerce configuration
 */
const deleteConfig = async (req, res) => {
  try {
    const config = await WooCommerceConfig.findByIdAndDelete(req.params.id);

    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    res.json({ success: true, message: 'WooCommerce configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Gemini helpers
// ─────────────────────────────────────────────
const callGemini = async (prompt) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const extractJSON = (text) => {
  let str = text;
  if (str.includes('```json')) str = str.split('```json')[1].split('```')[0];
  else if (str.includes('```')) str = str.split('```')[1].split('```')[0];
  return JSON.parse(str.trim());
};

/**
 * Generate and create WooCommerce product
 * Template DB se aata hai — strict schema enforce hota hai
 * 
 * Request body:
 * - templateId: DB se template ID (required)
 * - metaTitle, metaDescription, focusKeyword, slug (SEO fields)
 * - price, sku, stockQuantity (product fields)
 * - contentData: object with remaining tour data
 */
const generateAndCreateProduct = async (req, res) => {
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
      productType = 'simple' // default to simple product
    } = req.body;

    // Validate required fields
    if (!templateId) {
      return res.status(400).json({ success: false, message: 'templateId is required' });
    }
    if (!metaTitle || !metaDescription || !focusKeyword || !slug) {
      return res.status(400).json({ success: false, message: 'SEO fields required: metaTitle, metaDescription, focusKeyword, slug' });
    }
    if (!price) {
      return res.status(400).json({ success: false, message: 'price is required for WooCommerce products' });
    }

    // Template DB se lo
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const finalSku = sku || slug;
    const finalStock = parseInt(stockQuantity || 999);

    // Gemini prompt — template DB se, strict schema
    const prompt = `You are a WooCommerce product content generator for tour packages.

TEMPLATE TO FOLLOW FOR DESCRIPTION:
${template.template}

TOUR DATA:
${JSON.stringify(contentData || {})}

SEO DATA:
- Title: ${metaTitle}
- Meta Description: ${metaDescription}
- Focus Keyword: ${focusKeyword}

STRICT RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation, no extra text
2. Fill EXACTLY these fields and nothing else:
   - name: "${metaTitle}"
   - short_description: max 155 chars sales teaser based on tour data
   - description: complete HTML description using the TEMPLATE structure above (use <h2>, <h3>, <p>, <ul>, <strong> — NO markdown)

3. DO NOT add any other fields — no categories, no images, no attributes, no tags, no allPricing
4. Output ONLY the JSON object`;

    const rawText = await callGemini(prompt);
    const aiData = extractJSON(rawText);

    // Strict schema enforce — AI ka koi bhi extra field nahi jaayega
    const productData = {
      name: metaTitle,                          // Always from input
      slug: slug,                               // Always from input
      type: productType,                        // Always from input
      status: 'draft',
      short_description: aiData.short_description || '',
      description: aiData.description || '',
      price: String(price),                     // Always from input
      regular_price: String(price),             // Always from input
      sku: String(finalSku),                    // Always from input
      stock_quantity: finalStock,               // Always from input
      manage_stock: true,
      meta_data: [
        { key: 'rank_math_title', value: metaTitle },
        { key: 'rank_math_description', value: metaDescription },
        { key: 'rank_math_focus_keyword', value: focusKeyword }
      ]
    };

    // WooCommerce credentials lo
    const wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    const siteUrl = wooConfig?.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
    const consumerKey = wooConfig?.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = wooConfig?.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(500).json({
        success: false,
        message: 'WooCommerce credentials not configured. Add to .env or configure via Settings.'
      });
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const wooResponse = await axios.post(
      `${siteUrl}/wp-json/wc/v3/products`,
      productData,
      { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' } }
    );

    const createdProduct = wooResponse.data;

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
    console.error('Product generation error:', error.response?.data || error.message);
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

    // response: [{ slug: 'tour_phys', label: 'Tour' }, ...]
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