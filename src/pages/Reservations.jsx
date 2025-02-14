import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Reservations.css";

const Reservations = () => {
  const [reservations, setReservations] = useState([
    { id: 1, guestName: "Emily Smith", checkIn: "Oct 21, 2022", checkOut: "Oct 28, 2022", room: "103", status: "Reserved" },
    { id: 2, guestName: "John Davis", checkIn: "Oct 23, 2022", checkOut: "Oct 29, 2022", room: "203", status: "Checked in" },
    { id: 3, guestName: "Lucy Brown", checkIn: "Oct 25, 2022", checkOut: "Oct 30, 2022", room: "303", status: "Canceled" },
    { id: 4, guestName: "Emily Smith", checkIn: "Oct 21, 2022", checkOut: "Oct 28, 2022", room: "103", status: "Reserved" },
    { id: 5, guestName: "John Davis", checkIn: "Oct 23, 2022", checkOut: "Oct 29, 2022", room: "203", status: "Checked in" },
    { id: 6, guestName: "Lucy Brown", checkIn: "Oct 25, 2022", checkOut: "Oct 30, 2022", room: "303", status: "Canceled" }
  ]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Filter Reservations
  const filteredReservations = reservations.filter((res) =>
    res.guestName.toLowerCase().includes(search.toLowerCase()) &&
    (filterStatus ? res.status === filterStatus : true)
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="reservations-header">
          <h1>Reservations</h1>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by guest name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Reserved">Reserved</option>
              <option value="Checked in">Checked in</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Room</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((res) => (
                <tr key={res.id}>
                  <td>{res.guestName}</td>
                  <td>{res.checkIn}</td>
                  <td>{res.checkOut}</td>
                  <td>{res.room}</td>
                  <td>
                    <span className={`status ${res.status.toLowerCase().replace(" ", "-")}`}>
                      {res.status}
                    </span>
                  </td>
                  <td>
                    <button className="edit-btn">Edit</button>
                    <button className="delete-btn">Cancel</button>
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

export default Reservations;
