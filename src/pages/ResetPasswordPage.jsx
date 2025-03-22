import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import "../assets/styles/ResetPasswordPage.css"; // Optional: your own styles

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      console.error("Reset error:", err.message);
      setError("Could not send reset email. Please check the email and try again.");
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-card">
        <h2>Reset Your Password</h2>
        <form onSubmit={handleResetPassword}>
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Reset Email</button>
          <button type="button" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
  
};

export default ResetPasswordPage;
