const { GlobalKeyboardListener } = require("node-global-key-listener");

function startKeyTracking() {
  const keyboard = new GlobalKeyboardListener();

  keyboard.addListener((e, down) => {
    if (e.state === "DOWN") {
      console.log("Key pressed:", e.name, `(RawCode: ${e.rawKey._rawCode})`);
    }
  });
}

module.exports = { startKeyTracking };
