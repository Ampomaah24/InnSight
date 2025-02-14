import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/NavMenu.css";

const NavMenu = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="nav">
      <div className="menu-container">
        <div className="menu-icon" onClick={toggleMenu}>☰</div>
        {menuOpen && (
          <div className="dropdown-menu">
            <Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link>
            <Link to="/room-listings" onClick={() => setMenuOpen(false)}>Room Listings</Link>
            <Link to="/conference-listings" onClick={() => setMenuOpen(false)}>Conference Room Listings</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavMenu;
