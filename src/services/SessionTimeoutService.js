import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

class SessionTimeoutService {
  constructor(timeoutInMinutes = 20, warningInMinutes = 1) {
    if (SessionTimeoutService.instance) {
      return SessionTimeoutService.instance;
    }
    
    this.timeoutInMinutes = timeoutInMinutes;
    this.warningInMinutes = warningInMinutes;
    this.timer = null;
    this.warningTimer = null;
    this.lastActivity = new Date();
    this.isActive = true;
    this.isLoggingOut = false; 
    
    this.setupListeners();
    SessionTimeoutService.instance = this;
  }

  setupListeners() {
  
    const events = [
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown"
    ];
    
   
    let lastMove = 0;
    document.addEventListener("mousemove", () => {
      const now = Date.now();
      if (now - lastMove > 2000) { 
        lastMove = now;
        this.handleUserActivity();
      }
    });

    events.forEach(event => {
      document.addEventListener(event, this.handleUserActivity.bind(this));
    });
    
    // Listen for stay logged in action from the warning component
    document.addEventListener('sessionTimeout:stayLoggedIn', this.resetTimer.bind(this));
    
    // Listen for logout action
    document.addEventListener('sessionTimeout:logoutNow', this.logout.bind(this));
    
    // Listen for visibility changes 
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    this.resetTimer();
    
    this.checkIntervalId = setInterval(this.checkSession.bind(this), 60 * 1000);
  
    console.log(`SessionTimeoutService initialized with ${this.timeoutInMinutes} minute timeout`);
  }

  handleUserActivity() {
    if (!this.isActive || this.isLoggingOut) return; 
    
    this.lastActivity = new Date();
    this.resetTimer();
  }

  handleVisibilityChange() {
    if (!this.isActive || this.isLoggingOut) return; 
    
    if (document.visibilityState === 'visible') {
    
      const now = new Date();
      const inactiveTime = (now - this.lastActivity) / 1000 / 60; 
      
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
    if (!this.isActive || this.isLoggingOut) return; 
    
    const now = new Date();
    const inactiveTime = (now - this.lastActivity) / 1000 / 60; 
    
    console.debug(`Periodic check: inactive for ${inactiveTime.toFixed(2)} minutes`);
    
    if (inactiveTime >= this.timeoutInMinutes) {
      console.debug("Session expired during periodic check");
      this.logout();
    }
  }

  resetTimer() {
    if (!this.isActive || this.isLoggingOut) return; 
    
    // Update last activity time
    this.lastActivity = new Date();
    
    this.clearTimeouts();
    

    const warningTime = (this.timeoutInMinutes - this.warningInMinutes) * 60 * 1000;
    this.warningTimer = setTimeout(() => {
      console.debug("Warning timer triggered");
      this.showWarning();
    }, warningTime);
    

    const logoutTime = this.timeoutInMinutes * 60 * 1000;
    this.timer = setTimeout(() => {
      console.debug("Logout timer triggered");
      this.logout();
    }, logoutTime);
    
    console.debug(`Timers reset: warning in ${warningTime/1000}s, logout in ${logoutTime/1000}s`);
  }

  showWarning() {
    if (!this.isActive || this.isLoggingOut) return; 
    
    try {
     
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
      
    }
  }

  async logout() {
    if (!this.isActive || this.isLoggingOut) return; 
    this.isActive = false;
    this.isLoggingOut = true;
    
    // Clear all timers
    this.clearTimeouts();
    
    try {
      console.debug("Logging out due to inactivity");
      
      localStorage.removeItem('redirectAfterLogin');
      
      // Sign out from Firebase
      await signOut(auth);
  
      const logoutEvent = new CustomEvent('sessionTimeout:loggedOut');
      document.dispatchEvent(logoutEvent);
    
      setTimeout(() => {
  
        window.location.href = "/login?timeout=true";
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
      

      setTimeout(() => {
        window.location.href = "/login?timeout=true";
      }, 100);
    }
  }
  
  // Method to manually extend session 
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
    
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
  
 
  async regularLogout() {
    if (!this.isActive || this.isLoggingOut) return;
    this.isActive = false;
    this.isLoggingOut = true;
    this.clearTimeouts();
    
    try {
  
      localStorage.removeItem('redirectAfterLogin');
      
      console.debug("User initiated logout");
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Add a small delay before redirecting
      setTimeout(() => {
        
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
      
 
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }
  

  destroy() {
    // Clear all timers
    this.clearTimeouts();
    
    // Remove event listeners 
    document.removeEventListener('sessionTimeout:stayLoggedIn', this.resetTimer);
    document.removeEventListener('sessionTimeout:logoutNow', this.logout);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
 
    SessionTimeoutService.instance = null;
  }
}

export default SessionTimeoutService;