import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";

/**
 * Session timeout handler module
 * Manages user session timeouts and redirects
 */

// Session timeout in minutes (adjust as needed)
const SESSION_TIMEOUT_MINUTES = 30;
let sessionTimeoutId = null;

/**
 * Initialize the session timeout monitor
 * This should be called when the app initializes or user logs in
 */
export const initSessionMonitor = () => {
  // Clear any existing timeout
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  // Set new timeout
  resetSessionTimeout();
  
  // Add activity listeners
  addActivityListeners();
};

/**
 * Reset the session timeout timer
 * Called when user activity is detected
 */
export const resetSessionTimeout = () => {
  // Clear existing timeout if any
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
  }
  
  // Set new timeout
  sessionTimeoutId = setTimeout(() => {
    handleSessionTimeout();
  }, SESSION_TIMEOUT_MINUTES * 60 * 1000);
};

/**
 * Handle session timeout
 * Logs user out and redirects to login page
 */
const handleSessionTimeout = async () => {
  try {
    // Get current path before logout
    const currentPath = window.location.pathname;
    
    // Clear all stored redirect paths
    localStorage.removeItem('redirectAfterLogin');
    
    // Sign out the user
    await signOut(auth);
    
    // Redirect to login page with timeout flag
    window.location.href = `/login?timeout=true`;
    
  } catch (error) {
    console.error("Error handling session timeout:", error);
    // Fallback redirect
    window.location.href = "/login?timeout=true";
  }
};

/**
 * Add activity listeners to reset timeout on user activity
 */
const addActivityListeners = () => {
  // User interactions that reset the timeout
  const events = [
    'mousedown', 'mousemove', 'keydown',
    'scroll', 'touchstart', 'click', 'keypress'
  ];
  
  // Add event listeners
  events.forEach(event => {
    document.addEventListener(event, resetSessionTimeout, false);
  });
};

/**
 * Remove activity listeners
 * Should be called when user logs out
 */
export const removeActivityListeners = () => {
  const events = [
    'mousedown', 'mousemove', 'keydown',
    'scroll', 'touchstart', 'click', 'keypress'
  ];
  
  events.forEach(event => {
    document.removeEventListener(event, resetSessionTimeout, false);
  });
  
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
};

/**
 * Clean up the session monitor
 * Should be called when the app unmounts or user logs out
 */
export const cleanupSessionMonitor = () => {
  removeActivityListeners();
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
};