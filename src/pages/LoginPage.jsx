import React, { useState, useEffect } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaExclamationTriangle } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../assets/styles/LoginPage.css";

const LoginPage = () => {
  // State variables for form inputs and UI feedback
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [confirmResetEmail, setConfirmResetEmail] = useState("");
  const [emailsMismatch, setEmailsMismatch] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

  const navigate = useNavigate();

  // Reset the inactivity timer on user interaction
  useEffect(() => {
    const resetInactivityTimer = () => {
      setLastActivity(Date.now());
    };

    // Add event listeners for user activity
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);

    return () => {
      // Clean up event listeners
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      window.removeEventListener("click", resetInactivityTimer);
      window.removeEventListener("scroll", resetInactivityTimer);
    };
  }, []);

  // Check for session timeout
  useEffect(() => {
    const checkSessionTimeout = () => {
      const currentTime = Date.now();
      const timeElapsed = currentTime - lastActivity;

      if (timeElapsed >= TIMEOUT_DURATION && auth.currentUser) {
        // Log out the user if they've been inactive
        auth.signOut();
        setError("Your session has expired due to inactivity.");
        clearTimeout(sessionTimeout);
      } else {
        // Schedule next check
        const timeoutId = setTimeout(checkSessionTimeout, 10000); // Check every 10 seconds
        setSessionTimeout(timeoutId);
      }
    };

    const timeoutId = setTimeout(checkSessionTimeout, 10000);
    setSessionTimeout(timeoutId);

    return () => {
      clearTimeout(sessionTimeout);
    };
  }, [lastActivity]);

  // Input sanitization function
  const sanitizeInput = (input) => {
    if (!input) return "";
    
    // Remove potentially dangerous characters and trim whitespace
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
      .replace(/javascript:/gi, "") // Remove javascript: to prevent JavaScript injection
      .replace(/on\w+=/gi, ""); // Remove event handlers like onclick=
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handles login with Firebase Auth and route redirection based on user role
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    
    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      // Set persistence type based on "Remember Me" selection
      const persistenceType = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistenceType);

      // Attempt to sign in with sanitized email and password
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;

      // Retrieve user document from Firestore to check role
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Reset inactivity timer on successful login
        setLastActivity(Date.now());

        // Navigate to appropriate dashboard based on user role
        if (userData.role === "admin" || userData.role === "superadmin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/services");
        }
      } else {
        console.log("No user role found.");
        setError("User role not found. Please contact support.");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid email or password. Please try again.");
    }
  };

  // Sends password reset email using Firebase Auth with double confirmation
  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    setEmailsMismatch(false);

    const sanitizedEmail = sanitizeInput(resetEmail);
    const sanitizedConfirmEmail = sanitizeInput(confirmResetEmail);

    if (!sanitizedEmail) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    if (!isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Check if emails match for double confirmation
    if (sanitizedEmail !== sanitizedConfirmEmail) {
      setEmailsMismatch(true);
      setError("Email addresses do not match. Please verify and try again.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, sanitizedEmail);
      setMessage("Password reset email sent! Check your inbox.");
      setShowResetPrompt(false);
      setResetEmail("");
      setConfirmResetEmail("");
    } catch (err) {
      console.error("Reset error:", err.message);
      setError("Failed to send reset email. Make sure the email is correct.");
    }
  };

  // Handle email input change with sanitization
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
  };

  // Handle reset email input change with sanitization
  const handleResetEmailChange = (e) => {
    const value = e.target.value;
    setResetEmail(value);
    
    // Clear mismatch error when user types
    if (emailsMismatch) {
      setEmailsMismatch(false);
    }
  };

  // Handle confirm reset email input change with sanitization
  const handleConfirmResetEmailChange = (e) => {
    const value = e.target.value;
    setConfirmResetEmail(value);
    
    // Clear mismatch error when user types
    if (emailsMismatch) {
      setEmailsMismatch(false);
    }
  };

  return (
    <>
      <div className="decorative-elements">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="vertical-line line-1"></div>
        <div className="vertical-line line-2"></div>
        <div className="horizontal-line line-3"></div>
        <div className="horizontal-line line-4"></div>
        <div className="dots"></div>
      </div>

      <div className="page-container">
        <div className="login-container">
          <div className="profile-section">
            <div className="profile-icon">
              <img src="/images/profile-placeholder.png" alt="Profile" />
            </div>
            <h2 className="welcome-text">Welcome!</h2>
          </div>

          <div className="login-box">
            <div className="corner-bl"></div>

            <form onSubmit={handleLogin}>
              {error && (
                <div className="error-message">
                  <FaExclamationTriangle className="error-icon" />
                  <p>{error}</p>
                </div>
              )}
              {message && <p className="success-message">{message}</p>}

              <div className="input-group">
                <span className="input-icon"><FaUser /></span>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  aria-label="Email"
                />
              </div>

              <div className="input-group">
                <span className="input-icon"><FaLock /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                  autoComplete="current-password"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  role="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex="0"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="options">
{/*                 <div className="remember-me">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <label htmlFor="remember-me">Remember me</label>
                </div> */}
                <span
                  className="forgot-password"
                  onClick={() => setShowResetPrompt(true)}
                  role="button"
                  tabIndex="0"
                >
                  Forgot Password?
                </span>
              </div>

              <button type="submit" className="login-button">
                Sign In
              </button>
            </form>

            {showResetPrompt && (
              <div className="reset-dialog">
                <h3>Reset Password</h3>
                {error && emailsMismatch && (
                  <div className="error-message">
                    <FaExclamationTriangle className="error-icon" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="input-group">
                  <span className="input-icon"><FaUser /></span>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={handleResetEmailChange}
                    required
                    aria-label="Reset email"
                  />
                </div>

                <div className="input-group">
                  <span className="input-icon"><FaUser /></span>
                  <input
                    type="email"
                    placeholder="Confirm your email"
                    value={confirmResetEmail}
                    onChange={handleConfirmResetEmailChange}
                    required
                    aria-label="Confirm reset email"
                    className={emailsMismatch ? "input-error" : ""}
                  />
                </div>

                <div className="reset-actions">
                  <button
                    className="cancel"
                    onClick={() => {
                      setShowResetPrompt(false);
                      setResetEmail("");
                      setConfirmResetEmail("");
                      setEmailsMismatch(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="submit"
                    onClick={handleResetPassword}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;