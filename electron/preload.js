const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory selection for local storage
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Storage configuration management
  getStorageConfigs: () => ipcRenderer.invoke('storage:getAll'),
  createStorageConfig: (config) => ipcRenderer.invoke('storage:create', config),
  updateStorageConfig: (id, config) => ipcRenderer.invoke('storage:update', id, config),
  deleteStorageConfig: (id) => ipcRenderer.invoke('storage:delete', id),
  getStorageConfig: (id) => ipcRenderer.invoke('storage:get', id),
  
  // Debug functionality
  reloadApp: () => ipcRenderer.invoke('debug:reloadApp'),
  openDevTools: () => ipcRenderer.invoke('debug:openDevTools'),
  clearUserData: () => ipcRenderer.invoke('debug:clearUserData'),
  
  // Legacy compatibility (for existing code)
  saveStorageConfig: (config) => ipcRenderer.invoke('save-storage-config', config),
  addStorage: (storage) => ipcRenderer.invoke('add-storage', storage),
  updateStorage: (storageId, updatedStorage) => ipcRenderer.invoke('update-storage', storageId, updatedStorage),
  deleteStorage: (storageId) => ipcRenderer.invoke('delete-storage', storageId)
});
