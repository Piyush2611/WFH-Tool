const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { WellnessAnalyst } = require("./trackers/WellnessAnalyst");
const { startWindowTracking } = require("./trackers/windowTracker");
const { startKeyTracking } = require("./trackers/keyTracker");

let mainWindow;
let analyst;
let ffmpegProcess = null;
let idleTimer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    alwaysOnTop: true,
    frame: true,
    kiosk: false, // Set true for full lock
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");

  analyst = new WellnessAnalyst();
  startWindowTracking(mainWindow, analyst);
  startKeyTracking(analyst);

  // Force focus back to app if user tries to switch
  mainWindow.on("blur", () => {
    console.log("Focus lost - bringing window back to front.");
    mainWindow.focus();
  });

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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (analyst) analyst.saveUserModel();
  if (idleTimer) clearInterval(idleTimer);
  app.quit();
});

ipcMain.on("start-recording", () => {
  console.log("start-recording IPC received!");
  startRecording();
});
