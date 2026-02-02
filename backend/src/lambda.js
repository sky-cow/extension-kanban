/**
 * AWS Lambda Handler
 * 
 * Wraps Express app for Lambda execution
 */

const serverless = require('serverless-http');
const app = require('./app');

// Create serverless handler
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  request: (request, event, context) => {
    // Add AWS context to request
    request.awsEvent = event;
    request.awsContext = context;
  },
});

module.exports.handler = handler;
