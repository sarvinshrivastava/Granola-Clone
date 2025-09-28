/**
 * @fileoverview Environment Configuration and Validation
 * @description Secure environment variable management with validation and type checking
 *
 * Features:
 * - Environment variable validation and type checking
 * - Development/production configuration separation
 * - Secure default values and fallbacks
 * - Configuration schema validation
 * - Environment-specific logging levels
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-09-28
 */

// =============================================================================
// IMPORTS
// =============================================================================

const path = require("path");

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * @class EnvironmentConfig
 * @description Manages and validates environment configuration
 */
class EnvironmentConfig {
  constructor() {
    this.nodeEnv = process.env.NODE_ENV || "development";
    this.isDevelopment = this.nodeEnv === "development";
    this.isProduction = this.nodeEnv === "production";
    this.isTest = this.nodeEnv === "test";

    // Load and validate configuration
    this.config = this._loadConfiguration();
    this._validateConfiguration();
  }

  /**
   * @private
   * @method _loadConfiguration
   * @description Loads configuration from environment variables
   * @returns {Object} Configuration object
   */
  _loadConfiguration() {
    return {
      // Server Configuration
      server: {
        port: this._getNumber("PORT", 5000),
        host: this._getString("HOST", "localhost"),
        environment: this.nodeEnv,
      },

      // API Configuration
      sarvam: {
        apiKey: this._getString("SARVAM_API_KEY", ""),
        apiUrl: this._getString("SARVAM_API_URL", "https://api.sarvam.ai"),
        timeout: this._getNumber("SARVAM_TIMEOUT", 120000),
        maxRetries: this._getNumber("SARVAM_MAX_RETRIES", 3),
      },

      // Security Configuration
      security: {
        rateLimitWindow: this._getNumber("RATE_LIMIT_WINDOW", 15 * 60 * 1000), // 15 minutes
        rateLimitMax: this._getNumber("RATE_LIMIT_MAX", 100),
        corsOrigin: this._getString(
          "CORS_ORIGIN",
          this.isDevelopment ? "*" : ""
        ),
        maxRequestSize: this._getString("MAX_REQUEST_SIZE", "50mb"),
        sessionSecret: this._getString(
          "SESSION_SECRET",
          this._generateSecret()
        ),
      },

      // WebSocket Configuration
      websocket: {
        path: this._getString("WS_PATH", "/ws/stt"),
        heartbeatInterval: this._getNumber("WS_HEARTBEAT_INTERVAL", 30000),
        maxConnections: this._getNumber("WS_MAX_CONNECTIONS", 100),
        maxMessageSize: this._getNumber(
          "WS_MAX_MESSAGE_SIZE",
          50 * 1024 * 1024
        ),
      },

      // Logging Configuration
      logging: {
        level: this._getString(
          "LOG_LEVEL",
          this.isDevelopment ? "debug" : "info"
        ),
        file: this._getString("LOG_FILE", ""),
        maxFiles: this._getNumber("LOG_MAX_FILES", 5),
        maxSize: this._getString("LOG_MAX_SIZE", "10m"),
      },

      // Storage Configuration
      storage: {
        dataPath: this._getString("DATA_PATH", path.join(__dirname, "../data")),
        tempPath: this._getString("TEMP_PATH", "/tmp/granola-clone"),
        maxFileSize: this._getNumber("MAX_FILE_SIZE", 50 * 1024 * 1024),
      },

      // Performance Configuration
      performance: {
        memoryLimit: this._getNumber("MEMORY_LIMIT", 512 * 1024 * 1024), // 512MB
        cpuLimit: this._getNumber("CPU_LIMIT", 80), // 80%
        cleanupInterval: this._getNumber("CLEANUP_INTERVAL", 5 * 60 * 1000), // 5 minutes
      },
    };
  }

  /**
   * @private
   * @method _validateConfiguration
   * @description Validates the loaded configuration
   * @throws {Error} If configuration is invalid
   */
  _validateConfiguration() {
    const errors = [];

    // Critical validations
    if (this.isProduction && !this.config.sarvam.apiKey) {
      errors.push("SARVAM_API_KEY is required in production environment");
    }

    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push(`Invalid PORT: ${this.config.server.port} (must be 1-65535)`);
    }

    if (this.isProduction && this.config.security.corsOrigin === "*") {
      errors.push("CORS_ORIGIN wildcard (*) not allowed in production");
    }

    if (this.config.websocket.maxConnections < 1) {
      errors.push("WS_MAX_CONNECTIONS must be at least 1");
    }

    if (this.config.storage.maxFileSize < 1024) {
      errors.push("MAX_FILE_SIZE must be at least 1KB");
    }

    // Security validations
    if (this.isProduction && this.config.security.sessionSecret.length < 32) {
      errors.push(
        "SESSION_SECRET must be at least 32 characters in production"
      );
    }

    if (this.config.security.rateLimitMax < 1) {
      errors.push("RATE_LIMIT_MAX must be at least 1");
    }

    // API validations
    if (
      this.config.sarvam.apiKey &&
      this.config.sarvam.apiKey === "YOUR_API_KEY_HERE"
    ) {
      console.warn("⚠️  SARVAM_API_KEY appears to be a placeholder value");
    }

    if (this.config.sarvam.timeout < 10000) {
      errors.push("SARVAM_TIMEOUT must be at least 10 seconds");
    }

    if (errors.length > 0) {
      console.error("❌ Environment Configuration Errors:");
      errors.forEach((error) => console.error(`  - ${error}`));
      throw new Error(
        `Invalid environment configuration: ${errors.join(", ")}`
      );
    }

    // Log configuration status
    console.log(`✅ Environment configuration loaded successfully`);
    console.log(`🌍 Environment: ${this.nodeEnv}`);
    console.log(
      `🚀 Server will run on: ${this.config.server.host}:${this.config.server.port}`
    );
    console.log(
      `🔑 SarvamAI API: ${
        this.config.sarvam.apiKey ? "Configured" : "Not configured (mock mode)"
      }`
    );
    console.log(`📊 Log Level: ${this.config.logging.level}`);
  }

  /**
   * @private
   * @method _getString
   * @description Gets string environment variable with default
   * @param {string} key - Environment variable key
   * @param {string} defaultValue - Default value
   * @returns {string} Environment variable value or default
   */
  _getString(key, defaultValue) {
    const value = process.env[key];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * @private
   * @method _getNumber
   * @description Gets number environment variable with default
   * @param {string} key - Environment variable key
   * @param {number} defaultValue - Default value
   * @returns {number} Environment variable value or default
   */
  _getNumber(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      console.warn(
        `⚠️  Invalid number for ${key}: ${value}, using default: ${defaultValue}`
      );
      return defaultValue;
    }

    return numValue;
  }

  /**
   * @private
   * @method _getBoolean
   * @description Gets boolean environment variable with default
   * @param {string} key - Environment variable key
   * @param {boolean} defaultValue - Default value
   * @returns {boolean} Environment variable value or default
   */
  _getBoolean(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;

    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  /**
   * @private
   * @method _generateSecret
   * @description Generates a secure session secret if none provided
   * @returns {string} Generated secret
   */
  _generateSecret() {
    if (this.isProduction) {
      throw new Error("SESSION_SECRET must be explicitly set in production");
    }

    // Generate a random secret for development
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let secret = "";
    for (let i = 0; i < 64; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log("🔑 Generated session secret for development");
    return secret;
  }

  /**
   * @method get
   * @description Gets configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'server.port')
   * @returns {*} Configuration value
   */
  get(path) {
    return path.split(".").reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * @method getAll
   * @description Gets entire configuration object
   * @returns {Object} Complete configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * @method isDev
   * @description Checks if running in development mode
   * @returns {boolean} True if development
   */
  isDev() {
    return this.isDevelopment;
  }

  /**
   * @method isProd
   * @description Checks if running in production mode
   * @returns {boolean} True if production
   */
  isProd() {
    return this.isProduction;
  }

  /**
   * @method printSummary
   * @description Prints configuration summary (without sensitive data)
   */
  printSummary() {
    console.log("\n📋 Configuration Summary:");
    console.log(`   Environment: ${this.nodeEnv}`);
    console.log(
      `   Server: ${this.config.server.host}:${this.config.server.port}`
    );
    console.log(
      `   SarvamAI: ${
        this.config.sarvam.apiKey ? "✅ Configured" : "❌ Not configured"
      }`
    );
    console.log(
      `   CORS Origin: ${this.config.security.corsOrigin || "Not set"}`
    );
    console.log(
      `   Rate Limit: ${this.config.security.rateLimitMax} requests per ${
        this.config.security.rateLimitWindow / 60000
      } minutes`
    );
    console.log(`   Log Level: ${this.config.logging.level}`);
    console.log(
      `   Max File Size: ${(
        this.config.storage.maxFileSize /
        1024 /
        1024
      ).toFixed(1)}MB`
    );
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Create singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;
