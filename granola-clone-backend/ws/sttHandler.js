/**
 * @fileoverview Speech-to-Text WebSocket Handler
 * @description Handles WebSocket connections for real-time Hindi speech-to-text
 * transcription using SarvamAI API. Optimized for WAV files from Web Audio API.
 *
 * Features:
 * - Direct WAV file processing (no conversion needed)
 * - SarvamAI API integration with comprehensive error handling
 * - Mock mode for development/testing
 * - React StrictMode compatibility
 * - Rate limiting and queue management
 * - Automatic cleanup and resource management
 *
 * @author AI Assistant
 * @version 2.0.0
 * @since 2025-09-27
 */

// =============================================================================
// IMPORTS
// =============================================================================

const WebSocket = require("ws");
const https = require("https");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { WAVValidator } = require("../utils/wavValidator");

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIG = {
  SARVAM_API: {
    HOSTNAME: "api.sarvam.ai",
    PORT: 443,
    PATH: "/speech-to-text",
    MODEL: "saarika:v2.5",
    LANGUAGE: "hi-IN",
    TIMEOUT: 120000, // 2 minutes
  },
  PROCESSING: {
    MIN_FILE_SIZE: 1000, // 1KB minimum
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB maximum
    MIN_INTERVAL: 1000, // 1 second between requests
    QUEUE_SIZE: 1, // Keep only latest request
    MAX_ERRORS: 5, // Max consecutive errors before cooldown
    COOLDOWN_TIME: 30000, // 30 second cooldown
  },
  MOCK_TRANSCRIPTS: [
    "नमस्ते, आज का मीटिंग शुरू हो रहा है।",
    "आज हमें प्रोजेक्ट के बारे में बात करनी है।",
    "क्या सभी तैयार हैं?",
    "धन्यवाद, मीटिंग समाप्त।",
  ],
};

// =============================================================================
// MAIN WEBSOCKET HANDLER
// =============================================================================

/**
 * @function sttHandler
 * @description Initializes WebSocket server for speech-to-text processing
 * @param {http.Server} server - HTTP server instance
 */
module.exports = (server) => {
  const API_KEY = process.env.SARVAM_API_KEY;

  // Initialize WebSocket server
  const wss = new WebSocket.Server({
    server,
    path: "/ws/stt",
    perMessageDeflate: false, // Disable compression for better performance
  });

  console.log("🎤 Speech-to-Text WebSocket server initialized"); // ==========================================================================
  // CONNECTION HANDLER
  // ==========================================================================

  wss.on("connection", async (client, request) => {
    const clientId = Math.random().toString(36).substring(2, 9);
    const clientIP = request.socket.remoteAddress;

    console.log(`✅ STT client connected [ID: ${clientId}] [IP: ${clientIP}]`); // Client state management
    let isProcessing = false;
    let processingQueue = [];
    let lastProcessTime = 0;
    let consecutiveErrors = 0;

    // Initialize WAV validator for this client
    const wavValidator = new WAVValidator({
      validationLevel: "standard",
      autoFix: true,
      tempDir: `/tmp/wav-processing-${clientId}`,
    });

    // ==========================================================================
    // API KEY VALIDATION & MOCK MODE
    // ==========================================================================

    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE" || API_KEY.trim() === "") {
      console.log(
        `⚠️  [${clientId}] SARVAM_API_KEY not set - enabling MOCK mode`
      );

      let mockIndex = 0;

      client.on("message", (message) => {
        console.log(
          `📨 [${clientId}] Received audio in mock mode (${message.length} bytes)`
        );

        // Simulate processing delay
        setTimeout(() => {
          if (client.readyState === WebSocket.OPEN) {
            const transcript =
              CONFIG.MOCK_TRANSCRIPTS[
                mockIndex % CONFIG.MOCK_TRANSCRIPTS.length
              ];
            client.send(JSON.stringify({ transcript }));
            mockIndex++;
            console.log(`📝 [${clientId}] Sent mock transcript: ${transcript}`);
          }
        }, 1500);
      });

      // Simple close handler for mock mode
      client.on("close", (code, reason) => {
        console.log(
          `🔌 [${clientId}] Mock client disconnected [Code: ${code}]`
        );
      });

      return;
    }

    // ==========================================================================
    // TRANSCRIPTION FUNCTIONS
    // ==========================================================================

    /**
     * @function transcribeWAVFile
     * @description Transcribes WAV audio file using SarvamAI API
     * @param {Buffer} audioBuffer - WAV file buffer
     * @returns {Promise<string>} Transcribed text
     */
    async function transcribeWAVFile(audioBuffer) {
      return new Promise((resolve, reject) => {
        const requestTimeout = setTimeout(() => {
          reject(
            new Error("API request timeout - server taking too long to respond")
          );
        }, CONFIG.SARVAM_API.TIMEOUT);

        try {
          // Validate input
          if (
            !audioBuffer ||
            audioBuffer.length < CONFIG.PROCESSING.MIN_FILE_SIZE
          ) {
            clearTimeout(requestTimeout);
            reject(new Error("Audio buffer too small or empty"));
            return;
          }

          if (audioBuffer.length > CONFIG.PROCESSING.MAX_FILE_SIZE) {
            clearTimeout(requestTimeout);
            reject(new Error("Audio file too large (max 50MB)"));
            return;
          }

          console.log(
            `📤 [${clientId}] Uploading WAV file: ${(
              audioBuffer.length / 1024
            ).toFixed(1)}KB`
          );

          // Create form data
          const form = new FormData();
          form.append("file", audioBuffer, {
            filename: "audio.wav",
            contentType: "audio/wav",
          });
          form.append("model", CONFIG.SARVAM_API.MODEL);
          form.append("language_code", CONFIG.SARVAM_API.LANGUAGE);

          // API request options
          const options = {
            hostname: CONFIG.SARVAM_API.HOSTNAME,
            port: CONFIG.SARVAM_API.PORT,
            path: CONFIG.SARVAM_API.PATH,
            method: "POST",
            timeout: CONFIG.SARVAM_API.TIMEOUT,
            headers: {
              "api-subscription-key": API_KEY,
              "User-Agent": "Granola-Clone-STT/2.0",
              ...form.getHeaders(),
            },
          };

          const request = https.request(options, (response) => {
            let responseData = "";
            let dataSize = 0;
            const maxResponseSize = 10 * 1024 * 1024; // 10MB max response

            response.on("data", (chunk) => {
              dataSize += chunk.length;
              if (dataSize > maxResponseSize) {
                clearTimeout(requestTimeout);
                request.destroy();
                reject(new Error("Response too large - possible API error"));
                return;
              }
              responseData += chunk;
            });

            response.on("end", () => {
              clearTimeout(requestTimeout);

              try {
                if (response.statusCode === 200) {
                  const result = JSON.parse(responseData);

                  if (result && typeof result.transcript === "string") {
                    const transcript = result.transcript.trim();
                    console.log(
                      `✅ [${clientId}] Transcription successful: ${transcript.length} chars, ` +
                        `\"${transcript.substring(0, 50)}${
                          transcript.length > 50 ? "..." : ""
                        }\"`
                    );
                    resolve(transcript);
                  } else {
                    console.log(
                      `⚠️  [${clientId}] Empty or invalid transcript response`
                    );
                    resolve(""); // Empty transcript is acceptable
                  }
                } else {
                  // Handle specific HTTP error codes
                  const errorMessages = {
                    400: "Invalid audio format or corrupted file",
                    401: "Invalid API key - check SARVAM_API_KEY",
                    403: "API access forbidden - check subscription status",
                    413: "Audio file too large for API",
                    429: "Rate limit exceeded - please try again in a moment",
                    500: "SarvamAI server error - please try again later",
                    503: "SarvamAI service temporarily unavailable",
                  };

                  const errorMessage =
                    errorMessages[response.statusCode] ||
                    `API error ${response.statusCode}: ${responseData.substring(
                      0,
                      200
                    )}`;

                  console.error(
                    `❌ [${clientId}] API Error ${response.statusCode}:`,
                    responseData.substring(0, 200)
                  );
                  reject(new Error(errorMessage));
                }
              } catch (parseError) {
                reject(
                  new Error(`Response parsing failed: ${parseError.message}`)
                );
              }
            });

            response.on("timeout", () => {
              clearTimeout(requestTimeout);
              request.destroy();
              reject(new Error("Response timeout"));
            });
          });

          // Handle request errors
          request.on("error", (error) => {
            clearTimeout(requestTimeout);

            const errorMessages = {
              ECONNRESET: "Connection reset - API server issue",
              ENOTFOUND:
                "Cannot reach SarvamAI API - check internet connection",
              ETIMEDOUT: "Connection timeout - check network connectivity",
              ECONNREFUSED: "Connection refused - API server may be down",
              CERT_HAS_EXPIRED: "SSL certificate error - API issue",
            };

            const errorMessage =
              errorMessages[error.code] || `Network error: ${error.message}`;
            reject(new Error(errorMessage));
          });

          request.on("timeout", () => {
            clearTimeout(requestTimeout);
            request.destroy();
            reject(new Error("Socket timeout"));
          });

          request.setTimeout(CONFIG.SARVAM_API.TIMEOUT);

          // Handle form streaming errors
          form.on("error", (error) => {
            clearTimeout(requestTimeout);
            reject(new Error(`Form data error: ${error.message}`));
          });

          // Send the form data
          form.pipe(request);
        } catch (error) {
          clearTimeout(requestTimeout);
          reject(new Error(`Request preparation failed: ${error.message}`));
        }
      });
    }

    // ==========================================================================
    // MESSAGE HANDLER
    // ==========================================================================

    client.on("message", async (message) => {
      try {
        const currentTime = Date.now();

        // Basic validation
        if (!message || message.length === 0) {
          console.log(`⚠️  [${clientId}] Received empty message`);
          return;
        }

        console.log(
          `📨 [${clientId}] Received message: ${message.length} bytes`
        );

        // Rate limiting
        if (currentTime - lastProcessTime < CONFIG.PROCESSING.MIN_INTERVAL) {
          console.log(`⏭️  [${clientId}] Rate limited - skipping request`);
          return;
        }

        // Memory protection
        if (message.length > CONFIG.PROCESSING.MAX_FILE_SIZE) {
          console.log(
            `❌ [${clientId}] File too large: ${message.length} bytes`
          );
          client.send(
            JSON.stringify({
              error: "Audio file too large (max 50MB)",
            })
          );
          return;
        }

        // Skip if too small
        if (message.length < CONFIG.PROCESSING.MIN_FILE_SIZE) {
          console.log(
            `⏭️  [${clientId}] File too small: ${message.length} bytes`
          );
          return;
        }

        // Queue management
        if (isProcessing) {
          console.log(`⏭️  [${clientId}] Already processing - queuing request`);
          processingQueue = [message]; // Keep only latest
          return;
        }

        // Consecutive error protection
        if (consecutiveErrors >= CONFIG.PROCESSING.MAX_ERRORS) {
          console.log(
            `❌ [${clientId}] Too many consecutive errors - cooling down`
          );
          client.send(
            JSON.stringify({
              error: "Service temporarily unavailable due to errors",
            })
          );

          // Reset after cooldown
          setTimeout(() => {
            consecutiveErrors = 0;
            console.log(`🔄 [${clientId}] Error cooldown completed`);
          }, CONFIG.PROCESSING.COOLDOWN_TIME);
          return;
        }

        // Start processing
        isProcessing = true;
        lastProcessTime = currentTime;

        try {
          console.log(`🔄 [${clientId}] Starting transcription process`);

          // Parse message - handle Node.js ws library Buffer behavior
          let audioBuffer;
          let mimeType = "audio/wav";

          // Convert Buffer to string if needed (Node.js ws library wraps text in Buffer)
          const messageStr = Buffer.isBuffer(message)
            ? message.toString("utf8")
            : message;

          try {
            // Try to parse as JSON (expected format from frontend)
            const audioData = JSON.parse(messageStr);
            if (audioData.audio && audioData.mimeType) {
              audioBuffer = Buffer.from(audioData.audio, "base64");
              mimeType = audioData.mimeType;
              console.log(
                `📦 [${clientId}] Parsed JSON audio data: ${mimeType}, ${audioBuffer.length} bytes`
              );
            } else {
              throw new Error(
                "Invalid JSON format - missing audio or mimeType"
              );
            }
          } catch (jsonError) {
            // Fallback: treat as direct base64 string
            try {
              audioBuffer = Buffer.from(messageStr, "base64");
              console.log(
                `📦 [${clientId}] Parsed as direct base64: ${audioBuffer.length} bytes`
              );
            } catch (base64Error) {
              throw new Error(
                `Message parsing failed: ${jsonError.message} (JSON), ${base64Error.message} (base64)`
              );
            }
          }

          // Validate and process WAV format
          console.log(`🔍 [${clientId}] Validating WAV format...`);
          const validationResult = await wavValidator.validateAndProcess(
            audioBuffer,
            clientId
          );

          if (validationResult.wasProcessed) {
            console.log(
              `🔧 [${clientId}] WAV format corrected for SarvamAI compatibility`
            );
          }

          // Process the audio
          const processingTimeout = setTimeout(() => {
            console.log(`⏰ [${clientId}] Processing timeout reached`);
            isProcessing = false;
          }, 180000); // 3 minute timeout

          const transcript = await transcribeWAVFile(
            validationResult.processedBuffer
          );
          clearTimeout(processingTimeout);

          if (transcript && transcript.trim()) {
            console.log(
              `📝 [${clientId}] Sending transcript: ${transcript.length} chars`
            );

            client.send(
              JSON.stringify({
                transcript: transcript.trim(),
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - currentTime,
              })
            );

            consecutiveErrors = 0; // Reset error count on success
          } else {
            console.log(`⚠️  [${clientId}] Empty transcript received`);
            client.send(
              JSON.stringify({
                transcript: "",
                message: "No speech detected in audio",
              })
            );
          }
        } catch (error) {
          console.error(`❌ [${clientId}] Transcription error:`, error.message);
          consecutiveErrors++;

          // Send user-friendly error message
          let userMessage = "Transcription failed";

          if (error.message.includes("timeout")) {
            userMessage = "Processing took too long, please try again";
          } else if (
            error.message.includes("network") ||
            error.message.includes("connection")
          ) {
            userMessage = "Network error, please check your connection";
          } else if (error.message.includes("API key")) {
            userMessage = "Service authentication error";
          } else if (error.message.includes("rate limit")) {
            userMessage = "Service busy, please try again in a moment";
          } else if (
            error.message.includes("audio format") ||
            error.message.includes("corrupted")
          ) {
            userMessage = "Audio format not supported, please try again";
          } else if (error.message.includes("too large")) {
            userMessage = "Audio file too large";
          }

          client.send(
            JSON.stringify({
              error: userMessage,
              technical: error.message.substring(0, 200),
            })
          );
        }

        isProcessing = false;

        // Process queued messages
        if (processingQueue.length > 0) {
          const queuedMessage = processingQueue.pop();
          processingQueue = [];

          setTimeout(() => {
            if (client.readyState === WebSocket.OPEN) {
              client.emit("message", queuedMessage);
            }
          }, 500);
        }
      } catch (error) {
        console.error(
          `❌ [${clientId}] Critical error in message handler:`,
          error
        );
        isProcessing = false;
        consecutiveErrors++;

        client.send(
          JSON.stringify({
            error: "Internal server error",
          })
        );
      }
    });

    // ==========================================================================
    // CONNECTION LIFECYCLE
    // ==========================================================================

    client.on("close", (code, reason) => {
      // Handle React StrictMode disconnections gracefully
      if (
        code === 1001 &&
        (!reason || reason.toString() === "Component unmounting")
      ) {
        console.log(
          `🔄 [${clientId}] Client disconnected (React StrictMode lifecycle)`
        );
      } else {
        console.log(
          `🔌 [${clientId}] Client disconnected [Code: ${code}] [Reason: ${
            reason || "No reason"
          }]`
        );
      }

      // Cleanup
      isProcessing = false;
      processingQueue = [];
    });

    client.on("error", (error) => {
      console.error(`❌ [${clientId}] WebSocket error:`, error.message);
      isProcessing = false;
      processingQueue = [];
    });

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    client.on("close", () => {
      clearInterval(pingInterval);
    });
  });

  // ==========================================================================
  // SERVER ERROR HANDLING
  // ==========================================================================

  wss.on("error", (error) => {
    console.error("❌ WebSocket Server error:", error.message);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🔄 Received SIGTERM - closing WebSocket server gracefully");

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, "Server shutdown");
      }
    });

    wss.close(() => {
      console.log("✅ WebSocket server closed");
    });
  });

  // Memory monitoring for development
  if (process.env.NODE_ENV === "development") {
    setInterval(() => {
      const usage = process.memoryUsage();
      const mbUsage = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };

      if (mbUsage.heapUsed > 500) {
        // 500MB threshold
        console.log("🔍 High memory usage detected:", mbUsage);
      }
    }, 60000); // Check every minute
  }

  console.log("🎤 Speech-to-Text WebSocket handler ready");
};
