/**
 * WebSocket Service
 * 
 * Real-time collaboration using WebSocket connections
 * - Broadcast changes to all connected clients
 * - Track active users per board
 * - Handle connection lifecycle
 */

const logger = require('../utils/logger');

/**
 * Store active connections
 * Structure: { boardId: Set<connectionId> }
 */
const boardConnections = new Map();

/**
 * Store connection metadata
 * Structure: { connectionId: { userId, boardId, username } }
 */
const connectionMeta = new Map();

/**
 * Add connection to board
 */
const addConnection = (connectionId, boardId, userId, username) => {
  // Add to board connections
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Set());
  }
  boardConnections.get(boardId).add(connectionId);

  // Store metadata
  connectionMeta.set(connectionId, {
    userId,
    boardId,
    username,
    connectedAt: new Date().toISOString(),
  });

  logger.info('WebSocket connection added', {
    connectionId,
    boardId,
    userId,
    activeConnections: boardConnections.get(boardId).size,
  });
};

/**
 * Remove connection
 */
const removeConnection = (connectionId) => {
  const meta = connectionMeta.get(connectionId);
  
  if (meta) {
    const { boardId } = meta;
    
    // Remove from board connections
    if (boardConnections.has(boardId)) {
      boardConnections.get(boardId).delete(connectionId);
      
      // Clean up empty board
      if (boardConnections.get(boardId).size === 0) {
        boardConnections.delete(boardId);
      }
    }

    // Remove metadata
    connectionMeta.delete(connectionId);

    logger.info('WebSocket connection removed', {
      connectionId,
      boardId,
      userId: meta.userId,
    });

    return meta;
  }

  return null;
};

/**
 * Get all connections for a board
 */
const getBoardConnections = (boardId) => {
  return boardConnections.get(boardId) || new Set();
};

/**
 * Get active users for a board
 */
const getActiveBoardUsers = (boardId) => {
  const connections = getBoardConnections(boardId);
  const users = new Map();

  connections.forEach(connectionId => {
    const meta = connectionMeta.get(connectionId);
    if (meta) {
      users.set(meta.userId, {
        userId: meta.userId,
        username: meta.username,
        connectedAt: meta.connectedAt,
      });
    }
  });

  return Array.from(users.values());
};

/**
 * Broadcast message to all connections in a board
 */
const broadcastToBoard = async (boardId, message, excludeConnectionId = null, sendFunction) => {
  const connections = getBoardConnections(boardId);
  const payload = JSON.stringify(message);

  const sendPromises = Array.from(connections)
    .filter(connId => connId !== excludeConnectionId)
    .map(async (connectionId) => {
      try {
        await sendFunction(connectionId, payload);
      } catch (error) {
        logger.error('Error sending WebSocket message', {
          connectionId,
          boardId,
          error: error.message,
        });
        // Remove failed connection
        removeConnection(connectionId);
      }
    });

  await Promise.allSettled(sendPromises);

  logger.debug('Broadcast to board', {
    boardId,
    recipientCount: connections.size,
    messageType: message.type,
  });
};

/**
 * Send message to specific connection
 */
const sendToConnection = async (connectionId, message, sendFunction) => {
  try {
    const payload = JSON.stringify(message);
    await sendFunction(connectionId, payload);
  } catch (error) {
    logger.error('Error sending to connection', {
      connectionId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * WebSocket message types for real-time events
 */
const MESSAGE_TYPES = {
  // Board events
  BOARD_UPDATED: 'board:updated',
  
  // List events
  LIST_CREATED: 'list:created',
  LIST_UPDATED: 'list:updated',
  LIST_DELETED: 'list:deleted',
  
  // Task events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved',
  
  // User presence
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USER_LIST: 'user:list',
  
  // System
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
};

/**
 * Create WebSocket message
 */
const createMessage = (type, data, meta = {}) => {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    ...meta,
  };
};

module.exports = {
  addConnection,
  removeConnection,
  getBoardConnections,
  getActiveBoardUsers,
  broadcastToBoard,
  sendToConnection,
  MESSAGE_TYPES,
  createMessage,
};
