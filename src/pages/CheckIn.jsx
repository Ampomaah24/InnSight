import React, { useState, useEffect } from "react";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/CheckIn.css";

const CheckIn = () => {
  const [bookedGuests, setBookedGuests] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Fetch all bookings from Firestore
        const bookingsQuery = query(collection(db, "bookings"));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBookedGuests(bookingsData);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, []);

  // Handle Check-in action
  const handleCheckIn = async (bookingId) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: "Checked in" });

      // Update UI
      setBookedGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === bookingId ? { ...guest, status: "Checked in" } : guest
        )
      );
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  // Handle Check-out action
  const handleCheckOut = async (bookingId) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: "Checked out" });

      // Update UI
      setBookedGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === bookingId ? { ...guest, status: "Checked out" } : guest
        )
      );
    } catch (error) {
      console.error("Error checking out:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="checkin-header">
          <h1>Check-in / Check-out</h1>
        </div>

        {/* Guests Table */}
        <div className="table-container">
          <h2>Guest Reservations</h2>
          <table className="checkin-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Check-in Date</th>
                <th>Check-out Date</th>
                <th>Room Type</th>
                <th>Assigned Room</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookedGuests.length > 0 ? (
                bookedGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td>{guest.firstName} {guest.lastName}</td>
                    <td>{new Date(guest.checkIn).toLocaleDateString()}</td>
                    <td>{new Date(guest.checkOut).toLocaleDateString()}</td>
                    <td>{guest.roomType}</td>
                    <td>{guest.roomNumber || "Not assigned"}</td>
                    <td>
                      <span className={`status ${(guest.status || "Pending").replace(" ", "-").toLowerCase()}`}>
                        {guest.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      {guest.status === "Confirmed" && (
                        <button className="checkin-btn" onClick={() => handleCheckIn(guest.id)}>
                          Check In
                        </button>
                      )}
                      {guest.status === "Checked in" && (
                        <button className="checkout-btn" onClick={() => handleCheckOut(guest.id)}>
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7">No reservations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
