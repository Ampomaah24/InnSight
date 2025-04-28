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
import { useNavigate, useLocation } from "react-router-dom";
import "../assets/styles/LoginPage.css";
import bgImage from '../assets/images/orange-2.jpg';

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
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('timeout') === 'true') {
      setTimeoutOccurred(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('redirectAfterLogin');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      // Check for internet connection first
      if (!navigator.onLine) {
        throw new Error("network_error");
      }

      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Create a standardized user object with all required fields
        const normalizedUser = {
          id: user.uid,
          email: user.email,
          role: userData.role ? userData.role.toLowerCase() : 'user',
          fname: userData.firstName || userData.fname || userData.fullName || user.displayName?.split(' ')[0] || "User",
          lname: userData.lastName || userData.lname || user.displayName?.split(' ').slice(1).join(' ') || "",
          fullName: userData.fullName || 
                  `${userData.firstName || userData.fname || ""} ${userData.lastName || userData.lname || ""}`.trim() || 
                  user.displayName || "User",
          photoURL: userData.photoURL || user.photoURL,
          avatar: userData.avatar || null,
          phone: userData.phone || "",
          address: userData.address || "",
          dateOfBirth: userData.dateOfBirth || "",
          bio: userData.bio || "",
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString()
        };
        
        // Store complete user data
        console.log("Storing normalized user data:", normalizedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        
        // Check if the user has admin privileges (both admin and super admin should go to admin dashboard)
        const isAdminUser = normalizedUser.role.includes('admin'); // This will match both "admin" and "super admin"
        
        if (timeoutOccurred) {
          navigate(isAdminUser ? "/admin-dashboard" : "/services", { replace: true });
        } else {
          const redirectPath = localStorage.getItem('redirectAfterLogin') || 
                             (isAdminUser ? "/admin-dashboard" : "/services");
          navigate(redirectPath);
        }
      }
    } catch (err) {
      console.error("Login error:", err.code || err.message);
      
      // Handle different error types
      if (!navigator.onLine || err.message === "network_error" || 
          err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later or reset your password.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else {
        setError("Login failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    setEmailsMismatch(false);
    setIsLoading(true);

    try {
      // Check for internet connection first
      if (!navigator.onLine) {
        throw new Error("network_error");
      }
      
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage("Password reset email sent! Check your inbox.");
      setShowResetPrompt(false);
    } catch (err) {
      if (!navigator.onLine || err.message === "network_error" || 
          err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to send reset email. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleResetPrompt = () => {
    setShowResetPrompt(!showResetPrompt);
    setResetEmail("");
    setError("");
    setMessage("");
  };

  return (
    <div className="page-container">
      <div 
        className="login-background"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>

      <div className="login-container">
        <h1 className="login-title">Account Login</h1>

        {timeoutOccurred && (
          <div className="timeout-message">
  
            <p>Your session expired due to inactivity. Please log in again.</p>
            
          </div>
        )}

        <div className="login-box">
          {!showResetPrompt ? (
            <form onSubmit={handleLogin}>
              {error && (
                <div style={{
                  backgroundColor: "#faded7", 
                  borderRadius: "4px",
                  padding: "10px 15px",
                  marginBottom: "15px",
                  color: "#333",
                  textAlign: "center" 
                }}>
                  {error}
                </div>
              )}
              
              {message && (
                <div className="success-message">
                  <p>{message}</p>
                </div>
              )}

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
                  disabled={isLoading}
                />
                <span
                  className="toggle-password"
                  onClick={() => !isLoading && setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <button 
                type="submit" 
                className="login-button" 
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
              
              <div className="forgot-password">
                <span onClick={toggleResetPrompt}>Forgot password?</span>
              </div>
            </form>
          ) : (
            <div className="reset-dialog">
              <h3>Reset Password</h3>
              
              {error && (
                <div style={{
                  backgroundColor: "#faded7", 
                  borderRadius: "4px",
                  padding: "10px 15px",
                  marginBottom: "15px",
                  color: "#333",
                  textAlign: "center" 
                }}>
                  {error}
                </div>
              )}
              
              {message && (
                <div className="success-message">
                  <p>{message}</p>
                </div>
              )}
              
              <div className="input-group">
                <span className="input-icon"><FaUser /></span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="reset-buttons">
                <button 
                  className="login-button" 
                  onClick={handleResetPassword}
                  disabled={isLoading || !resetEmail}
                >
                  {isLoading ? "Sending..." : "Reset Password"}
                </button>
                
                <button 
                  className="cancel-button" 
                  onClick={toggleResetPrompt}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;