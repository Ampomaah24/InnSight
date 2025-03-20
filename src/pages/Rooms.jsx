import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Rooms.css";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "rooms"));
        const fetchedRooms = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          number: doc.data().name,
          type: doc.data().t_room,
          status: doc.data().status || "Available", // Ensuring default status
          price: `$${doc.data().price}`,
          features: doc.data().amenities || [],
        }));

        setRooms(fetchedRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Handle status change
  const handleStatusChange = async (roomId, newStatus) => {
    try {
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, { status: newStatus });

      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === roomId ? { ...room, status: newStatus } : room
        )
      );
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  };

  // Handle room deletion
  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await deleteDoc(doc(db, "rooms", roomId));
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== roomId));
      } catch (error) {
        console.error("Error deleting room:", error);
      }
    }
  };

  const filteredRooms = rooms.filter((room) =>
    filterStatus ? room.status === filterStatus : true
  );

  if (loading) {
    return <div>Loading rooms...</div>;
  }

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
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
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
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.number}</td>
                    <td>{room.type}</td>
                    <td>
                      <select
                        value={room.status}
                        onChange={(e) => handleStatusChange(room.id, e.target.value)}
                        className={`status-dropdown ${room.status.toLowerCase()}`}
                      >
                        <option value="Available">Available</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Occupied">Occupied</option>
                      </select>
                    </td>
                    <td>{room.price}</td>
                    <td>{room.features.join(", ")}</td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDeleteRoom(room.id)}>Remove</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>No rooms available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Rooms;
