/**
 * Express Application
 * 
 * Main application setup with:
 * - Security middleware
 * - Request logging
 * - Route mounting
 * - Error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const boardRoutes = require('./routes/boards');
const taskRoutes = require('./routes/tasks');

// Create Express app
const app = express();

/**
 * Security Middleware
 */

// Helmet: Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS: Allow requests from Chrome extension
const corsOptions = {
  origin: (origin, callback) => {
    // Allow Chrome extension origins
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else if (process.env.CORS_ORIGIN) {
      // Allow configured origins
      const allowedOrigins = process.env.CORS_ORIGIN.split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

/**
 * Request Processing Middleware
 */

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });

  next();
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * API Routes
 */
app.use('/api/boards', boardRoutes);
app.use('/api', taskRoutes);

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Collaborative Task Board API',
    version: '2.0.0',
    status: 'running',
    documentation: '/api-docs',
  });
});

/**
 * Error Handling
 */

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Close server and connections
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

module.exports = app;
