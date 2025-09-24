// Object to store the accumulated usage time for each app
let appUsageData = {};

// Listen for app-usage events from the main process USING THE EXPOSED API
window.electronAPI.onAppUsage((_event, data) => {
  const { name, duration } = data;

  // Format the duration in seconds to hh:mm:ss format
  const formattedTime = formatTime(duration);

  // Accumulate the total time for the app
  if (!appUsageData[name]) {
    appUsageData[name] = 0;  // Initialize if it's the first time we encounter this app
  }
  
  appUsageData[name] += duration;  // Add the new usage time to the existing time

  // Update the table
  updateTable();
});

// Function to format seconds into hh:mm:ss format
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Function to update the table
function updateTable() {
  const tableBody = document.getElementById("usage-table-body");
  tableBody.innerHTML = '';  // Clear the table body before re-rendering

  for (const app in appUsageData) {
    const totalDuration = formatTime(appUsageData[app]);

    // Create a new row for the app usage
    const tableRow = document.createElement('tr');
    tableRow.innerHTML = `<td>${app}</td><td>${totalDuration}</td>`;

    // Append the new row to the table
    tableBody.appendChild(tableRow);
  }
}

// Trigger recording via IPC
document.getElementById("start-recording").addEventListener("click", () => {
  // Send a message to the main process to start recording
  window.electronAPI.startRecording();
});
