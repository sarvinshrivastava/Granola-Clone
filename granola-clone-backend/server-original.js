/**
 * @fileoverview Main Server Application
 * @description Enhanced Express server with comprehensive security, monitoring,// =============================================================================
// 404 HANDLER
// =============================================================================

app.use((req, res, next) => {validation
 *
 * Features:
 * - Security middleware stack (Helmet, CORS, Rate limiting)
 * - Input validation and sanitization
 * - Health monitoring and status endpoints
 * - Environment configuration management
 * - WebSocket speech-to-text integration
 * - Comprehensive error handling and logging
 *
 * @author AI Assistant
 * @version 2.0.0
 * @since 2025-09-28
 */

// =============================================================================
// IMPORTS
// =============================================================================

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

// Load environment configuration first
require("dotenv").config();
const config = require("./config/environment");

// Import middleware and routes
const SecurityMiddleware = require("./middleware/security");
const { validate } = require("./middleware/validation");
const transcriptRoutes = require("./routes/transcripts");
const HealthMonitor = require("./routes/health");

// =============================================================================
// APPLICATION SETUP
// =============================================================================

const app = express();
const HOST = config.get("server.host");
const PORT = config.get("server.port");

console.log("🚀 Starting Granola Clone Backend Server...");
config.printSummary();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Initialize security middleware
const security = new SecurityMiddleware(config);
const { rateLimits, errorHandler } = security.applyAll(app);

// =============================================================================
// BODY PARSING WITH SECURITY LIMITS
// =============================================================================

// JSON body parser with size limits
app.use(
  bodyParser.json({
    limit: config.get("security.maxRequestSize"),
    strict: true,
    type: "application/json",
  })
);

// URL-encoded body parser
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: config.get("security.maxRequestSize"),
    parameterLimit: 100,
  })
);

// =============================================================================
// HEALTH MONITORING
// =============================================================================

// Initialize health monitoring
const healthMonitor = new HealthMonitor(config);
app.use("/", healthMonitor.getRouter());

console.log("🏥 Health monitoring endpoints configured");

// =============================================================================
// API ROUTES
// =============================================================================

// Apply API-specific rate limiting
app.use("/api", rateLimits.general);

// Transcript routes with validation
app.use("/api/transcripts", transcriptRoutes);

console.log("📊 API routes configured");

// =============================================================================
// ROOT ENDPOINT
// =============================================================================

app.get("/", (req, res) => {
  res.json({
    name: "Granola Clone Backend",
    version: process.env.npm_package_version || "2.0.0",
    description: "Hindi speech-to-text transcription service",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      api: "/api/transcripts",
      websocket: config.get("websocket.path"),
      documentation: "/api/docs",
    },
    features: [
      "Real-time speech-to-text transcription",
      "WebSocket support for live audio streaming",
      "SarvamAI API integration",
      "Comprehensive security middleware",
      "Health monitoring and status endpoints",
    ],
  });
});

// =============================================================================
// 404 HANDLER
// =============================================================================

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      health: "/health",
      status: "/status",
      api: "/api/transcripts",
      websocket: config.get("websocket.path"),
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Apply error handling middleware (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${config.get("server.environment")}`);
  console.log(
    `🔑 SarvamAI API: ${
      config.get("sarvam.apiKey") ? "Configured" : "Mock mode"
    }`
  );
  console.log(`🎤 WebSocket STT: ${config.get("websocket.path")}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
  console.log("🎯 Server ready to accept connections");
});

// =============================================================================
// WEBSOCKET INTEGRATION
// =============================================================================

// 🔹 Attach STT WebSocket handler (preserving existing functionality)
require("./ws/sttHandler")(server);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error("❌ Error during server shutdown:", err);
      process.exit(1);
    }

    console.log("✅ Server closed gracefully");
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Handle graceful shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = { app, server, config };
