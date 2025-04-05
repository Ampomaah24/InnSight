import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import "../assets/styles/SignUp.css";

export default function SignUp() {
  // State for user input
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is already signed in, redirect to appropriate page
        navigate("/services");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle input field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Sanitize input (removes dangerous characters)
  const sanitize = (str) => str.replace(/[<>]/g, "").trim();

  // Map Firebase auth error codes to user-friendly messages
  const mapAuthCodeToMessage = (code) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password is too weak.";
      case "auth/network-request-failed":
        return "Network error. Please try again.";
      case "auth/operation-not-allowed":
        return "Email/password registration is not enabled.";
      case "auth/internal-error":
        return "Internal error. Please try again.";
      default:
        return `Something went wrong. Please try again. (${code})`;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { fullName, email, password, confirmPassword } = formData;
    
    // Form validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    // Sanitize inputs
    const sanitizedFullName = sanitize(fullName);
    const sanitizedEmail = sanitize(email);

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Enforce strong password rules
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, special character, and a period."
      );
      setLoading(false);
      return;
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        sanitizedEmail,
        password
      );
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Store extra user details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: sanitizedFullName,
        email: sanitizedEmail,
        uid: user.uid,
        role: "user",
        createdAt: new Date(),
        lastLogin: new Date(),
        isVerified: false
      });

      setMessage("Account created! Please verify your email.");
      setFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      // Redirect to login after delay
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Firebase error:", err.code, err.message);
      setError(mapAuthCodeToMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-image"></div>

      <div className="signup-form-container">
        <div className="signup-form">
          <h2 className="signup-title">Sign Up</h2>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          {/* Signup Form */}
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
              <small className="password-hint">
                Must contain 8+ characters with uppercase, lowercase, number, and special character.
              </small>
            </div>

            <div>
              <label className="signup-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password..."
                className="signup-input"
                required
              />
            </div>

            <button 
              type="submit" 
              className="signup-button" 
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            
            <p className="login-link">
              Already have an account? <a href="/login">Login here</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}