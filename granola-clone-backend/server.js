/**
 * @fileoverview Enhanced Granola Clone Backend Server
 * @description Express server with security middleware, monitoring, and WebSocket STT
 */

const express = require("express");
const bodyParser = require("body-parser");

// Load environment configuration
require("dotenv").config();
const config = require("./config/environment");

// Import middleware and routes
const SecurityMiddleware = require("./middleware/security");
const transcriptRoutes = require("./routes/transcripts");
const HealthMonitor = require("./routes/health");

// =============================================================================
// APPLICATION SETUP
// =============================================================================

const app = express();
const HOST = config.get("server.host");
const PORT = config.get("server.port");

console.log("🚀 Starting Enhanced Granola Clone Backend...");
config.printSummary();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

const security = new SecurityMiddleware(config);
const { rateLimits, errorHandler } = security.applyAll(app);

// =============================================================================
// BODY PARSING
// =============================================================================

app.use(
  bodyParser.json({
    limit: config.get("security.maxRequestSize"),
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: config.get("security.maxRequestSize"),
  })
);

// =============================================================================
// HEALTH MONITORING
// =============================================================================

const healthMonitor = new HealthMonitor(config);
app.use(healthMonitor.getRouter());

// =============================================================================
// API ROUTES
// =============================================================================

app.use("/api", rateLimits.general);
app.use("/api/transcripts", transcriptRoutes);

// =============================================================================
// ROOT ENDPOINT
// =============================================================================

app.get("/", (req, res) => {
  res.json({
    name: "Granola Clone Backend Enhanced",
    version: "2.0.0",
    description:
      "Hindi speech-to-text transcription service with enhanced security",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      api: "/api/transcripts",
      websocket: "/ws/stt",
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Enhanced server running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${config.get("server.environment")}`);
  console.log(
    `🔑 SarvamAI API: ${
      config.get("sarvam.apiKey") ? "Configured" : "Mock mode"
    }`
  );
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
});

// =============================================================================
// WEBSOCKET INTEGRATION (PRESERVE EXISTING FUNCTIONALITY)
// =============================================================================

require("./ws/sttHandler")(server);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🔄 SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, config };
