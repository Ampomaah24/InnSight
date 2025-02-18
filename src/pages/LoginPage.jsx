import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { signInWithEmailAndPassword } from "firebase/auth"; // Import Firebase auth
import { auth } from "../config/firebase"; // Import auth instance
import { useNavigate } from "react-router-dom"; // For navigation
import "../assets/styles/LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in:", email);
      navigate("/services"); // Redirect to dashboard after successful login
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="profile-section">
        <div className="profile-icon">
          <img src="/images/profile-placeholder.png" alt="Profile" />
        </div>
        <h2 className="welcome-text">Welcome!</h2>
      </div>

      <div className="login-box">
        <form onSubmit={handleLogin}>
          {error && <p className="error-message">{error}</p>}
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
            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="login-button">Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
