/**
 * Task API Routes
 * 
 * REST endpoints for task management
 */

const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const boardService = require('../services/boardService');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');

/**
 * GET /lists/:listId/tasks
 * Get all tasks in a list
 */
router.get(
  '/lists/:listId/tasks',
  authenticate,
  validate(schemas.listIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const { boardId } = req.query;

    // Verify user has access to the board
    if (boardId) {
      const hasAccess = await boardService.canUserViewBoard(boardId, req.user.userId);
      if (!hasAccess) {
        throw new NotFoundError('Board');
      }
    }

    const tasks = await taskService.getListTasks(listId);

    res.json({
      success: true,
      data: tasks.map(task => task.toJSON()),
      count: tasks.length,
    });
  })
);

/**
 * POST /lists/:listId/tasks
 * Create a new task
 */
router.post(
  '/lists/:listId/tasks',
  authenticate,
  validate(schemas.listIdParam, 'params'),
  validate(schemas.createTask, 'body'),
  asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const { boardId } = req.query;

    if (!boardId) {
      throw new Error('boardId query parameter is required');
    }

    const task = await taskService.createTask(
      { ...req.body, listId },
      req.user.userId,
      boardId
    );

    res.status(201).json({
      success: true,
      data: task.toJSON(),
      message: 'Task created successfully',
    });
  })
);

/**
 * GET /tasks/:taskId
 * Get task by ID
 */
router.get(
  '/tasks/:taskId',
  authenticate,
  validate(schemas.taskIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { listId, boardId } = req.query;

    if (!listId || !boardId) {
      throw new Error('listId and boardId query parameters are required');
    }

    // Verify access
    const hasAccess = await boardService.canUserViewBoard(boardId, req.user.userId);
    if (!hasAccess) {
      throw new NotFoundError('Board');
    }

    const task = await taskService.getTaskById(listId, taskId);
    if (!task) {
      throw new NotFoundError('Task');
    }

    res.json({
      success: true,
      data: task.toJSON(),
    });
  })
);

/**
 * PUT /tasks/:taskId
 * Update task
 */
router.put(
  '/tasks/:taskId',
  authenticate,
  validate(schemas.taskIdParam, 'params'),
  validate(schemas.updateTask, 'body'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { listId, boardId } = req.query;

    if (!listId || !boardId) {
      throw new Error('listId and boardId query parameters are required');
    }

    const task = await taskService.updateTask(
      listId,
      taskId,
      req.body,
      req.user.userId,
      boardId
    );

    res.json({
      success: true,
      data: task.toJSON(),
      message: 'Task updated successfully',
    });
  })
);

/**
 * DELETE /tasks/:taskId
 * Delete task
 */
router.delete(
  '/tasks/:taskId',
  authenticate,
  validate(schemas.taskIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { listId, boardId } = req.query;

    if (!listId || !boardId) {
      throw new Error('listId and boardId query parameters are required');
    }

    await taskService.deleteTask(listId, taskId, req.user.userId, boardId);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  })
);

/**
 * PUT /tasks/:taskId/move
 * Move task to different list
 */
router.put(
  '/tasks/:taskId/move',
  authenticate,
  validate(schemas.taskIdParam, 'params'),
  validate(schemas.moveTask, 'body'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { targetListId } = req.body;
    const { listId, boardId } = req.query;

    if (!listId || !boardId) {
      throw new Error('listId and boardId query parameters are required');
    }

    const task = await taskService.moveTask(
      listId,
      taskId,
      targetListId,
      req.user.userId,
      boardId
    );

    res.json({
      success: true,
      data: task.toJSON(),
      message: 'Task moved successfully',
    });
  })
);

/**
 * PUT /tasks/:taskId/assign
 * Assign task to user
 */
router.put(
  '/tasks/:taskId/assign',
  authenticate,
  validate(schemas.taskIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { assigneeId } = req.body;
    const { listId, boardId } = req.query;

    if (!listId || !boardId) {
      throw new Error('listId and boardId query parameters are required');
    }

    const task = await taskService.assignTask(
      listId,
      taskId,
      assigneeId,
      req.user.userId,
      boardId
    );

    res.json({
      success: true,
      data: task.toJSON(),
      message: 'Task assigned successfully',
    });
  })
);

/**
 * GET /boards/:boardId/tasks
 * Get all tasks for a board
 */
router.get(
  '/boards/:boardId/tasks',
  authenticate,
  validate(schemas.boardIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;

    // Verify access
    const hasAccess = await boardService.canUserViewBoard(boardId, req.user.userId);
    if (!hasAccess) {
      throw new NotFoundError('Board');
    }

    const tasks = await taskService.getBoardTasks(boardId);

    res.json({
      success: true,
      data: tasks.map(task => task.toJSON()),
      count: tasks.length,
    });
  })
);

module.exports = router;
