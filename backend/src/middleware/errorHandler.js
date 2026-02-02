/**
 * Error Handling Middleware
 * 
 * Centralized error handling with:
 * - Consistent error responses
 * - Error logging
 * - Security (don't leak internal details)
 */

const logger = require('../utils/logger');

/**
 * Custom error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.logError(err, req);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Don't leak internal error details in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'An unexpected error occurred';
    code = 'INTERNAL_ERROR';
  }

  // Send error response
  res.status(statusCode).json({
    error: code,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(req.id && { requestId: req.id }),
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
