const axios = require('axios');

/**
 * Test WooCommerce connection
 * @param {String} siteUrl - WooCommerce site URL
 * @param {String} consumerKey - WooCommerce API consumer key
 * @param {String} consumerSecret - WooCommerce API consumer secret
 * @returns {Object} - Connection test result
 */
const normalizeUrl = (url) => (url || '').trim().replace(/\/+$/, '');

const testConnection = async (siteUrl, consumerKey, consumerSecret) => {
  try {
    const base = normalizeUrl(siteUrl);
    const url = `${base}/wp-json/wc/v3/products?per_page=1`;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      message: 'Connection successful',
      productsCount: response.data.length
    };
  } catch (error) {
    const msg = extractWooError(error);
    return { success: false, message: msg };
  }
};

const extractWooError = (error) => {
  if (!error.response) return error.message || 'Network or connection error';
  const { data, status, statusText } = error.response;
  if (typeof data === 'string') return `HTTP ${status}: ${data.substring(0, 200)}`;
  if (data?.message && String(data.message).trim()) return data.message;
  if (data?.code) return `${data.code}${data.message ? ': ' + data.message : ''}`;
  if (statusText) return `HTTP ${status} ${statusText}`;
  if (status) return `HTTP ${status}`;
  const raw = JSON.stringify(data);
  return raw && raw !== '{}' ? raw.substring(0, 250) : 'Unknown API error';
};

/**
 * Create WooCommerce product
 * @param {Object} config - WooCommerce configuration
 * @param {Object} productData - Product data
 * @returns {Object} - Created product details
 */
const createProduct = async (config, productData) => {
  try {
    const { siteUrl, consumerKey, consumerSecret } = config;
    const base = normalizeUrl(siteUrl);
    const url = `${base}/wp-json/wc/v3/products`;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    // Build payload - ONLY send fields that WooCommerce recognizes
    const payload = {
      name: productData.title || productData.name || 'Product',
      description: productData.description || productData.content || '',
      sku: productData.sku || `product-${Date.now()}`,
      status: 'draft',
      type: 'simple'
    };
    
    // ALWAYS add price - it's required
    if (productData.price) {
      const priceNum = parseFloat(productData.price);
      if (!isNaN(priceNum) && priceNum > 0) {
        payload.price = priceNum.toString(); // Send as string, WC will handle it
      }
    }
    
    // Add stock if provided
    if (productData.stockQuantity) {
      const stockNum = parseInt(productData.stockQuantity);
      if (!isNaN(stockNum)) {
        payload.stock_quantity = stockNum;
      }
    }
    
    // Add short description if provided
    if (productData.shortDescription) {
      payload.short_description = productData.shortDescription;
    }

    // Add Yoast SEO meta data if provided
    if (productData.yoastMeta && Array.isArray(productData.yoastMeta) && productData.yoastMeta.length > 0) {
      payload.meta_data = productData.yoastMeta;
    }
    
    // Add category if provided
    if (productData.categoryId) {
      payload.categories = [{ id: productData.categoryId }];
    }
    
    // Add images if provided
    if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
      payload.images = productData.images;
    }
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      productId: response.data.id,
      productUrl: response.data.permalink,
      message: 'Product created successfully'
    };
  } catch (error) {
    const detailMsg = extractWooError(error);
    throw new Error(`WooCommerce API error: ${detailMsg}`);
  }
};

/**
 * Update WooCommerce product
 * @param {Object} config - WooCommerce configuration
 * @param {Number} productId - Product ID to update
 * @param {Object} productData - Updated product data
 * @returns {Object} - Updated product details
 */
const updateProduct = async (config, productId, productData) => {
  try {
    const { siteUrl, consumerKey, consumerSecret } = config;
    const base = normalizeUrl(siteUrl);
    const url = `${base}/wp-json/wc/v3/products/${productId}`;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const payload = {
      name: productData.title || productData.name,
      description: productData.description || productData.content,
      price: productData.price,
      sku: productData.sku
    };
    
    const response = await axios.put(url, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      productId: response.data.id,
      productUrl: response.data.permalink,
      message: 'Product updated successfully'
    };
  } catch (error) {
    throw new Error(`WooCommerce API error: ${error.response?.data?.message || error.message}`);
  }
};

module.exports = {
  testConnection,
  createProduct,
  updateProduct
};
