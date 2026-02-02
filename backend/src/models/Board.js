/**
 * Board Model
 * 
 * Represents a task board with:
 * - Validation
 * - Business logic
 * - Data transformation
 */

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

/**
 * Validation schema for board creation
 */
const createBoardSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  description: Joi.string().max(500).optional().allow('').trim(),
  organizationId: Joi.string().uuid().required(),
  createdBy: Joi.string().uuid().required(),
});

/**
 * Validation schema for board updates
 */
const updateBoardSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().trim(),
  description: Joi.string().max(500).optional().allow('').trim(),
}).min(1); // At least one field required

/**
 * Board class with business logic
 */
class Board {
  constructor(data) {
    this.pk = data.pk || `BOARD#${data.boardId || uuidv4()}`;
    this.sk = 'METADATA';
    this.boardId = data.boardId || this.pk.split('#')[1];
    this.name = data.name;
    this.description = data.description || '';
    this.organizationId = data.organizationId;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isArchived = data.isArchived || false;
    this.type = 'BOARD';
  }

  /**
   * Create new board with validation
   */
  static create(data) {
    const { error, value } = createBoardSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return new Board(value);
  }

  /**
   * Validate update data
   */
  static validateUpdate(data) {
    const { error, value } = updateBoardSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * Update board properties
   */
  update(updates) {
    const validUpdates = Board.validateUpdate(updates);
    
    Object.keys(validUpdates).forEach(key => {
      this[key] = validUpdates[key];
    });
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Archive board (soft delete)
   */
  archive() {
    this.isArchived = true;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Convert to plain object for DynamoDB
   */
  toItem() {
    return {
      pk: this.pk,
      sk: this.sk,
      boardId: this.boardId,
      name: this.name,
      description: this.description,
      organizationId: this.organizationId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isArchived: this.isArchived,
      type: this.type,
    };
  }

  /**
   * Convert to API response format (hide internal fields)
   */
  toJSON() {
    return {
      id: this.boardId,
      name: this.name,
      description: this.description,
      organizationId: this.organizationId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isArchived: this.isArchived,
    };
  }

  /**
   * Create Board instance from DynamoDB item
   */
  static fromItem(item) {
    if (!item) return null;
    return new Board(item);
  }

  /**
   * Check if user is board owner
   */
  isOwner(userId) {
    return this.createdBy === userId;
  }
}

module.exports = Board;
