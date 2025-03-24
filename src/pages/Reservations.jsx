import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "../assets/styles/Reservations.css";

const Reservations = () => {
  const [roomReservations, setRoomReservations] = useState([]);
  const [conferenceReservations, setConferenceReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        // Regular room bookings
        const roomSnapshot = await getDocs(collection(db, "bookings"));
        const rooms = roomSnapshot.docs.map((doc) => ({
          id: doc.id,
          guestName: `${doc.data().firstName} ${doc.data().lastName}`,
          checkIn: new Date(doc.data().checkIn).toLocaleDateString(),
          checkOut: new Date(doc.data().checkOut).toLocaleDateString(),
          room: doc.data().roomName || "N/A",
          status: doc.data().status || "Reserved",
        }));

        // Conference room bookings
        const confSnapshot = await getDocs(collection(db, "conferenceBookings"));
        const conferences = confSnapshot.docs.map((doc) => ({
          id: doc.id,
          guestName: `${doc.data().firstName} ${doc.data().lastName}`,
          checkIn: new Date(doc.data().checkIn).toLocaleDateString(),
          checkOut: new Date(doc.data().checkOut).toLocaleDateString(),
          room: doc.data().roomName || "N/A",
          status: doc.data().status || "Reserved",
        }));

        setRoomReservations(rooms);
        setConferenceReservations(conferences);
      } catch (error) {
        console.error("Error fetching reservations:", error.message);
      }
    };

    fetchReservations();
  }, []);

  // Filter both sets
  const filterData = (data) =>
    data.filter((res) =>
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

        {/* Room Bookings Table */}
        <h2 style={{ marginTop: "2rem" }}>Room Bookings</h2>
        <div className="table-container">
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
              {filterData(roomReservations).map((res) => (
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
                </tr>
              ))}
              {filterData(roomReservations).length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
                    No room reservations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Conference Bookings Table */}
        <h2 style={{ marginTop: "3rem" }}>Conference Bookings</h2>
        <div className="table-container">
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
              {filterData(conferenceReservations).map((res) => (
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
                </tr>
              ))}
              {filterData(conferenceReservations).length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "1rem", color: "#888" }}>
                    No conference reservations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Reservations;
