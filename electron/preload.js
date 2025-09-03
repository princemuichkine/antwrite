const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  platform: process.platform,

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // File operations
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  saveFile: (content, defaultPath) =>
    ipcRenderer.invoke('dialog-save-file', content, defaultPath),

  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // IPC listeners for menu actions
  onNewDocument: (callback) => ipcRenderer.on('new-document', callback),
  onOpenFile: (callback) => ipcRenderer.on('open-file', callback),

  // Remove listeners
  removeAllListeners: (event) => ipcRenderer.removeAllListeners(event),
});
