import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Billing.css";

const Billing = () => {
  const [payments, setPayments] = useState([
    { id: 1, guestName: "Emily Smith", date: "Feb 14, 2025", amount: "$200", status: "Completed", method: "Credit Card" },
    { id: 2, guestName: "John Davis", date: "Feb 14, 2025", amount: "$450", status: "Pending", method: "PayPal" },
    { id: 3, guestName: "Lucy Brown", date: "Feb 14, 2025", amount: "$320", status: "Failed", method: "Bank Transfer" },
  ]);

  const [filterStatus, setFilterStatus] = useState("");

  const filteredPayments = payments.filter((payment) =>
    filterStatus ? payment.status === filterStatus : true
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="billing-header">
          <h1>Billing & Payments</h1>
          <div className="filters">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Transactions</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.guestName}</td>
                  <td>{payment.date}</td>
                  <td>{payment.amount}</td>
                  <td>{payment.method}</td>
                  <td>
                    <span className={`status ${payment.status.toLowerCase()}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    {payment.status === "Pending" && (
                      <button className="confirm-btn">Confirm</button>
                    )}
                    {payment.status === "Completed" && (
                      <button className="invoice-btn">Generate Invoice</button>
                    )}
                    {payment.status === "Failed" && (
                      <button className="retry-btn">Retry</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;
