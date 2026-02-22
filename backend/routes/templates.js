const express = require('express');
const router = express.Router();
const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/templateController');

// GET all templates
router.get('/', getAllTemplates);

// GET single template
router.get('/:id', getTemplateById);

// POST create template
router.post('/', createTemplate);

// PUT update template
router.put('/:id', updateTemplate);

// DELETE template
router.delete('/:id', deleteTemplate);

module.exports = router;
