const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");
const { WellnessAnalyst } = require("./trackers/WellnessAnalyst");
const { startWindowTracking } = require("./trackers/windowTracker");
const { startKeyTracking } = require("./trackers/keyTracker");

let mainWindow;
let analyst;
let ffmpegProcess = null;
let idleTimer = null;

const LOCK_FILE = path.join(app.getPath('userData'), 'lock.json');

function getLocalIPv4Addresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

function saveAllowedIP(ip) {
  try {
    const data = { allowedIP: ip, savedAt: new Date().toISOString() };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2), { encoding: 'utf8' });
    console.log('Saved lock file:', LOCK_FILE, data);
    return true;
  } catch (err) {
    console.error('Failed to write lock file', err);
    return false;
  }
}

function loadAllowedIP() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return null;
    const raw = fs.readFileSync(LOCK_FILE, 'utf8');
    const obj = JSON.parse(raw);
    return obj && obj.allowedIP ? obj.allowedIP : null;
  } catch (err) {
    console.error('Failed to read lock file', err);
    return null;
  }
}

function quitWithMessage(title, message) {
  try { dialog.showErrorBox(title, message); } catch (e) { console.error(title, message); }
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    alwaysOnTop: false,
    frame: true,
    kiosk: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");

  analyst = new WellnessAnalyst();
  startWindowTracking(mainWindow, analyst);
  startKeyTracking(analyst);

  // Track idle time
  startIdleTracking();
}

function startIdleTracking() {
  let lastActivity = Date.now();

  ipcMain.on("user-activity", () => {
    lastActivity = Date.now();
  });

  idleTimer = setInterval(() => {
    const now = Date.now();
    const idleSeconds = (now - lastActivity) / 1000;
    if (idleSeconds > 60) {
      console.log("User idle for more than 60 seconds.");
      mainWindow.webContents.send("user-idle", idleSeconds);
    }
  }, 10000);
}

async function getSources() {
  return desktopCapturer.getSources({ types: ["window", "screen"] });
}

async function startRecording() {
  try {
    const sources = await getSources();
    let windowSource = sources.find(source => source.name === "FlowState");
    if (!windowSource) {
      console.warn("FlowState window not found, defaulting to primary screen.");
      windowSource = sources.find(source => source.type === "screen") || sources[0];
    }

    if (!windowSource) {
      console.error("No suitable source found.");
      return;
    }

    const videoPath = path.join(__dirname, "recorded-video.mp4");

    let ffmpegInputArgs;
    if (process.platform === "win32") {
      ffmpegInputArgs = ["-f", "gdigrab", "-framerate", "30", "-i", `title=${windowSource.name}`];
    } else if (process.platform === "darwin") {
      ffmpegInputArgs = ["-f", "avfoundation", "-framerate", "30", "-i", "1:none"];
    } else if (process.platform === "linux") {
      const display = process.env.DISPLAY || ":0.0";
      ffmpegInputArgs = ["-f", "x11grab", "-framerate", "30", "-i", `${display}+0,0`];
    } else {
      console.error(`Unsupported platform: ${process.platform}`);
      return;
    }

    if (ffmpegProcess) {
      ffmpegProcess.kill();
      ffmpegProcess = null;
    }

    const ffmpegArgs = [
      ...ffmpegInputArgs,
      "-vcodec", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      videoPath,
    ];

    ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ffmpegProcess.stderr.on("data", data => console.log(`FFmpeg stderr: ${data}`));
    ffmpegProcess.on("close", code => {
      console.log(`FFmpeg exited with code ${code}`);
      ffmpegProcess = null;
    });

    console.log("Recording started:", videoPath);
  } catch (error) {
    console.error("Recording error:", error);
  }
}

// ==== IP Locking Logic ====
app.whenReady().then(() => {
  const isSetup = process.argv.includes('--setup');    // Run with --setup on authorized machine to lock IP
  const isRelock = process.argv.includes('--relock');  // Run with --relock to update lock to current IP

  const localIPs = getLocalIPv4Addresses();
  const currentIP = localIPs.length > 0 ? localIPs[0] : null; // pick first non-internal IPv4

  console.log('Detected local IPs:', localIPs, 'Using:', currentIP);

  if (!currentIP) {
    quitWithMessage('Network check failed', 'No local IPv4 address found. The application will now exit.');
    return;
  }

  if (isSetup) {
    const saved = saveAllowedIP(currentIP);
    if (!saved) {
      quitWithMessage('Setup failed', 'Unable to save lock. The application will now exit.');
      return;
    }
    console.log('Setup complete: IP locked to', currentIP);
    createWindow();
    return;
  }

  if (isRelock) {
    const saved = saveAllowedIP(currentIP);
    if (!saved) {
      quitWithMessage('Relock failed', 'Unable to save lock. The application will now exit.');
      return;
    }
    console.log('Relock complete: IP updated to', currentIP);
    createWindow();
    return;
  }

  const allowedIP = loadAllowedIP();

  if (!allowedIP) {
    quitWithMessage(
      'Application locked',
      'This application has not been configured for this device. Please run the application once with --setup on the authorized machine.'
    );
    return;
  }

  if (currentIP !== allowedIP) {
    quitWithMessage(
      'Unauthorized device',
      `This application is locked to IP ${allowedIP}, but current IP is ${currentIP}. Exiting.`
    );
    return;
  }

  createWindow();
});

// ==== Cleanup on exit ====
app.on("window-all-closed", () => {
  if (analyst) analyst.saveUserModel();
  if (idleTimer) clearInterval(idleTimer);
  if (ffmpegProcess) ffmpegProcess.kill();
  app.quit();
});

// IPC handlers
ipcMain.on("start-recording", () => {
  console.log("start-recording IPC received!");
  startRecording();
});

ipcMain.on('user-location', (event, location) => {
  console.log('Received location:', location);
  event.reply('location-received', 'Location data received successfully!');
});
