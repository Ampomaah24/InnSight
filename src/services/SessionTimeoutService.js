// Updated SessionTimeoutService.js
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

class SessionTimeoutService {
  constructor(timeoutInMinutes = 20, warningInMinutes = 1) {
    // Make sure we only create one instance
    if (SessionTimeoutService.instance) {
      return SessionTimeoutService.instance;
    }
    
    this.timeoutInMinutes = timeoutInMinutes;
    this.warningInMinutes = warningInMinutes;
    this.timer = null;
    this.warningTimer = null;
    this.lastActivity = new Date();
    this.isActive = true; // Track if user session is active
    
    this.setupListeners();
    SessionTimeoutService.instance = this;
  }

  setupListeners() {
    // Track user activity events - throttle mousemove for performance
    const events = [
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown"
    ];
    
    // Add mousemove with throttling
    let lastMove = 0;
    document.addEventListener("mousemove", () => {
      const now = Date.now();
      if (now - lastMove > 2000) { // Only trigger every 2 seconds for mousemove
        lastMove = now;
        this.handleUserActivity();
      }
    });
    
    // Add all other event listeners
    events.forEach(event => {
      document.addEventListener(event, this.handleUserActivity.bind(this));
    });
    
    // Listen for "stay logged in" action from the warning component
    document.addEventListener('sessionTimeout:stayLoggedIn', this.resetTimer.bind(this));
    
    // Listen for "logout now" action
    document.addEventListener('sessionTimeout:logoutNow', this.logout.bind(this));
    
    // Listen for visibility changes (tab focus/blur)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Start the initial timer
    this.resetTimer();
    
    // Check session status periodically (every minute)
    this.checkIntervalId = setInterval(this.checkSession.bind(this), 60 * 1000);
    
    // Log initialization for debugging
    console.log(`SessionTimeoutService initialized with ${this.timeoutInMinutes} minute timeout`);
  }

  handleUserActivity() {
    if (!this.isActive) return; // Skip if session is already inactive
    
    this.lastActivity = new Date();
    // Add a debug log to verify activity is being tracked (can remove in production)
    console.debug("User activity detected, resetting timeout timer");
    this.resetTimer();
  }

  handleVisibilityChange() {
    if (!this.isActive) return; // Skip if session is already inactive
    
    if (document.visibilityState === 'visible') {
      // When tab becomes visible again, check if session should be expired
      const now = new Date();
      const inactiveTime = (now - this.lastActivity) / 1000 / 60; // in minutes
      
      console.debug(`Tab visible again. Inactive time: ${inactiveTime.toFixed(2)} minutes`);
      
      if (inactiveTime >= this.timeoutInMinutes) {
        console.debug("Session expired while tab was inactive");
        this.logout();
      } else if (inactiveTime >= (this.timeoutInMinutes - this.warningInMinutes)) {
        console.debug("Showing warning after tab becomes active");
        this.showWarning();
      } else {
        this.resetTimer();
      }
    }
  }

  checkSession() {
    if (!this.isActive) return; // Skip if session is already inactive
    
    const now = new Date();
    const inactiveTime = (now - this.lastActivity) / 1000 / 60; // in minutes
    
    console.debug(`Periodic check: inactive for ${inactiveTime.toFixed(2)} minutes`);
    
    if (inactiveTime >= this.timeoutInMinutes) {
      console.debug("Session expired during periodic check");
      this.logout();
    }
  }

  resetTimer() {
    if (!this.isActive) return; // Skip if session is already inactive
    
    // Update last activity time
    this.lastActivity = new Date();
    
    // Clear the existing timers
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    // Set warning timer (make sure conversion to milliseconds is correct)
    const warningTime = (this.timeoutInMinutes - this.warningInMinutes) * 60 * 1000;
    this.warningTimer = setTimeout(() => {
      console.debug("Warning timer triggered");
      this.showWarning();
    }, warningTime);
    
    // Set logout timer
    const logoutTime = this.timeoutInMinutes * 60 * 1000;
    this.timer = setTimeout(() => {
      console.debug("Logout timer triggered");
      this.logout();
    }, logoutTime);
    
    console.debug(`Timers reset: warning in ${warningTime/1000}s, logout in ${logoutTime/1000}s`);
  }

  showWarning() {
    if (!this.isActive) return; // Skip if session is already inactive
    
    // Create and show a warning dialog
    const warningEvent = new CustomEvent('sessionTimeout:warning', {
      detail: {
        timeRemaining: this.warningInMinutes * 60,
        logoutTime: new Date(this.lastActivity.getTime() + (this.timeoutInMinutes * 60 * 1000))
      }
    });
    
    console.debug("Dispatching warning event");
    document.dispatchEvent(warningEvent);
  }

  async logout() {
    if (!this.isActive) return; // Prevent multiple logouts
    
    // Mark session as inactive
    this.isActive = false;
    
    // Clear all timers
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    
    try {
      // IMPORTANT CHANGE: For timeout-based logouts, we DON'T save the current path
      // This prevents the login page from redirecting back to previous page after timeout
      
      // We can completely remove this redirect storage for timeout-based logouts
      localStorage.removeItem('redirectAfterLogin');
      
      console.debug("Logging out due to inactivity - no path saved for redirect");
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Dispatch an event for components that need to know about the logout
      const logoutEvent = new CustomEvent('sessionTimeout:loggedOut');
      document.dispatchEvent(logoutEvent);
      
      // Redirect to login page with timeout parameter
      window.location.href = "/login?timeout=true";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
  
  // Method to manually extend session (can be called from components)
  extendSession() {
    if (!this.isActive) return;
    console.debug("Manually extending session");
    this.resetTimer();
  }
  // Add this method to your SessionTimeoutService
clearTimeouts() {
  // Clear the warning timeout
  if (this.warningTimer) {
    clearTimeout(this.warningTimer);
    this.warningTimer = null;
  }
  
  // Clear the logout timeout
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }
  
  // Clear check interval if it exists
  if (this.checkIntervalId) {
    clearInterval(this.checkIntervalId);
    this.checkIntervalId = null;
  }
}
  // Method to handle regular user-initiated logouts (not timeout)
  // This can be called from your logout buttons to preserve redirect behavior
  async regularLogout() {
    if (!this.isActive) return;
    
    // Mark session as inactive
    this.isActive = false;
    
    // Clear all timers
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    
    try {
      // For regular logouts, we don't need to store the current path
      localStorage.removeItem('redirectAfterLogin');
      
      console.debug("User initiated logout");
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Redirect to login page (no timeout parameter)
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
}

export default SessionTimeoutService;