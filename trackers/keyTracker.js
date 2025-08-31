// keyTracker.js (Updated)
const { GlobalKeyboardListener } = require("node-global-key-listener");

function startKeyTracking(analyst) {
  const v = new GlobalKeyboardListener();
  console.log("Keyboard listener started.");

  v.addListener(function (e, down) {
    if (e.state === "DOWN") {
      // Send keystroke to Wellness Analyst
      analyst.recordKeystroke();
    }
  });
}

module.exports = { startKeyTracking };