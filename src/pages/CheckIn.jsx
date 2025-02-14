import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/CheckIn.css";

const CheckIn = () => {
  const [checkIns, setCheckIns] = useState([
    { id: 1, guestName: "Emily Smith", checkInDate: "Feb 14, 2025", room: "103", status: "Pending" },
    { id: 2, guestName: "John Davis", checkInDate: "Feb 14, 2025", room: "203", status: "Checked in" },
  ]);

  const [checkOuts, setCheckOuts] = useState([
    { id: 3, guestName: "Lucy Brown", checkOutDate: "Feb 14, 2025", room: "303", status: "Pending" },
    { id: 4, guestName: "Mike Wilson", checkOutDate: "Feb 14, 2025", room: "403", status: "Checked out" },
  ]);

  const handleCheckIn = (id) => {
    setCheckIns(checkIns.map((guest) => 
      guest.id === id ? { ...guest, status: "Checked in" } : guest
    ));
  };

  const handleCheckOut = (id) => {
    setCheckOuts(checkOuts.map((guest) => 
      guest.id === id ? { ...guest, status: "Checked out" } : guest
    ));
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        
        <div className="checkin-header">
          <h1>Check-in / Check-out</h1>
        </div>

        {/* Check-in Table */}
        <div className="table-container">
          <h2>Today's Check-ins</h2>
          <table className="checkin-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Check-in Date</th>
                <th>Room</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((guest) => (
                <tr key={guest.id}>
                  <td>{guest.guestName}</td>
                  <td>{guest.checkInDate}</td>
                  <td>{guest.room}</td>
                  <td>
                    <span className={`status ${guest.status.replace(" ", "-").toLowerCase()}`}>
                      {guest.status}
                    </span>
                  </td>
                  <td>
                    {guest.status === "Pending" && (
                      <button className="checkin-btn" onClick={() => handleCheckIn(guest.id)}>
                        Check In
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Check-out Table */}
        <div className="table-container">
          <h2>Today's Check-outs</h2>
          <table className="checkout-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Check-out Date</th>
                <th>Room</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {checkOuts.map((guest) => (
                <tr key={guest.id}>
                  <td>{guest.guestName}</td>
                  <td>{guest.checkOutDate}</td>
                  <td>{guest.room}</td>
                  <td>
                    <span className={`status ${guest.status.replace(" ", "-").toLowerCase()}`}>
                      {guest.status}
                    </span>
                  </td>
                  <td>
                    {guest.status === "Pending" && (
                      <button className="checkout-btn" onClick={() => handleCheckOut(guest.id)}>
                        Check Out
                      </button>
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

export default CheckIn;
