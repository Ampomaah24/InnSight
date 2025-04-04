import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaHome, 
  FaCalendarCheck, 
  FaUsers, 
  FaChartBar, 
  FaBed, 
  FaMoneyBillWave, 
  FaCog, 
  FaKey,
  FaBars,
  FaTimes
} from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if current path matches the menu item path
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    handleResize();
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <>
      {isMobile && (
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
      )}
      
      <div className={`sidebar ${isMobile && sidebarOpen ? 'open' : ''} ${isMobile && !sidebarOpen ? 'closed' : ''}`}>
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
              <span className="sidebar-icon"><FaCalendarCheck /></span>
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
          
          <li className={`sidebar-item ${isActive('/ad_settings') ? 'active' : ''}`}>
            <Link to="/ad_settings">
              <span className="sidebar-icon"><FaUsers /></span>
              <span className="sidebar-text">Settings</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/add-expense') ? 'active' : ''}`}>
            <Link to="/add-expense">
              <span className="sidebar-icon"><FaMoneyBillWave /></span>
              <span className="sidebar-text">Expenses</span>
            </Link>
          </li>
          
          <li className={`sidebar-item ${isActive('/reports') ? 'active' : ''}`}>
            <Link to="/reports">
              <span className="sidebar-icon"><FaChartBar /></span>
              <span className="sidebar-text">Reports & Analytics</span>
            </Link>
          </li>
          

        </ul>
        
        <div className="sidebar-footer">
          <p>Ampomaah Tourist Hotel</p>
          
        </div>
      </div>
    </>
  );
};

export default Sidebar;