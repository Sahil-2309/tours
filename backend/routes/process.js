const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  processExcel,
  getProcessStatus,
  getAllProcessHistory,
  retryFailedRows
} = require('../controllers/processController');

// Configure multer for file upload (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// POST process Excel file
router.post('/process', (req, res, next) => {
  upload.single('excelFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file. Please upload an Excel file (.xlsx or .xls).'
      });
    }
    next();
  });
}, processExcel);

// GET process status by ID
router.get('/status/:id', getProcessStatus);

// GET all process history
router.get('/history', getAllProcessHistory);

// POST retry failed rows
router.post('/retry', retryFailedRows);

module.exports = router;
