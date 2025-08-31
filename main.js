// main.js (Updated)
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { startWindowTracking } = require("./trackers/windowTracker");
const { startKeyTracking } = require("./trackers/keyTracker");
// We'll create this new module to analyze the data
const { WellnessAnalyst } = require("./trackers/WellnessAnalyst");

let mainWindow;
let analyst;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");

  // Initialize our AI wellness analyst
  analyst = new WellnessAnalyst();

  // Start all tracking modules, passing the analyst for data processing
  startWindowTracking(mainWindow, analyst);
  startKeyTracking(analyst);

  // Listen for events from the renderer (e.g., user dismissing a nudge)
  ipcMain.on("user-dismissed-nudge", (event, nudgeType) => {
    analyst.recordUserFeedback(nudgeType);
  });
}

app.whenReady().then(createWindow);

// Handle app closing
app.on("window-all-closed", () => {
  analyst.saveUserModel(); // Save learned preferences before quitting
  app.quit();
});