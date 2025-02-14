import React from "react";
import { FaSearch, FaBell, FaThLarge, FaUserCircle } from "react-icons/fa";
import "../assets/styles/Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Left Side - Brand Name */}
      <div className="navbar-left">
        <span className="brand-name">InnSight</span>
      </div>

      {/* Center - Navigation Links */}
      <div className="navbar-center">
        <ul>
          <li><a href="#">Dashboard</a></li>
          <li><a href="#">Check-in</a></li>
          <li><a href="#">Reservations</a></li>
          <li><a href="#">Users</a></li>
          <li><a href="#">Reports</a></li>
        </ul>
      </div>

      {/* Right Side - Icons */}
      <div className="navbar-right">
        <FaSearch className="icon" />
        <FaBell className="icon" />
        <FaThLarge className="icon" />
        <FaUserCircle className="profile-icon" />
      </div>
    </nav>
  );
};

export default Navbar;
