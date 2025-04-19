import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaHome, 
  FaCalendarAlt, 
  FaKey, 
  FaBed, 
  FaCog, 
  FaChartBar, 
  FaMoneyBillWave, 
  FaSignOutAlt,
  FaEdit,
  FaUserPlus,
  FaTags,
  FaPlaneDeparture,
  FaFileInvoiceDollar
} from "react-icons/fa";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Check if the current path matches the specified path
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Set sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle logout
  const handleLogout = () => {
    auth.signOut()
      .then(() => {
        // Clear session storage
        sessionStorage.removeItem('currentUser');
        // Redirect to login page
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  return (
    <>
      {isMobile && (
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <span>☰</span>
        </button>
      )}
      
      <aside className={`sidebar ${isMobile ? (isSidebarOpen ? 'open' : 'closed') : ''}`}>
        <div className="sidebar-logo">
          <h2>InnSight</h2>
        </div>
        
        <ul className="sidebar-menu">
          <li className={`sidebar-item ${isActive('/admin-dashboard') ? 'active' : ''}`}>
            <Link to="/admin-dashboard">
              <span className="sidebar-icon"><FaHome /></span>
              <span className="sidebar-text">Dashboard</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/reservations') ? 'active' : ''}`}>
            <Link to="/reservations">
              <span className="sidebar-icon"><FaCalendarAlt /></span>
              <span className="sidebar-text">Reservations</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/check-in') ? 'active' : ''}`}>
            <Link to="/check-in">
              <span className="sidebar-icon"><FaKey /></span>
              <span className="sidebar-text">Check-in / Check-out</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/rooms') ? 'active' : ''}`}>
            <Link to="/rooms">
              <span className="sidebar-icon"><FaBed /></span>
              <span className="sidebar-text">Rooms & Availability</span>
            </Link>
          </li>
          
          {/* Room Management Link */}
          <li className={`sidebar-item ${isActive('/room-management') ? 'active' : ''}`}>
            <Link to="/room-management">
              <span className="sidebar-icon"><FaEdit /></span>
              <span className="sidebar-text">Room Management</span>
            </Link>
          </li>
          
         
      
          
          {/* User Registration Link */}
          <li className={`sidebar-item ${isActive('/user-registration') ? 'active' : ''}`}>
            <Link to="/user-registration">
              <span className="sidebar-icon"><FaUserPlus /></span>
              <span className="sidebar-text">User Registration</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/pickup') ? 'active' : ''}`}>
            <Link to="/pickup">
              <span className="sidebar-icon"><FaPlaneDeparture /></span>
              <span className="sidebar-text">Airport Pickups</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/bills') ? 'active' : ''}`}>
            <Link to="/bills">
              <span className="sidebar-icon"><FaFileInvoiceDollar /></span>
              <span className="sidebar-text">Outstanding Bills</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/add-expense') ? 'active' : ''}`}>
            <Link to="/add-expense">
              <span className="sidebar-icon"><FaMoneyBillWave /></span>
              <span className="sidebar-text">Expenses</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/freports') ? 'active' : ''}`}>
            <Link to="/freports">
              <span className="sidebar-icon"><FaChartBar /></span>
              <span className="sidebar-text">Reports & Analytics</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/ad_settings') ? 'active' : ''}`}>
            <Link to="/ad_settings">
              <span className="sidebar-icon"><FaCog /></span>
              <span className="sidebar-text">Settings</span>
            </Link>
          </li>
          
  {/*         <li className="sidebar-item" onClick={handleLogout}>
            <Link to="#">
              <span className="sidebar-icon"><FaSignOutAlt /></span>
              <span className="sidebar-text">Logout</span>
            </Link>
          </li> */}
        </ul>
        
        <div className="sidebar-footer">
          <p>Ampomaah Tourist Hotel</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;