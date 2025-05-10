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
    this.isLoggingOut = false; // Track if logout is in progress
    
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
    if (!this.isActive || this.isLoggingOut) return; // Skip if session is already inactive
    
    this.lastActivity = new Date();
    this.resetTimer();
  }

  handleVisibilityChange() {
    if (!this.isActive || this.isLoggingOut) return; // Skip if session is already inactive
    
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
    if (!this.isActive || this.isLoggingOut) return; // Skip if session is already inactive
    
    const now = new Date();
    const inactiveTime = (now - this.lastActivity) / 1000 / 60; // in minutes
    
    console.debug(`Periodic check: inactive for ${inactiveTime.toFixed(2)} minutes`);
    
    if (inactiveTime >= this.timeoutInMinutes) {
      console.debug("Session expired during periodic check");
      this.logout();
    }
  }

  resetTimer() {
    if (!this.isActive || this.isLoggingOut) return; // Skip if session is already inactive
    
    // Update last activity time
    this.lastActivity = new Date();
    
    // Clear the existing timers
    this.clearTimeouts();
    
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
    if (!this.isActive || this.isLoggingOut) return; // Skip if session is already inactive
    
    try {
      // Create and show a warning dialog
      const warningEvent = new CustomEvent('sessionTimeout:warning', {
        detail: {
          timeRemaining: this.warningInMinutes * 60,
          logoutTime: new Date(this.lastActivity.getTime() + (this.timeoutInMinutes * 60 * 1000))
        }
      });
      
      console.debug("Dispatching warning event");
      document.dispatchEvent(warningEvent);
    } catch (error) {
      console.error("Error showing warning:", error);
      // If warning fails, proceed to logout when timeout is reached
    }
  }

  async logout() {
    if (!this.isActive || this.isLoggingOut) return; // Prevent multiple logouts
    
    // Mark session as inactive and logging out in progress
    this.isActive = false;
    this.isLoggingOut = true;
    
    // Clear all timers
    this.clearTimeouts();
    
    try {
      console.debug("Logging out due to inactivity");
      
      // Make sure to clear any stored redirect paths
      localStorage.removeItem('redirectAfterLogin');
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Dispatch an event for components that need to know about the logout
      const logoutEvent = new CustomEvent('sessionTimeout:loggedOut');
      document.dispatchEvent(logoutEvent);
      
      // Add a small delay before redirecting to ensure all event listeners have processed
      setTimeout(() => {
        // Redirect to login page with timeout parameter
        window.location.href = "/login?timeout=true";
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
      
      // Even if there's an error, redirect to login
      setTimeout(() => {
        window.location.href = "/login?timeout=true";
      }, 100);
    }
  }
  
  // Method to manually extend session (can be called from components)
  extendSession() {
    if (!this.isActive || this.isLoggingOut) return;
    console.debug("Manually extending session");
    this.resetTimer();
  }

  // Clean up all timers
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
  async regularLogout() {
    if (!this.isActive || this.isLoggingOut) return;
    
    // Mark session as inactive and logging out
    this.isActive = false;
    this.isLoggingOut = true;
    
    // Clear all timers
    this.clearTimeouts();
    
    try {
      // For regular logouts, we don't need to store the current path
      localStorage.removeItem('redirectAfterLogin');
      
      console.debug("User initiated logout");
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Add a small delay before redirecting
      setTimeout(() => {
        // Redirect to login page (no timeout parameter)
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
      
      // Even if there's an error, redirect to login
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }
  
  // Clean up method - should be called when the app unmounts
  destroy() {
    // Clear all timers
    this.clearTimeouts();
    
    // Remove event listeners (only the ones we can access here)
    document.removeEventListener('sessionTimeout:stayLoggedIn', this.resetTimer);
    document.removeEventListener('sessionTimeout:logoutNow', this.logout);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Reset the singleton instance
    SessionTimeoutService.instance = null;
  }
}

export default SessionTimeoutService;