const axios = require('axios');

const DEFAULT_MODEL = 'models/gemini-2.5-flash';

/**
 * Call Gemini API to generate content with template and data
 * @param {String} template - The template string
 * @param {Object} data - Key-value pairs from Excel row
 * @param {String} model - Gemini model to use (optional)
 * @returns {String} - Generated content
 */
const generateContent = async (template, data, model = null) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const dataString = Object.entries(data)
      .map(([key, value]) => `${key}: ${value || 'N/A'}`)
      .join('\n');

    const fullPrompt = `Template:\n${template}\n\nData:\n${dataString}`;

    // ✅ Priority: function param > env var > default
    const selectedModel = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`;

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

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const content = response.data.candidates[0].content;
      if (content && content.parts && content.parts[0]) {
        return content.parts[0].text;
      }
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.error?.message || error.message;
      throw new Error(`Gemini API error: ${msg}`);
    }
    throw new Error(`Gemini API error: ${error.message}`);
  }
};

module.exports = {
  generateContent
};