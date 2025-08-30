const { ipcMain } = require("electron");
const activeWin = require("active-win");

let lastWindow = null;
let lastTimestamp = Date.now();

function startWindowTracking(win) { // pass BrowserWindow reference
  setInterval(async () => {
    const window = await activeWin();
    if (!window) return;

    if (lastWindow && lastWindow.owner.name === window.owner.name) {
      // same app continues, do nothing
    } else {
      if (lastWindow) {
        const duration = Math.floor((Date.now() - lastTimestamp) / 1000); // in seconds
        console.log(`App ${lastWindow.owner.name} used for ${duration} seconds`);

        // Send info to renderer
        win.webContents.send("app-usage", {
          name: lastWindow.owner.name,
          duration
        });
      }
      lastWindow = window;
      lastTimestamp = Date.now();
    }
  }, 2000);
}

module.exports = { startWindowTracking };
