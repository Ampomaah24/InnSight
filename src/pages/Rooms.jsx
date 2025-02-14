import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Rooms.css";

const Rooms = () => {
  const [rooms, setRooms] = useState([
    { id: 101, type: "Single", status: "Available", price: "$80", features: ["WiFi", "TV"] },
    { id: 102, type: "Double", status: "Occupied", price: "$120", features: ["WiFi", "TV", "Mini Fridge"] },
    { id: 103, type: "Suite", status: "Out of Service", price: "$200", features: ["WiFi", "TV", "Mini Bar", "Balcony"] },
  ]);

  const [filterStatus, setFilterStatus] = useState("");

  const filteredRooms = rooms.filter((room) =>
    filterStatus ? room.status === filterStatus : true
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        
        <div className="rooms-header">
          <h1>Rooms & Availability</h1>
          <div className="filters">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Rooms</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Out of Service">Out of Service</option>
            </select>
          </div>
        </div>

        {/* Rooms Table */}
        <div className="table-container">
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Price</th>
                <th>Features</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td>
                  <td>{room.type}</td>
                  <td>
                    <span className={`status ${room.status.replace(" ", "-").toLowerCase()}`}>
                      {room.status}
                    </span>
                  </td>
                  <td>{room.price}</td>
                  <td>{room.features.join(", ")}</td>
                  <td>
                    <button className="edit-btn">Edit</button>
                    <button className="delete-btn">Remove</button>
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

export default Rooms;
