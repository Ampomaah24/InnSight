import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Rooms.css";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    occupied: 0
  });
  const [statusUpdateMessage, setStatusUpdateMessage] = useState(null);

  const fetchRoomsAndBookings = async () => {
    try {
      setLoading(true);
      
      // Get current date (start of day) for comparing booking dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch all rooms
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const fetchedRooms = roomsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          number: data.name || doc.id,
          type: data.t_room || data.type || "Standard",
          status: data.status || "Available", // Use status from DB if available
          price: `$${data.price || 0}`,
          features: data.amenities || [],
          lastUpdated: data.lastUpdated,
        };
      });
      
      // Fetch active bookings
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));
      const fetchedBookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        let checkInDate, checkOutDate;
        
        // Parse check-in date
        try {
          if (data.checkIn instanceof Timestamp) {
            checkInDate = data.checkIn.toDate();
          } else if (data.checkIn && data.checkIn.seconds) {
            checkInDate = new Date(data.checkIn.seconds * 1000);
          } else if (data.checkIn) {
            checkInDate = new Date(data.checkIn);
          }
        } catch (e) {
          console.warn("Error parsing check-in date", e);
          checkInDate = null;
        }
        
        // Parse check-out date
        try {
          if (data.checkOut instanceof Timestamp) {
            checkOutDate = data.checkOut.toDate();
          } else if (data.checkOut && data.checkOut.seconds) {
            checkOutDate = new Date(data.checkOut.seconds * 1000);
          } else if (data.checkOut) {
            checkOutDate = new Date(data.checkOut);
          }
        } catch (e) {
          console.warn("Error parsing check-out date", e);
          checkOutDate = null;
        }
        
        return {
          id: doc.id,
          roomNumber: data.roomNumber,
          status: data.status,
          guestName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          checkInDate,
          checkOutDate,
          lastUpdated: data.lastUpdated
        };
      }).filter(booking => booking.checkInDate && booking.checkOutDate && booking.roomNumber); // Filter out invalid bookings
      
      setBookings(fetchedBookings);
      
      // Update room status based on bookings if room doesn't have a status
      const updatedRooms = fetchedRooms.map(room => {
        // Only calculate status if not already set in database
        if (!room.status || room.status === "Available") {
          const roomBookings = fetchedBookings.filter(
            booking => booking.roomNumber === room.number
          );
          
          // Find bookings affecting this room's status today
          const activeBooking = roomBookings.find(booking => {
            return (
              booking.checkInDate <= today && 
              booking.checkOutDate > today &&
              (booking.status === "Checked in" || booking.status === "checked-in" || booking.status === "Checked-in")
            );
          });
          
          const reservedBooking = roomBookings.find(booking => {
            return (
              booking.checkInDate > today &&
              (booking.status === "Confirmed" || booking.status === "Reserved" || booking.status === "reserved")
            );
          });
          
          // Determine room status
          let status = "Available";
          
          if (activeBooking) {
            status = "Occupied";
          } else if (reservedBooking) {
            status = "Reserved";
          }
          
          return { 
            ...room, 
            status,
            activeBookingId: activeBooking?.id,
            reservedBookingId: reservedBooking?.id,
            activeBooking,
            reservedBooking 
          };
        }
        
        // If room already has a status, find the associated booking for reference
        const roomBookings = fetchedBookings.filter(
          booking => booking.roomNumber === room.number
        );
        
        const activeBooking = roomBookings.find(booking => {
          return (
            booking.checkInDate <= today && 
            booking.checkOutDate > today &&
            (booking.status === "Checked in" || booking.status === "checked-in" || booking.status === "Checked-in")
          );
        });
        
        const reservedBooking = roomBookings.find(booking => {
          return (
            booking.checkInDate > today &&
            (booking.status === "Confirmed" || booking.status === "Reserved" || booking.status === "reserved")
          );
        });
        
        return { 
          ...room,
          activeBookingId: activeBooking?.id,
          reservedBookingId: reservedBooking?.id,
          activeBooking,
          reservedBooking
        };
      });
      
      // Calculate stats
      const totalRooms = updatedRooms.length;
      const availableRooms = updatedRooms.filter(room => room.status === "Available").length;
      const reservedRooms = updatedRooms.filter(room => room.status === "Reserved").length;
      const occupiedRooms = updatedRooms.filter(room => room.status === "Occupied").length;
      
      setStats({
        total: totalRooms,
        available: availableRooms,
        reserved: reservedRooms,
        occupied: occupiedRooms
      });
      
      // Sort rooms by room number
      const sortedRooms = updatedRooms.sort((a, b) => {
        // Extract numeric parts for proper numeric sorting
        const numA = a.number.replace(/\D/g, '');
        const numB = b.number.replace(/\D/g, '');
        
        if (numA && numB) {
          return parseInt(numA) - parseInt(numB);
        }
        
        return a.number.localeCompare(b.number);
      });
      
      setRooms(sortedRooms);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsAndBookings();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchRoomsAndBookings();
    }, 300000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Show status update message for 3 seconds
  const showStatusMessage = (message, type = "success") => {
    setStatusUpdateMessage({ message, type });
    setTimeout(() => {
      setStatusUpdateMessage(null);
    }, 3000);
  };

  // Handle status change with full booking synchronization
  const handleStatusChange = async (roomId, roomNumber, newStatus, activeBookingId, reservedBookingId) => {
    try {
      // Update room status in Firestore
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, { 
        status: newStatus,
        lastUpdated: Timestamp.now()
      });
      
      // Handle booking status updates based on room status change
      if (newStatus === "Occupied") {
        // If changing to Occupied and there's a reserved booking, update it to checked in
        if (reservedBookingId) {
          const bookingRef = doc(db, "bookings", reservedBookingId);
          await updateDoc(bookingRef, { 
            status: "Checked in",
            lastUpdated: Timestamp.now()
          });
          
          showStatusMessage(`Room ${roomNumber} marked as Occupied and booking updated to Checked in`);
        } else {
          // If there's no booking but room is marked occupied, log it
          console.log(`Room ${roomNumber} marked as Occupied but no booking found to update`);
          showStatusMessage(`Room ${roomNumber} marked as Occupied`);
        }
      } 
      else if (newStatus === "Available") {
        // If changing to Available and there's an active booking, update it to checked out
        if (activeBookingId) {
          const bookingRef = doc(db, "bookings", activeBookingId);
          await updateDoc(bookingRef, { 
            status: "Checked out",
            lastUpdated: Timestamp.now()
          });
          
          showStatusMessage(`Room ${roomNumber} marked as Available and booking updated to Checked out`);
        } else {
          showStatusMessage(`Room ${roomNumber} marked as Available`);
        }
      }
      else if (newStatus === "Reserved") {
        showStatusMessage(`Room ${roomNumber} marked as Reserved`);
      }

      // Update local state for immediate UI feedback
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === roomId ? { ...room, status: newStatus } : room
        )
      );
      
      // Update stats
      const updatedRooms = rooms.map(room => 
        room.id === roomId ? { ...room, status: newStatus } : room
      );
      
      const totalRooms = updatedRooms.length;
      const availableRooms = updatedRooms.filter(room => room.status === "Available").length;
      const reservedRooms = updatedRooms.filter(room => room.status === "Reserved").length;
      const occupiedRooms = updatedRooms.filter(room => room.status === "Occupied").length;
      
      setStats({
        total: totalRooms,
        available: availableRooms,
        reserved: reservedRooms,
        occupied: occupiedRooms
      });
      
      // Refresh data after a delay to ensure DB updates are reflected
      setTimeout(() => {
        fetchRoomsAndBookings();
      }, 1000);
      
    } catch (error) {
      console.error("Error updating room status:", error);
      showStatusMessage(`Error updating room status: ${error.message}`, "error");
    }
  };

  // Handle room deletion with booking verification
  const handleDeleteRoom = async (roomId, roomNumber) => {
    // Check if room has active bookings first
    const roomBookings = bookings.filter(booking => 
      booking.roomNumber === roomNumber && 
      (booking.status === "Confirmed" || booking.status === "Checked in" || booking.status === "Reserved")
    );
    
    if (roomBookings.length > 0) {
      const confirmDelete = window.confirm(
        `Room ${roomNumber} has ${roomBookings.length} active bookings. Are you sure you want to delete this room? This may cause issues with existing reservations.`
      );
      
      if (!confirmDelete) {
        return;
      }
    } else {
      // Standard confirmation
      if (!window.confirm("Are you sure you want to delete this room?")) {
        return;
      }
    }
    
    try {
      await deleteDoc(doc(db, "rooms", roomId));
      
      showStatusMessage(`Room ${roomNumber} has been deleted`);
      
      // Update local state
      const updatedRooms = rooms.filter((room) => room.id !== roomId);
      setRooms(updatedRooms);
      
      // Update stats
      const totalRooms = updatedRooms.length;
      const availableRooms = updatedRooms.filter(room => room.status === "Available").length;
      const reservedRooms = updatedRooms.filter(room => room.status === "Reserved").length;
      const occupiedRooms = updatedRooms.filter(room => room.status === "Occupied").length;
      
      setStats({
        total: totalRooms,
        available: availableRooms,
        reserved: reservedRooms,
        occupied: occupiedRooms
      });
    } catch (error) {
      console.error("Error deleting room:", error);
      showStatusMessage(`Error deleting room: ${error.message}`, "error");
    }
  };

  const filteredRooms = rooms.filter((room) =>
    filterStatus ? room.status === filterStatus : true
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Rooms & Availability</h1>
          <div className="filters">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="status-filter"
            >
              <option value="">All Rooms</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>
        </div>

        {statusUpdateMessage && (
          <div className={`status-message ${statusUpdateMessage.type}`}>
            {statusUpdateMessage.message}
          </div>
        )}

        <div className="room-stats">
          <div className="stat-card">
            <div className="stat-title">Total Rooms</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card available-card">
            <div className="stat-title">Available</div>
            <div className="stat-value">{stats.available}</div>
          </div>
          <div className="stat-card reserved-card">
            <div className="stat-title">Reserved</div>
            <div className="stat-value">{stats.reserved}</div>
          </div>
          <div className="stat-card occupied-card">
            <div className="stat-title">Occupied</div>
            <div className="stat-value">{stats.occupied}</div>
          </div>
        </div>

        {/* Rooms Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">Loading rooms...</div>
          ) : (
            <div className="table-responsive">
              <table className="rooms-table">
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Features</th>
                    <th>Guest</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length > 0 ? (
                    filteredRooms.map((room) => (
                      <tr key={room.id}>
                        <td className="room-number">{room.number}</td>
                        <td>{room.type}</td>
                        <td>
                          <div className="status-selector">
                            <select
                              value={room.status}
                              onChange={(e) => handleStatusChange(
                                room.id, 
                                room.number, 
                                e.target.value, 
                                room.activeBookingId, 
                                room.reservedBookingId
                              )}
                              className={`status-dropdown ${room.status.toLowerCase()}`}
                            >
                              <option value="Available">Available</option>
                              <option value="Reserved">Reserved</option>
                              <option value="Occupied">Occupied</option>
                            </select>
                          </div>
                        </td>
                        <td className="price">{room.price}</td>
                        <td className="features">
                          <div className="feature-list">
                            {room.features.map((feature, index) => (
                              <span key={index} className="feature-tag">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="guest-name">
                          {room.status === "Occupied" && room.activeBooking ? 
                            room.activeBooking.guestName : 
                            room.status === "Reserved" && room.reservedBooking ? 
                            room.reservedBooking.guestName : ""}
                        </td>
                        <td>
                          <button 
                            className="remove-btn" 
                            onClick={() => handleDeleteRoom(room.id, room.number)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan="7">No rooms available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="pagination">
            <div className="showing-entries">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rooms;