import React, { useState } from "react";
<<<<<<< HEAD
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
=======
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"; // Added Eye Icons
import "../assets/styles/LoginPage.css"; // Import the CSS file
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
<<<<<<< HEAD
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const persistenceType = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistenceType);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.role === "admin") {
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
=======

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Logging in with:", email, password);
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
  };

  return (
    <div className="login-container">
<<<<<<< HEAD
      <div className="profile-section">
        <div className="profile-icon">
=======
      {/* Profile Section */}
      <div className="profile-section">
        <div className="profile-icon">
          {/* Placeholder for Profile Picture */}
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
          <img src="/images/profile-placeholder.png" alt="Profile" />
        </div>
        <h2 className="welcome-text">Welcome!</h2>
      </div>

<<<<<<< HEAD
      <div className="login-box">
        <form onSubmit={handleLogin}>
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

=======
      {/* Login Box */}
      <div className="login-box">
        <form onSubmit={handleLogin}>
          {/* Email Input */}
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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

<<<<<<< HEAD
=======
          {/* Password Input with Toggle */}
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
          <div className="input-group">
            <span className="input-icon"><FaLock /></span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
<<<<<<< HEAD
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
=======
            {/* Toggle Password Visibility */}
            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

<<<<<<< HEAD
          <div className="options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />{" "}
              Remember me
            </label>
            <span
  className="forgot-password"
  style={{ cursor: "pointer", color: "#007bff" }}
  onClick={() => navigate("/reset-password")}
>
  Forgot Password?
</span>

          </div>

          <button type="submit" className="login-button">Sign In</button>
        </form>

=======
          {/* Remember Me & Forgot Password */}
          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          {/* Sign-In Button */}
          <button type="submit" className="login-button">Sign In</button>
        </form>
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
      </div>
    </div>
  );
};

export default LoginPage;
