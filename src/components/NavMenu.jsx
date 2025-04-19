import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import "../assets/styles/NavMenu.css";

const NavMenu = ({ menuOpen, setMenuOpen }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Close menu and navigate to home page after successful logout
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle mouse leave to close menu with a slight delay
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Cancel the close timeout if mouse returns to menu
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle click outside to close menu (backup method)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    // Add event listener when menu is open
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Cleanup the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, setMenuOpen]);

  return (
    <nav className="nav">
      <div 
        className="menu-container" 
        ref={menuRef}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="hamburger-icon">☰</span>
        </div>
        {menuOpen && (
          <div className="dropdown-menu">
            <Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link>
            <Link to="/restaurant" onClick={() => setMenuOpen(false)}>Restaurant</Link>
            <Link to="/guest-bills" onClick={() => setMenuOpen(false)}>Billing</Link>
            <Link to="/room-listings" onClick={() => setMenuOpen(false)}>Room Listings</Link>
            <Link to="/conference-listings" onClick={() => setMenuOpen(false)}>Conference Room Listings</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link>
            <button
              className="logout-link"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavMenu;