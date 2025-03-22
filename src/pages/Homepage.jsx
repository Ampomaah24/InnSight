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
      </div>
    </div>
  );
};

export default Homepage;
