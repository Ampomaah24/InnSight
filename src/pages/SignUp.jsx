import { useState } from "react";
<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore"; // Firestore functions
import { auth, db } from "../config/firebase"; // Import Firestore
import "../assets/styles/SignUp.css";
=======
import "../assets/styles/SignUp.css"; // Import external CSS file
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2

export default function SignUp() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

<<<<<<< HEAD
  const [error, setError] = useState("");
  const navigate = useNavigate();

=======
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

<<<<<<< HEAD
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // ✅ Save user role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        uid: user.uid,
        role: "user",  // Default role is "user"
        createdAt: new Date(),
      });

      console.log("User registered and saved to Firestore:", user.email);
      navigate("/"); // Redirect to home page
    } catch (err) {
      setError("Error signing up. Please try again.");
    }
=======
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
  };

  return (
    <div className="signup-container">
<<<<<<< HEAD
      <div className="signup-image"></div>
      <div className="signup-form-container">
        <div className="signup-form">
          <h2 className="signup-title">Sign Up</h2>
          {error && <p className="error-message">{error}</p>}
=======
      {/* Left Side with Background Image */}
      <div className="signup-image"></div>

      {/* Right Side - Sign Up Form */}
      <div className="signup-form-container">
        <div className="signup-form">
          <h2 className="signup-title">Sign Up</h2>
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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
<<<<<<< HEAD
                required
=======
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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
<<<<<<< HEAD
                required
=======
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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
<<<<<<< HEAD
                required
=======
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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
<<<<<<< HEAD
                required
=======
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
