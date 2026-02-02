/**
 * List Model
 * 
 * Represents a task list/column with:
 * - Validation
 * - Ordering
 */

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

/**
 * Validation schema for list creation
 */
const createListSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().trim(),
  boardId: Joi.string().uuid().required(),
  order: Joi.number().integer().min(0).default(0),
  createdBy: Joi.string().uuid().required(),
});

/**
 * Validation schema for list updates
 */
const updateListSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().trim(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

/**
 * List class with business logic
 */
class List {
  constructor(data) {
    this.pk = data.pk || `BOARD#${data.boardId}`;
    this.sk = data.sk || `LIST#${data.listId || uuidv4()}`;
    this.listId = data.listId || this.sk.split('#')[1];
    this.boardId = data.boardId || this.pk.split('#')[1];
    this.name = data.name;
    this.order = data.order || 0;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.type = 'LIST';
  }

  /**
   * Create new list with validation
   */
  static create(data) {
    const { error, value } = createListSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return new List(value);
  }

  /**
   * Validate update data
   */
  static validateUpdate(data) {
    const { error, value } = updateListSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * Update list properties
   */
  update(updates) {
    const validUpdates = List.validateUpdate(updates);
    
    Object.keys(validUpdates).forEach(key => {
      this[key] = validUpdates[key];
    });
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Reorder list
   */
  reorder(newOrder) {
    if (typeof newOrder !== 'number' || newOrder < 0) {
      throw new Error('Invalid order value');
    }

    this.order = newOrder;
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
      listId: this.listId,
      boardId: this.boardId,
      name: this.name,
      order: this.order,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: this.type,
    };
  }

  /**
   * Convert to API response format
   */
  toJSON() {
    return {
      id: this.listId,
      boardId: this.boardId,
      name: this.name,
      order: this.order,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create List instance from DynamoDB item
   */
  static fromItem(item) {
    if (!item) return null;
    return new List(item);
  }
}

module.exports = List;
