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

    const fullPrompt = `You are a professional SEO content writer. Fill the given template using the provided data and generate the final article.

## STRICT FORMATTING RULES — MUST FOLLOW WITHOUT EXCEPTION

1. OUTPUT ONLY VALID MARKDOWN. Do NOT use any HTML tags.
2. For bold text, use ONLY double asterisks: **Bold Text**
   - NEVER use triple asterisks (***) or any other variant.
3. ALL hyperlinks MUST be formatted as Markdown linked text:
   - CORRECT: [Visit the official site](https://www.example.com)
   - INCORRECT: https://www.example.com  ← naked links are STRICTLY FORBIDDEN
   - INCORRECT: <https://www.example.com>  ← angle-bracket links are FORBIDDEN
4. Do NOT add any introduction or closing remarks outside the template's heading structure.
5. Do NOT add decorative symbols, dividers, or extra formatting not present in the template.
6. Follow the template's heading hierarchy exactly (H1, H2, H3 as specified).

---

## TEMPLATE

${template}

---

## DATA

${dataString}`;

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
        let text = content.parts[0].text;

        // ─── Post-processing sanitizer ───────────────────────────────────
        // Fix ***bold*** or ***bold italic*** → **bold**
        text = text.replace(/\*{3}([^*]+)\*{3}/g, '**$1**');

        // Fix naked URLs that are NOT already inside a Markdown link [text](url)
        // Match http(s):// URLs not preceded by ]( or " or '
        text = text.replace(/(?<!\]\()(?<!")(?<!')(\bhttps?:\/\/[^\s\)\]'"<>,]+)/g, (match) => {
          try {
            const url = new URL(match);
            const label = url.hostname.replace(/^www\./, '');
            return `[${label}](${match})`;
          } catch {
            return match;
          }
        });
        // ─────────────────────────────────────────────────────────────────

        return text;
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

/**
 * Call Gemini API to generate structured content (JSON)
 * @param {String} prompt - The full prompt
 * @param {String} model - Gemini model to use
 * @param {Object} schema - JSON schema for the response
 * @returns {Object} - Parsed JSON object
 */
const generateStructuredContent = async (prompt, model = DEFAULT_MODEL, schema = null) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    if (schema) {
      payload.generationConfig.responseSchema = schema;
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const content = response.data.candidates[0].content;
      if (content && content.parts && content.parts[0]) {
        return JSON.parse(content.parts[0].text);
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
  generateContent,
  generateStructuredContent
};