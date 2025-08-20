// Settings management for BIDS Collector
// Handles app configuration including S3 configuration, etc.

const SETTINGS_KEY = 'bids-collector-settings';

// Default settings structure
const DEFAULT_SETTINGS = {
  version: '1.0.0',
  s3: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    region: 'us-east-1',
    endpoint: '', // Custom endpoint for S3-compatible services
    forcePathStyle: false
  },
  download: {
    maxConcurrentDownloads: 3,
    chunkSize: 1024 * 1024, // 1MB chunks
    bufferSize: 1024 * 1024 * 10, // 10MB buffer
    verifyChecksum: true,
    autoStartTasks: true // Automatically start collection tasks after creation
  },
  ui: {
    theme: 'auto', // 'light', 'dark', 'auto'
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h' // '12h', '24h'
  },
  privacy: {
    analytics: false,
    crashReporting: false,
    usageStatistics: false
  }
};

/**
 * Load settings from localStorage
 * @returns {Object} Current settings object
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return mergeSettings(DEFAULT_SETTINGS, settings);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
  try {
    const merged = mergeSettings(DEFAULT_SETTINGS, settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

/**
 * Get a specific setting value
 * @param {string} path - Dot-separated path to setting (e.g., 'app.enabled')
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} Setting value
 */
export function getSetting(path, defaultValue = null) {
  const settings = loadSettings();
  const keys = path.split('.');
  let value = settings;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Set a specific setting value
 * @param {string} path - Dot-separated path to setting
 * @param {*} value - Value to set
 */
export function setSetting(path, value) {
  const settings = loadSettings();
  const keys = path.split('.');
  let current = settings;
  
  // Navigate to parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  // Set the final value
  current[keys[keys.length - 1]] = value;
  
  return saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
export function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS });
}

/**
 * Export settings as JSON string
 */
export function exportSettings() {
  const settings = loadSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON string
 * @param {string} jsonString - JSON string of settings
 */
export function importSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    return saveSettings(settings);
  } catch (error) {
    console.error('Failed to import settings:', error);
    return false;
  }
}

/**
 * Get S3 client configuration
 * @returns {Object} S3 configuration object
 */
export function getS3Config() {
  const settings = loadSettings();
  const config = {
    region: settings.s3.region,
    requestTimeout: settings.s3.timeout,
    maxRetries: settings.s3.retryAttempts
  };
  
  if (settings.s3.endpoint) {
    config.endpoint = settings.s3.endpoint;
    config.forcePathStyle = settings.s3.forcePathStyle;
  }
  
  return config;
}





/**
 * Deep merge two settings objects
 * @param {Object} defaults - Default settings
 * @param {Object} settings - User settings
 * @returns {Object} Merged settings
 */
function mergeSettings(defaults, settings) {
  const result = { ...defaults };
  
  for (const key in settings) {
    if (settings.hasOwnProperty(key)) {
      if (typeof settings[key] === 'object' && settings[key] !== null && 
          typeof defaults[key] === 'object' && defaults[key] !== null) {
        result[key] = mergeSettings(defaults[key], settings[key]);
      } else {
        result[key] = settings[key];
      }
    }
  }
  
  return result;
}

export { DEFAULT_SETTINGS };
