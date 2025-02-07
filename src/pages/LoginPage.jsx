import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"; // Added Eye Icons
import "../assets/styles/LoginPage.css"; // Import the CSS file

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Logging in with:", email, password);
  };

  return (
    <div className="login-container">
      {/* Profile Section */}
      <div className="profile-section">
        <div className="profile-icon">
          {/* Placeholder for Profile Picture */}
          <img src="/images/profile-placeholder.png" alt="Profile" />
        </div>
        <h2 className="welcome-text">Welcome!</h2>
      </div>

      {/* Login Box */}
      <div className="login-box">
        <form onSubmit={handleLogin}>
          {/* Email Input */}
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

          {/* Password Input with Toggle */}
          <div className="input-group">
            <span className="input-icon"><FaLock /></span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* Toggle Password Visibility */}
            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

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
      </div>
    </div>
  );
};

export default LoginPage;
