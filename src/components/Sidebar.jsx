import React from "react";
import { FaHome, FaCalendarCheck, FaUsers, FaChartBar, FaBed, FaMoneyBillWave, FaCog, FaClipboardList, FaKey } from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li className="sidebar-item active">
          <FaHome /> Dashboard
        </li>
        <li className="sidebar-item">
  <a href="/reservations">
    <FaCalendarCheck /> Reservations
  </a>
</li>

<li className="sidebar-item">
  <a href="/check-in">
    <FaKey /> Check-in / Check-out
  </a>
</li>

<li className="sidebar-item">
  <a href="/rooms">
    <FaBed /> Rooms & Availability
  </a>
</li>
        <li className="sidebar-item">
          <FaUsers /> Guests
        </li>
        <li className="sidebar-item">
  <a href="/billing">
    <FaMoneyBillWave /> Billing & Payments
  </a>
</li>

        <li className="sidebar-item">
          <FaClipboardList /> Staff Management
        </li>
        <li className="sidebar-item">
          <FaChartBar /> Reports & Analytics
        </li>
        <li className="sidebar-item">
          <FaCog /> Settings
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
