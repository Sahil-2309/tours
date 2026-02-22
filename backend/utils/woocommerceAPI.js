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
    
    const payload = {
      name: productData.title || productData.name,
      description: productData.description || productData.content,
      short_description: productData.shortDescription || '',
      price: productData.price,
      regular_price: productData.regularPrice || productData.price,
      sale_price: productData.salePrice || null,
      sku: productData.sku || `product-${Date.now()}`,
      stock_quantity: productData.stockQuantity || 999,
      status: 'draft',
      type: 'simple',
      meta_data: productData.meta || []
    };
    
    // Add category if provided
    if (productData.categoryId) {
      payload.categories = [{ id: productData.categoryId }];
    }
    
    // Add images if provided
    if (productData.images && Array.isArray(productData.images)) {
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
    throw new Error(`WooCommerce API error: ${error.response?.data?.message || error.message}`);
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
