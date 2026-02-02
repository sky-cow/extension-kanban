/**
 * Structured Logger using Winston
 * 
 * Provides consistent logging across the application with:
 * - Structured JSON output for CloudWatch
 * - Log levels (error, warn, info, debug)
 * - Request ID tracking
 * - Error stack traces
 */

const winston = require('winston');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom format for CloudWatch Logs
 */
const cloudWatchFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Format for local development (human-readable)
 */
const localFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if exists
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: NODE_ENV === 'production' ? cloudWatchFormat : localFormat,
  defaultMeta: {
    service: 'collaborative-task-board',
    environment: NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Add request context to logger
 */
const withRequestContext = (req) => {
  return logger.child({
    requestId: req.id || req.requestContext?.requestId,
    userId: req.user?.userId,
    path: req.path,
    method: req.method,
  });
};

/**
 * Log API request
 */
const logRequest = (req, res, duration) => {
  logger.info('API Request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?.userId,
    ip: req.ip,
  });
};

/**
 * Log API error
 */
const logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
  };

  if (req) {
    errorLog.requestId = req.id;
    errorLog.userId = req.user?.userId;
    errorLog.path = req.path;
    errorLog.method = req.method;
  }

  logger.error('Error occurred', errorLog);
};

/**
 * Log security event
 */
const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log database operation
 */
const logDbOperation = (operation, table, details = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    ...details,
  });
};

module.exports = logger;
module.exports.withRequestContext = withRequestContext;
module.exports.logRequest = logRequest;
module.exports.logError = logError;
module.exports.logSecurityEvent = logSecurityEvent;
module.exports.logDbOperation = logDbOperation;
