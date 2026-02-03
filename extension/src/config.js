/**
 * Configuration
 * 
 * Update these values with your AWS deployment endpoints
 */

export const CONFIG = {
  // API Gateway REST endpoint
  //API_BASE_URL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/api',
  API_BASE_URL: 'http://localhost:3000/api',

  
  // API Gateway WebSocket endpoint
 // WS_URL: 'wss://YOUR_WS_ID.execute-api.us-east-1.amazonaws.com/dev',
 WS_URL: 'ws://localhost:3001', // or leave as-is if not using yet

  // AWS Cognito configuration
  //COGNITO_REGION: 'us-east-1',
  //COGNITO_USER_POOL_ID: 'us-east-1_XXXXXXXXX',
  //COGNITO_CLIENT_ID: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
  //COGNITO_DOMAIN: 'your-app-domain.auth.us-east-1.amazoncognito.com',

  COGNITO_REGION: 'us-east-1',
  //COGNITO_USER_POOL_ID: 'local-dev-pool',  //remove this if you are not using Cognito
  //COGNITO_CLIENT_ID: 'local-dev-client',  //remove this if you are not using Cognito
  COGNITO_DOMAIN: 'http://localhost:3000', // only if code uses it
  
  // Organization ID (you can make this dynamic later)
  ORGANIZATION_ID: 'your-organization-uuid',
  
  // Feature flags
 // ENABLE_WEBSOCKET: true,
 // ENABLE_OFFLINE_MODE: false,

  ENABLE_WEBSOCKET: false,        // start with WebSockets off if you like
  // If true, the extension will use in-memory mock data and won't call the backend.
  ENABLE_OFFLINE_MODE: true,
  
  // UI settings
  RECONNECT_DELAY: 5000, // 5 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
};

// Validate configuration on load
function validateConfig() {
  // In offline/mock mode, Cognito is intentionally not configured.
  const required = CONFIG.ENABLE_OFFLINE_MODE
    ? ['API_BASE_URL']
    : ['API_BASE_URL', 'WS_URL', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID'];
  const missing = required.filter(key => 
    !CONFIG[key] || CONFIG[key].includes('YOUR_') || CONFIG[key].includes('XXXXXXXXX')
  );
  
  if (missing.length > 0) {
    console.warn('⚠️ Configuration incomplete. Please update the following in config.js:', missing);
  }
}

validateConfig();

export { validateConfig };
