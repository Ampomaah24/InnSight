import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import NavMenu from "../components/NavMenu";
import "../assets/styles/Pickup.css";

const AdminPickupTracker = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, past
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPickupBookings = async () => {
      try {
        setLoading(true);
        const bookingsRef = collection(db, "bookings");
        const q = query(
          bookingsRef, 
          where("airportPickup", "==", "Yes"),
          orderBy("pickupDetails.pickupDate", "asc")
        );
        const snapshot = await getDocs(q);
        
        const pickupBookings = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.pickupDetails) {
            // Add status calculation
            const status = getPickupStatus(data.pickupDetails.pickupDate, data.pickupDetails.pickupTime);
            pickupBookings.push({ 
              id: doc.id, 
              ...data, 
              status 
            });
          }
        });
        
        setPickups(pickupBookings);
      } catch (error) {
        console.error("Error fetching airport pickups:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPickupBookings();
  }, []);

  const getPickupStatus = (pickupDate, pickupTime) => {
    const now = new Date();
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    
    if (pickup < now) {
      return "completed";
    } else {
      return "upcoming";
    }
  };

  const getReminderStatus = (pickupDate, pickupTime) => {
    const now = new Date();
    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const diffMs = pickup - now;
    const diffHrs = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHrs < 0) return "past";
    if (diffHrs <= 1) return "1hr";
    if (diffDays <= 1) return "1day";
    if (diffDays <= 3) return "3days";
    return "upcoming";
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const filteredPickups = pickups.filter(pickup => {
    const reminder = getReminderStatus(pickup.pickupDetails.pickupDate, pickup.pickupDetails.pickupTime);
    
    // Apply filter
    if (filter === "upcoming" && reminder === "past") return false;
    if (filter === "past" && reminder !== "past") return false;
    
    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        pickup.firstName?.toLowerCase().includes(searchLower) ||
        pickup.lastName?.toLowerCase().includes(searchLower) ||
        pickup.pickupDetails.flightNumber?.toLowerCase().includes(searchLower) ||
        pickup.pickupDetails.airportLocation?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  return (
    <div className="pickup-admin-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <div className="pickup-content">
        <div className="pickup-header">
          <div>
            <h2 className="page-heading">Airport Pickup Schedule</h2>
            <p className="subtext">Track upcoming airport pickups requested by guests.</p>
          </div>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-number">{pickups.filter(p => getReminderStatus(p.pickupDetails.pickupDate, p.pickupDetails.pickupTime) !== "past").length}</span>
              <span className="stat-label">Upcoming</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pickups.filter(p => getReminderStatus(p.pickupDetails.pickupDate, p.pickupDetails.pickupTime) === "1hr" || getReminderStatus(p.pickupDetails.pickupDate, p.pickupDetails.pickupTime) === "1day").length}</span>
              <span className="stat-label">Urgent</span>
            </div>
          </div>
        </div>
        
        <div className="pickup-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, flight number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-container">
            <button 
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === "upcoming" ? "active" : ""}`}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming
            </button>
            <button 
              className={`filter-btn ${filter === "past" ? "active" : ""}`}
              onClick={() => setFilter("past")}
            >
              Past
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading pickup schedule...</p>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>No pickups {filter === "upcoming" ? "scheduled" : filter === "past" ? "completed" : "found"}.</p>
            {searchTerm && <p className="empty-sub">Try adjusting your search term.</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="pickup-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Pickup Date</th>
                  <th>Pickup Time</th>
                  <th>Flight Number</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPickups.map((pickup, idx) => {
                  const { firstName, lastName, pickupDetails } = pickup;
                  const reminder = getReminderStatus(pickupDetails.pickupDate, pickupDetails.pickupTime);
                  return (
                    <tr key={idx} className={reminder === "past" ? "past-pickup" : ""}>
                      <td className="guest-cell">
                        <div className="guest-name">{firstName} {lastName}</div>
                        {pickup.email && <div className="guest-email">{pickup.email}</div>}
                      </td>
                      <td>{formatDate(pickupDetails.pickupDate)}</td>
                      <td>{formatTime(pickupDetails.pickupTime)}</td>
                      <td className="flight-cell">
                        <span className="flight-number">{pickupDetails.flightNumber || "N/A"}</span>
                      </td>
                      <td>{pickupDetails.airportLocation || "N/A"}</td>
                      <td>
                        {reminder === "past" && <span className="reminder-badge gray">Completed</span>}
                        {reminder === "1hr" && <span className="reminder-badge red">Within 1 Hour</span>}
                        {reminder === "1day" && <span className="reminder-badge orange">Within 24 Hours</span>}
                        {reminder === "3days" && <span className="reminder-badge yellow">Within 3 Days</span>}
                        {reminder === "upcoming" && <span className="reminder-badge blue">Upcoming</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPickupTracker;