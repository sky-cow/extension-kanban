/**
 * Task Service
 * 
 * Business logic for task operations:
 * - CRUD operations
 * - Task movement between lists
 * - Authorization
 */

const Task = require('../models/Task');
const { getItem, putItem, updateItem, deleteItem, queryItems, transactWrite } = require('../utils/db');
const { canUserEditBoard } = require('./boardService');
const logger = require('../utils/logger');

const TABLES = {
  TASKS: 'boards', // Tasks stored in same table with boards
  LISTS: 'boards', // Lists stored in same table with boards
};

/**
 * Create a new task
 */
const createTask = async (taskData, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to create tasks in this board');
    }

    const task = Task.create({
      ...taskData,
      createdBy: userId,
    });

    await putItem(TABLES.TASKS, task.toItem());

    logger.info('Task created', { taskId: task.taskId, listId: taskData.listId, userId });
    return task;
  } catch (error) {
    logger.error('Error creating task', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get task by ID
 */
const getTaskById = async (listId, taskId) => {
  try {
    const item = await getItem(TABLES.TASKS, {
      pk: `LIST#${listId}`,
      sk: `TASK#${taskId}`,
    });

    if (!item) {
      return null;
    }

    return Task.fromItem(item);
  } catch (error) {
    logger.error('Error getting task', { error: error.message, taskId, listId });
    throw error;
  }
};

/**
 * Get all tasks in a list
 */
const getListTasks = async (listId) => {
  try {
    const items = await queryItems(TABLES.TASKS, {
      expression: '#pk = :listId AND begins_with(#sk, :taskPrefix)',
      names: { '#pk': 'pk', '#sk': 'sk' },
      values: { ':listId': `LIST#${listId}`, ':taskPrefix': 'TASK#' },
    });

    return items.map(item => Task.fromItem(item)).sort((a, b) => a.order - b.order);
  } catch (error) {
    logger.error('Error getting list tasks', { error: error.message, listId });
    throw error;
  }
};

/**
 * Get all tasks for a board (across all lists)
 */
const getBoardTasks = async (boardId) => {
  try {
    // First get all lists for the board
    const lists = await queryItems(TABLES.LISTS, {
      expression: '#pk = :boardId AND begins_with(#sk, :listPrefix)',
      names: { '#pk': 'pk', '#sk': 'sk' },
      values: { ':boardId': `BOARD#${boardId}`, ':listPrefix': 'LIST#' },
    });

    // Then get tasks for each list
    const tasksPromises = lists.map(list => {
      const listId = list.listId;
      return getListTasks(listId);
    });

    const tasksArrays = await Promise.all(tasksPromises);
    return tasksArrays.flat();
  } catch (error) {
    logger.error('Error getting board tasks', { error: error.message, boardId });
    throw error;
  }
};

/**
 * Update task
 */
const updateTask = async (listId, taskId, updates, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to update tasks in this board');
    }

    const task = await getTaskById(listId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.update(updates);

    await putItem(TABLES.TASKS, task.toItem());

    logger.info('Task updated', { taskId, listId, userId });
    return task;
  } catch (error) {
    logger.error('Error updating task', { error: error.message, taskId, userId });
    throw error;
  }
};

/**
 * Move task to different list
 */
const moveTask = async (currentListId, taskId, newListId, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to move tasks in this board');
    }

    const task = await getTaskById(currentListId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Move task (delete from old location, create in new location)
    const oldKey = {
      pk: `LIST#${currentListId}`,
      sk: `TASK#${taskId}`,
    };

    task.moveTo(newListId);

    await transactWrite([
      {
        type: 'Delete',
        tableName: TABLES.TASKS,
        key: oldKey,
      },
      {
        type: 'Put',
        tableName: TABLES.TASKS,
        item: task.toItem(),
      },
    ]);

    logger.info('Task moved', { taskId, fromList: currentListId, toList: newListId, userId });
    return task;
  } catch (error) {
    logger.error('Error moving task', { error: error.message, taskId, userId });
    throw error;
  }
};

/**
 * Delete task
 */
const deleteTask = async (listId, taskId, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to delete tasks in this board');
    }

    await deleteItem(TABLES.TASKS, {
      pk: `LIST#${listId}`,
      sk: `TASK#${taskId}`,
    });

    logger.info('Task deleted', { taskId, listId, userId });
    return true;
  } catch (error) {
    logger.error('Error deleting task', { error: error.message, taskId, userId });
    throw error;
  }
};

/**
 * Assign task to user
 */
const assignTask = async (listId, taskId, assigneeId, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to assign tasks in this board');
    }

    const task = await getTaskById(listId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.assignTo(assigneeId);

    await putItem(TABLES.TASKS, task.toItem());

    logger.info('Task assigned', { taskId, assigneeId, userId });
    return task;
  } catch (error) {
    logger.error('Error assigning task', { error: error.message, taskId, userId });
    throw error;
  }
};

/**
 * Change task label
 */
const setTaskLabel = async (listId, taskId, label, userId, boardId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to update tasks in this board');
    }

    const task = await getTaskById(listId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.setLabel(label);

    await putItem(TABLES.TASKS, task.toItem());

    logger.info('Task label updated', { taskId, label, userId });
    return task;
  } catch (error) {
    logger.error('Error updating task label', { error: error.message, taskId, userId });
    throw error;
  }
};

module.exports = {
  createTask,
  getTaskById,
  getListTasks,
  getBoardTasks,
  updateTask,
  moveTask,
  deleteTask,
  assignTask,
  setTaskLabel,
};
