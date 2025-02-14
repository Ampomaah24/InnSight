import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [reservations] = useState([
    { id: 1, guestName: "Emily Smith", checkIn: "Oct 21, 2022", checkOut: "Oct 28, 2022", room: "103", status: "Reserved" },
    { id: 2, guestName: "John Davis", checkIn: "Oct 23, 2022", checkOut: "Oct 29, 2022", room: "203", status: "Reserved" },
    { id: 3, guestName: "Lucy Brown", checkIn: "Oct 25, 2022", checkOut: "Oct 30, 2022", room: "303", status: "Checked in" },
  ]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="classp">Overview of Activities</p>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="card" onClick={() => navigate("/check-in")}>
            <p className="card-title">Today's Check-ins</p>
            <h2 className="card-value">14</h2>
          </div>
          <div className="card" onClick={() => navigate("/reservations")}>
            <p className="card-title">Today's Reservations</p>
            <h2 className="card-value">22</h2>
          </div>
          <div className="card" onClick={() => navigate("/rooms")}>
            <p className="card-title">Rooms Occupied</p>
            <h2 className="card-value">12</h2>
          </div>
          <div className="card" onClick={() => navigate("/billing")}>
            <p className="card-title">Total Revenue</p>
            <h2 className="card-value">$5,400</h2>
          </div>
        </div>

        {/* Upcoming Reservations */}
        <div className="table-container">
          <h2 className="table-title">Upcoming Reservations</h2>
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Room</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.id}>
                  <td>{res.guestName}</td>
                  <td>{res.checkIn}</td>
                  <td>{res.checkOut}</td>
                  <td>{res.room}</td>
                  <td>
                    <span className={`status ${res.status === "Checked in" ? "checked-in" : "reserved"}`}>
                      {res.status}
                    </span>
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

export default Dashboard;
