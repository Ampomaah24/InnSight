import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({
    checkInsToday: 0,
    totalReservations: 0,
    roomsOccupied: 0,
  });

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const fetchedReservations = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          guestName: `${doc.data().firstName} ${doc.data().lastName}`,
          checkIn: new Date(doc.data().checkIn).toLocaleDateString(),
          checkOut: new Date(doc.data().checkOut).toLocaleDateString(),
          room: doc.data().roomNumber || "N/A",
          status: doc.data().status || "Reserved",
        }));

        setReservations(fetchedReservations);

        // Calculate dynamic stats
        const today = new Date().toLocaleDateString(); // Get today's date
        const checkInsToday = fetchedReservations.filter(
          (res) => res.checkIn === today && res.status === "Checked in"
        ).length;

        const totalReservations = fetchedReservations.length;

        const roomsOccupied = new Set(
          fetchedReservations
            .filter((res) => res.status === "Checked in")
            .map((res) => res.room)
        ).size;

        setStats({ checkInsToday, totalReservations, roomsOccupied });
      } catch (error) {
        console.error("Error fetching reservations:", error);
      }
    };

    fetchReservations();
  }, []);

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
            <h2 className="card-value">{stats.checkInsToday}</h2>
          </div>
          <div className="card" onClick={() => navigate("/reservations")}>
            <p className="card-title">Today's Reservations</p>
            <h2 className="card-value">{stats.totalReservations}</h2>
          </div>
          <div className="card" onClick={() => navigate("/rooms")}>
            <p className="card-title">Rooms Occupied</p>
            <h2 className="card-value">{stats.roomsOccupied}</h2>
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
