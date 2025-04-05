import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
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

  const navigate = useNavigate();

  // Handles login with Firebase Auth and route redirection based on user role
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      // Set persistence type based on "Remember Me" selection
      const persistenceType = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistenceType);

      // Attempt to sign in with provided email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Retrieve user document from Firestore to check role
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Navigate to appropriate dashboard based on user role
        if (userData.role === "admin" || userData.role === "superadmin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/services");
        }
      } else {
        console.log("No user role found.");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid email or password. Please try again.");
    }
  };

  // Sends password reset email using Firebase Auth
  const handleResetPassword = async () => {
    setError("");
    setMessage("");

    if (!resetEmail) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage("Password reset email sent! Check your inbox.");
      setShowResetPrompt(false);
      setResetEmail("");
    } catch (err) {
      console.error("Reset error:", err.message);
      setError("Failed to send reset email. Make sure the email is correct.");
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
              {error && <p className="error-message">{error}</p>}
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
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

          
              <div className="options">
                
                <span
                  className="forgot-password"
                  onClick={() => setShowResetPrompt(true)}
                >
                  Forgot Password?
                </span>
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-button">
                Sign In
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
                  />
                </div>

                <div className="reset-actions">
                  <button
                    className="cancel"
                    onClick={() => setShowResetPrompt(false)}
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

