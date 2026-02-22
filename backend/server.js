require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const templateRoutes = require('./routes/templates');
const wordpressRoutes = require('./routes/wordpress');
const woocommerceRoutes = require('./routes/woocommerce');
const processRoutes = require('./routes/process');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/templates', templateRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/woocommerce', woocommerceRoutes);
app.use('/api/process', processRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Server is running on port ${PORT}          ║
║                                                ║
║   📝 API Endpoints:                            ║
║   • http://localhost:${PORT}/api/health         ║
║   • http://localhost:${PORT}/api/templates      ║
║   • http://localhost:${PORT}/api/wordpress      ║
║   • http://localhost:${PORT}/api/process        ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the process using that port or set a different PORT environment variable.`);
    console.error('To free the port on Windows: run `netstat -ano | findstr :' + PORT + '` then `taskkill /PID <pid> /F`.');
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});
