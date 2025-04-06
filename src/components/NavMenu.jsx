import React from "react";
import { Link } from "react-router-dom";
import "../assets/styles/NavMenu.css";

const NavMenu = ({ menuOpen, setMenuOpen }) => {
  return (
    <nav className="nav">
      <div className="menu-container">
        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>☰</div>
        {menuOpen && (
          <div className="dropdown-menu">
            <Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link>
            <Link to="/restaurant" onClick={() => setMenuOpen(false)}>Restaurant</Link>
            <Link to="/guest-bills" onClick={() => setMenuOpen(false)}>Billing</Link>
            <Link to="/room-listings" onClick={() => setMenuOpen(false)}>Room Listings</Link>
            <Link to="/conference-listings" onClick={() => setMenuOpen(false)}>Conference Room Listings</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link>
            <Link to="/" onClick={() => setMenuOpen(false)}>Logout</Link>
          

          </div>
        )}
      </div>
    </nav>
  );
};

export default NavMenu;
