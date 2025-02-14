import React from "react";
import { FaHome, FaCalendarCheck, FaUsers, FaChartBar } from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item active">
          <FaHome /> Dashboard
        </li>
        <li className="sidebar-item">
          <FaCalendarCheck /> Check-in
        </li>
        <li className="sidebar-item">
          <FaUsers /> Users
        </li>
        <li className="sidebar-item">
          <FaChartBar /> Reports
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
