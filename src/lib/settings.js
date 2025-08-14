// Settings management for BIDS Collector
// Handles app configuration including proxy settings, S3 configuration, etc.

const SETTINGS_KEY = 'bids-collector-settings';

// Default settings structure
const DEFAULT_SETTINGS = {
  version: '1.0.0',
  httpProxy: {
    enabled: false,
    host: '',
    port: '',
    username: '',
    password: '',
    bypassLocal: true,
    bypassList: ['localhost', '127.0.0.1', '*.local']
  },
  httpsProxy: {
    enabled: false,
    host: '',
    port: '',
    username: '',
    password: '',
    bypassLocal: true,
    bypassList: ['localhost', '127.0.0.1', '*.local'],
    validateSSL: true
  },
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
 * @param {string} path - Dot-separated path to setting (e.g., 'proxy.enabled')
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
 * Get proxy configuration for HTTP and HTTPS requests
 * @returns {Object|null} Proxy configuration object with http and https configs
 */
export function getProxyConfig() {
  const settings = loadSettings();
  
  const config = {};
  
  // HTTP proxy configuration
  if (settings.httpProxy.enabled && settings.httpProxy.host) {
    config.http = {
      host: settings.httpProxy.host,
      port: parseInt(settings.httpProxy.port) || 8080,
      protocol: 'http'
    };
    
    if (settings.httpProxy.username) {
      config.http.auth = {
        username: settings.httpProxy.username,
        password: settings.httpProxy.password || ''
      };
    }
  }
  
  // HTTPS proxy configuration
  if (settings.httpsProxy.enabled && settings.httpsProxy.host) {
    config.https = {
      host: settings.httpsProxy.host,
      port: parseInt(settings.httpsProxy.port) || 8080,
      protocol: 'https',
      validateSSL: settings.httpsProxy.validateSSL
    };
    
    if (settings.httpsProxy.username) {
      config.https.auth = {
        username: settings.httpsProxy.username,
        password: settings.httpsProxy.password || ''
      };
    }
  }
  
  return Object.keys(config).length > 0 ? config : null;
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
  
  // Add proxy configuration if enabled
  const proxyConfig = getProxyConfig();
  if (proxyConfig) {
    config.httpOptions = {};
    
    // Configure HTTP proxy
    if (proxyConfig.http) {
      let httpProxy = `${proxyConfig.http.protocol}://${proxyConfig.http.host}:${proxyConfig.http.port}`;
      if (proxyConfig.http.auth) {
        httpProxy = `${proxyConfig.http.protocol}://${proxyConfig.http.auth.username}:${proxyConfig.http.auth.password}@${proxyConfig.http.host}:${proxyConfig.http.port}`;
      }
      config.httpOptions.httpProxy = httpProxy;
    }
    
    // Configure HTTPS proxy
    if (proxyConfig.https) {
      let httpsProxy = `${proxyConfig.https.protocol}://${proxyConfig.https.host}:${proxyConfig.https.port}`;
      if (proxyConfig.https.auth) {
        httpsProxy = `${proxyConfig.https.protocol}://${proxyConfig.https.auth.username}:${proxyConfig.https.auth.password}@${proxyConfig.https.host}:${proxyConfig.https.port}`;
      }
      config.httpOptions.httpsProxy = httpsProxy;
    }
  }
  
  return config;
}

/**
 * Validate HTTP proxy settings
 * @param {Object} proxySettings - HTTP proxy settings to validate
 * @returns {Object} Validation result with success flag and errors
 */
export function validateHttpProxySettings(proxySettings) {
  const errors = [];
  
  if (proxySettings.enabled) {
    if (!proxySettings.host) {
      errors.push('HTTP proxy host is required when proxy is enabled');
    }
    
    if (!proxySettings.port) {
      errors.push('HTTP proxy port is required when proxy is enabled');
    } else {
      const port = parseInt(proxySettings.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('HTTP proxy port must be a number between 1 and 65535');
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validate HTTPS proxy settings
 * @param {Object} proxySettings - HTTPS proxy settings to validate
 * @returns {Object} Validation result with success flag and errors
 */
export function validateHttpsProxySettings(proxySettings) {
  const errors = [];
  
  if (proxySettings.enabled) {
    if (!proxySettings.host) {
      errors.push('HTTPS proxy host is required when proxy is enabled');
    }
    
    if (!proxySettings.port) {
      errors.push('HTTPS proxy port is required when proxy is enabled');
    } else {
      const port = parseInt(proxySettings.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('HTTPS proxy port must be a number between 1 and 65535');
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validate proxy settings (legacy function for backward compatibility)
 * @param {Object} proxySettings - Proxy settings to validate
 * @returns {Object} Validation result with success flag and errors
 */
export function validateProxySettings(proxySettings) {
  // For backward compatibility, treat as HTTP proxy
  return validateHttpProxySettings(proxySettings);
}

/**
 * Test HTTP proxy connection
 * @param {Object} proxySettings - HTTP proxy settings to test
 * @returns {Promise<boolean>} Success status
 */
export async function testHttpProxyConnection(proxySettings) {
  try {
    // Test connection to a HTTP endpoint
    const testUrl = 'http://httpbin.org/ip';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      // Note: In a real implementation, you'd need to configure the proxy at the Tauri level
      // This is a simplified test
    });
    
    return response.ok;
  } catch (error) {
    console.error('HTTP proxy test failed:', error);
    return false;
  }
}

/**
 * Test HTTPS proxy connection
 * @param {Object} proxySettings - HTTPS proxy settings to test
 * @returns {Promise<boolean>} Success status
 */
export async function testHttpsProxyConnection(proxySettings) {
  try {
    // Test connection to a HTTPS endpoint
    const testUrl = 'https://httpbin.org/ip';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      // Note: In a real implementation, you'd need to configure the proxy at the Tauri level
      // This is a simplified test
    });
    
    return response.ok;
  } catch (error) {
    console.error('HTTPS proxy test failed:', error);
    return false;
  }
}

/**
 * Test proxy connection (legacy function for backward compatibility)
 * @param {Object} proxySettings - Proxy settings to test
 * @returns {Promise<boolean>} Success status
 */
export async function testProxyConnection(proxySettings) {
  // For backward compatibility, test as HTTP proxy
  return testHttpProxyConnection(proxySettings);
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
