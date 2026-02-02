/**
 * WebSocket Disconnect Handler
 * 
 * Handles WebSocket disconnections
 */

const { removeConnection, broadcastToBoard, MESSAGE_TYPES, createMessage } = require('../services/websocketService');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');

const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});

/**
 * Send message via API Gateway
 */
const sendMessage = async (connectionId, data) => {
  await apiGateway.postToConnection({
    ConnectionId: connectionId,
    Data: data,
  }).promise();
};

/**
 * Disconnect handler
 */
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Remove connection and get metadata
    const meta = removeConnection(connectionId);

    if (meta) {
      // Notify other users in the board
      await broadcastToBoard(
        meta.boardId,
        createMessage(MESSAGE_TYPES.USER_LEFT, {
          userId: meta.userId,
          username: meta.username,
        }),
        connectionId,
        sendMessage
      );

      logger.info('WebSocket disconnected', {
        connectionId,
        userId: meta.userId,
        boardId: meta.boardId,
      });
    }

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    logger.error('WebSocket disconnection error', {
      connectionId,
      error: error.message,
    });
    return { statusCode: 500, body: 'Internal server error' };
  }
};
