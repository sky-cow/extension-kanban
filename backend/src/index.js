/**
 * Server Entry Point
 * 
 * Starts the Express server
 */

require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
  });
});

// Export for serverless
module.exports = app;
module.exports.server = server;
