/**
 * Logger utility for BIDS Collector Desktop
 * Provides structured logging with timestamps and levels
 * Supports both console output and file logging via Tauri backend
 */

import { invoke } from '@tauri-apps/api/core';

// Log levels
export const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING', 
  ERROR: 'ERROR'
};

/**
 * Format a log entry with timestamp, level, and message
 * Format: [YYYY-MM-DD HH:MM:SS] LEVEL: Message
 */
function formatLogEntry(level, message) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  return `[${timestamp}] ${level}: ${message}`;
}

/**
 * Write log entry to file via Tauri backend
 */
async function writeToLogFile(formattedEntry) {
  try {
    await invoke('write_log_entry', { entry: formattedEntry });
  } catch (error) {
    // If backend logging fails, fall back to console only
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Core logging function
 */
async function log(level, message) {
  const formattedEntry = formatLogEntry(level, message);
  
  // Always output to console for development
  switch (level) {
    case LogLevel.INFO:
      console.log(formattedEntry);
      break;
    case LogLevel.WARNING:
      console.warn(formattedEntry);
      break;
    case LogLevel.ERROR:
      console.error(formattedEntry);
      break;
  }
  
  // Also write to log file
  await writeToLogFile(formattedEntry);
}

/**
 * Log an informational message
 * @param {string} message - The message to log
 */
export async function logInfo(message) {
  await log(LogLevel.INFO, message);
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 */
export async function logWarning(message) {
  await log(LogLevel.WARNING, message);
}

/**
 * Log an error message
 * @param {string} message - The message to log
 */
export async function logError(message) {
  await log(LogLevel.ERROR, message);
}

/**
 * Log an error with stack trace if available
 * @param {string} message - The base error message
 * @param {Error} error - The error object (optional)
 */
export async function logErrorWithDetails(message, error = null) {
  let fullMessage = message;
  if (error) {
    fullMessage += ` - ${error.message}`;
    if (error.stack) {
      fullMessage += ` | Stack: ${error.stack}`;
    }
  }
  await logError(fullMessage);
}

/**
 * Initialize logging system
 * Called once at application startup
 */
export async function initializeLogger() {
  try {
    await invoke('initialize_logging');
    await logInfo('BIDS Collector Desktop logging system initialized');
  } catch (error) {
    console.error('Failed to initialize logging system:', error);
  }
}

// Export convenience aliases
export { logInfo as info, logWarning as warning, logError as error };