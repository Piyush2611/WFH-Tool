const { app, BrowserWindow } = require("electron");
const activeWin = require("active-win");

let lastWindow = null;
let lastTimestamp = Date.now();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
    },
  });

  win.loadFile("index.html");

  // Start tracking window usage
  setInterval(async () => {
    const currentWindow = await activeWin();
    if (!currentWindow) return;

    if (!lastWindow || currentWindow.owner.name !== lastWindow.owner.name) {
      if (lastWindow) {
        const duration = Math.floor((Date.now() - lastTimestamp) / 1000);
        win.webContents.send("app-usage", {
          name: lastWindow.owner.name,
          duration,
        });
      }
      lastWindow = currentWindow;
      lastTimestamp = Date.now();
    }
  }, 0);
}

app.whenReady().then(createWindow);
