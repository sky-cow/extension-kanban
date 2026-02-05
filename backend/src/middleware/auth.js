// ... existing header comments ...

const { CognitoJwtVerifier } = require("aws-jwt-verify");
const logger = require("../utils/logger");
const { OAuth2Client } = require("google-auth-library");

// Determine if we are in local/dev mode with no Cognito configured
const isLocalDev =
  (process.env.NODE_ENV || "development") !== "production" &&
  (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID);

let verifier = null;

if (!isLocalDev) {
  // Configure Cognito JWT verifier only when Cognito is actually configured
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID,
  });
}

// Use GOOGLE_CLIENT_ID env var (set this before deploy/run)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Authentication middleware
 * In local dev without Cognito, we stub a fake user and skip JWT verification.
 */
const authenticate = async (req, res, next) => {
  // Local dev: bypass Cognito, attach a fake user
  if (isLocalDev) {
    req.user = {
      userId: "local-user-id",
      username: "local-user",
      email: "local@example.com",
      organizationId: process.env.LOCAL_ORG_ID || "local-org",
      role: "admin",
    };
    logger.info("Local dev: skipping Cognito auth, using fake user", {
      userId: req.user.userId,
    });
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.logSecurityEvent("Missing or invalid authorization header", {
        path: req.path,
        ip: req.ip,
      });
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization token",
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifier.verify(token);

    req.user = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      organizationId: payload["custom:organizationId"],
      role: payload["custom:role"],
    };

    logger.debug("User authenticated", { userId: req.user.userId });
    next();
  } catch (error) {
    logger.logSecurityEvent("Token verification failed", {
      error: error.message,
      path: req.path,
      ip: req.ip,
    });

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
};

/**
 * Optional authentication middleware
 */
const optionalAuthenticate = async (req, res, next) => {
  // Local dev: do nothing, just continue
  if (isLocalDev) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = await verifier.verify(token);

    req.user = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      organizationId: payload["custom:organizationId"],
      role: payload["custom:role"],
    };

    next();
  } catch (error) {
    logger.debug("Optional auth failed", { error: error.message });
    next();
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.logSecurityEvent("Insufficient permissions", {
        userId: req.user.userId,
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        path: req.path,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

const requireOrganization = (organizationId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (req.user.organizationId !== organizationId) {
      logger.logSecurityEvent("Organization access denied", {
        userId: req.user.userId,
        userOrganization: req.user.organizationId,
        requestedOrganization: organizationId,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied to this organization",
      });
    }

    next();
  };
};

/**
 * Auth middleware
 * Expects Authorization: Bearer <id_token>
 * On success attaches req.user = { id, email, name }
 */
module.exports = async function auth(req, res, next) {
  try {
    // Local/dev: allow offline mock user if explicitly enabled
    if (process.env.ENABLE_OFFLINE_MODE === "true") {
      console.info("[auth] Offline mode enabled — using mock user");
      req.user = {
        id: "local-dev-user",
        email: "dev@example.com",
        name: "Dev User",
      };
      return next();
    }

    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer (.+)$/);
    if (!match) {
      console.warn("[auth] Missing Authorization header");
      return res.status(401).json({ error: "Missing Authorization token" });
    }

    const idToken = match[1];
    console.debug(
      "[auth] Verifying ID token (masked):",
      `${idToken.slice(0, 8)}...`,
    );

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID, // must match token audience
    });

    const payload = ticket.getPayload();
    // log minimal info for debugging (avoid full token echo)
    console.info("[auth] Token verified for", payload.email, payload.sub);

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
    };

    return next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireOrganization,
};
