/**
 * @fileoverview Input Validation Middleware
 * @description Comprehensive request validation using Joi schemas
 *
 * Features:
 * - Request body validation
 * - Query parameter validation
 * - File upload validation
 * - Custom validation rules
 * - Error formatting and reporting
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-09-28
 */

// =============================================================================
// IMPORTS
// =============================================================================

const Joi = require("joi");

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * @class ValidationSchemas
 * @description Defines validation schemas for different endpoints
 */
class ValidationSchemas {
  /**
   * @static
   * @method transcript
   * @description Validation schema for transcript operations
   */
  static get transcript() {
    return {
      // POST /api/transcripts
      create: Joi.object({
        title: Joi.string()
          .min(1)
          .max(200)
          .trim()
          .default("Untitled Meeting")
          .messages({
            "string.min": "Title cannot be empty",
            "string.max": "Title must be less than 200 characters",
          }),
        content: Joi.string().max(50000).trim().default("").messages({
          "string.max": "Content must be less than 50,000 characters",
        }),
        date: Joi.date().iso().optional().messages({
          "date.format": "Date must be in ISO format (YYYY-MM-DD)",
        }),
      }),

      // GET /api/transcripts/:id
      getById: {
        params: Joi.object({
          id: Joi.alternatives()
            .try(
              Joi.number().integer().positive(),
              Joi.string().pattern(/^\d+$/)
            )
            .required()
            .messages({
              "alternatives.match": "ID must be a positive integer",
              "any.required": "Transcript ID is required",
            }),
        }),
      },

      // GET /api/transcripts with query parameters
      list: {
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(10),
          sort: Joi.string().valid("date", "title", "id").default("date"),
          order: Joi.string().valid("asc", "desc").default("desc"),
          search: Joi.string().max(100).trim().optional(),
        }),
      },
    };
  }

  /**
   * @static
   * @method webSocket
   * @description Validation schema for WebSocket messages
   */
  static get webSocket() {
    return {
      audioMessage: Joi.object({
        audio: Joi.string().base64().required().messages({
          "string.base64": "Audio data must be valid base64",
          "any.required": "Audio data is required",
        }),
        mimeType: Joi.string()
          .valid("audio/wav", "audio/wave", "audio/x-wav")
          .default("audio/wav")
          .messages({
            "any.only": "Only WAV audio format is supported",
          }),
        timestamp: Joi.date().iso().optional(),
        metadata: Joi.object({
          duration: Joi.number().positive().optional(),
          sampleRate: Joi.number()
            .valid(8000, 16000, 22050, 44100, 48000)
            .optional(),
          channels: Joi.number().valid(1, 2).optional(),
        }).optional(),
      }),
    };
  }

  /**
   * @static
   * @method health
   * @description Validation schema for health check endpoints
   */
  static get health() {
    return {
      query: Joi.object({
        detailed: Joi.boolean().default(false),
        include: Joi.array()
          .items(Joi.string().valid("database", "api", "websocket", "memory"))
          .optional(),
      }),
    };
  }
}

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * @class ValidationMiddleware
 * @description Provides validation middleware functions
 */
class ValidationMiddleware {
  /**
   * @static
   * @method validate
   * @description Creates validation middleware for a given schema
   * @param {Object} schema - Joi validation schema
   * @param {string} property - Request property to validate ('body', 'query', 'params')
   * @returns {Function} Express middleware function
   */
  static validate(schema, property = "body") {
    return (req, res, next) => {
      const data = req[property];

      const { error, value } = schema.validate(data, {
        abortEarly: false, // Return all errors
        allowUnknown: false, // Don't allow unknown fields
        stripUnknown: true, // Remove unknown fields
        convert: true, // Convert types when possible
      });

      if (error) {
        const errorDetails = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }));

        console.log(
          `❌ Validation error for ${req.method} ${req.path}:`,
          errorDetails
        );

        return res.status(400).json({
          error: "Validation failed",
          details: errorDetails,
          timestamp: new Date().toISOString(),
        });
      }

      // Replace request data with validated/sanitized data
      req[property] = value;
      next();
    };
  }

  /**
   * @static
   * @method validateMultiple
   * @description Validates multiple request properties
   * @param {Object} schemas - Object with schemas for different properties
   * @returns {Function} Express middleware function
   */
  static validateMultiple(schemas) {
    return (req, res, next) => {
      const errors = [];

      for (const [property, schema] of Object.entries(schemas)) {
        const data = req[property];

        const { error, value } = schema.validate(data, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          const propertyErrors = error.details.map((detail) => ({
            property,
            field: detail.path.join("."),
            message: detail.message,
            value: detail.context?.value,
          }));
          errors.push(...propertyErrors);
        } else {
          req[property] = value;
        }
      }

      if (errors.length > 0) {
        console.log(
          `❌ Multi-property validation error for ${req.method} ${req.path}:`,
          errors
        );

        return res.status(400).json({
          error: "Validation failed",
          details: errors,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    };
  }

  /**
   * @static
   * @method validateWebSocketMessage
   * @description Validates WebSocket message data
   * @param {*} data - Message data to validate
   * @returns {Object} Validation result with isValid and error properties
   */
  static validateWebSocketMessage(data) {
    try {
      const { error, value } =
        ValidationSchemas.webSocket.audioMessage.validate(data, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
          convert: true,
        });

      if (error) {
        const errorDetails = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return {
          isValid: false,
          error: "Invalid WebSocket message format",
          details: errorDetails,
        };
      }

      return {
        isValid: true,
        data: value,
      };
    } catch (err) {
      return {
        isValid: false,
        error: "Message validation failed",
        details: [{ field: "message", message: err.message }],
      };
    }
  }

  /**
   * @static
   * @method validateFileUpload
   * @description Validates file upload parameters
   * @param {Object} file - File object from multer
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateFileUpload(file, options = {}) {
    const {
      maxSize = 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes = ["audio/wav", "audio/wave", "audio/x-wav"],
      requiredFields = ["originalname", "mimetype", "size", "buffer"],
    } = options;

    const errors = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!file || !file[field]) {
        errors.push({
          field,
          message: `${field} is required`,
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push({
        field: "size",
        message: `File size ${(file.size / 1024 / 1024).toFixed(
          1
        )}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
      });
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push({
        field: "mimetype",
        message: `File type ${
          file.mimetype
        } not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`,
      });
    }

    // Check file name
    if (
      file.originalname &&
      !/^[\w\-. ]+\.(wav|wave)$/i.test(file.originalname)
    ) {
      errors.push({
        field: "originalname",
        message:
          "Invalid file name. Only alphanumeric characters, spaces, hyphens, and dots are allowed",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * @static
   * @method createCustomValidator
   * @description Creates a custom validation function
   * @param {Function} validationFn - Custom validation function
   * @param {string} errorMessage - Error message for validation failure
   * @returns {Function} Express middleware function
   */
  static createCustomValidator(
    validationFn,
    errorMessage = "Custom validation failed"
  ) {
    return (req, res, next) => {
      try {
        const isValid = validationFn(req);

        if (!isValid) {
          console.log(
            `❌ Custom validation failed for ${req.method} ${req.path}`
          );

          return res.status(400).json({
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
        }

        next();
      } catch (error) {
        console.error(`❌ Custom validation error:`, error.message);

        res.status(500).json({
          error: "Internal validation error",
          timestamp: new Date().toISOString(),
        });
      }
    };
  }
}

// =============================================================================
// CONVENIENCE MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * @description Pre-configured validation middleware for common use cases
 */
const validate = {
  // Transcript validation
  createTranscript: ValidationMiddleware.validate(
    ValidationSchemas.transcript.create
  ),
  getTranscript: ValidationMiddleware.validateMultiple(
    ValidationSchemas.transcript.getById
  ),
  listTranscripts: ValidationMiddleware.validate(
    ValidationSchemas.transcript.list.query,
    "query"
  ),

  // Health check validation
  healthCheck: ValidationMiddleware.validate(
    ValidationSchemas.health.query,
    "query"
  ),

  // Custom validators
  requireAPIKey: ValidationMiddleware.createCustomValidator(
    (req) =>
      req.headers["api-subscription-key"] || req.headers["authorization"],
    "API key is required"
  ),

  requireContentType: (contentType) =>
    ValidationMiddleware.createCustomValidator(
      (req) => req.get("Content-Type")?.includes(contentType),
      `Content-Type must include ${contentType}`
    ),
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  ValidationMiddleware,
  ValidationSchemas,
  validate,
};
