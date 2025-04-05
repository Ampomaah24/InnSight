// Import necessary dependencies and components
import React, { useState, useEffect } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../assets/styles/LoginPage.css"; // Custom styles

// LoginPage component
const LoginPage = () => {
  // State variables for login form fields and UI feedback
  const [email, setEmail] = useState("");                 
  const [password, setPassword] = useState("");            
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState("");                 
  const [message, setMessage] = useState("");             
  const [showResetPrompt, setShowResetPrompt] = useState(false); 
  const [resetEmail, setResetEmail] = useState("");        

  const navigate = useNavigate(); // Navigation hook

  // Auto logout after inactivity (15 minutes)
  useEffect(() => {
    const timeout = setTimeout(() => {
      signOut(auth);
      navigate("/login"); // Redirect to login page
    }, 15 * 60 * 1000); // 15 minutes timeout

    const resetTimer = () => {
      clearTimeout(timeout); 
    };

    // Track user activity to reset the logout timer
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [navigate]);

  // Handle user login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const sanitizedEmail = email.trim();
      const sanitizedPassword = password.trim();


      // Attempt Firebase sign in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        sanitizedEmail,
        sanitizedPassword
      );
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Route user based on role
        if (userData.role === "admin" || userData.role === "superadmin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/services");
        }
      } else {
        setError("User role not found.");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid email or password. Please try again.");
    }
  };

  // Handle password reset functionality
  const handleResetPassword = async () => {
    setError("");
    setMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to reset your password?"
    );
    if (!confirmed) return;

    if (!resetEmail.trim()) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim()); // Firebase reset email
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

          {/* Login form  */}
          <div className="login-box">
            <div className="corner-bl"></div>

            
            <form onSubmit={handleLogin}>
            
              {error && <p className="error-message">{error}</p>}
              {message && <p className="success-message">{message}</p>}

          
              <div className="input-group">
                <span className="input-icon">
                  <FaUser />
                </span>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                />
              </div>

              {/* Password input  */}
              <div className="input-group">
                <span className="input-icon">
                  <FaLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.trim())}
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

          
              <button type="submit" className="login-button">
                Sign In
              </button>
            </form>

           
            {showResetPrompt && (
              <div className="reset-dialog">
                <h3>Reset Password</h3>

                {/* Reset email input */}
                <div className="input-group">
                  <span className="input-icon">
                    <FaUser />
                  </span>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value.trim())}
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
