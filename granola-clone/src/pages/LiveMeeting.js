/**
 * @fileoverview LiveMeeting Component - Hindi Speech-to-Text Recording Interface
 * @description A professional React component for recording Hindi speech and converting
 * it to text using Web Audio API and SarvamAI transcription service.
 *
 * Features:
 * - High-quality Web Audio API recording (no MediaRecorder dependency)
 * - Real-time recording status and feedback
 * - WebSocket communication with backend
 * - Automatic transcript saving and navigation
 * - Comprehensive error handling and recovery
 * - React StrictModeI Assistant
 * @version 2.0.0
 * @since 2025-09-27
 */

// =============================================================================
// IMPORTS
// =============================================================================

import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { encode } from "base64-arraybuffer";

// Custom hooks and context
import { TranscriptContext } from "../context/TranscriptContext";

// Audio utilities
import { WebAudioRecorder } from "../utils/wavEncoder";

// =============================================================================
// CONSTANTS
// =============================================================================

const WEBSOCKET_CONFIG = {
  URL: "ws://localhost:5000/ws/stt",
  TIMEOUT: 10000,
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY_BASE: 2000,
};

const AUDIO_CONSTRAINTS = [
  {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
  },
  {
    echoCancellation: false,
    noiseSuppression: false,
  },
  true, // Last resort
];

const ERROR_MESSAGES = {
  NOT_ALLOWED:
    "Microphone access denied. Please allow microphone access and try again.",
  NOT_FOUND: "No microphone found. Please connect a microphone and try again.",
  NOT_SUPPORTED: "Audio recording not supported by your browser.",
  NOT_READABLE: "Microphone is being used by another application.",
  NETWORK_TIMEOUT: "Connection timeout. Please check your internet connection.",
  WEBSOCKET_ERROR:
    "Cannot connect to server. Please make sure the backend is running.",
  RECORDING_TOO_SHORT:
    "Recording too short - please record for at least 1 second",
  RECORDING_TOO_LARGE:
    "Recording too large (max 50MB) - please record shorter audio",
  CONNECTION_LOST: "Connection lost - please try recording again",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @component LiveMeeting
 * @description Main component for live Hindi speech recording and transcription
 * @returns {JSX.Element} The LiveMeeting component
 */
function LiveMeeting() {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Ready to start recording");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for persistent objects
  const wsRef = useRef(null);
  const webAudioRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const componentMountedRef = useRef(true);
  const isStrictModeRef = useRef(false);

  // Hooks
  const { addTranscript } = useContext(TranscriptContext);
  const navigate = useNavigate();

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * @effect StrictMode Detection
   * @description Detects React StrictMode for proper WebSocket handling
   */
  useEffect(() => {
    const wasRun = isStrictModeRef.current;
    isStrictModeRef.current = true;

    if (wasRun) {
      console.log(
        "🔍 React StrictMode detected - WebSocket reconnections are expected"
      );
    }

    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  /**
   * @effect Browser Compatibility Check
   * @description Validates browser support for required APIs
   */
  useEffect(() => {
    validateBrowserSupport();
  }, []);

  /**
   * @effect Cleanup on Unmount
   * @description Ensures proper cleanup when component unmounts
   */
  useEffect(() => {
    return () => {
      console.log("🧹 LiveMeeting component cleanup initiated");
      cleanupAllResources();
    };
  }, []);

  // ==========================================================================
  // BROWSER COMPATIBILITY & VALIDATION
  // ==========================================================================

  /**
   * @function validateBrowserSupport
   * @description Comprehensive browser compatibility validation
   * @returns {boolean} Whether browser is fully supported
   */
  const validateBrowserSupport = useCallback(() => {
    const issues = [];

    // Check core APIs
    if (!navigator.mediaDevices) issues.push("MediaDevices API not supported");
    if (!navigator.mediaDevices?.getUserMedia)
      issues.push("getUserMedia not supported");
    if (!window.WebSocket) issues.push("WebSocket not supported");
    if (!WebAudioRecorder.isSupported())
      issues.push("Web Audio API not supported");
    if (!window.Blob) issues.push("Blob constructor not supported");
    if (!window.ArrayBuffer) issues.push("ArrayBuffer not supported");

    // Check HTTPS requirement
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      issues.push("HTTPS required for microphone access");
    }

    if (issues.length > 0) {
      setError(`Browser compatibility issues: ${issues.join(", ")}`);
      setStatus("Browser not supported");
      return false;
    }

    console.log("✅ Browser compatibility check passed");
    setStatus("Browser compatibility: OK - Ready to record");
    return true;
  }, []);

  // ==========================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * @function connectWebSocket
   * @description Establishes WebSocket connection with retry logic
   * @returns {Promise<WebSocket>} Connected WebSocket instance
   */
  const connectWebSocket = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Prevent multiple connections
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("⚠️ WebSocket already connected, reusing connection");
        resolve(wsRef.current);
        return;
      }

      // Close existing connection
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Creating new connection");
        } catch (error) {
          console.warn("Error closing existing WebSocket:", error);
        }
        wsRef.current = null;
      }

      setIsConnecting(true);
      setStatus("Connecting to server...");

      const ws = new WebSocket(WEBSOCKET_CONFIG.URL);
      let connectionTimeout;
      let isResolved = false;

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        if (!isResolved) {
          ws.close();
          reject(new Error("Connection timeout"));
        }
      }, WEBSOCKET_CONFIG.TIMEOUT);

      // Connection opened
      ws.onopen = () => {
        if (!isResolved) {
          clearTimeout(connectionTimeout);
          console.log("✅ WebSocket connected to backend");
          setStatus("Connected to server");
          setIsConnecting(false);
          reconnectAttempts.current = 0;
          isResolved = true;
          resolve(ws);
        }
      };

      // Connection error
      ws.onerror = (error) => {
        if (!isResolved) {
          clearTimeout(connectionTimeout);
          console.error("❌ WebSocket connection error:", error);
          setIsConnecting(false);
          isResolved = true;
          reject(new Error("WebSocket connection failed"));
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        handleWebSocketClose(event);
      };

      // Message received
      ws.onmessage = (event) => {
        handleWebSocketMessage(event);
      };
    });
  }, []);

  /**
   * @function handleWebSocketClose
   * @description Handles WebSocket connection closure with reconnection logic
   * @param {CloseEvent} event - WebSocket close event
   */
  const handleWebSocketClose = useCallback(
    (event) => {
      // Don't treat React StrictMode disconnections as errors
      if (
        event.code === 1001 &&
        (!event.reason || event.reason === "Component unmounting")
      ) {
        console.log(
          "🔌 WebSocket closed due to React StrictMode component lifecycle"
        );
        return;
      }

      console.log(
        `🔌 WebSocket closed - Code: ${event.code}, Reason: ${
          event.reason || "No reason"
        }`
      );

      // Attempt reconnection if recording and not intentional close
      if (
        isRecording &&
        event.code !== 1000 &&
        reconnectAttempts.current < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectAttempts.current++;
        setStatus(
          `Connection lost. Retry ${reconnectAttempts.current}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS}...`
        );

        setTimeout(() => {
          if (isRecording && componentMountedRef.current) {
            startRecording();
          }
        }, WEBSOCKET_CONFIG.RECONNECT_DELAY_BASE * reconnectAttempts.current);
      } else if (event.code !== 1000) {
        setStatus("Disconnected from server");
      }
    },
    [isRecording]
  );

  /**
   * @function handleWebSocketMessage
   * @description Processes messages received from WebSocket
   * @param {MessageEvent} event - WebSocket message event
   */
  const handleWebSocketMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Received from backend:", data);

        if (data.error) {
          console.error("❌ Backend error:", data.error);
          setError(data.error);
          setStatus(`Error: ${data.error}`);
          return;
        }

        if (data.transcript) {
          const completeTranscript = data.transcript.trim();
          console.log(
            `📝 Received transcript: ${completeTranscript.length} characters`
          );

          setTranscript(completeTranscript);
          setStatus("✅ Transcription completed!");

          // Save transcript to context
          if (completeTranscript) {
            addTranscript({
              title: `Hindi Meeting - ${new Date().toLocaleDateString()}`,
              date: new Date().toISOString().split("T")[0],
              content: completeTranscript,
              duration: "Unknown",
            });
            console.log("💾 Transcript saved to history");
          }

          // Cleanup and navigate
          cleanupAfterRecording();
          setTimeout(() => navigate("/"), 2000);
        }

        if (data.message) {
          setStatus(data.message);
        }
      } catch (parseError) {
        console.error("❌ Failed to parse WebSocket message:", parseError);
        setError("Invalid response from server");
      }
    },
    [addTranscript, navigate]
  );

  // ==========================================================================
  // AUDIO RECORDING MANAGEMENT
  // ==========================================================================

  /**
   * @function requestMicrophoneAccess
   * @description Requests microphone access with fallback constraints
   * @returns {Promise<MediaStream>} Audio stream
   */
  const requestMicrophoneAccess = useCallback(async () => {
    let stream = null;
    let constraintIndex = 0;

    while (!stream && constraintIndex < AUDIO_CONSTRAINTS.length) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS[constraintIndex],
        });
        console.log(
          `✅ Microphone access granted with constraint set ${constraintIndex}`
        );
        break;
      } catch (error) {
        console.warn(`Audio constraint ${constraintIndex} failed:`, error);
        constraintIndex++;
      }
    }

    if (!stream) {
      throw new Error("Could not access microphone with any constraints");
    }

    return stream;
  }, []);

  /**
   * @function startRecording
   * @description Initiates audio recording process
   */
  const startRecording = useCallback(async () => {
    try {
      setError("");

      // Validate browser support
      if (!validateBrowserSupport()) {
        return;
      }

      // Connect to WebSocket
      wsRef.current = await connectWebSocket();

      setStatus("Requesting microphone access...");

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      streamRef.current = stream;
      setStatus("Microphone access granted");

      // Initialize Web Audio API recorder
      console.log("🎵 Initializing Web Audio API recorder");
      webAudioRecorderRef.current = new WebAudioRecorder({
        sampleRate: 16000,
        numChannels: 1,
        bufferSize: 4096,
        onDataAvailable: (data) => {
          if (data.duration > 0) {
            setStatus(`🎤 Recording: ${data.duration.toFixed(1)}s`);
          }
        },
      });

      // Initialize recorder with stream
      await webAudioRecorderRef.current.initialize(stream);
      console.log("✅ Web Audio API recorder ready");

      // Start recording
      webAudioRecorderRef.current.start();
      setIsRecording(true);
      setStatus("🎤 Recording... Click Stop when finished");

      console.log("🎤 Recording started successfully");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);

      let errorMessage = ERROR_MESSAGES.WEBSOCKET_ERROR;

      if (error.name === "NotAllowedError")
        errorMessage = ERROR_MESSAGES.NOT_ALLOWED;
      else if (error.name === "NotFoundError")
        errorMessage = ERROR_MESSAGES.NOT_FOUND;
      else if (error.name === "NotSupportedError")
        errorMessage = ERROR_MESSAGES.NOT_SUPPORTED;
      else if (error.name === "NotReadableError")
        errorMessage = ERROR_MESSAGES.NOT_READABLE;
      else if (error.message.includes("timeout"))
        errorMessage = ERROR_MESSAGES.NETWORK_TIMEOUT;

      setError(errorMessage);
      setStatus("Failed to start recording");
      setIsRecording(false);
      setIsConnecting(false);
    }
  }, [validateBrowserSupport, connectWebSocket, requestMicrophoneAccess]);

  /**
   * @function stopRecording
   * @description Stops recording and processes audio for transcription
   */
  const stopRecording = useCallback(async () => {
    console.log("🛑 Stop recording requested");
    setIsRecording(false);
    setStatus("Processing recorded audio...");

    if (!webAudioRecorderRef.current) {
      setError("No active recording found");
      return;
    }

    try {
      // Generate WAV file from recording
      console.log("📁 Generating WAV file from recording");
      const wavBlob = webAudioRecorderRef.current.stop();

      console.log(
        `🎵 Generated WAV file: ${wavBlob.size} bytes, type: ${wavBlob.type}`
      );

      // Validate audio size
      if (wavBlob.size < 1000) {
        setError(ERROR_MESSAGES.RECORDING_TOO_SHORT);
        cleanupAfterRecording();
        return;
      }

      if (wavBlob.size > 50 * 1024 * 1024) {
        setError(ERROR_MESSAGES.RECORDING_TOO_LARGE);
        cleanupAfterRecording();
        return;
      }

      // Send for transcription
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        setStatus("Sending audio for transcription...");

        const buffer = await wavBlob.arrayBuffer();
        const base64 = encode(buffer);

        const audioData = {
          audio: base64,
          mimeType: "audio/wav",
        };
        console.log(`📤 Sending WAV audio data: ${base64.length} characters`);
        wsRef.current.send(JSON.stringify(audioData));

        setStatus("Processing transcription...");
        console.log("📤 Audio sent for transcription");
      } else {
        setError(ERROR_MESSAGES.CONNECTION_LOST);
        cleanupAfterRecording();
      }
    } catch (error) {
      console.error("❌ Error processing recording:", error);
      setError(`Audio processing error: ${error.message}`);
      cleanupAfterRecording();
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // ==========================================================================
  // CLEANUP FUNCTIONS
  // ==========================================================================

  /**
   * @function cleanupAfterRecording
   * @description Cleans up resources after recording completion
   */
  const cleanupAfterRecording = useCallback(() => {
    console.log("🧹 Cleaning up after recording completion");

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, "Recording completed");
      } catch (error) {
        console.warn("Error closing WebSocket:", error);
      }
      wsRef.current = null;
    }

    // Clean up Web Audio recorder
    if (webAudioRecorderRef.current) {
      try {
        webAudioRecorderRef.current.cleanup();
      } catch (error) {
        console.warn("Error cleaning up recorder:", error);
      }
      webAudioRecorderRef.current = null;
    }
  }, []);

  /**
   * @function cleanupAllResources
   * @description Comprehensive cleanup of all component resources
   */
  const cleanupAllResources = useCallback(async () => {
    console.log("🧹 Comprehensive resource cleanup initiated");

    // Stop recording if active
    if (isRecording) {
      setIsRecording(false);
    }

    // Clean up Web Audio recorder
    if (webAudioRecorderRef.current) {
      try {
        await webAudioRecorderRef.current.cleanup();
      } catch (error) {
        console.warn("Recorder cleanup warning:", error);
      }
      webAudioRecorderRef.current = null;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.close(1000, "Component unmounting");
      } catch (error) {
        console.warn("WebSocket cleanup warning:", error);
      }
      wsRef.current = null;
    }

    console.log("✅ Resource cleanup completed");
  }, [isRecording]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * @function handleRecordingToggle
   * @description Handles record/stop button click
   */
  const handleRecordingToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  /**
   * @function handleClearTranscript
   * @description Clears the current transcript
   */
  const handleClearTranscript = useCallback(() => {
    setTranscript("");
    setError("");
    setStatus("Ready to start recording");
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="container">
      <h2>Live Meeting (Hindi Speech-to-Text)</h2>

      {/* Status Display */}
      <div
        style={{
          margin: "10px 0",
          padding: "15px",
          backgroundColor: error
            ? "#ffebee"
            : status.includes("Recording")
            ? "#e8f5e8"
            : "#f5f5f5",
          border: `2px solid ${
            error
              ? "#f44336"
              : status.includes("Recording")
              ? "#4caf50"
              : "#ddd"
          }`,
          borderRadius: "8px",
          fontSize: "14px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
          Status: {status}
        </div>
        {error && (
          <div style={{ color: "#f44336", marginTop: "10px" }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Transcript Display */}
      <div
        style={{
          margin: "20px 0",
          padding: "20px",
          minHeight: "200px",
          backgroundColor: "#fafafa",
          border: "2px solid #ddd",
          borderRadius: "8px",
          fontSize: "16px",
          lineHeight: "1.6",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{ fontWeight: "bold", marginBottom: "15px", color: "#333" }}
        >
          Transcript:
        </div>
        <div style={{ color: transcript ? "#000" : "#666" }}>
          {transcript ||
            (isRecording
              ? "🎤 Recording in progress... Transcript will appear when you stop recording."
              : "Click Start Recording to begin capturing your Hindi speech")}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button
          onClick={handleRecordingToggle}
          disabled={isConnecting}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: isRecording ? "#f44336" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "25px",
            cursor: isConnecting ? "not-allowed" : "pointer",
            opacity: isConnecting ? 0.6 : 1,
            marginRight: "10px",
            transition: "all 0.3s ease",
          }}
        >
          {isConnecting
            ? "🔄 Connecting..."
            : isRecording
            ? "⏹ Stop Recording"
            : "🎤 Start Recording"}
        </button>

        {transcript && (
          <button
            onClick={handleClearTranscript}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              backgroundColor: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            Clear Transcript
          </button>
        )}
      </div>

      {/* Help Information */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          fontSize: "14px",
          color: "#666",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          lineHeight: "1.5",
        }}
      >
        <div
          style={{ fontWeight: "bold", marginBottom: "10px", color: "#333" }}
        >
          💡 Recording Tips:
        </div>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li>Speak clearly in Hindi for best transcription results</li>
          <li>Record complete conversations - no time limits</li>
          <li>Ensure your microphone is working and not used by other apps</li>
          <li>Transcript will appear after you stop recording</li>
          <li>Your recordings are automatically saved to history</li>
          {error && (
            <li style={{ color: "#f44336", fontWeight: "bold" }}>
              If problems persist, try refreshing the page or checking your
              internet connection
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default LiveMeeting;
