const axios = require('axios');

// Default model can be overridden via env var
// Using gemini-2.5-flash as default (more stable and available than pro)
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Call Gemini API to generate content with template and data
 * @param {String} template - The template string
 * @param {Object} data - Key-value pairs from Excel row
 * @returns {String} - Generated content
 */
const generateContent = async (template, data) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Format data as a readable string for Gemini
    const dataString = Object.entries(data)
      .map(([key, value]) => `${key}: ${value || 'N/A'}`)
      .join('\n');

    const fullPrompt = `Template:\n${template}\n\nData:\n${dataString}`;

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract generated text from response
    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const content = response.data.candidates[0].content;
      if (content && content.parts && content.parts[0]) {
        return content.parts[0].text;
      }
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    // If we receive an error response from the Gemini API, attempt to list available models
    if (error.response) {
      const msg = error.response.data && error.response.data.error && error.response.data.error.message
        ? error.response.data.error.message
        : error.message;

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
          const listResp = await axios.get(listUrl, { headers: { 'Content-Type': 'application/json' } });
          if (listResp.data && Array.isArray(listResp.data.models)) {
            const available = listResp.data.models.map(m => m.name + (m.supportedMethods ? ` (methods: ${m.supportedMethods.join(',')})` : '')).join(', ');
            throw new Error(`Gemini API error: ${msg}. Available models: ${available}`);
          }
        }
      } catch (listErr) {
        // If listing models fails, include both messages
        throw new Error(`Gemini API error: ${msg}. Additionally, listing models failed: ${listErr.message}`);
      }

      throw new Error(`Gemini API error: ${msg}`);
    }

    throw new Error(`Gemini API error: ${error.message}`);
  }
};

module.exports = {
  generateContent
};
