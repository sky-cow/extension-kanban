/**
 * WebSocket Connect Handler
 * 
 * Handles new WebSocket connections
 */

const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { addConnection, sendToConnection, MESSAGE_TYPES, createMessage, getActiveBoardUsers } = require('../services/websocketService');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');

const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});

// Configure Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
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
 * Connect handler
 */
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;
  const boardId = event.queryStringParameters?.boardId;

  try {
    // Validate token
    if (!token) {
      logger.logSecurityEvent('WebSocket connection without token', { connectionId });
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Verify JWT
    const payload = await verifier.verify(token);
    const userId = payload.sub;
    const username = payload.username || payload.email;

    // Validate boardId
    if (!boardId) {
      return { statusCode: 400, body: 'Missing boardId' };
    }

    // Add connection
    addConnection(connectionId, boardId, userId, username);

    // Get active users
    const activeUsers = getActiveBoardUsers(boardId);

    // Send user list to new connection
    await sendToConnection(
      connectionId,
      createMessage(MESSAGE_TYPES.USER_LIST, { users: activeUsers }),
      sendMessage
    );

    logger.info('WebSocket connected', {
      connectionId,
      userId,
      boardId,
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    logger.error('WebSocket connection error', {
      connectionId,
      error: error.message,
    });
    return { statusCode: 500, body: 'Internal server error' };
  }
};
