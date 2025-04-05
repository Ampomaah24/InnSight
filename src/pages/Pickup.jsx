import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import NavMenu from "../components/NavMenu";
import "../assets/styles/Pickup.css";

const AdminPickupTracker = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickups, setPickups] = useState([]);

  useEffect(() => {
    const fetchPickupBookings = async () => {
      try {
        const bookingsRef = collection(db, "bookings");
        const snapshot = await getDocs(bookingsRef);
        const pickupBookings = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.airportPickup === "Yes" && data.pickupDetails) {
            pickupBookings.push({ id: doc.id, ...data });
          }
        });

        setPickups(pickupBookings);
      } catch (error) {
        console.error("Error fetching airport pickups:", error);
      }
    };

    fetchPickupBookings();
  }, []);

  const getReminderStatus = (pickupDate, pickupTime) => {
    const now = new Date();
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const diffMs = pickup - now;
    const diffHrs = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHrs <= 1 && diffHrs > 0) return "1hr";
    if (diffDays <= 1 && diffDays > 0) return "1day";
    return null;
  };

  return (
    <div className="pickup-admin-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="pickup-content">
        <h2 className="page-heading">Airport Pickup Schedule</h2>
        <p className="subtext">Track upcoming airport pickups requested by guests.</p>

        {pickups.length === 0 ? (
          <p>No upcoming pickups scheduled.</p>
        ) : (
          <table className="pickup-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Pickup Date</th>
                <th>Pickup Time</th>
                <th>Flight Number</th>
                <th>Location</th>
                <th>Reminder</th>
              </tr>
            </thead>
            <tbody>
              {pickups.map((pickup, idx) => {
                const { firstName, lastName, pickupDetails } = pickup;
                const reminder = getReminderStatus(pickupDetails.pickupDate, pickupDetails.pickupTime);

                return (
                  <tr key={idx}>
                    <td>{firstName} {lastName}</td>
                    <td>{pickupDetails.pickupDate}</td>
                    <td>{pickupDetails.pickupTime}</td>
                    <td>{pickupDetails.flightNumber}</td>
                    <td>{pickupDetails.airportLocation}</td>
                    <td>
                      {reminder === "1day" && <span className="reminder-badge orange">1 Day Left</span>}
                      {reminder === "1hr" && <span className="reminder-badge red">1 Hour Left</span>}
                      {!reminder && <span className="reminder-badge">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPickupTracker;
