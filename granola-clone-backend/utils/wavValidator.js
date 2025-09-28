/**
 * @fileoverview WAV File Validation and Processing Utilities
 * @description Professional-grade WAV file validation and format correction
 * for ensuring compatibility with SarvamAI speech-to-text API.
 *
 * Features:
 * - WAV header validation and parsing
 * - Automatic format correction using FFmpeg
 * - SarvamAI API compatibility checking
 * - Comprehensive error handling and logging
 * - Memory-efficient processing for large files
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-09-27
 */

// =============================================================================
// IMPORTS
// =============================================================================

const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const fs = require("fs").promises;
const path = require("path");
const { Readable } = require("stream");

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// =============================================================================
// CONSTANTS
// =============================================================================

const WAV_VALIDATION_CONFIG = {
  // SarvamAI API preferred format
  SARVAM_PREFERRED: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    format: "wav",
  },

  // WAV header constants
  HEADER: {
    RIFF_SIGNATURE: Buffer.from("RIFF", "ascii"),
    WAVE_SIGNATURE: Buffer.from("WAVE", "ascii"),
    FMT_SIGNATURE: Buffer.from("fmt ", "ascii"),
    DATA_SIGNATURE: Buffer.from("data", "ascii"),
    MIN_HEADER_SIZE: 44,
    RIFF_OFFSET: 0,
    WAVE_OFFSET: 8,
    FMT_OFFSET: 12,
  },

  // Processing limits
  LIMITS: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MIN_FILE_SIZE: 1000, // 1KB
    MAX_DURATION: 600, // 10 minutes
    TEMP_DIR: "/tmp/wav-processing",
  },

  // Validation levels
  VALIDATION_LEVELS: {
    BASIC: "basic", // Header signature check
    STANDARD: "standard", // Format parameter validation
    STRICT: "strict", // Full compatibility check
  },
};

// =============================================================================
// WAV VALIDATION CLASS
// =============================================================================

/**
 * @class WAVValidator
 * @description Professional WAV file validation and processing utilities
 */
class WAVValidator {
  /**
   * @constructor
   * @param {Object} options - Configuration options
   * @param {string} options.validationLevel - Validation strictness level
   * @param {boolean} options.autoFix - Automatically fix format issues
   * @param {string} options.tempDir - Temporary directory for processing
   */
  constructor(options = {}) {
    this.validationLevel =
      options.validationLevel ||
      WAV_VALIDATION_CONFIG.VALIDATION_LEVELS.STANDARD;
    this.autoFix = options.autoFix !== false; // Default to true
    this.tempDir = options.tempDir || WAV_VALIDATION_CONFIG.LIMITS.TEMP_DIR;

    // Ensure temp directory exists
    this._ensureTempDir();
  }

  /**
   * @method validateAndProcess
   * @description Main entry point for WAV validation and processing
   * @param {Buffer} wavBuffer - Input WAV file as buffer
   * @param {string} clientId - Client identifier for logging
   * @returns {Promise<{isValid: boolean, processedBuffer: Buffer, metadata: Object}>}
   * @throws {Error} If validation fails and autoFix is disabled
   */
  async validateAndProcess(wavBuffer, clientId = "unknown") {
    const startTime = Date.now();

    try {
      console.log(
        `🔍 [${clientId}] Starting WAV validation: ${wavBuffer.length} bytes`
      );

      // Basic size validation
      this._validateFileSize(wavBuffer);

      // Parse WAV header and validate
      const headerInfo = this._parseWAVHeader(wavBuffer);
      const validationResult = this._validateWAVFormat(headerInfo);

      let processedBuffer = wavBuffer;
      let wasProcessed = false;

      // Auto-fix if needed and enabled
      if (!validationResult.isValid && this.autoFix) {
        console.log(
          `🔧 [${clientId}] WAV format issues detected, applying fixes...`
        );
        processedBuffer = await this._fixWAVFormat(wavBuffer, clientId);
        wasProcessed = true;

        // Re-validate processed buffer
        const newHeaderInfo = this._parseWAVHeader(processedBuffer);
        const newValidationResult = this._validateWAVFormat(newHeaderInfo);

        if (!newValidationResult.isValid) {
          throw new Error("WAV format could not be corrected automatically");
        }

        console.log(`✅ [${clientId}] WAV format corrected successfully`);
      } else if (!validationResult.isValid) {
        throw new Error(
          `WAV validation failed: ${validationResult.errors.join(", ")}`
        );
      }

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ [${clientId}] WAV validation completed in ${processingTime}ms${
          wasProcessed ? " (with format correction)" : ""
        }`
      );

      return {
        isValid: true,
        processedBuffer,
        metadata: {
          ...headerInfo,
          wasProcessed,
          processingTime,
          originalSize: wavBuffer.length,
          finalSize: processedBuffer.length,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `❌ [${clientId}] WAV validation failed in ${processingTime}ms:`,
        error.message
      );
      throw new Error(`WAV validation failed: ${error.message}`);
    }
  }

  /**
   * @private
   * @method _validateFileSize
   * @description Validates WAV file size limits
   * @param {Buffer} wavBuffer - WAV file buffer
   * @throws {Error} If file size is invalid
   */
  _validateFileSize(wavBuffer) {
    if (wavBuffer.length < WAV_VALIDATION_CONFIG.LIMITS.MIN_FILE_SIZE) {
      throw new Error(
        `WAV file too small: ${wavBuffer.length} bytes (minimum: ${WAV_VALIDATION_CONFIG.LIMITS.MIN_FILE_SIZE})`
      );
    }

    if (wavBuffer.length > WAV_VALIDATION_CONFIG.LIMITS.MAX_FILE_SIZE) {
      throw new Error(
        `WAV file too large: ${wavBuffer.length} bytes (maximum: ${WAV_VALIDATION_CONFIG.LIMITS.MAX_FILE_SIZE})`
      );
    }
  }

  /**
   * @private
   * @method _parseWAVHeader
   * @description Parses WAV file header and extracts format information
   * @param {Buffer} wavBuffer - WAV file buffer
   * @returns {Object} Parsed header information
   * @throws {Error} If header parsing fails
   */
  _parseWAVHeader(wavBuffer) {
    if (wavBuffer.length < WAV_VALIDATION_CONFIG.HEADER.MIN_HEADER_SIZE) {
      throw new Error("WAV file too small to contain valid header");
    }

    try {
      // Check RIFF signature
      const riffSignature = wavBuffer.subarray(0, 4);
      if (!riffSignature.equals(WAV_VALIDATION_CONFIG.HEADER.RIFF_SIGNATURE)) {
        throw new Error("Invalid RIFF signature");
      }

      // Check WAVE signature
      const waveSignature = wavBuffer.subarray(8, 12);
      if (!waveSignature.equals(WAV_VALIDATION_CONFIG.HEADER.WAVE_SIGNATURE)) {
        throw new Error("Invalid WAVE signature");
      }

      // Find fmt chunk
      let fmtOffset = 12;
      let fmtSize = 0;

      while (fmtOffset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.subarray(fmtOffset, fmtOffset + 4);
        const chunkSize = wavBuffer.readUInt32LE(fmtOffset + 4);

        if (chunkId.equals(WAV_VALIDATION_CONFIG.HEADER.FMT_SIGNATURE)) {
          fmtSize = chunkSize;
          break;
        }

        fmtOffset += 8 + chunkSize;
      }

      if (fmtSize === 0) {
        throw new Error("fmt chunk not found");
      }

      // Parse format information
      const fmtData = fmtOffset + 8;
      const audioFormat = wavBuffer.readUInt16LE(fmtData);
      const numChannels = wavBuffer.readUInt16LE(fmtData + 2);
      const sampleRate = wavBuffer.readUInt32LE(fmtData + 4);
      const byteRate = wavBuffer.readUInt32LE(fmtData + 8);
      const blockAlign = wavBuffer.readUInt16LE(fmtData + 12);
      const bitsPerSample = wavBuffer.readUInt16LE(fmtData + 14);

      // Calculate file size
      const fileSize = wavBuffer.readUInt32LE(4) + 8;

      return {
        fileSize,
        audioFormat,
        numChannels,
        sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample,
        fmtSize,
        duration: this._calculateDuration(
          wavBuffer.length,
          sampleRate,
          numChannels,
          bitsPerSample
        ),
      };
    } catch (error) {
      throw new Error(`WAV header parsing failed: ${error.message}`);
    }
  }

  /**
   * @private
   * @method _validateWAVFormat
   * @description Validates WAV format against SarvamAI requirements
   * @param {Object} headerInfo - Parsed header information
   * @returns {Object} Validation result with errors if any
   */
  _validateWAVFormat(headerInfo) {
    const errors = [];
    const warnings = [];

    // Audio format validation (must be PCM)
    if (headerInfo.audioFormat !== 1) {
      errors.push(
        `Unsupported audio format: ${headerInfo.audioFormat} (must be 1 for PCM)`
      );
    }

    // Sample rate validation
    const preferredSampleRate =
      WAV_VALIDATION_CONFIG.SARVAM_PREFERRED.sampleRate;
    if (headerInfo.sampleRate !== preferredSampleRate) {
      if (
        this.validationLevel === WAV_VALIDATION_CONFIG.VALIDATION_LEVELS.STRICT
      ) {
        errors.push(
          `Sample rate ${headerInfo.sampleRate}Hz not optimal (preferred: ${preferredSampleRate}Hz)`
        );
      } else {
        warnings.push(
          `Sample rate ${headerInfo.sampleRate}Hz, preferred: ${preferredSampleRate}Hz`
        );
      }
    }

    // Channel validation
    const preferredChannels = WAV_VALIDATION_CONFIG.SARVAM_PREFERRED.channels;
    if (headerInfo.numChannels !== preferredChannels) {
      if (
        this.validationLevel === WAV_VALIDATION_CONFIG.VALIDATION_LEVELS.STRICT
      ) {
        errors.push(
          `Channel count ${headerInfo.numChannels} not optimal (preferred: ${preferredChannels})`
        );
      } else {
        warnings.push(
          `Channel count ${headerInfo.numChannels}, preferred: ${preferredChannels}`
        );
      }
    }

    // Bit depth validation
    const preferredBitDepth = WAV_VALIDATION_CONFIG.SARVAM_PREFERRED.bitDepth;
    if (headerInfo.bitsPerSample !== preferredBitDepth) {
      if (
        this.validationLevel === WAV_VALIDATION_CONFIG.VALIDATION_LEVELS.STRICT
      ) {
        errors.push(
          `Bit depth ${headerInfo.bitsPerSample} not optimal (preferred: ${preferredBitDepth})`
        );
      } else {
        warnings.push(
          `Bit depth ${headerInfo.bitsPerSample}, preferred: ${preferredBitDepth}`
        );
      }
    }

    // Duration validation
    if (headerInfo.duration > WAV_VALIDATION_CONFIG.LIMITS.MAX_DURATION) {
      errors.push(
        `Audio too long: ${headerInfo.duration}s (max: ${WAV_VALIDATION_CONFIG.LIMITS.MAX_DURATION}s)`
      );
    }

    // Byte rate validation
    const expectedByteRate =
      headerInfo.sampleRate *
      headerInfo.numChannels *
      (headerInfo.bitsPerSample / 8);
    if (Math.abs(headerInfo.byteRate - expectedByteRate) > 1) {
      warnings.push(
        `Byte rate mismatch: ${headerInfo.byteRate} vs expected ${expectedByteRate}`
      );
    }

    const isValid = errors.length === 0;

    if (warnings.length > 0) {
      console.log(`⚠️  WAV validation warnings: ${warnings.join(", ")}`);
    }

    return {
      isValid,
      errors,
      warnings,
      requiresFix:
        !isValid ||
        (this.validationLevel ===
          WAV_VALIDATION_CONFIG.VALIDATION_LEVELS.STRICT &&
          warnings.length > 0),
    };
  }

  /**
   * @private
   * @method _fixWAVFormat
   * @description Fixes WAV format issues using FFmpeg
   * @param {Buffer} inputBuffer - Input WAV buffer
   * @param {string} clientId - Client identifier for logging
   * @returns {Promise<Buffer>} Fixed WAV buffer
   * @throws {Error} If fixing fails
   */
  async _fixWAVFormat(inputBuffer, clientId) {
    const tempInputPath = path.join(
      this.tempDir,
      `input_${clientId}_${Date.now()}.wav`
    );
    const tempOutputPath = path.join(
      this.tempDir,
      `output_${clientId}_${Date.now()}.wav`
    );

    try {
      // Write input buffer to temporary file
      await fs.writeFile(tempInputPath, inputBuffer);

      // Convert using FFmpeg with SarvamAI optimal settings
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioCodec("pcm_s16le") // 16-bit PCM
          .audioChannels(WAV_VALIDATION_CONFIG.SARVAM_PREFERRED.channels)
          .audioFrequency(WAV_VALIDATION_CONFIG.SARVAM_PREFERRED.sampleRate)
          .format("wav")
          .on("start", (commandLine) => {
            console.log(`🔧 [${clientId}] FFmpeg processing: ${commandLine}`);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              console.log(
                `🔧 [${clientId}] Processing progress: ${Math.round(
                  progress.percent
                )}%`
              );
            }
          })
          .on("end", () => {
            console.log(`✅ [${clientId}] FFmpeg processing completed`);
            resolve();
          })
          .on("error", (error) => {
            console.error(`❌ [${clientId}] FFmpeg error:`, error.message);
            reject(
              new Error(`Audio format conversion failed: ${error.message}`)
            );
          })
          .save(tempOutputPath);
      });

      // Read the converted file
      const convertedBuffer = await fs.readFile(tempOutputPath);
      console.log(
        `📁 [${clientId}] WAV format fixed: ${inputBuffer.length} → ${convertedBuffer.length} bytes`
      );

      return convertedBuffer;
    } finally {
      // Cleanup temporary files
      try {
        await fs.unlink(tempInputPath).catch(() => {});
        await fs.unlink(tempOutputPath).catch(() => {});
      } catch (cleanupError) {
        console.warn(
          `⚠️  [${clientId}] Temp file cleanup warning:`,
          cleanupError.message
        );
      }
    }
  }

  /**
   * @private
   * @method _calculateDuration
   * @description Calculates audio duration from file parameters
   * @param {number} fileSize - File size in bytes
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} channels - Number of channels
   * @param {number} bitDepth - Bits per sample
   * @returns {number} Duration in seconds
   */
  _calculateDuration(fileSize, sampleRate, channels, bitDepth) {
    const headerSize = WAV_VALIDATION_CONFIG.HEADER.MIN_HEADER_SIZE;
    const dataSize = fileSize - headerSize;
    const bytesPerSecond = sampleRate * channels * (bitDepth / 8);
    return Math.max(0, dataSize / bytesPerSecond);
  }

  /**
   * @private
   * @method _ensureTempDir
   * @description Ensures temporary directory exists
   */
  async _ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn(
        `⚠️  Could not create temp directory ${this.tempDir}:`,
        error.message
      );
    }
  }

  /**
   * @static
   * @method createValidator
   * @description Factory method for creating validator instances
   * @param {Object} options - Configuration options
   * @returns {WAVValidator} New validator instance
   */
  static createValidator(options = {}) {
    return new WAVValidator(options);
  }

  /**
   * @static
   * @method quickValidate
   * @description Quick validation without processing
   * @param {Buffer} wavBuffer - WAV file buffer
   * @returns {boolean} True if valid WAV format
   */
  static quickValidate(wavBuffer) {
    try {
      if (wavBuffer.length < WAV_VALIDATION_CONFIG.HEADER.MIN_HEADER_SIZE) {
        return false;
      }

      const riffSignature = wavBuffer.subarray(0, 4);
      const waveSignature = wavBuffer.subarray(8, 12);

      return (
        riffSignature.equals(WAV_VALIDATION_CONFIG.HEADER.RIFF_SIGNATURE) &&
        waveSignature.equals(WAV_VALIDATION_CONFIG.HEADER.WAVE_SIGNATURE)
      );
    } catch (error) {
      return false;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  WAVValidator,
  WAV_VALIDATION_CONFIG,
};
