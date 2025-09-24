const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const { startWindowTracking} = require("./trackers/windowTracker");
const {startKeyTracking} = require("./trackers/keyTracker");
const fs = require("fs");
const { spawn } = require("child_process");
const { WellnessAnalyst } = require("./trackers/WellnessAnalyst");

let mainWindow;
let analyst;

// Create a new window
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

  // Initialize AI wellness analyst
  analyst = new WellnessAnalyst();
  startWindowTracking(mainWindow, analyst);
  startKeyTracking(analyst);
}

// Function to start screen recording
async function startRecording() {
  try {
    const sources = await getSources();
    const windowSource = sources.find((source) => source.name === "FlowState"); // Replace with your window title

    if (!windowSource) {
      console.error("Window source not found!");
      return;
    }

    const videoPath = path.join(__dirname, 'recorded-video.mp4');

    // Set up ffmpeg command to record the window
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'x11grab',  // For Linux. On macOS, use '-f avfoundation'
      '-i', windowSource.id,  // Input window
      '-vcodec', 'libx264',  // Video codec
      '-preset', 'fast',  // Encoding preset
      '-crf', '23',  // Video quality
      '-pix_fmt', 'yuv420p', // Pixel format
      videoPath,  // Output file
    ]);

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg error:', err);
    });
  } catch (error) {
    console.error("Error starting recording:", error);
  }
}

// Function to get screen/window sources (returns a Promise)
function getSources() {
  return new Promise((resolve, reject) => {
    desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
      if (error) {
        reject(new Error("Error getting sources: " + error));
      } else {
        resolve(sources);
      }
    });
  });
}

// Handle the app window creation
app.whenReady().then(() => {
  createWindow();
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  analyst.saveUserModel(); // Save learned preferences before quitting
  app.quit();
});

// IPC listener to start recording
ipcMain.on("start-recording", (event) => {
  startRecording(); // Start the window recording
});
