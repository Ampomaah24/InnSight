import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";



// Session timeout in minutes (adjust as needed)
const SESSION_TIMEOUT_MINUTES = 30;
let sessionTimeoutId = null;


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


export const cleanupSessionMonitor = () => {
  removeActivityListeners();
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
};