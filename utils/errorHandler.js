/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 * @module utils/errorHandler
 */

/**
 * Standardized error logging function
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalInfo - Additional information about the error
 * @returns {void}
 */
function logError(error, context, additionalInfo = {}) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...additionalInfo
  };
  
  // Log to console with consistent format
  console.error(`[ERROR] ${context}:`, JSON.stringify(errorInfo, null, 2));
}

/**
 * Standardized error response for Discord interactions
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} interaction - Discord interaction object (optional)
 * @returns {Object} Formatted error response
 */
function createErrorResponse(error, context, interaction = null) {
  logError(error, context, { interactionId: interaction?.id });
  
  // For user-facing errors, we provide a friendly message
  // For unexpected errors, we provide a generic message
  const isUserError = error.isOperational || error.isUserFacing;
  
  const response = {
    content: isUserError
      ? `❌ ${error.message}`
      : "❌ An unexpected error occurred. Please try again later.",
    ephemeral: true
  };
  
  return response;
}

/**
 * Wraps async functions to catch and handle errors consistently
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
function asyncHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // If we have an interaction object as first argument, use it for error response
      const interaction = args[0] && typeof args[0].reply === 'function' ? args[0] : null;
      
      const errorResponse = createErrorResponse(error, fn.name || 'anonymous', interaction);
      
      if (interaction) {
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorResponse);
          } else {
            await interaction.reply(errorResponse);
          }
        } catch (replyError) {
          logError(replyError, 'errorReply', { originalError: error.message });
        }
      }
      
      // Re-throw the error for upstream handling if needed
      throw error;
    }
  };
}

/**
 * Custom Error Classes
 */

class ApplicationError extends Error {
  constructor(message, isUserFacing = false) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = true;
    this.isUserFacing = isUserFacing;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message) {
    super(message || 'Invalid input provided', true);
    this.name = 'ValidationError';
  }
}

class APIError extends ApplicationError {
  constructor(message, statusCode = 50) {
    super(message || 'API request failed', false);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

class DatabaseError extends ApplicationError {
  constructor(message) {
    super(message || 'Database operation failed', false);
    this.name = 'DatabaseError';
  }
}

class NetworkError extends ApplicationError {
  constructor(message) {
    super(message || 'Network connection failed', false);
    this.name = 'NetworkError';
  }
}

class AuthenticationError extends ApplicationError {
  constructor(message) {
    super(message || 'Authentication failed', true);
    this.name = 'AuthenticationError';
  }
}

module.exports = {
  logError,
  createErrorResponse,
  asyncHandler,
  ApplicationError,
  ValidationError,
  APIError,
  DatabaseError,
  NetworkError,
  AuthenticationError
};