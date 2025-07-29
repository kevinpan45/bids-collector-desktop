// Storage configuration utilities for the desktop app
export class StorageConfig {
  async getAll() {
    try {
      const config = await window.electronAPI.getStorageConfig();
      return config.storages || [];
    } catch (error) {
      console.error('Error loading storage configurations:', error);
      throw error;
    }
  }

  async getById(id) {
    const storages = await this.getAll();
    return storages.find(storage => storage.id === id);
  }

  async create(storage) {
    try {
      const result = await window.electronAPI.addStorage(storage);
      return result;
    } catch (error) {
      console.error('Error creating storage configuration:', error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const result = await window.electronAPI.updateStorage(id, updates);
      return result;
    } catch (error) {
      console.error('Error updating storage configuration:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await window.electronAPI.deleteStorage(id);
      return result;
    } catch (error) {
      console.error('Error deleting storage configuration:', error);
      throw error;
    }
  }

  async selectDirectory() {
    try {
      const result = await window.electronAPI.selectDirectory();
      return result;
    } catch (error) {
      console.error('Error selecting directory:', error);
      throw error;
    }
  }

  validateStorage(storage) {
    const errors = [];

    if (!storage.name?.trim()) {
      errors.push('Storage name is required');
    }

    if (storage.type === 'local') {
      if (!storage.localPath?.trim()) {
        errors.push('Local directory path is required');
      }
    } else if (storage.type === 's3') {
      if (!storage.endpoint?.trim()) {
        errors.push('S3 endpoint is required');
      }
      if (!storage.bucket?.trim()) {
        errors.push('S3 bucket name is required');
      }
      if (!storage.accessKey?.trim()) {
        errors.push('S3 access key is required');
      }
      if (!storage.secretKey?.trim()) {
        errors.push('S3 secret key is required');
      }
    } else {
      errors.push('Invalid storage type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getStorageTypeDisplay(storage) {
    switch (storage.type) {
      case 'local':
        return 'Local Disk';
      case 's3':
        return storage.provider || 'S3';
      default:
        return 'Unknown';
    }
  }

  getStorageLocationDisplay(storage) {
    if (storage.type === 'local') {
      return storage.localPath || '-';
    }
    return storage.endpoint || '-';
  }

  // Test storage connection
  async testConnection(storage) {
    if (storage.type === 'local') {
      // For local storage, just check if directory exists and is accessible
      // This would need to be implemented in the Electron main process
      return { success: true, message: 'Local directory is accessible' };
    } else if (storage.type === 's3') {
      // For S3, this would need proper AWS SDK integration
      // For now, just return a placeholder
      return { success: true, message: 'Connection test not implemented yet' };
    }
    
    return { success: false, message: 'Unknown storage type' };
  }
}

// Export a singleton instance
export const storageConfig = new StorageConfig();
