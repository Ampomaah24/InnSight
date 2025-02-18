import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth"; // Import Firebase auth
import { auth } from "../config/firebase"; // Import auth instance
import "../assets/styles/SignUp.css";

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      console.log("User signed up:", formData.email);
      navigate("/services"); // Redirect after successful signup
    } catch (err) {
      setError("Error signing up. Please try again.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-image"></div>

      <div className="signup-form-container">
        <div className="signup-form">
          <h2 className="signup-title">Sign Up</h2>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit} className="signup-form-fields">
            <div>
              <label className="signup-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Name..."
                className="signup-input"
                required
              />
            </div>
            <div>
              <label className="signup-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address..."
                className="signup-input"
                required
              />
            </div>
            <div>
              <label className="signup-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter Password..."
                className="signup-input"
                required
              />
            </div>
            <div>
              <label className="signup-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Enter Password..."
                className="signup-input"
                required
              />
            </div>
            <button type="submit" className="signup-button">
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}