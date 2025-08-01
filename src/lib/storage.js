/**
 * Storage utility for persistent configuration management
 * Handles saving and loading configuration to ~/.bids-collector/ directory
 */

// Tauri APIs
let tauriExists = null;
let tauriReadTextFile = null;
let tauriWriteTextFile = null;
let tauriMkdir = null;
let tauriCreate = null;
let tauriAppDataDir = null;

// Initialize Tauri APIs
async function initTauriAPIs() {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const path = await import('@tauri-apps/api/path');
      
      tauriExists = fs.exists;
      tauriReadTextFile = fs.readTextFile;
      tauriWriteTextFile = fs.writeTextFile;
      tauriMkdir = fs.mkdir;
      tauriCreate = fs.create;
      tauriAppDataDir = path.appDataDir;
      
      return true;
    } catch (error) {
      console.warn('Tauri filesystem APIs not available:', error);
      return false;
    }
  }
  return false;
}

// Get the config directory path
async function getConfigDir() {
  if (tauriAppDataDir) {
    const appDataDir = await tauriAppDataDir();
    return `${appDataDir}/bids-collector`;
  }
  // Fallback for web environment
  return 'localStorage';
}

// Ensure config directory exists
async function ensureConfigDir() {
  if (!tauriExists || !tauriMkdir) {
    return false;
  }
  
  const configDir = await getConfigDir();
  const exists = await tauriExists(configDir);
  
  if (!exists) {
    try {
      await tauriMkdir(configDir, { recursive: true });
      console.log(`Created config directory: ${configDir}`);
      return true;
    } catch (error) {
      console.error('Failed to create config directory:', error);
      return false;
    }
  }
  
  return true;
}

// Save configuration to file
export async function saveConfig(module, data) {
  try {
    // Initialize Tauri APIs if not already done
    if (!tauriExists) {
      const initialized = await initTauriAPIs();
      if (!initialized) {
        console.warn('Falling back to localStorage for config persistence');
        localStorage.setItem(`bids-collector-${module}`, JSON.stringify(data));
        return true;
      }
    }
    
    // Ensure config directory exists
    const dirCreated = await ensureConfigDir();
    if (!dirCreated) {
      throw new Error('Failed to create config directory');
    }
    
    // Write config file
    const configDir = await getConfigDir();
    const filePath = `${configDir}/${module}.json`;
    const jsonData = JSON.stringify(data, null, 2);
    
    console.log(`Attempting to save config to: ${filePath}`);
    await tauriWriteTextFile(filePath, jsonData);
    console.log(`Configuration saved successfully to: ${filePath}`);
    
    return true;
  } catch (error) {
    console.error(`Failed to save ${module} config to filesystem:`, error.message || error);
    
    // Fallback to localStorage
    try {
      localStorage.setItem(`bids-collector-${module}`, JSON.stringify(data));
      console.log(`Config saved to localStorage as fallback for module: ${module}`);
      return true;
    } catch (storageError) {
      console.error('localStorage fallback also failed:', storageError);
      return false;
    }
  }
}

// Load configuration from file
export async function loadConfig(module, defaultConfig = {}) {
  try {
    // Initialize Tauri APIs if not already done
    if (!tauriExists) {
      const initialized = await initTauriAPIs();
      if (!initialized) {
        console.warn('Falling back to localStorage for config loading');
        const stored = localStorage.getItem(`bids-collector-${module}`);
        return stored ? JSON.parse(stored) : defaultConfig;
      }
    }
    
    // Read config file
    const configDir = await getConfigDir();
    const filePath = `${configDir}/${module}.json`;
    
    console.log(`Attempting to load config from: ${filePath}`);
    
    // Check if file exists
    const exists = await tauriExists(filePath);
    if (!exists) {
      console.log(`Config file not found: ${filePath}, using default config`);
      return defaultConfig;
    }
    
    // Read and parse config
    const jsonData = await tauriReadTextFile(filePath);
    const config = JSON.parse(jsonData);
    console.log(`Configuration loaded successfully from: ${filePath}`);
    
    return config;
  } catch (error) {
    console.error(`Failed to load ${module} config from filesystem:`, error.message || error);
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`bids-collector-${module}`);
      if (stored) {
        console.log(`Config loaded from localStorage as fallback for module: ${module}`);
        return JSON.parse(stored);
      }
    } catch (storageError) {
      console.error('localStorage fallback also failed:', storageError);
    }
    
    // Return default config if all else fails
    console.log(`Using default config for module: ${module}`);
    return defaultConfig;
  }
}

// Delete configuration file
export async function deleteConfig(module) {
  try {
    // Initialize Tauri APIs if not already done
    if (!tauriExists) {
      const initialized = await initTauriAPIs();
      if (!initialized) {
        localStorage.removeItem(`bids-collector-${module}`);
        return true;
      }
    }
    
    const configDir = await getConfigDir();
    const filePath = `${configDir}/${module}.json`;
    
    // Check if file exists
    const exists = await tauriExists(filePath);
    if (exists) {
      // Note: We would need to add remove permission and import remove function
      // For now, we'll just clear the content
      await tauriWriteTextFile(filePath, '{}');
      console.log(`Configuration cleared: ${filePath}`);
    }
    
    // Also clear localStorage fallback
    localStorage.removeItem(`bids-collector-${module}`);
    
    return true;
  } catch (error) {
    console.error(`Failed to delete ${module} config:`, error);
    return false;
  }
}

// Get config directory path (for display purposes)
export async function getConfigPath() {
  try {
    if (!tauriExists) {
      await initTauriAPIs();
    }
    
    if (tauriAppDataDir) {
      const appDataDir = await tauriAppDataDir();
      return `${appDataDir}/bids-collector`;
    }
    
    return 'localStorage (browser storage)';
  } catch (error) {
    console.error('Failed to get config path:', error);
    return 'localStorage (fallback)';
  }
}
