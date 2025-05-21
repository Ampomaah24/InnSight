import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification 
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import "../assets/styles/SignUp.css";
import signUP1 from "../assets/images/IMG_0123.JPG";

export default function SignUp() {

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });


  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const sanitizeInput = (input) => {
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .trim();
  };

  // Handles form input changes and updates the state with user input
  const handleChange = (e) => {
    const { name, value } = e.target;
    // sanitizing input
    const sanitizedValue = sanitizeInput(value);
    setFormData({ ...formData, [name]: sanitizedValue });
  };

  //  user friendly error messages
  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please use a different email or try logging in.";
      case "auth/invalid-email":
        return "The email address format is invalid. Please check and try again.";
      case "auth/weak-password":
        return "The password is too weak. Please choose a stronger password.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/too-many-requests":
        return "Too many unsuccessful attempts. Please try again later.";
      default:
        return "An error occurred during registration. Please try again.";
    }
  };

  // password strngth validation
  const validatePasswordStrength = (password) => {
    // Check length
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return "Password must include at least one uppercase letter.";
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return "Password must include at least one lowercase letter.";
    }
    
    // Check for number
    if (!/\d/.test(password)) {
      return "Password must include at least one number.";
    }
    
    // Check for special character
    if (!/[@$!%*?&.]/.test(password)) {
      return "Password must include at least one special character (@$!%*?&.).";
    }
    
    return null;
  };

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    // Additional input validation
    if (!formData.fullName || formData.fullName.length < 2) {
      setError("Please enter a valid name with at least 2 characters.");
      setIsSubmitting(false);
      return;
    }

    // Email format validation 
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    // Check if the passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const passwordError = validatePasswordStrength(formData.password);
    if (passwordError) {
      setError(passwordError);
      setIsSubmitting(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Store additional user information in Firestore after successful registration
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        uid: user.uid,
        role: "user",
        createdAt: new Date(),
        emailVerified: false,
      });

      setSuccessMessage("Account created successfully! Please check your email to verify your account.");
      
      // Clear form data
      setFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (err) {

      console.error("Firebase error:", err.code, err.message);
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      <div >
        <img src={signUP1} alt="" className="signup-image" />
      </div>

    {successMessage && (
    <p className="success-message" role="status">
      {successMessage}
    </p>
  )}
      <div className="signup-form-container">
        <div className="signup-form">
 

          <h2 className="signup-title">Sign Up</h2>
          {error && (
  <p className="error-message" role="alert">
    <span style={{ marginRight: "0.5rem" }}>⚠️</span>{error}
  </p>
)}

          
          <form onSubmit={handleSubmit} className="signup-form-fields" noValidate>
            <div>
              <label className="signup-label" htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Name..."
                className="signup-input"
                required
                aria-label="Full Name"
                aria-required="true"
                autoComplete="name"
                minLength="2"
              />
            </div>

            <div>
              <label className="signup-label" htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address..."
                className="signup-input"
                required
                aria-label="Email"
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="signup-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter Password..."
                className="signup-input"
                required
                aria-label="Password"
                aria-required="true"
                autoComplete="new-password"
                minLength="8"
              />
          
            </div>

            <div>
              <label className="signup-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Enter Password..."
                className="signup-input"
                required
                aria-label="Confirm Password"
                aria-required="true"
                autoComplete="new-password"
                minLength="8"
                aria-describedby="password-requirements"
              />
            </div>
            
            <button 
              type="submit" 
              className={`signup-button ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </button>
          </form>
          
          <div className="login-redirect">
            <p>Already have an account? <a href="/login">Login here</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}