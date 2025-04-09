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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [confirmResetEmail, setConfirmResetEmail] = useState("");
  const [emailsMismatch, setEmailsMismatch] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user was redirected due to session timeout
    const params = new URLSearchParams(window.location.search);
    if (params.get('timeout') === 'true') {
      setTimeoutOccurred(true);
      // Remove the parameter to prevent showing the message on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ✨ Helper functions
  const sanitizeInput = (input) => {
    if (!input) return "";
    return input.trim().replace(/[<>]/g, "").replace(/javascript:/gi, "").replace(/on\w+=/gi, "");
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const sanitizedEmail = sanitizeInput(email);
    if (!isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check for stored redirect path from session timeout
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        } else {
          // Use standard navigation
          navigate(userData.role === "admin" || userData.role === "superadmin" ? "/admin-dashboard" : "/services");
        }
      } else {
        setError("User role not found. Please contact support.");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid email or password. Please try again.");
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    setEmailsMismatch(false);

    const sanitizedEmail = sanitizeInput(resetEmail);
    const sanitizedConfirmEmail = sanitizeInput(confirmResetEmail);

    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (sanitizedEmail !== sanitizedConfirmEmail) {
      setEmailsMismatch(true);
      setError("Email addresses do not match.");
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
      setError("Failed to send reset email.");
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

            {timeoutOccurred && (
              <div className="timeout-message">
                <FaExclamationTriangle className="error-icon" />
                <p>Your session expired due to inactivity. Please log in again.</p>
              </div>
            )}

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
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  autoComplete="current-password"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <span
                  className="forgot-password"
                  onClick={() => setShowResetPrompt(true)}
                >
                  Forgot Password?
                </span>
              </div>

              <button type="submit" className="login-button">Sign In</button>
            </form>

            {showResetPrompt && (
              <div className="reset-dialog">
                <h3>Reset Password</h3>
                {emailsMismatch && (
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
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setEmailsMismatch(false);
                    }}
                    required
                  />
                </div>
                <div className="input-group">
                  <span className="input-icon"><FaUser /></span>
                  <input
                    type="email"
                    placeholder="Confirm your email"
                    value={confirmResetEmail}
                    onChange={(e) => {
                      setConfirmResetEmail(e.target.value);
                      setEmailsMismatch(false);
                    }}
                    required
                    className={emailsMismatch ? "input-error" : ""}
                  />
                </div>

                <div className="reset-actions">
                  <button className="cancel" onClick={() => setShowResetPrompt(false)}>
                    Cancel
                  </button>
                  <button className="submit" onClick={handleResetPassword}>
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