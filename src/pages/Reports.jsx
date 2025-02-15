import React from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Reports.css";

const Reports = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <h1>Reports & Analytics</h1>
        <p>View detailed insights and generate reports.</p>
      </div>
    </div>
  );
};

export default Reports;
