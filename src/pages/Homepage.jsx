






import React from "react";
import "../assets/styles/Homepage.css"; // Updated CSS import

const Homepage = () => {
  return (
    <div className="homepage">
      {/* Navbar */}
      <div className="navbar">
        <button className="menu-icon">
          <div></div>
          <div></div>
          <div></div>
        </button>
        <a href="/login" className="login">Log In</a>
      </div>

      {/* Main Content */}
      <div className="content">
        <h1 className="title">AMPOMAAH TOURIST HOTEL</h1>
        <p className="subtitle">Experience Hospitality, Embrace Tranquility</p>

        {/* Signup and Guest Options */}
        <div className="options">
          <p>Don't have an account? <a href="/signup" className="signup-link">Sign-Up</a></p>
          <p className="or-text">OR</p>
          <button className="guest-button">Continue as a Guest</button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;


