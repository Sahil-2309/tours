const XLSX = require('xlsx');

const MANDATORY_SEO_FIELDS = ['Meta Title', 'Meta Description', 'Focus Keywords', 'Slug'];
const OPTIONAL_SEO_FIELDS = ['OG Image URL'];
const PRODUCT_FIELDS = ['Price', 'Regular Price', 'Sale Price', 'SKU', 'Stock Quantity'];

const DEFAULT_VALUES = {
  'Meta Title': '',
  'Meta Description': '',
  'Focus Keywords': '',
  'Slug': '',
  'OG Image URL': '',
  'Price': '',
  'Regular Price': '',
  'Sale Price': '',
  'SKU': '',
  'Stock Quantity': 999
};

const truncate = (value, max = 160) => {
  if (!value) {
    return '';
  }

  const text = String(value).trim();
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
};

const generateSlug = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const parseExcel = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Column aliases: map alternate names to canonical names
    const COLUMN_ALIASES = {
      'Main Title': 'Meta Title',
      'Title': 'Meta Title',
      'Tour Title': 'Meta Title',
      'Description': 'Meta Description',
      'Keywords': 'Focus Keywords',
      'Focus Keyword': 'Focus Keywords',
    };

    return jsonData.map((row, index) => {
      // Apply column aliases first
      const normalizedRow = {};
      Object.keys(row).forEach((key) => {
        const canonicalKey = COLUMN_ALIASES[key] || key;
        // Don't overwrite if canonical key already exists
        if (!(canonicalKey in normalizedRow)) {
          normalizedRow[canonicalKey] = row[key];
        }
      });

      const seo = {};
      const content = {};
      const product = {};
      const postType = normalizedRow['Post Type'] || 'wordpress';

      Object.keys(normalizedRow).forEach((key) => {
        if (MANDATORY_SEO_FIELDS.includes(key) || OPTIONAL_SEO_FIELDS.includes(key)) {
          seo[key] = normalizedRow[key] ?? DEFAULT_VALUES[key];
        } else if (PRODUCT_FIELDS.includes(key)) {
          product[key] = normalizedRow[key] ?? DEFAULT_VALUES[key];
        } else if (key !== 'Post Type') {
          content[key] = normalizedRow[key];
        }
      });

      seo['Meta Title'] = seo['Meta Title'] || content['Tour Name'] || content['Title'] || content['Name'] || '';
      seo['Slug'] = seo['Slug'] || generateSlug(seo['Meta Title'] || content['Tour Name'] || content['Title'] || content['Name']);
      seo['Meta Description'] =
        seo['Meta Description'] || truncate(content['Content'] || content['Description'] || '');

      MANDATORY_SEO_FIELDS.forEach((field) => {
        if (!(field in seo)) {
          seo[field] = DEFAULT_VALUES[field];
        }
      });

      PRODUCT_FIELDS.forEach((field) => {
        if (!(field in product)) {
          product[field] = DEFAULT_VALUES[field];
        }
      });

      return {
        rowNumber: index + 1,
        seo,
        content,
        product,
        postType,
        rawData: normalizedRow
      };
    });
  } catch (error) {
    throw new Error(`Error parsing Excel: ${error.message}`);
  }
};

module.exports = {
  parseExcel
};
