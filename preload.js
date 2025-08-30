const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onActiveWindow: (callback) => ipcRenderer.on("active-window", callback),
  onAppUsage: (callback) => ipcRenderer.on("app-usage", callback),
});
