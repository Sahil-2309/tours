const WooCommerceConfig = require('../models/WooCommerceConfig');
const Template = require('../models/Template');
const { testConnection } = require('../utils/woocommerceAPI');
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
// Gemini helper — model dynamic
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
      productType = 'simple',
      geminiModel = DEFAULT_GEMINI_MODEL // ✅ add
    } = req.body;

    if (!templateId) return res.status(400).json({ success: false, message: 'templateId is required' });
    if (!metaTitle || !metaDescription || !focusKeyword || !slug) {
      return res.status(400).json({ success: false, message: 'SEO fields required: metaTitle, metaDescription, focusKeyword, slug' });
    }
    if (!price) return res.status(400).json({ success: false, message: 'price is required for WooCommerce products' });

    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const finalSku = sku || slug;
    const finalStock = parseInt(stockQuantity || 999);

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
2. Fill EXACTLY these 2 fields and nothing else:
   - short_description: max 155 chars sales teaser based on tour data
   - description: complete HTML description using the TEMPLATE structure above (use <h2>, <h3>, <p>, <ul>, <strong> — NO markdown)
3. DO NOT add any other fields
4. Output ONLY the JSON object`;

    // ✅ geminiModel pass karo
    const rawText = await callGemini(prompt, geminiModel);
    const aiData = extractJSON(rawText);

    const productData = {
      name: metaTitle,
      slug: slug,
      type: productType,
      status: 'draft',
      short_description: aiData.short_description || '',
      description: aiData.description || '',
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

    const wooConfig = await WooCommerceConfig.findOne({ isActive: true });
    const siteUrl = wooConfig?.siteUrl || process.env.WOOCOMMERCE_SITE_URL;
    const consumerKey = wooConfig?.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = wooConfig?.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return res.status(500).json({ success: false, message: 'WooCommerce credentials not configured.' });
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