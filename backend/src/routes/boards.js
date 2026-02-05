/**
 * Board API Routes
 *
 * REST endpoints for board management
 */

const express = require("express");
const router = express.Router();
const boardService = require("../services/boardService");
const auth = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validator");
const { asyncHandler, NotFoundError } = require("../middleware/errorHandler");

/**
 * GET /boards
 * Get all boards for authenticated user
 */
router.get(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    logger.info("Boards list requested", {
      userId: req.user?.userId,
      path: req.path,
    });
    const boards = await boardService.getUserBoards(req.user.userId);

    res.json({
      success: true,
      data: boards,
      count: boards.length,
    });
  }),
);

/**
 * POST /boards
 * Create a new board
 */
router.post(
  "/",
  auth,
  validate(schemas.createBoard, "body"),
  asyncHandler(async (req, res) => {
    const board = await boardService.createBoard(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      data: board.toJSON(),
      message: "Board created successfully",
    });
  }),
);

/**
 * GET /boards/:boardId
 * Get board details by ID
 */
router.get(
  "/:boardId",
  auth,
  validate(schemas.boardIdParam, "params"),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;

    // Check if user has access
    const hasAccess = await boardService.canUserViewBoard(
      boardId,
      req.user.userId,
    );
    if (!hasAccess) {
      throw new NotFoundError("Board");
    }

    const board = await boardService.getBoardById(boardId);
    if (!board) {
      throw new NotFoundError("Board");
    }

    res.json({
      success: true,
      data: board.toJSON(),
    });
  }),
);

/**
 * PUT /boards/:boardId
 * Update board
 */
router.put(
  "/:boardId",
  auth,
  validate(schemas.boardIdParam, "params"),
  validate(schemas.updateBoard, "body"),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;

    const board = await boardService.updateBoard(
      boardId,
      req.body,
      req.user.userId,
    );

    res.json({
      success: true,
      data: board.toJSON(),
      message: "Board updated successfully",
    });
  }),
);

/**
 * DELETE /boards/:boardId
 * Delete board
 */
router.delete(
  "/:boardId",
  auth,
  validate(schemas.boardIdParam, "params"),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;

    await boardService.deleteBoard(boardId, req.user.userId);

    res.json({
      success: true,
      message: "Board deleted successfully",
    });
  }),
);

/**
 * GET /boards/:boardId/members
 * Get board members
 */
router.get(
  "/:boardId/members",
  auth,
  validate(schemas.boardIdParam, "params"),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;

    // Check if user has access
    const hasAccess = await boardService.canUserViewBoard(
      boardId,
      req.user.userId,
    );
    if (!hasAccess) {
      throw new NotFoundError("Board");
    }

    const members = await boardService.getBoardMembers(boardId);

    res.json({
      success: true,
      data: members,
      count: members.length,
    });
  }),
);

/**
 * POST /boards/:boardId/members
 * Add member to board
 */
router.post(
  "/:boardId/members",
  auth,
  validate(schemas.boardIdParam, "params"),
  validate(schemas.addBoardMember, "body"),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const { userId, role } = req.body;

    const member = await boardService.addBoardMember(
      boardId,
      userId,
      role,
      req.user.userId,
    );

    res.status(201).json({
      success: true,
      data: member,
      message: "Member added successfully",
    });
  }),
);

/**
 * DELETE /boards/:boardId/members/:userId
 * Remove member from board
 */
router.delete(
  "/:boardId/members/:userId",
  auth,
  validate(schemas.boardIdParam, "params"),
  asyncHandler(async (req, res) => {
    const { boardId, userId } = req.params;

    await boardService.removeBoardMember(boardId, userId, req.user.userId);

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  }),
);

module.exports = router;
