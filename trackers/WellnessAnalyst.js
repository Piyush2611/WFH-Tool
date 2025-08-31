// wellnessAnalyst.js
class WellnessAnalyst {
  constructor() {
    this.currentSession = {
      startTime: Date.now(),
      appSessions: [], // {appName, startTime, endTime, duration}
      keystrokes: 0,
      lastBreakReminder: 0, // timestamp of last reminder
    };
    this.userModel = {
      avgFocusSessionLength: 25 * 60, // 25 minutes in seconds, default starting point
      avgKeystrokesPerMinute: 100,
      preferredBreakInterval: 45 * 60, // 45 minutes, will be learned
    };
    this.loadUserModel();
  }

  // Method called by windowTracker
  recordAppUsage(appName, duration) {
    this.currentSession.appSessions.push({ appName, duration });
    console.log(`[Analyst] Recorded ${appName} for ${duration}s`);

    // Check for burnout signals: Too long on a single task?
    if (this.isInFocusSession()) {
      const focusDuration = this.getCurrentFocusDuration();
      if (focusDuration > this.userModel.preferredBreakInterval) {
        this._suggestBreak(focusDuration);
      }
    }
  }

  // Method called by keyTracker
  recordKeystroke() {
    this.currentSession.keystrokes++;
    // We can analyze typing pace for frustration later
  }

  isInFocusSession() {
    // Simple logic: If the current app is a "focus" app (e.g., VS Code, not Slack)
    const focusApps = ["Code", "WebStorm", "Google Chrome", "Figma"];
    const lastApp = this.currentSession.appSessions.slice(-1)[0]?.appName;
    return focusApps.some(app => lastApp.includes(app));
  }

  getCurrentFocusDuration() {
    // Calculate how long the user has been in the current focus app block
    let totalFocusTime = 0;
    for (let i = this.currentSession.appSessions.length - 1; i >= 0; i--) {
      const session = this.currentSession.appSessions[i];
      if (this.isInFocusSession(session.appName)) {
        totalFocusTime += session.duration;
      } else {
        break;
      }
    }
    return totalFocusTime;
  }

  _suggestBreak(duration) {
    const now = Date.now();
    // Don't spam the user with suggestions
    if (now - this.currentSession.lastBreakReminder < 15 * 60 * 1000) {
      return;
    }
    this.currentSession.lastBreakReminder = now;

    // Format the message
    const minutes = Math.floor(duration / 60);
    const message = `You've been in deep work for ${minutes} minutes. Your brain will thank you for a 5-minute break. Want a stretch video?`;

    // Send the nudge to the UI
    if (mainWindow) {
      mainWindow.webContents.send("wellness-nudge", {
        type: "break_reminder",
        message: message,
        duration: duration,
      });
    }
  }

  recordUserFeedback(nudgeType) {
    // If the user dismisses a nudge, we can learn from it.
    // For now, just log it. Later, adjust userModel.preferredBreakInterval.
    console.log(`User dismissed nudge: ${nudgeType}`);
  }

  loadUserModel() {
    try {
      const data = require("./user-model.json");
      this.userModel = { ...this.userModel, ...data };
    } catch (error) {
      console.log("No existing user model found. Starting fresh.");
    }
  }

  saveUserModel() {
    const fs = require("fs");
    fs.writeFileSync("./user-model.json", JSON.stringify(this.userModel, null, 2));
  }
}

module.exports = { WellnessAnalyst };