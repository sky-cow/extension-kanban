/**
 * Board Service
 * 
 * Business logic for board operations:
 * - Create, read, update, delete boards
 * - Manage board members
 * - Authorization checks
 */

const Board = require('../models/Board');
const { getItem, putItem, updateItem, deleteItem, queryItems, transactWrite } = require('../utils/db');
const logger = require('../utils/logger');

const TABLES = {
  BOARDS: 'boards',
  BOARD_MEMBERS: 'board-members',
};

/**
 * Create a new board
 */
const createBoard = async (boardData, userId) => {
  try {
    const board = Board.create({
      ...boardData,
      createdBy: userId,
    });

    // Transaction: Create board + Add creator as owner
    await transactWrite([
      {
        type: 'Put',
        tableName: TABLES.BOARDS,
        item: board.toItem(),
      },
      {
        type: 'Put',
        tableName: TABLES.BOARD_MEMBERS,
        item: {
          pk: `BOARD#${board.boardId}`,
          sk: `USER#${userId}`,
          boardId: board.boardId,
          userId: userId,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      },
    ]);

    logger.info('Board created', { boardId: board.boardId, userId });
    return board;
  } catch (error) {
    logger.error('Error creating board', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get board by ID
 */
const getBoardById = async (boardId) => {
  try {
    const item = await getItem(TABLES.BOARDS, {
      pk: `BOARD#${boardId}`,
      sk: 'METADATA',
    });

    if (!item) {
      return null;
    }

    return Board.fromItem(item);
  } catch (error) {
    logger.error('Error getting board', { error: error.message, boardId });
    throw error;
  }
};

/**
 * Get all boards for a user
 */
const getUserBoards = async (userId) => {
  try {
    // Query board-members table to get boards user has access to
    const memberItems = await queryItems(TABLES.BOARD_MEMBERS, {
      expression: '#sk = :userId',
      names: { '#sk': 'sk' },
      values: { ':userId': `USER#${userId}` },
    });

    // Get full board details
    const boards = await Promise.all(
      memberItems.map(async (member) => {
        const board = await getBoardById(member.boardId);
        return board ? { ...board.toJSON(), role: member.role } : null;
      })
    );

    return boards.filter(Boolean);
  } catch (error) {
    logger.error('Error getting user boards', { error: error.message, userId });
    throw error;
  }
};

/**
 * Update board
 */
const updateBoard = async (boardId, updates, userId) => {
  try {
    // Check authorization
    const canEdit = await canUserEditBoard(boardId, userId);
    if (!canEdit) {
      throw new Error('User does not have permission to edit this board');
    }

    const board = await getBoardById(boardId);
    if (!board) {
      throw new Error('Board not found');
    }

    board.update(updates);

    await putItem(TABLES.BOARDS, board.toItem());

    logger.info('Board updated', { boardId, userId });
    return board;
  } catch (error) {
    logger.error('Error updating board', { error: error.message, boardId, userId });
    throw error;
  }
};

/**
 * Delete board (and all associated data)
 */
const deleteBoard = async (boardId, userId) => {
  try {
    // Check if user is owner
    const board = await getBoardById(boardId);
    if (!board) {
      throw new Error('Board not found');
    }

    if (!board.isOwner(userId)) {
      throw new Error('Only board owner can delete the board');
    }

    // TODO: In production, implement cascade delete for lists and tasks
    // For now, just delete the board metadata
    await deleteItem(TABLES.BOARDS, {
      pk: `BOARD#${boardId}`,
      sk: 'METADATA',
    });

    logger.info('Board deleted', { boardId, userId });
    return true;
  } catch (error) {
    logger.error('Error deleting board', { error: error.message, boardId, userId });
    throw error;
  }
};

/**
 * Add member to board
 */
const addBoardMember = async (boardId, newUserId, role, requestingUserId) => {
  try {
    // Check if requesting user has owner/editor role
    const canManage = await canUserManageBoard(boardId, requestingUserId);
    if (!canManage) {
      throw new Error('User does not have permission to add members');
    }

    // Validate role
    if (!['owner', 'editor', 'viewer'].includes(role)) {
      throw new Error('Invalid role');
    }

    const member = {
      pk: `BOARD#${boardId}`,
      sk: `USER#${newUserId}`,
      boardId: boardId,
      userId: newUserId,
      role: role,
      joinedAt: new Date().toISOString(),
    };

    await putItem(TABLES.BOARD_MEMBERS, member);

    logger.info('Board member added', { boardId, newUserId, role, requestingUserId });
    return member;
  } catch (error) {
    logger.error('Error adding board member', { error: error.message, boardId, newUserId });
    throw error;
  }
};

/**
 * Remove member from board
 */
const removeBoardMember = async (boardId, userIdToRemove, requestingUserId) => {
  try {
    // Check if requesting user has owner role
    const canManage = await canUserManageBoard(boardId, requestingUserId);
    if (!canManage) {
      throw new Error('User does not have permission to remove members');
    }

    // Cannot remove self if you're the only owner
    const members = await getBoardMembers(boardId);
    const owners = members.filter(m => m.role === 'owner');
    
    if (owners.length === 1 && owners[0].userId === userIdToRemove) {
      throw new Error('Cannot remove the last owner');
    }

    await deleteItem(TABLES.BOARD_MEMBERS, {
      pk: `BOARD#${boardId}`,
      sk: `USER#${userIdToRemove}`,
    });

    logger.info('Board member removed', { boardId, userIdToRemove, requestingUserId });
    return true;
  } catch (error) {
    logger.error('Error removing board member', { error: error.message, boardId, userIdToRemove });
    throw error;
  }
};

/**
 * Get all members of a board
 */
const getBoardMembers = async (boardId) => {
  try {
    const members = await queryItems(TABLES.BOARD_MEMBERS, {
      expression: '#pk = :boardId',
      names: { '#pk': 'pk' },
      values: { ':boardId': `BOARD#${boardId}` },
    });

    return members;
  } catch (error) {
    logger.error('Error getting board members', { error: error.message, boardId });
    throw error;
  }
};

/**
 * Check if user can view board
 */
const canUserViewBoard = async (boardId, userId) => {
  try {
    const member = await getItem(TABLES.BOARD_MEMBERS, {
      pk: `BOARD#${boardId}`,
      sk: `USER#${userId}`,
    });

    return member !== null;
  } catch (error) {
    logger.error('Error checking view permission', { error: error.message, boardId, userId });
    return false;
  }
};

/**
 * Check if user can edit board
 */
const canUserEditBoard = async (boardId, userId) => {
  try {
    const member = await getItem(TABLES.BOARD_MEMBERS, {
      pk: `BOARD#${boardId}`,
      sk: `USER#${userId}`,
    });

    return member && ['owner', 'editor'].includes(member.role);
  } catch (error) {
    logger.error('Error checking edit permission', { error: error.message, boardId, userId });
    return false;
  }
};

/**
 * Check if user can manage board (add/remove members)
 */
const canUserManageBoard = async (boardId, userId) => {
  try {
    const member = await getItem(TABLES.BOARD_MEMBERS, {
      pk: `BOARD#${boardId}`,
      sk: `USER#${userId}`,
    });

    return member && member.role === 'owner';
  } catch (error) {
    logger.error('Error checking manage permission', { error: error.message, boardId, userId });
    return false;
  }
};

module.exports = {
  createBoard,
  getBoardById,
  getUserBoards,
  updateBoard,
  deleteBoard,
  addBoardMember,
  removeBoardMember,
  getBoardMembers,
  canUserViewBoard,
  canUserEditBoard,
  canUserManageBoard,
};
