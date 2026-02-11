/**
 * Server Entry Point
 *
 * Starts the Express server
 */

require("dotenv").config();
const app = require("./app");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Simple console log for quick local debugging
console.info("BACKEND STARTUP", {
  NODE_ENV: process.env.NODE_ENV || "local",
  AWS_REGION: process.env.AWS_REGION || process.env.REGION,
  DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX || "not-set",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT-SET",
});

// Start server
const server = app.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
  });

  console.log(
    `Backend listening on http://localhost:${PORT} (env=${NODE_ENV})`,
  );
});

// Export for serverless
module.exports = app;
module.exports.server = server;
