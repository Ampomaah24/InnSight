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
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const normalizedUser = {
          id: user.uid,
          email: user.email,
          role: userData.role ? userData.role.toLowerCase() : 'user',
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        
        if (timeoutOccurred) {
          navigate(normalizedUser.role === "admin" ? "/admin-dashboard" : "/services", { replace: true });
        } else {
          const redirectPath = localStorage.getItem('redirectAfterLogin') || 
                             (normalizedUser.role === "admin" ? "/admin-dashboard" : "/services");
          navigate(redirectPath);
        }
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
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
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage("Password reset email sent! Check your inbox.");
      setShowResetPrompt(false);
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
            <FaExclamationTriangle className="error-icon" />
            <p>Your session expired due to inactivity. Please log in again.</p>
          </div>
        )}

        <div className="login-box">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="error-message">
                <FaExclamationTriangle className="error-icon" />
                <p>{error}</p>
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
          </form>

          {showResetPrompt && (
            <div className="reset-dialog">
              <h3>Reset Password</h3>
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
              <button 
                className="login-button" 
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Reset Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;