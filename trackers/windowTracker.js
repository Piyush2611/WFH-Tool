// windowTracker.js (Updated)
const { ipcMain } = require("electron");
const activeWin = require("active-win");

function startWindowTracking(win, analyst) {
  let lastWindow = null;
  let lastTimestamp = Date.now();

  setInterval(async () => {
    const currentWindow = await activeWin();
    if (!currentWindow) return;

    const currentAppName = currentWindow.owner.name;

    if (!lastWindow || currentAppName !== lastWindow.owner.name) {
      // App switch detected
      if (lastWindow) {
        const duration = Math.floor((Date.now() - lastTimestamp) / 1000);
        console.log(`App ${lastWindow.owner.name} used for ${duration} seconds`);

        // Send to UI (your original feature)
        win.webContents.send("app-usage", {
          name: lastWindow.owner.name,
          duration: duration,
        });

        // Send to Wellness Analyst (NEW - for burnout prevention)
        analyst.recordAppUsage(lastWindow.owner.name, duration);
      }
      lastWindow = currentWindow;
      lastTimestamp = Date.now();
    }
  }, 2000); // Check every 2 seconds
}

module.exports = { startWindowTracking };