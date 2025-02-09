import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "../assets/styles/SignUp.css"; // Import external CSS file

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate(); // Initialize navigation

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simulate form validation before redirecting
    if (
      formData.fullName &&
      formData.email &&
      formData.password &&
      formData.password === formData.confirmPassword
    ) {
      console.log("Form submitted:", formData);

      // Redirect to Services page
      navigate("/services");
    } else {
      alert("Please fill out all fields and ensure passwords match.");
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side with Background Image */}
      <div className="signup-image"></div>

      {/* Right Side - Sign Up Form */}
      <div className="signup-form-container">
        <div className="signup-form">
          <h2 className="signup-title">Sign Up</h2>
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
