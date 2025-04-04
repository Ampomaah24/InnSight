import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import "../assets/styles/SignUp.css";

export default function SignUp() {
  // State hook to manage form data (user's input fields)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State hook to handle error messages
  const [error, setError] = useState("");
  
  // React Router's navigate hook to redirect users after successful sign up
  const navigate = useNavigate();

  // Handles form input changes and updates the state with user input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles form submission, creating a new user in Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset the error message before checking validations
    setError("");

    // Check if the passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Password strength validation (ensures at least one uppercase, one lowercase, a number, a special character, and a period)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (!strongPasswordRegex.test(formData.password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, special character, and a period."
      );
      return;
    }

    try {
      // Create a new user with email and password using Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Store additional user information in Firestore after successful registration
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        uid: user.uid,
        role: "user",
        createdAt: new Date(),
      });

      // Log success and navigate to the homepage after registration
      console.log("User registered and saved to Firestore:", user.email);
      navigate("/login"); // Redirect to homepage or desired page after registration
    } catch (err) {
      // Catch any errors from Firebase and display the error message
      console.error("Firebase error:", err.code, err.message);
      setError(err.message); // Set the error message to display to the user
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
