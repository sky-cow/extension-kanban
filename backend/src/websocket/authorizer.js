const { OAuth2Client } = require("google-auth-library");
const logger = require("../utils/logger");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.handler = async (event) => {
  logger.info("[websocketAuthorizer] event", {
    routeKey: event.requestContext?.routeKey,
    qs: event.queryStringParameters
      ? Object.keys(event.queryStringParameters)
      : null,
  });

  const tokenFromQs = event.queryStringParameters?.token;
  let idToken = tokenFromQs || null;

  if (!idToken && event.headers?.authorization) {
    const h = event.headers.authorization;
    if (h.startsWith("Bearer ")) idToken = h.slice(7);
    else idToken = h;
  }

  if (!idToken) {
    logger.warn("[websocketAuthorizer] no token provided");
    return { isAuthorized: false };
  }

  // dev fallback
  if (process.env.ENABLE_OFFLINE_MODE === "true") {
    logger.info("[websocketAuthorizer] offline mode - allowing mock user");
    return {
      isAuthorized: true,
      context: {
        userId: "local-dev-user",
        email: "dev@example.com",
        name: "Dev User",
      },
    };
  }

  try {
    logger.debug(
      "[websocketAuthorizer] verifying token (masked)",
      idToken.slice(0, 8) + "...",
    );
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    logger.info("[websocketAuthorizer] token verified for", payload.email);

    return {
      isAuthorized: true,
      context: {
        userId: payload.sub,
        email: payload.email,
        name: payload.name || "",
      },
    };
  } catch (err) {
    logger.error(
      "[websocketAuthorizer] token verify failed",
      err.message || err,
    );
    return { isAuthorized: false };
  }
};
