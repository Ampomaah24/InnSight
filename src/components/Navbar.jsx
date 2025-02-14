import React from "react";
import { FaSearch, FaBell, FaThLarge, FaUserCircle } from "react-icons/fa";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">InnSight</div>

      <div className="navbar-center">
        <ul>
          <li><a href="#">Dashboard</a></li>
          <li><a href="#">Check-in</a></li>
          <li><a href="#">Reservations</a></li>
          <li><a href="#">Users</a></li>
          <li><a href="#">Reports</a></li>
        </ul>
      </div>

      <div className="navbar-right">
        <FaSearch className="icon" />
        <FaBell className="icon" />
        <FaThLarge className="icon" />
        <FaUserCircle className="icon" />
      </div>
    </nav>
  );
};

export default Navbar;
