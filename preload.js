const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onActiveWindow: (callback) => ipcRenderer.on("active-window", callback),
  onAppUsage: (callback) => ipcRenderer.on("app-usage", callback),
  startRecording: () => ipcRenderer.send("start-recording"),
  onIdle: (callback) => ipcRenderer.on("user-idle", (_event, idleTime) => callback(idleTime)),
  sendUserActivity: () => ipcRenderer.send("user-activity"),
});
