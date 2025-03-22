<<<<<<< HEAD
import React, { useState } from "react";
import { Link } from "react-router-dom";
import NavMenu from "../components/NavMenu"; 
import backgroundImage from "../assets/images/360_F_29133877_bfA2n7cWV53fto2BomyZ6pyRujJTBwjd.jpg";
import "../assets/styles/Homepage.css";

const Homepage = () => {
  const [menuOpen, setMenuOpen] = useState(false); // Manage dropdown menu state

  return (
    <div className="homepage">
      {/* Navbar with Login Button inside */}
      <div className="nav">
  <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
  <Link to="/login" className="login">Log In</Link>
</div>


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

        {/* Guest Button now opens menu */}
        <button className="guest-btn" onClick={() => setMenuOpen(!menuOpen)}>
          Continue as a Guest
        </button>
=======
import React from "react"; // Importing React library
import "../assets/styles/Homepage.css"; // Importing external CSS file for styling

const Homepage = () => {
  return (
    <div className="homepage">
      {/* Navbar Section  */}
      <div className="navbar">
       
        <button className="menu-icon">
          <div></div> 
          <div></div> 
          <div></div> 
        </button>

        <a href="/login" className="login">Log In</a>
      </div>

      {/* Main Content Section */}
      <div className="content">
        
        <h1 className="title">AMPOMAAH TOURIST HOTEL</h1>
        <p className="subtitle">Experience Hospitality, Embrace Tranquility</p>
        <div className="options">
          <p>Don't have an account? <a href="/signup" className="signup-link">Sign-Up</a></p>

          <p className="or-text">OR</p>
          <button className="guest-button">Continue as a Guest</button>
        </div>
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default Homepage;
=======
export default Homepage; // Exporting the Homepage component for use in the App
>>>>>>> 5e4bcf3544a1d7fe29e319b1608574fbc338a6a2
