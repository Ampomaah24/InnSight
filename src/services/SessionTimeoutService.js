import { signOut } from "firebase/auth";
import { auth } from "../config/firebase"; // Adjust this path if needed

class SessionTimeoutService {
  constructor(timeoutInMinutes = 20, warningInMinutes = 1) {
    this.timeoutInMinutes = timeoutInMinutes;
    this.warningInMinutes = warningInMinutes;
    this.timer = null;
    this.warningTimer = null;
    this.lastActivity = new Date();
    this.setupListeners();
  }

  setupListeners() {
    // Track user activity events
    const events = [
      "mousedown", 
      "mousemove", 
      "keypress", 
      "scroll", 
      "touchstart", 
      "click", 
      "keydown"
    ];
    
    // Add all event listeners
    events.forEach(event => {
      document.addEventListener(event, this.handleUserActivity.bind(this));
    });
    
    // Listen for "stay logged in" action from the warning component
    document.addEventListener('sessionTimeout:stayLoggedIn', this.resetTimer.bind(this));
    
    // Listen for visibility changes (tab focus/blur)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Start the initial timer
    this.resetTimer();
    
    // Check session status periodically (every minute)
    setInterval(this.checkSession.bind(this), 60 * 1000);
  }

  handleUserActivity() {
    this.lastActivity = new Date();
    this.resetTimer();
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // When tab becomes visible again, check if session should be expired
      const now = new Date();
      const inactiveTime = (now - this.lastActivity) / 1000 / 60; // in minutes
      
      if (inactiveTime >= this.timeoutInMinutes) {
        this.logout();
      } else if (inactiveTime >= (this.timeoutInMinutes - this.warningInMinutes)) {
        this.showWarning();
      } else {
        this.resetTimer();
      }
    }
  }

  checkSession() {
    const now = new Date();
    const inactiveTime = (now - this.lastActivity) / 1000 / 60; // in minutes
    
    if (inactiveTime >= this.timeoutInMinutes) {
      this.logout();
    }
  }

  resetTimer() {
    // Update last activity time
    this.lastActivity = new Date();
    
    // Clear the existing timers
    if (this.timer) clearTimeout(this.timer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    // Set warning timer
    const warningTime = (this.timeoutInMinutes - this.warningInMinutes) * 60 * 1000;
    this.warningTimer = setTimeout(this.showWarning.bind(this), warningTime);
    
    // Set logout timer
    this.timer = setTimeout(this.logout.bind(this), this.timeoutInMinutes * 60 * 1000);
  }

  showWarning() {
    // Create and show a warning dialog
    const warningEvent = new CustomEvent('sessionTimeout:warning', {
      detail: { 
        timeRemaining: this.warningInMinutes * 60,
        logoutTime: new Date(this.lastActivity.getTime() + (this.timeoutInMinutes * 60 * 1000))
      }
    });
    document.dispatchEvent(warningEvent);
  }

  async logout() {
    try {
      // Save current URL to localStorage before logout (to redirect back after login)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Dispatch an event for components that need to know about the logout
      const logoutEvent = new CustomEvent('sessionTimeout:loggedOut');
      document.dispatchEvent(logoutEvent);
      
      // Redirect to login page
      window.location.href = "/login?timeout=true";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
}

export default SessionTimeoutService;