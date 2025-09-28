/**
 * @fileoverview Advanced WAV File Encoding and Web Audio Recording
 * @description This module provides high-quality WAV file generation from Web Audio API
 * using modern browser APIs for consistent cross-browser audio recording.
 *
 * Key Features:
 * - Pure Web Audio API implementation (no MediaRecorder dependency)
 * - Direct PCM to WAV conversion with proper headers
 * - Optimized for SarvamAI API (16kHz, 1 channel, 16-bit)
 * - Comprehensive error handling and browser compatibility
 *
 * @author AI Assistant
 * @version 2.0.0
 * @since 2025-09-27
 */

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000, // Optimal for speech recognition APIs
  CHANNELS: 1, // Mono recording for speech
  BIT_DEPTH: 16, // 16-bit PCM
  BUFFER_SIZE: 4096, // Balance between latency and performance
  WAV_HEADER_SIZE: 44, // Standard WAV header size in bytes
};

// =============================================================================
// WAV ENCODER CLASS
// =============================================================================

/**
 * @class WAVEncoder
 * @description Creates properly formatted WAV files from raw PCM audio data
 *
 * This class handles the complex process of:
 * 1. Converting Float32 PCM data to Int16 format
 * 2. Creating proper WAV file headers with correct metadata
 * 3. Assembling the complete WAV file as a Blob
 */
export class WAVEncoder {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {number} options.sampleRate - Audio sample rate (default: 16000Hz)
   * @param {number} options.numChannels - Number of audio channels (default: 1)
   * @param {number} options.bitDepth - Bit depth for audio samples (default: 16)
   */
  constructor(options = {}) {
    // Audio format configuration
    this.sampleRate = options.sampleRate || AUDIO_CONFIG.SAMPLE_RATE;
    this.numChannels = options.numChannels || AUDIO_CONFIG.CHANNELS;
    this.bitDepth = options.bitDepth || AUDIO_CONFIG.BIT_DEPTH;

    // Calculated properties for WAV format
    this.bytesPerSample = this.bitDepth / 8;
    this.blockAlign = this.numChannels * this.bytesPerSample;
    this.byteRate = this.sampleRate * this.blockAlign;

    // Validation
    this._validateConfiguration();
  }

  /**
   * @private
   * @method _validateConfiguration
   * @description Validates the encoder configuration parameters
   * @throws {Error} If configuration is invalid
   */
  _validateConfiguration() {
    if (this.sampleRate <= 0 || this.sampleRate > 192000) {
      throw new Error(
        `Invalid sample rate: ${this.sampleRate}. Must be between 1 and 192000 Hz`
      );
    }

    if (this.numChannels < 1 || this.numChannels > 2) {
      throw new Error(
        `Invalid channel count: ${this.numChannels}. Must be 1 (mono) or 2 (stereo)`
      );
    }

    if (![8, 16, 24, 32].includes(this.bitDepth)) {
      throw new Error(
        `Invalid bit depth: ${this.bitDepth}. Must be 8, 16, 24, or 32`
      );
    }
  }

  /**
   * @method encodeWAV
   * @description Creates a complete WAV file from raw PCM audio data
   * @param {Float32Array[]} audioBuffers - Array of Float32Arrays containing PCM data
   * @returns {Blob} Complete WAV file as a Blob ready for upload
   * @throws {Error} If no audio data provided or encoding fails
   */
  encodeWAV(audioBuffers) {
    // Input validation
    if (!Array.isArray(audioBuffers) || audioBuffers.length === 0) {
      throw new Error("No audio buffers provided for encoding");
    }

    // Calculate total length of audio data
    const totalSamples = audioBuffers.reduce((sum, buffer) => {
      if (!(buffer instanceof Float32Array)) {
        throw new Error("All audio buffers must be Float32Array instances");
      }
      return sum + buffer.length;
    }, 0);

    if (totalSamples === 0) {
      throw new Error("Audio buffers contain no data");
    }

    try {
      // Convert Float32 PCM data to Int16
      const int16Data = this._convertFloat32ToInt16(audioBuffers, totalSamples);

      // Calculate file sizes
      const dataSize = int16Data.length * this.bytesPerSample;
      const fileSize = AUDIO_CONFIG.WAV_HEADER_SIZE - 8 + dataSize;

      // Create WAV file buffer
      const buffer = new ArrayBuffer(AUDIO_CONFIG.WAV_HEADER_SIZE + dataSize);
      const view = new DataView(buffer);

      // Write WAV header and audio data
      this._writeWAVHeader(view, fileSize, dataSize);
      this._writeAudioData(view, int16Data);

      // Log encoding success
      const duration = totalSamples / this.sampleRate;
      console.log(
        `📁 WAV encoding successful: ${(buffer.byteLength / 1024).toFixed(
          1
        )}KB, ` +
          `${totalSamples.toLocaleString()} samples, ${duration.toFixed(
            2
          )}s duration`
      );

      return new Blob([buffer], { type: "audio/wav" });
    } catch (error) {
      console.error("❌ WAV encoding failed:", error);
      throw new Error(`WAV encoding failed: ${error.message}`);
    }
  }

  /**
   * @private
   * @method _writeWAVHeader
   * @description Writes the standard WAV file header with format information
   * @param {DataView} view - DataView for writing binary data
   * @param {number} fileSize - Total file size minus 8 bytes
   * @param {number} dataSize - Size of audio data in bytes
   */
  _writeWAVHeader(view, fileSize, dataSize) {
    let offset = 0;

    // RIFF chunk descriptor
    this._writeString(view, offset, "RIFF");
    offset += 4;
    view.setUint32(offset, fileSize, true);
    offset += 4;
    this._writeString(view, offset, "WAVE");
    offset += 4;

    // fmt sub-chunk
    this._writeString(view, offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4; // Sub-chunk size
    view.setUint16(offset, 1, true);
    offset += 2; // Audio format (1 = PCM)
    view.setUint16(offset, this.numChannels, true);
    offset += 2;
    view.setUint32(offset, this.sampleRate, true);
    offset += 4;
    view.setUint32(offset, this.byteRate, true);
    offset += 4;
    view.setUint16(offset, this.blockAlign, true);
    offset += 2;
    view.setUint16(offset, this.bitDepth, true);
    offset += 2;

    // data sub-chunk
    this._writeString(view, offset, "data");
    offset += 4;
    view.setUint32(offset, dataSize, true);
  }

  /**
   * @private
   * @method _writeAudioData
   * @description Writes the PCM audio data to the WAV file buffer
   * @param {DataView} view - DataView for writing binary data
   * @param {Int16Array} int16Data - Converted audio data
   */
  _writeAudioData(view, int16Data) {
    let offset = AUDIO_CONFIG.WAV_HEADER_SIZE;

    for (let i = 0; i < int16Data.length; i++) {
      view.setInt16(offset, int16Data[i], true);
      offset += 2;
    }
  }

  /**
   * @private
   * @method _convertFloat32ToInt16
   * @description Converts Float32Array audio data to Int16 PCM format
   * @param {Float32Array[]} audioBuffers - Input audio buffers
   * @param {number} totalLength - Total number of samples
   * @returns {Int16Array} Converted audio data
   */
  _convertFloat32ToInt16(audioBuffers, totalLength) {
    const int16Data = new Int16Array(totalLength);
    let offset = 0;

    for (const buffer of audioBuffers) {
      for (let i = 0; i < buffer.length; i++) {
        // Clamp sample to valid range and convert to int16
        const sample = Math.max(-1, Math.min(1, buffer[i]));
        int16Data[offset + i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      offset += buffer.length;
    }

    return int16Data;
  }

  /**
   * @private
   * @method _writeString
   * @description Writes ASCII string to DataView
   * @param {DataView} view - DataView for writing
   * @param {number} offset - Write offset
   * @param {string} string - String to write
   */
  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * @static
   * @method createWAV
   * @description Static convenience method for quick WAV creation
   * @param {Float32Array[]} audioBuffers - Audio data to encode
   * @param {number} sampleRate - Sample rate (optional, default: 16000)
   * @returns {Blob} WAV file blob
   */
  static createWAV(audioBuffers, sampleRate = AUDIO_CONFIG.SAMPLE_RATE) {
    const encoder = new WAVEncoder({ sampleRate });
    return encoder.encodeWAV(audioBuffers);
  }
}

// =============================================================================
// WEB AUDIO RECORDER CLASS
// =============================================================================

/**
 * @class WebAudioRecorder
 * @description Professional-grade audio recorder using Web Audio API
 *
 * This class provides:
 * - High-quality audio capture via AudioContext
 * - Real-time PCM data collection
 * - Automatic WAV file generation
 * - Comprehensive error handling and cleanup
 */
export class WebAudioRecorder {
  /**
   * @constructor
   * @param {Object} options - Recorder configuration
   * @param {number} options.sampleRate - Recording sample rate
   * @param {number} options.numChannels - Number of channels
   * @param {number} options.bufferSize - Audio buffer size
   * @param {Function} options.onDataAvailable - Callback for real-time data
   */
  constructor(options = {}) {
    // Configuration
    this.sampleRate = options.sampleRate || AUDIO_CONFIG.SAMPLE_RATE;
    this.numChannels = options.numChannels || AUDIO_CONFIG.CHANNELS;
    this.bufferSize = options.bufferSize || AUDIO_CONFIG.BUFFER_SIZE;

    // Callbacks
    this.onDataAvailable = options.onDataAvailable || null;

    // Web Audio API components
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.scriptProcessor = null;

    // Recording state
    this.audioBuffers = [];
    this.isRecording = false;
    this.isInitialized = false;

    // Validation
    this._validateOptions();
  }

  /**
   * @private
   * @method _validateOptions
   * @description Validates recorder configuration
   * @throws {Error} If configuration is invalid
   */
  _validateOptions() {
    if (!WebAudioRecorder.isSupported()) {
      throw new Error("Web Audio API is not supported in this browser");
    }

    // Validate buffer size (must be power of 2 between 256 and 16384)
    const validBufferSizes = [256, 512, 1024, 2048, 4096, 8192, 16384];
    if (!validBufferSizes.includes(this.bufferSize)) {
      throw new Error(
        `Invalid buffer size: ${
          this.bufferSize
        }. Must be one of: ${validBufferSizes.join(", ")}`
      );
    }
  }

  /**
   * @method initialize
   * @description Initializes the Web Audio API recording system
   * @param {MediaStream} stream - Audio stream from getUserMedia
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If initialization fails
   */
  async initialize(stream) {
    if (this.isInitialized) {
      console.warn("⚠️ WebAudioRecorder already initialized");
      return true;
    }

    try {
      // Create AudioContext with specified sample rate
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: this.sampleRate,
      });

      // Resume context if suspended (required by browser policies)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      console.log(
        `🎵 AudioContext initialized: ${this.audioContext.sampleRate}Hz, ` +
          `${this.numChannels} channel(s), ${this.bufferSize} buffer size`
      );

      // Create media stream source
      this.mediaStreamSource =
        this.audioContext.createMediaStreamSource(stream);

      // Create script processor for audio data capture
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.bufferSize,
        this.numChannels,
        this.numChannels
      );

      // Set up audio processing callback
      this.scriptProcessor.onaudioprocess = (event) => {
        this._handleAudioProcess(event);
      };

      // Connect audio nodes
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log("✅ Web Audio API recording pipeline ready");

      return true;
    } catch (error) {
      console.error("❌ Web Audio API initialization failed:", error);
      await this._cleanup();
      throw new Error(`Web Audio API initialization failed: ${error.message}`);
    }
  }

  /**
   * @private
   * @method _handleAudioProcess
   * @description Handles audio processing events from ScriptProcessorNode
   * @param {AudioProcessingEvent} event - Audio processing event
   */
  _handleAudioProcess(event) {
    if (!this.isRecording) return;

    try {
      const inputBuffer = event.inputBuffer;
      const channelData = inputBuffer.getChannelData(0); // Get first channel

      // Create a copy of the audio data (important for memory management)
      const audioData = new Float32Array(channelData.length);
      audioData.set(channelData);

      // Store the audio data
      this.audioBuffers.push(audioData);

      // Notify listeners about new data availability
      if (this.onDataAvailable) {
        this.onDataAvailable({
          audioData: audioData,
          totalBuffers: this.audioBuffers.length,
          duration: this.getDuration(),
        });
      }
    } catch (error) {
      console.error("❌ Audio processing error:", error);
    }
  }

  /**
   * @method start
   * @description Starts audio recording
   * @throws {Error} If not initialized or already recording
   */
  start() {
    if (!this.isInitialized) {
      throw new Error(
        "WebAudioRecorder not initialized. Call initialize() first."
      );
    }

    if (this.isRecording) {
      console.warn("⚠️ Recording already in progress");
      return;
    }

    // Clear any previous recording data
    this.audioBuffers = [];
    this.isRecording = true;

    console.log("🎤 Web Audio API recording started");
  }

  /**
   * @method stop
   * @description Stops recording and generates WAV file
   * @returns {Blob} Complete WAV file
   * @throws {Error} If not recording or no data recorded
   */
  stop() {
    if (!this.isRecording) {
      throw new Error("Not currently recording");
    }

    this.isRecording = false;

    if (this.audioBuffers.length === 0) {
      throw new Error("No audio data recorded");
    }

    try {
      // Create WAV file from recorded audio buffers
      const wavFile = WAVEncoder.createWAV(this.audioBuffers, this.sampleRate);

      const duration = this.getDuration();
      console.log(
        `🛑 Recording stopped. Generated WAV file: ${(
          wavFile.size / 1024
        ).toFixed(1)}KB, ` + `${duration.toFixed(2)}s duration`
      );

      return wavFile;
    } catch (error) {
      console.error("❌ Failed to generate WAV file:", error);
      throw new Error(`WAV generation failed: ${error.message}`);
    }
  }

  /**
   * @method getDuration
   * @description Calculates current recording duration in seconds
   * @returns {number} Duration in seconds
   */
  getDuration() {
    const totalSamples = this.audioBuffers.reduce(
      (sum, buffer) => sum + buffer.length,
      0
    );
    return totalSamples / this.sampleRate;
  }

  /**
   * @method cleanup
   * @description Cleans up all Web Audio API resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    return this._cleanup();
  }

  /**
   * @private
   * @method _cleanup
   * @description Internal cleanup implementation
   * @returns {Promise<void>}
   */
  async _cleanup() {
    console.log("🧹 Cleaning up Web Audio API resources...");

    // Stop recording
    this.isRecording = false;

    // Disconnect and clean up audio nodes
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch (error) {
        console.warn("Script processor cleanup warning:", error);
      }
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch (error) {
        console.warn("Media stream source cleanup warning:", error);
      }
      this.mediaStreamSource = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.warn("AudioContext close warning:", error);
      }
      this.audioContext = null;
    }

    // Clear audio buffers
    this.audioBuffers = [];
    this.isInitialized = false;

    console.log("✅ Web Audio API cleanup completed");
  }

  /**
   * @static
   * @method isSupported
   * @description Checks if Web Audio API is supported in current browser
   * @returns {boolean} Support status
   */
  static isSupported() {
    const hasAudioContext = !!(
      window.AudioContext || window.webkitAudioContext
    );
    const hasScriptProcessor =
      hasAudioContext &&
      AudioContext.prototype.createScriptProcessor !== undefined;
    const hasMediaStreamSource =
      hasAudioContext &&
      AudioContext.prototype.createMediaStreamSource !== undefined;

    return hasAudioContext && hasScriptProcessor && hasMediaStreamSource;
  }

  /**
   * @static
   * @method getSupportedConstraints
   * @description Gets supported getUserMedia constraints for current browser
   * @returns {Object[]} Array of constraint configurations from most to least preferred
   */
  static getSupportedConstraints() {
    return [
      // Ideal constraints for speech recognition
      {
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
        channelCount: AUDIO_CONFIG.CHANNELS,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      // Fallback with basic processing
      {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      // Minimal fallback
      {
        echoCancellation: false,
        noiseSuppression: false,
      },
      // Last resort
      true,
    ];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  WAVEncoder,
  WebAudioRecorder,
  AUDIO_CONFIG,
};
