// ----------------------
// Auth & State
// ----------------------

const authContainer = document.getElementById('auth-container');
const dashboard = document.getElementById('main-dashboard-content');
const authTitle = document.getElementById('auth-title');
const authError = document.getElementById('auth-error');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthLink = document.getElementById('toggle-auth-link');
const toggleAuthText = document.getElementById('toggle-auth-text');

let isLoginMode = true; // toggle between login/register

// Check if user is already logged in (token in localStorage)
function isUserLoggedIn() {
  return !!localStorage.getItem('authToken');
}

// Show dashboard and hide auth form on login
function showDashboard() {
  authContainer.style.display = 'none';
  dashboard.style.display = 'block';
}

// Show auth form and hide dashboard on logout
function showAuthForm() {
  authContainer.style.display = 'block';
  dashboard.style.display = 'none';
}

// Toggle between login and register mode UI
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    authTitle.textContent = 'Login';
    authSubmitBtn.textContent = 'Login';
    toggleAuthText.textContent = "Don't have an account?";
    toggleAuthLink.textContent = 'Register';
  } else {
    authTitle.textContent = 'Register';
    authSubmitBtn.textContent = 'Register';
    toggleAuthText.textContent = "Already have an account?";
    toggleAuthLink.textContent = 'Login';
  }
  authError.style.display = 'none';
  authEmail.value = '';
  authPassword.value = '';
}

// Call toggle on link click
toggleAuthLink.addEventListener('click', toggleAuthMode);

// Handle auth form submit
authSubmitBtn.addEventListener('click', async () => {
  authError.style.display = 'none';
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = 'Please enter both email and password.';
    authError.style.display = 'block';
    return;
  }

  const endpoint = isLoginMode ? '/api/login' : '/api/register';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }

    // Save token (assuming backend returns token)
    localStorage.setItem('authToken', data.token);

    showDashboard();
    initializeApp(); // Initialize your app logic after login
  } catch (error) {
    authError.textContent = error.message;
    authError.style.display = 'block';
  }
});

// Logout helper (optional, add a button somewhere to call this)
function logout() {
  localStorage.removeItem('authToken');
  showAuthForm();
}

// ----------------------
// App Usage Tracking & Pomodoro Timer & Other Logic
// ----------------------

// Keep your original code but move all dashboard UI initializations & event listeners
// inside this function, so they run only after login:

function initializeApp() {
  // Pomodoro Timer Setup
  let appUsageData = {};
  let isUserIdle = false;

  // Pomodoro Timer Setup
  let pomodoroDuration = 25 * 60;
  let breakDuration = 5 * 60;
  let timer = null;
  let timeLeft = pomodoroDuration;
  let onBreak = false;

  // Get existing DOM elements or create them if not present
  const existingPomodoroContainer = document.getElementById('pomodoro-container');
  const pomodoroContainer = existingPomodoroContainer || document.createElement('div');
  pomodoroContainer.id = 'pomodoro-container';
  pomodoroContainer.style.marginBottom = '20px';

  const timerDisplay = document.getElementById('pomodoro-timer') || document.createElement('p');
  timerDisplay.id = 'pomodoro-timer';
  timerDisplay.style.fontSize = '1.2em';
  timerDisplay.style.fontWeight = 'bold';
  timerDisplay.style.marginBottom = '8px';

  if (!existingPomodoroContainer) {
    pomodoroContainer.appendChild(timerDisplay);

    const pomodoroBtn = document.createElement('button');
    pomodoroBtn.id = 'start-pomodoro';
    pomodoroBtn.textContent = 'Start Pomodoro';
    pomodoroBtn.style.padding = '10px 15px';
    pomodoroBtn.style.fontSize = '1em';
    pomodoroBtn.style.cursor = 'pointer';
    pomodoroContainer.appendChild(pomodoroBtn);

    dashboard.prepend(pomodoroContainer);

    pomodoroBtn.addEventListener('click', startPomodoro);
  }

  const summaryDiv = document.getElementById('summary-info') || document.createElement('div');
  summaryDiv.id = 'summary-info';
  summaryDiv.style.marginTop = '10px';
  summaryDiv.style.fontWeight = '600';

  if (!document.getElementById('summary-info')) {
    dashboard.prepend(summaryDiv);
  }

  // Toast container for non-blocking messages
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
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

    toast.addEventListener('click', () => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    });
  }

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

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = onBreak
      ? `Break Time: ${formatTime(timeLeft)}`
      : `Focus Time: ${formatTime(timeLeft)}`;
  }

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

  function updateSummary() {
    let total = 0;
    for (const app in appUsageData) {
      total += appUsageData[app];
    }
    summaryDiv.textContent = `Total Focus Time Today: ${formatTime(total)}`;
  }

  // Listen for app usage data from main process
  window.electronAPI.onAppUsage((_event, data) => {
    const { name, duration } = data;
    if (isUserIdle) return;
    if (!appUsageData[name]) appUsageData[name] = 0;
    appUsageData[name] += duration;
    updateTable();
    updateSummary();
  });

  // User Activity & Idle
  let lastActivityTime = Date.now();

  function reportUserActivity() {
    lastActivityTime = Date.now();
    isUserIdle = false;
    window.electronAPI.sendUserActivity?.();
  }

  ["mousemove", "keydown", "mousedown"].forEach(evt => {
    document.addEventListener(evt, reportUserActivity);
  });

  window.electronAPI.onIdle((idleTime) => {
    isUserIdle = true;
    showToast(`You've been idle for ${Math.floor(idleTime)} seconds. Let's get back to work!`);
  });

  // Start Pomodoro button listener already added in this init function

  // Screen Recording Trigger
  const recordBtn = document.getElementById("start-recording");
  if (recordBtn) {
    recordBtn.addEventListener("click", () => {
      window.electronAPI.startRecording();
    });
  }

  // Location: Just use Geolocation, no IP fallback (local only)
  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
          window.electronAPI.sendLocation({ latitude, longitude });
          // optionally update UI here
        },
        error => {
          console.error('Error getting location:', error);
          // No fallback here — keep local only
        }
      );
    }
  }

  // Auto get location on load after login
  getCurrentLocation();
}

// ----------------------
// On load logic: show correct screen
// ----------------------
window.addEventListener('DOMContentLoaded', () => {
  if (isUserLoggedIn()) {
    showDashboard();
    initializeApp();
  } else {
    showAuthForm();
  }
});
