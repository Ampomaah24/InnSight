 import React from "react";
import { Link } from "react-router-dom";
import NavMenu from "../components/NavMenu"; // Import the NavMenu component
import backgroundImage from "../assets/images/360_F_29133877_bfA2n7cWV53fto2BomyZ6pyRujJTBwjd.jpg";
import "../assets/styles/Homepage.css";

const Homepage = () => {
  return (
    <div className="homepage">
      <NavMenu /> {/* Use the extracted NavMenu component */}
      <Link to="/login" className="login">Log In</Link>
      

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

        <button ><Link to="/services" className="guest-btn"> Continue as a Guest </Link></button>
      </div>
    </div>
  );
};

export default Homepage;
