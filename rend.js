// renderer.js

// Listen for app-usage events from the main process USING THE EXPOSED API
window.electronAPI.onAppUsage((_event, data) => {
  const outputDiv = document.getElementById("output");
  if (outputDiv) {
    const message = `App <strong>${data.name}</strong> used for <strong>${data.duration}</strong> seconds`;
    outputDiv.innerHTML += `${message}<br>`;
  }
});

// --- Code for handling wellness nudges would go here in Phase 2 ---
// window.electronAPI.onWellnessNudge((_event, data) => { ... });