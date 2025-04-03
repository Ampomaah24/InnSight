import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavMenu from "../components/NavMenu";
import backgroundImage from "../assets/images/360_F_29133877_bfA2n7cWV53fto2BomyZ6pyRujJTBwjd.jpg";
import "../assets/styles/Homepage.css";

// Homepage component that displays the landing page of the hotel site
const Homepage = () => {
  // State hook to manage the menu's open/closed state
  const [menuOpen, setMenuOpen] = useState(false);
  // State hook to track the loading state of the background image
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Adds a luxury theme class to the body for styling
    const body = document.querySelector('body');
    body.classList.add('luxury-theme');
    
    // Cleanup the theme class when the component unmounts
    return () => {
      body.classList.remove('luxury-theme');
    };
  }, []);

  // Handler for image load event to update the imageLoaded state
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className="homepage">
      <div className="accent-circle accent-circle-top"></div>
      <div className="accent-circle accent-circle-bottom"></div>
      
    
      <header className="fixed-header">
        <div className="header-container">
          <div className="menu-wrapper">
            <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          </div>
          <div className="login-wrapper">
            <Link to="/login" className="login-btn">Log In</Link>
          </div>
        </div>
      </header>
      
      <div className="content">
        <h1>AMPOMAAH TOURIST HOTEL</h1>
        <div className={`image-container ${!imageLoaded ? 'image-loading' : ''}`}>
          <img
            src={backgroundImage}
            alt="Luxury Hotel Pool"
            className="hotel-image"
            onLoad={handleImageLoad}
          />
        </div>
        <p className="tagline">Experience Hospitality, Embrace Tranquility</p>
        <div className="signup-section">
          <p className="signup">
            Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
          </p>
          <div className="or">OR</div>
          <button className="guest-btn" onClick={() => setMenuOpen(!menuOpen)}>
          Continue as a Guest
        </button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;