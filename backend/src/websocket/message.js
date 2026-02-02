/**
 * WebSocket Message Handler
 * 
 * Handles incoming WebSocket messages and broadcasts to board members
 */

const { broadcastToBoard, MESSAGE_TYPES, createMessage } = require('../services/websocketService');
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
 * Message handler
 */
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    const body = JSON.parse(event.body);
    const { type, data, boardId } = body;

    logger.debug('WebSocket message received', {
      connectionId,
      type,
      boardId,
    });

    // Handle ping/pong
    if (type === MESSAGE_TYPES.PING) {
      await sendMessage(
        connectionId,
        JSON.stringify(createMessage(MESSAGE_TYPES.PONG, { timestamp: Date.now() }))
      );
      return { statusCode: 200, body: 'Pong sent' };
    }

    // Broadcast message to all board members
    if (boardId) {
      await broadcastToBoard(
        boardId,
        createMessage(type, data, { connectionId }),
        connectionId, // Exclude sender
        sendMessage
      );
    }

    return { statusCode: 200, body: 'Message sent' };
  } catch (error) {
    logger.error('WebSocket message error', {
      connectionId,
      error: error.message,
    });

    // Send error to client
    try {
      await sendMessage(
        connectionId,
        JSON.stringify(createMessage(MESSAGE_TYPES.ERROR, {
          message: 'Failed to process message',
        }))
      );
    } catch (sendError) {
      logger.error('Failed to send error message', {
        connectionId,
        error: sendError.message,
      });
    }

    return { statusCode: 500, body: 'Internal server error' };
  }
};
