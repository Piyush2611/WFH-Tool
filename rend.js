// ----------------------
// App Usage Tracking
// ----------------------
let appUsageData = {};
let isUserIdle = false;
let idleThreshold = 60; // seconds

// ----------------------
// Pomodoro Timer Setup
// ----------------------
let pomodoroDuration = 25 * 60; // 25 minutes
let breakDuration = 5 * 60; // 5 minutes
let timer = null;
let timeLeft = pomodoroDuration;
let onBreak = false;

// ----------------------
// Dashboard UI Elements
// ----------------------
const dashboard = document.querySelector('.dashboard');

// Pomodoro Container
const pomodoroContainer = document.createElement('div');
pomodoroContainer.id = 'pomodoro-container';
pomodoroContainer.style.marginBottom = '20px';

// Timer Display
const timerDisplay = document.createElement('p');
timerDisplay.id = 'pomodoro-timer';
timerDisplay.style.fontSize = '1.2em';
timerDisplay.style.fontWeight = 'bold';
timerDisplay.style.marginBottom = '8px';
pomodoroContainer.appendChild(timerDisplay);

// Start Pomodoro Button
const pomodoroBtn = document.createElement('button');
pomodoroBtn.id = 'start-pomodoro';
pomodoroBtn.textContent = 'Start Pomodoro';
pomodoroBtn.style.padding = '10px 15px';
pomodoroBtn.style.fontSize = '1em';
pomodoroBtn.style.cursor = 'pointer';
pomodoroContainer.appendChild(pomodoroBtn);

// Add Pomodoro to dashboard
dashboard.prepend(pomodoroContainer);

// Summary display (total focus time)
const summaryDiv = document.createElement('div');
summaryDiv.id = 'summary-info';
summaryDiv.style.marginTop = '10px';
summaryDiv.style.fontWeight = '600';
dashboard.prepend(summaryDiv);

// Toast container for non-blocking messages
const toast = document.createElement('div');
toast.id = 'toast';
toast.style.display = 'none';
toast.style.position = 'fixed';
toast.style.bottom = '30px';
toast.style.left = '50%';
toast.style.transform = 'translateX(-50%)';
toast.style.backgroundColor = '#333';
toast.style.color = '#fff';
toast.style.padding = '12px 20px';
toast.style.borderRadius = '6px';
toast.style.fontSize = '14px';
toast.style.zIndex = '9999';
toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
toast.style.transition = 'opacity 0.3s ease-in-out';
document.body.appendChild(toast);

// ----------------------
// Toast Message
// ----------------------
function showToast(message, duration = 5000) {
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, duration);
}

// Allow dismissing toast on click
toast.addEventListener('click', () => {
  toast.style.opacity = '0';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 300);
});

// ----------------------
// Time Formatting Helper
// ----------------------
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// ----------------------
// Timer Display Update
// ----------------------
function updateTimerDisplay() {
  timerDisplay.textContent = onBreak
    ? `Break Time: ${formatTime(timeLeft)}`
    : `Focus Time: ${formatTime(timeLeft)}`;
}

// ----------------------
// Pomodoro Timer Logic
// ----------------------
function startPomodoro() {
  if (timer) clearInterval(timer);

  timeLeft = pomodoroDuration;
  onBreak = false;
  updateTimerDisplay();

  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!onBreak) {
        showToast("Time for a break! Relax for 5 minutes.");
        timeLeft = breakDuration;
        onBreak = true;
        updateTimerDisplay();

        timer = setInterval(() => {
          timeLeft--;
          updateTimerDisplay();

          if (timeLeft <= 0) {
            clearInterval(timer);
            showToast("Break over! Time to focus again.");
            startPomodoro();
          }
        }, 1000);
      }
    }
  }, 1000);
}

// ----------------------
// Handle App Usage
// ----------------------
window.electronAPI.onAppUsage((_event, data) => {
  const { name, duration } = data;

  if (isUserIdle) return; // Don't track idle time as productive

  if (!appUsageData[name]) appUsageData[name] = 0;
  appUsageData[name] += duration;

  updateTable();
  updateSummary();
});

// ----------------------
// Update Table
// ----------------------
function updateTable() {
  const tableBody = document.getElementById("usage-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = '';
  for (const app in appUsageData) {
    const totalDuration = formatTime(appUsageData[app]);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${app}</td><td>${totalDuration}</td>`;
    tableBody.appendChild(row);
  }
}

// ----------------------
// Update Summary
// ----------------------
function updateSummary() {
  let total = 0;
  for (const app in appUsageData) {
    total += appUsageData[app];
  }
  summaryDiv.textContent = `Total Focus Time Today: ${formatTime(total)}`;
}

// ----------------------
// Start Pomodoro Button
// ----------------------
pomodoroBtn.addEventListener("click", startPomodoro);

// ----------------------
// Screen Recording Trigger
// ----------------------
const recordBtn = document.getElementById("start-recording");
if (recordBtn) {
  recordBtn.addEventListener("click", () => {
    window.electronAPI.startRecording();
  });
}

// ----------------------
// User Activity Tracking (Idle Detection)
// ----------------------
let lastActivityTime = Date.now();

function reportUserActivity() {
  lastActivityTime = Date.now();
  isUserIdle = false;
  window.electronAPI.sendUserActivity?.();
}

["mousemove", "keydown", "mousedown"].forEach(evt => {
  document.addEventListener(evt, reportUserActivity);
});

// Handle idle status message from main
window.electronAPI.onIdle((idleTime) => {
  isUserIdle = true;
  showToast(`You've been idle for ${Math.floor(idleTime)} seconds. Let's get back to work!`);
});
