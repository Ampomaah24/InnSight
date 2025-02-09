import React, { useState } from "react";
import { Link } from "react-router-dom";
import backgroundImage from "../assets/images/360_F_29133877_bfA2n7cWV53fto2BomyZ6pyRujJTBwjd.jpg";
import "../assets/styles/Homepage.css";

const Homepage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="homepage">
      <nav className="nav">
        {/* Dropdown Menu */}
        <div className="menu-container">
          <div className="menu-icon" onClick={toggleMenu}>☰</div>
          {menuOpen && (
            <div className="dropdown-menu">
              <Link to="/services">Services</Link>
              <Link to="/room-listings">Room Listings</Link>
              <Link to="/conference-rooms">Conference Room Listings</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/contact">Contact Us</Link>
            </div>
          )}
        </div>
        <Link to="/login" className="login">Log In</Link>
      </nav>

      <div className="content">
        <h1>AMPOMAAH TOURIST HOTEL</h1>

        <div className="image-container">
          <img src={backgroundImage} alt="Hotel" className="hotel-image" />
        </div>

        <p className="tagline">Experience Hospitality, Embrace Tranquility</p>

        <p className="signup">
          Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
        </p>

        <p className="or">OR</p>

        <button className="guest-btn" onClick={toggleMenu}>
          Continue as a Guest
        </button>
      </div>
    </div>
  );
};

export default Homepage;
