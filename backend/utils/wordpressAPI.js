const axios = require('axios');

/**
 * Test WordPress connection
 * @param {String} siteUrl - WordPress site URL
 * @param {String} username - WordPress username
 * @param {String} appPassword - WordPress application password
 * @returns {Object} - Connection test result
 */
const normalizeUrl = (url) => (url || '').trim().replace(/\/+$/, '');

// LiteSpeed & proxy-safe auth headers
const authHeaders = (username, appPassword) => {
  // Strip spaces — WP app passwords work with or without, but stripping avoids encoding issues
  const cleanPassword = (appPassword || '').replace(/\s+/g, '');
  const auth = Buffer.from(`${username}:${cleanPassword}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    // Bypass LiteSpeed / CDN cache so auth header actually reaches PHP
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
    'X-No-Cache': '1'
  };
};

const testConnection = async (siteUrl, username, appPassword) => {
  try {
    const base = normalizeUrl(siteUrl);
    // Append random param to bypass LiteSpeed/CDN edge cache
    // LiteSpeed ignores Cache-Control headers but can't cache a unique URL
    const url = `${base}/wp-json/wp/v2/users/me?_nocache=${Date.now()}`;

    const headers = authHeaders(username, appPassword);

    const response = await axios.get(url, { headers });

    console.log('[WP DEBUG] SUCCESS - User:', response.data.name, '| Roles:', response.data.roles);
    return {
      success: true,
      message: 'Connection successful',
      user: response.data.name
    };
  } catch (error) {
    const msg = error.response ? extractWpError(error) : (error.message || 'Connection failed');
    return {
      success: false,
      message: msg
    };
  }
};

const extractWpError = (error) => {
  if (!error.response) return error.message || 'Network or connection error';
  const { data, status, statusText } = error.response;
  if (typeof data === 'string') return `HTTP ${status}: ${data.substring(0, 200)}`;
  if (data?.message && String(data.message).trim()) return data.message;
  if (data?.code) return `${data.code}${data.message ? ': ' + data.message : ''}`;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.map(e => e.message || e).join('; ');
  if (data?.error) return String(data.error);
  if (data?.data?.params) return JSON.stringify(data.data.params);
  if (data?.data) return JSON.stringify(data.data).substring(0, 300);
  if (statusText) return `HTTP ${status} ${statusText}`;
  if (status) return `HTTP ${status}`;
  const raw = JSON.stringify(data);
  return raw && raw !== '{}' ? raw.substring(0, 250) : 'Unknown WordPress API error';
};

/**
 * Create WordPress post as draft
 * @param {Object} config - WordPress configuration
 * @param {Object} postData - Post data
 * @returns {Object} - Created post details
 */
const createPost = async (config, postData) => {
  const { siteUrl, username, appPassword } = config;
  const base = normalizeUrl(siteUrl);
  const url = `${base}/wp-json/wp/v2/posts`;

  const tryCreate = (payload) =>
    axios.post(url, payload, {
      headers: {
        ...authHeaders(username, appPassword),
        'Content-Type': 'application/json'
      }
    });

  const payloadWithMeta = {
    title: postData.title,
    content: postData.content,
    slug: postData.slug,
    status: 'draft',
    meta: postData.meta || {}
  };

  try {
    const response = await tryCreate(payloadWithMeta);
    return {
      success: true,
      postId: response.data.id,
      postUrl: response.data.link,
      message: 'Post created successfully'
    };
  } catch (error) {
    const msg = extractWpError(error);
    console.error('[WordPress createPost] Error:', msg, '| Raw:', JSON.stringify({
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    }));
    const status = error.response?.status;
    const hasMeta = postData.meta && Object.keys(postData.meta).length > 0;
    if (hasMeta && (status === 400 || status === 403 || status === 500)) {
      try {
        const payloadWithoutMeta = {
          title: postData.title,
          content: postData.content,
          slug: postData.slug,
          status: 'draft'
        };
        const response = await tryCreate(payloadWithoutMeta);
        return {
          success: true,
          postId: response.data.id,
          postUrl: response.data.link,
          message: 'Post created (SEO meta skipped - not registered on site)'
        };
      } catch (retryError) {
        const retryMsg = extractWpError(retryError);
        throw new Error(`WordPress API error: ${retryMsg}`);
      }
    }
    throw new Error(`WordPress API error: ${msg}`);
  }
};

/**
 * Update WordPress post
 * @param {Object} config - WordPress configuration
 * @param {Number} postId - Post ID to update
 * @param {Object} postData - Updated post data
 * @returns {Object} - Updated post details
 */
const updatePost = async (config, postId, postData) => {
  try {
    const { siteUrl, username, appPassword } = config;
    const base = normalizeUrl(siteUrl);
    const url = `${base}/wp-json/wp/v2/posts/${postId}`;

    const response = await axios.post(url, postData, {
      headers: {
        ...authHeaders(username, appPassword),
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      postId: response.data.id,
      postUrl: response.data.link,
      message: 'Post updated successfully'
    };
  } catch (error) {
    const msg = extractWpError(error);
    throw new Error(`WordPress API error: ${msg}`);
  }
};

module.exports = {
  testConnection,
  createPost,
  updatePost
};
