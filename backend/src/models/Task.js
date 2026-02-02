/**
 * Task Model
 * 
 * Represents a task with:
 * - Validation
 * - Label management
 * - Link handling
 */

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

/**
 * Valid task labels
 */
const TASK_LABELS = ['urgent', 'important', 'normal', 'low', 'none'];

/**
 * Validation schema for task creation
 */
const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().trim(),
  description: Joi.string().max(2000).optional().allow('').trim(),
  link: Joi.string().uri().max(500).optional().allow('').trim(),
  label: Joi.string().valid(...TASK_LABELS).default('none'),
  listId: Joi.string().uuid().required(),
  assignedTo: Joi.string().uuid().optional(),
  createdBy: Joi.string().uuid().required(),
});

/**
 * Validation schema for task updates
 */
const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional().trim(),
  description: Joi.string().max(2000).optional().allow('').trim(),
  link: Joi.string().uri().max(500).optional().allow('').trim(),
  label: Joi.string().valid(...TASK_LABELS).optional(),
  assignedTo: Joi.string().uuid().optional().allow(null),
}).min(1);

/**
 * Task class with business logic
 */
class Task {
  constructor(data) {
    this.pk = data.pk || `LIST#${data.listId}`;
    this.sk = data.sk || `TASK#${data.taskId || uuidv4()}`;
    this.taskId = data.taskId || this.sk.split('#')[1];
    this.listId = data.listId || this.pk.split('#')[1];
    this.title = data.title;
    this.description = data.description || '';
    this.link = data.link || '';
    this.label = data.label || 'none';
    this.assignedTo = data.assignedTo || null;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.order = data.order || 0;
    this.type = 'TASK';
  }

  /**
   * Create new task with validation
   */
  static create(data) {
    const { error, value } = createTaskSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return new Task(value);
  }

  /**
   * Validate update data
   */
  static validateUpdate(data) {
    const { error, value } = updateTaskSchema.validate(data);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * Update task properties
   */
  update(updates) {
    const validUpdates = Task.validateUpdate(updates);
    
    Object.keys(validUpdates).forEach(key => {
      this[key] = validUpdates[key];
    });
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Move task to different list
   */
  moveTo(newListId) {
    if (!newListId || typeof newListId !== 'string') {
      throw new Error('Invalid list ID');
    }

    this.listId = newListId;
    this.pk = `LIST#${newListId}`;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Assign task to user
   */
  assignTo(userId) {
    if (userId && typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    this.assignedTo = userId;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Set task label
   */
  setLabel(label) {
    if (!TASK_LABELS.includes(label)) {
      throw new Error(`Invalid label. Must be one of: ${TASK_LABELS.join(', ')}`);
    }

    this.label = label;
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
      taskId: this.taskId,
      listId: this.listId,
      title: this.title,
      description: this.description,
      link: this.link,
      label: this.label,
      assignedTo: this.assignedTo,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      order: this.order,
      type: this.type,
    };
  }

  /**
   * Convert to API response format
   */
  toJSON() {
    return {
      id: this.taskId,
      listId: this.listId,
      title: this.title,
      description: this.description,
      link: this.link,
      label: this.label,
      assignedTo: this.assignedTo,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      order: this.order,
    };
  }

  /**
   * Create Task instance from DynamoDB item
   */
  static fromItem(item) {
    if (!item) return null;
    return new Task(item);
  }

  /**
   * Get label emoji for display
   */
  getLabelEmoji() {
    const emojiMap = {
      urgent: '🔴',
      important: '🟠',
      normal: '🟢',
      low: '🔵',
      none: '',
    };
    return emojiMap[this.label] || '';
  }
}

module.exports = Task;
module.exports.TASK_LABELS = TASK_LABELS;
