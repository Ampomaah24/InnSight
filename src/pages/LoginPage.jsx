import React, { useState, useEffect } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaExclamationTriangle } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../assets/styles/LoginPage.css";

// Import useUser only if you're sure the context is set up
// import { useUser } from "../context/UserContext";

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
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  // Uncomment this once your context is working
  // const { setCurrentUser } = useUser();

  useEffect(() => {
    // Check if the user was redirected due to session timeout
    const params = new URLSearchParams(window.location.search);
    if (params.get('timeout') === 'true') {
      setTimeoutOccurred(true);
      // Remove the parameter to prevent showing the message on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Helper functions
  const sanitizeInput = (input) => {
    if (!input) return "";
    return input.trim().replace(/[<>]/g, "").replace(/javascript:/gi, "").replace(/on\w+=/gi, "");
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    const sanitizedEmail = sanitizeInput(email);
    if (!isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      // First check network connectivity
      if (!navigator.onLine) {
        setError("Network connection is unavailable. Please check your internet connection.");
        setIsLoading(false);
        return;
      }

      await setPersistence(auth, browserSessionPersistence);
      
      // Add timeout to the Firebase request
      const loginPromise = signInWithEmailAndPassword(auth, sanitizedEmail, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Login request timed out")), 10000)
      );
      
      const userCredential = await Promise.race([loginPromise, timeoutPromise]);
      const user = userCredential.user;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Debug logging to see the actual role value
          console.log("User data retrieved:", {
            email: user.email,
            role: userData.role,
            rawUserData: userData
          });
          
          // Normalize user data
          const normalizedUser = {
            id: user.uid,
            email: user.email,
            fullName: userData.fullName || "",
            // Add other properties as needed
            role: userData.role ? userData.role.toLowerCase() : 'user', // Normalize role to lowercase
          };
          
          // Update sessionStorage with current user
          sessionStorage.setItem('currentUser', JSON.stringify(normalizedUser));
          
          // If using context, update it here
          // setCurrentUser(normalizedUser);
          
          // Improved role check with normalization and explicit logging
          const isAdmin = normalizedUser.role === "admin" || normalizedUser.role === "superadmin";
          console.log("Is user admin?", isAdmin, "Role:", normalizedUser.role);
          
          // Check for stored redirect path from session timeout
          const redirectPath = localStorage.getItem('redirectAfterLogin');
          if (redirectPath) {
            console.log("Redirecting to stored path after timeout:", redirectPath);
            localStorage.removeItem('redirectAfterLogin');
            navigate(redirectPath);
          } else {
            // Use standard navigation with more explicit logging
            const targetPath = isAdmin ? "/admin-dashboard" : "/services";
            console.log("Standard navigation to:", targetPath);
            navigate(targetPath);
          }
        } else {
          console.error("User document not found in Firestore");
          setError("User profile not found. Please contact support.");
          setIsLoading(false);
        }
      } catch (firestoreErr) {
        console.error("Firestore error:", firestoreErr.message);
        setError("Unable to fetch user profile. Please try again later.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err.message, err.code);
      setIsLoading(false);
      
      // Handle specific Firebase errors with user-friendly messages
      switch(err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Invalid email or password. Please try again.");
          break;
        case 'auth/network-request-failed':
          setError("Network connection issue. Please check your internet and try again.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed login attempts. Please try again later or reset your password.");
          break;
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.");
          break;
        default:
          if (err.message === "Login request timed out") {
            setError("Login request timed out. Please check your network connection and try again.");
          } else {
            setError("An error occurred during login. Please try again later.");
          }
      }
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    setEmailsMismatch(false);
    setIsLoading(true);

    const sanitizedEmail = sanitizeInput(resetEmail);
    const sanitizedConfirmEmail = sanitizeInput(confirmResetEmail);

    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    if (sanitizedEmail !== sanitizedConfirmEmail) {
      setEmailsMismatch(true);
      setError("Email addresses do not match.");
      setIsLoading(false);
      return;
    }

    try {
      if (!navigator.onLine) {
        setError("Network connection is unavailable. Please check your internet connection.");
        setIsLoading(false);
        return;
      }
      
      await sendPasswordResetEmail(auth, sanitizedEmail);
      setMessage("Password reset email sent! Check your inbox.");
      setShowResetPrompt(false);
      setResetEmail("");
      setConfirmResetEmail("");
    } catch (err) {
      console.error("Reset error:", err.message);
      
      if (err.code === 'auth/user-not-found') {
        // Don't reveal if email exists in the system
        setMessage("If this email is registered, you'll receive a password reset link shortly.");
        setShowResetPrompt(false);
        setResetEmail("");
        setConfirmResetEmail("");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network connection issue. Please check your internet and try again.");
      } else {
        setError("Failed to send reset email. Please try again later.");
      }
    } finally {
      setIsLoading(false);
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
                <span
                  className="toggle-password"
                  onClick={() => !isLoading && setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="options">
                <span
                  className="forgot-password"
                  onClick={() => !isLoading && setShowResetPrompt(true)}
                >
                  Forgot Password?
                </span>
              </div>

              <button 
                type="submit" 
                className="login-button" 
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>

                <div className="reset-actions">
                  <button 
                    className="cancel" 
                    onClick={() => !isLoading && setShowResetPrompt(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="submit" 
                    onClick={handleResetPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Reset"}
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