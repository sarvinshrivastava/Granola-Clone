/**
 * @fileoverview Security Middleware Configuration
 * @description Comprehensive security middleware setup for Express application
 *
 * Features:
 * - Helmet for security headers
 * - Rate limiting for API protection
 * - Request sanitization and validation
 * - CORS configuration
 * - Error handling middleware
 * - Request logging and monitoring
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-09-28
 */

// =============================================================================
// IMPORTS
// =============================================================================

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const cors = require("cors");

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

/**
 * @class SecurityMiddleware
 * @description Manages and configures security middleware
 */
class SecurityMiddleware {
  constructor(config) {
    this.config = config;
    this.isDevelopment = config.get("server.environment") === "development";
    this.isProduction = config.get("server.environment") === "production";
  }

  /**
   * @method setupHelmet
   * @description Configures Helmet security headers
   * @returns {Function} Helmet middleware
   */
  setupHelmet() {
    const helmetConfig = {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https://api.sarvam.ai"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow WebSocket connections
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      frameguard: { action: "deny" },
      xssFilter: true,
      referrerPolicy: { policy: "same-origin" },
    };

    // Relax CSP in development
    if (this.isDevelopment) {
      helmetConfig.contentSecurityPolicy.directives.connectSrc.push(
        "http://localhost:*"
      );
      helmetConfig.contentSecurityPolicy.directives.connectSrc.push(
        "ws://localhost:*"
      );
    }

    console.log("🛡️  Security headers configured with Helmet");
    return helmet(helmetConfig);
  }

  /**
   * @method setupRateLimit
   * @description Configures rate limiting for API endpoints
   * @returns {Object} Rate limiting middleware configurations
   */
  setupRateLimit() {
    const windowMs = this.config.get("security.rateLimitWindow");
    const maxRequests = this.config.get("security.rateLimitMax");

    // General API rate limit
    const generalLimit = rateLimit({
      windowMs,
      max: maxRequests,
      message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil(windowMs / 1000),
        });
      },
    });

    // Stricter rate limit for WebSocket connections
    const wsLimit = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 connections per minute
      message: {
        error: "Too many WebSocket connections, please try again later.",
      },
      handler: (req, res) => {
        console.log(`🚫 WebSocket rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: "WebSocket connection rate limit exceeded",
        });
      },
    });

    // Very strict rate limit for file uploads
    const uploadLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 uploads per 15 minutes
      message: {
        error: "Too many file uploads, please try again later.",
      },
      handler: (req, res) => {
        console.log(`🚫 Upload rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: "File upload rate limit exceeded",
        });
      },
    });

    console.log(
      `⏱️  Rate limiting configured: ${maxRequests} requests per ${
        windowMs / 60000
      } minutes`
    );

    return {
      general: generalLimit,
      websocket: wsLimit,
      upload: uploadLimit,
    };
  }

  /**
   * @method setupCORS
   * @description Configures CORS with security considerations
   * @returns {Function} CORS middleware
   */
  setupCORS() {
    const corsOrigin = this.config.get("security.corsOrigin");

    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (corsOrigin === "*") {
          if (this.isProduction) {
            console.warn(
              "⚠️  CORS wildcard used in production - security risk!"
            );
          }
          return callback(null, true);
        }

        // Handle multiple origins
        const allowedOrigins = corsOrigin.split(",").map((o) => o.trim());

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Development localhost variations
        if (this.isDevelopment && origin.match(/^http:\/\/localhost:\d+$/)) {
          return callback(null, true);
        }

        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "api-subscription-key",
      ],
      exposedHeaders: ["X-Total-Count", "X-Rate-Limit-Remaining"],
      maxAge: 86400, // 24 hours
    };

    console.log(
      `🌐 CORS configured for origins: ${
        corsOrigin || "localhost (development)"
      }`
    );
    return cors(corsOptions);
  }

  /**
   * @method setupSanitization
   * @description Configures request sanitization middleware
   * @returns {Array} Array of sanitization middleware
   */
  setupSanitization() {
    const middleware = [];

    // MongoDB injection protection - temporarily disabled due to Express 5 compatibility issues
    // middleware.push(mongoSanitize());

    // Parameter pollution protection
    middleware.push(
      hpp({
        whitelist: ["sort", "fields", "page", "limit"], // Allow these to be arrays
      })
    );

    // Custom XSS protection middleware
    middleware.push((req, res, next) => {
      if (req.body && typeof req.body === "object") {
        this._sanitizeObject(req.body);
      }
      if (req.query && typeof req.query === "object") {
        this._sanitizeObject(req.query);
      }
      if (req.params && typeof req.params === "object") {
        this._sanitizeObject(req.params);
      }
      next();
    });

    console.log("🧹 Request sanitization configured");
    return middleware;
  }

  /**
   * @method setupCompression
   * @description Configures response compression
   * @returns {Function} Compression middleware
   */
  setupCompression() {
    const compressionOptions = {
      level: 6, // Good balance between compression and performance
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        // Don't compress WebSocket upgrade requests
        if (req.headers.upgrade) return false;

        // Don't compress already compressed content
        if (res.getHeader("Content-Encoding")) return false;

        return compression.filter(req, res);
      },
    };

    console.log("📦 Response compression configured");
    return compression(compressionOptions);
  }

  /**
   * @method setupLogging
   * @description Configures request logging
   * @returns {Function} Morgan logging middleware
   */
  setupLogging() {
    const logFormat = this.isDevelopment ? "dev" : "combined";

    const logOptions = {
      skip: (req, res) => {
        // Skip logging for health checks and WebSocket upgrades
        return req.url === "/health" || req.headers.upgrade;
      },
      stream: {
        write: (message) => {
          // Remove newline from Morgan's message
          console.log(`📝 ${message.trim()}`);
        },
      },
    };

    console.log(`📋 Request logging configured (${logFormat} format)`);
    return morgan(logFormat, logOptions);
  }

  /**
   * @method setupErrorHandler
   * @description Configures error handling middleware
   * @returns {Function} Error handling middleware
   */
  setupErrorHandler() {
    return (err, req, res, next) => {
      const errorId = Math.random().toString(36).substring(2, 9);

      console.error(`❌ Error [${errorId}] ${err.message}`, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        stack: this.isDevelopment ? err.stack : undefined,
      });

      // Handle specific error types
      let statusCode = 500;
      let message = "Internal server error";

      if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Invalid request data";
      } else if (err.name === "UnauthorizedError") {
        statusCode = 401;
        message = "Unauthorized";
      } else if (err.message.includes("CORS")) {
        statusCode = 403;
        message = "Cross-origin request blocked";
      } else if (err.type === "entity.too.large") {
        statusCode = 413;
        message = "Request entity too large";
      }

      const errorResponse = {
        error: message,
        errorId,
        timestamp: new Date().toISOString(),
      };

      // Include detailed error info in development
      if (this.isDevelopment) {
        errorResponse.details = err.message;
        errorResponse.stack = err.stack;
      }

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * @private
   * @method _sanitizeObject
   * @description Recursively sanitizes object properties
   * @param {Object} obj - Object to sanitize
   */
  _sanitizeObject(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === "string") {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          this._sanitizeObject(obj[key]);
        }
      }
    }
  }

  /**
   * @method applyAll
   * @description Applies all security middleware to Express app
   * @param {Express} app - Express application instance
   */
  applyAll(app) {
    console.log("🔒 Applying security middleware...");

    // Request logging (should be first)
    app.use(this.setupLogging());

    // Response compression
    app.use(this.setupCompression());

    // Security headers
    app.use(this.setupHelmet());

    // CORS configuration
    app.use(this.setupCORS());

    // Rate limiting
    const rateLimits = this.setupRateLimit();
    app.use("/api", rateLimits.general);
    app.use("/ws", rateLimits.websocket);

    // Request sanitization
    const sanitizers = this.setupSanitization();
    sanitizers.forEach((middleware) => app.use(middleware));

    // Body size limits are configured in server.js with bodyParser

    console.log("✅ All security middleware applied successfully");

    return {
      rateLimits,
      errorHandler: this.setupErrorHandler(),
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = SecurityMiddleware;
