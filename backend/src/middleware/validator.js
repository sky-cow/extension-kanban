/**
 * Input Validation Middleware
 * 
 * Validates request data using Joi schemas
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Validate request body, query, or params against Joi schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Get all validation errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return next(new ValidationError(JSON.stringify(errors)));
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // UUID validation
  uuid: Joi.string().uuid().required(),
  
  // Pagination
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  // Board ID param
  boardIdParam: Joi.object({
    boardId: Joi.string().uuid().required(),
  }),

  // List ID param
  listIdParam: Joi.object({
    listId: Joi.string().uuid().required(),
  }),

  // Task ID param
  taskIdParam: Joi.object({
    taskId: Joi.string().uuid().required(),
  }),

  // Create board
  createBoard: Joi.object({
    name: Joi.string().min(1).max(100).required().trim(),
    description: Joi.string().max(500).optional().allow('').trim(),
    organizationId: Joi.string().uuid().required(),
  }),

  // Update board
  updateBoard: Joi.object({
    name: Joi.string().min(1).max(100).optional().trim(),
    description: Joi.string().max(500).optional().allow('').trim(),
  }).min(1),

  // Create list
  createList: Joi.object({
    name: Joi.string().min(1).max(100).required().trim(),
    order: Joi.number().integer().min(0).optional(),
  }),

  // Update list
  updateList: Joi.object({
    name: Joi.string().min(1).max(100).optional().trim(),
    order: Joi.number().integer().min(0).optional(),
  }).min(1),

  // Create task
  createTask: Joi.object({
    title: Joi.string().min(1).max(200).required().trim(),
    description: Joi.string().max(2000).optional().allow('').trim(),
    link: Joi.string().uri().max(500).optional().allow('').trim(),
    label: Joi.string().valid('urgent', 'important', 'normal', 'low', 'none').default('none'),
    assignedTo: Joi.string().uuid().optional().allow(null),
  }),

  // Update task
  updateTask: Joi.object({
    title: Joi.string().min(1).max(200).optional().trim(),
    description: Joi.string().max(2000).optional().allow('').trim(),
    link: Joi.string().uri().max(500).optional().allow('').trim(),
    label: Joi.string().valid('urgent', 'important', 'normal', 'low', 'none').optional(),
    assignedTo: Joi.string().uuid().optional().allow(null),
  }).min(1),

  // Move task
  moveTask: Joi.object({
    targetListId: Joi.string().uuid().required(),
    order: Joi.number().integer().min(0).optional(),
  }),

  // Add board member
  addBoardMember: Joi.object({
    userId: Joi.string().uuid().required(),
    role: Joi.string().valid('owner', 'editor', 'viewer').required(),
  }),
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Sanitize middleware
 */
const sanitize = (property = 'body') => {
  return (req, res, next) => {
    if (req[property]) {
      req[property] = sanitizeInput(req[property]);
    }
    next();
  };
};

module.exports = {
  validate,
  schemas,
  sanitize,
};
