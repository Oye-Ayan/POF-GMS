require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const sequelize = require('./server/config/db');
const authMiddleware = require('./server/middleware/auth');

// Route imports
const authRoutes = require('./server/routes/auth');
const memberRoutes = require('./server/routes/members');
const shiftRoutes = require('./server/routes/shifts');

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY MIDDLEWARE

// Helmet — sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in our HTML
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
}));

// Rate limiting — prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,                 // 100 requests per minute
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// Body parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// STATIC FILES — Serve frontend
app.use(express.static(path.join(__dirname, '.'), {
  index: false, // We'll handle the root route manually
  extensions: ['html', 'css', 'js'],
}));

// API ROUTES
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/members', generalLimiter, authMiddleware, memberRoutes);
app.use('/api/shifts', generalLimiter, authMiddleware, shiftRoutes);

// SERVE FRONTEND
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all: serve index.html for SPA-like behavior
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: err.message || JSON.stringify(err),
  });
});

// START SERVER (Local) / EXPORT (Vercel)
async function initDB() {
  try {
    // Test database connection and sync structure
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
  } catch (error) {
    console.error('\nFailed to start server/database connection:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Ensure MySQL is running and .env credentials are correct.\n');
      process.exit(1);
    }
  }
}

// Initialize database dynamically
// In serverless, top-level awaits stall execution. This will run synchronously but let the function compile.
initDB();

// Only listen locally. Vercel triggers execution via exporting the app.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\nServer: http://localhost:${PORT}`);
  });
}

// Export for serverless consumption
module.exports = app;
