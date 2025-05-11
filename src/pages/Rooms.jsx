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

  // Helper function to get guest name consistently from booking data
  const getGuestNameFromBookingData = (data) => {
    // First try primary guest fields
    if (data.primaryGuestFirstName || data.primaryGuestLastName) {
      return `${data.primaryGuestFirstName || ''} ${data.primaryGuestLastName || ''}`.trim();
    }
    
    // Then check guests array
    if (data.guests && Array.isArray(data.guests) && data.guests.length > 0) {
      const firstGuest = data.guests[0];
      if (firstGuest && (firstGuest.firstName || firstGuest.lastName)) {
        return `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`.trim();
      }
    }
    
    // Then try booker fields
    if (data.bookerFirstName || data.bookerLastName) {
      return `${data.bookerFirstName || ''} ${data.bookerLastName || ''}`.trim();
    }
    
    // Finally fall back to legacy fields
    return `${data.firstName || ''} ${data.lastName || ''}`.trim() || "Guest";
  };

  // Helper function to normalize status strings for comparison
  const normalizeStatus = (status) => {
    if (!status) return "";
    // Convert to lowercase and remove all spaces/special characters
    return status.toLowerCase().replace(/[\s\-_]/g, '');
  };

  // Helper function to check if a booking should show as reserved
  const isBookingReserved = (status) => {
    if (!status) return false;
    
    // First check exact match (case-insensitive)
    const lowerStatus = status.toLowerCase();
    const exactMatches = ['confirmed', 'reserved', 'pending', 'paid', 'booked', 'active'];
    if (exactMatches.includes(lowerStatus)) {
      console.log(`Status "${status}" matched exactly, isReserved: true`);
      return true;
    }
    
    // Then check normalized status
    const normalized = normalizeStatus(status);
    const reservedStatuses = [
      'confirmed',
      'reserved', 
      'pending',
      'paymentpending',
      'paid',
      'booked',
      'active'
    ];
    
    // Check if the normalized status matches any reserved status
    const isReserved = reservedStatuses.includes(normalized);
    console.log(`Status "${status}" normalized to "${normalized}", isReserved: ${isReserved}`);
    return isReserved;
  };

  // Helper function to check if a booking is checked in
  const isBookingCheckedIn = (status) => {
    if (!status) return false;
    
    const lowerStatus = status.toLowerCase();
    const normalized = normalizeStatus(status);
    
    // Check various forms of "checked in"
    return lowerStatus === 'checked in' || 
           lowerStatus === 'checkedin' || 
           normalized === 'checkedin' || 
           normalized === 'occupied' ||
           lowerStatus === 'in house' ||
           normalized === 'inhouse';
  };

  const fetchRoomsAndBookings = async () => {
    try {
      setLoading(true);
      
      // Get current date (start of day) for comparing booking dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log(`Current date for comparison: ${today.toISOString()}`);
      
      // Fetch all rooms
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const fetchedRooms = roomsSnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(`Room ${data.name || doc.id} - DB Status: "${data.status}"`);
        
        // Fix: If status is a room number or invalid, set it to Available
        let roomStatus = data.status;
        if (!roomStatus || roomStatus === data.name || roomStatus === doc.id) {
          roomStatus = "Available";
          console.log(`Room ${data.name || doc.id} had invalid status, defaulting to Available`);
        }
        
        return {
          id: doc.id,
          number: data.name || doc.id,
          type: data.t_room || data.type || "Standard",
          price: `GHS ${data.price || 0}`,
          features: data.amenities || [],
          status: roomStatus,
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
          } else if (typeof data.checkIn === 'string') {
            checkInDate = new Date(data.checkIn);
          } else if (data.checkIn) {
            checkInDate = new Date(data.checkIn);
          }
          console.log(`Check-in date for booking ${doc.id}: ${checkInDate}`);
        } catch (e) {
          console.warn("Error parsing check-in date", e, data.checkIn);
          checkInDate = null;
        }
        
        // Parse check-out date
        try {
          if (data.checkOut instanceof Timestamp) {
            checkOutDate = data.checkOut.toDate();
          } else if (data.checkOut && data.checkOut.seconds) {
            checkOutDate = new Date(data.checkOut.seconds * 1000);
          } else if (typeof data.checkOut === 'string') {
            checkOutDate = new Date(data.checkOut);
          } else if (data.checkOut) {
            checkOutDate = new Date(data.checkOut);
          }
          console.log(`Check-out date for booking ${doc.id}: ${checkOutDate}`);
        } catch (e) {
          console.warn("Error parsing check-out date", e, data.checkOut);
          checkOutDate = null;
        }
        
        // Use the helper function to get guest name
        const guestName = getGuestNameFromBookingData(data);
        
        // Debug: Log the booking status
        console.log(`Booking ${doc.id} - Status: "${data.status}", Room: ${data.roomNumber}, CheckIn: ${checkInDate}, CheckOut: ${checkOutDate}`);
        
        return {
          id: doc.id,
          roomNumber: data.roomNumber,
          status: data.status,
          guestName: guestName,
          checkInDate,
          checkOutDate,
          lastUpdated: data.lastUpdated
        };
      }).filter(booking => {
        // Basic validation
        if (!booking.roomNumber) {
          console.log(`Filtering out booking ${booking.id} - missing room number`);
          return false;
        }
        
        if (!booking.checkInDate || !booking.checkOutDate) {
          console.log(`Filtering out booking ${booking.id} - missing check-in/out dates`);
          return false;
        }
      
        const normalizedStatus = normalizeStatus(booking.status);
        const lowerStatus = (booking.status || '').toLowerCase();
        
        // Only filter out explicitly cancelled/terminated/checked out bookings
        if (normalizedStatus === "cancelled" || 
            normalizedStatus === "terminated" || 
            normalizedStatus === "checkedout" ||
            lowerStatus === "checked out") {
          console.log(`Filtering out booking ${booking.id} - status: ${booking.status}`);
          return false;
        }
      
        // Debug log for kept bookings
        console.log(`Keeping booking ${booking.id} for room ${booking.roomNumber}`, {
          status: booking.status,
          normalizedStatus: normalizedStatus,
          isReserved: isBookingReserved(booking.status),
          checkIn: booking.checkInDate?.toISOString(),
          checkOut: booking.checkOutDate?.toISOString()
        });
      
        return true;
      });
      
      setBookings(fetchedBookings);
      
      // Update rooms based on actual booking data
      const updatedRooms = await Promise.all(fetchedRooms.map(async (room) => {
        // Find bookings for this room - handle room number variations
        const roomBookings = fetchedBookings.filter(booking => {
          // Handle variations in room numbers (R1 vs R001, R2 vs R002, etc.)
          const bookingRoomNum = booking.roomNumber;
          const roomNum = room.number;
          
          // Direct match
          if (bookingRoomNum === roomNum) return true;
          
          // Extract numeric parts for comparison
          const bookingNumMatch = bookingRoomNum.match(/\d+/);
          const roomNumMatch = roomNum.match(/\d+/);
          
          if (bookingNumMatch && roomNumMatch) {
            const bookingNum = parseInt(bookingNumMatch[0]);
            const roomNumInt = parseInt(roomNumMatch[0]);
            return bookingNum === roomNumInt;
          }
          
          return false;
        });

        console.log(`\n=== Room ${room.number} Analysis ===`);
        console.log(`Room DB Status: "${room.status}"`);
        console.log(`Found ${roomBookings.length} bookings`);
        roomBookings.forEach(b => {
          console.log(`Booking ${b.id}: status="${b.status}", checkIn=${b.checkInDate}, checkOut=${b.checkOutDate}`);
          console.log(`  isReserved: ${isBookingReserved(b.status)}, isCheckedIn: ${isBookingCheckedIn(b.status)}`);
        });

        // Find active bookings (checked in)
        const activeBooking = roomBookings.find(booking => {
          const dateActive = booking.checkInDate <= today && booking.checkOutDate > today;
          const isCheckedIn = isBookingCheckedIn(booking.status);
          
          console.log(`Active check for booking ${booking.id}:`, {
            checkIn: booking.checkInDate?.toISOString(),
            checkOut: booking.checkOutDate?.toISOString(),
            today: today.toISOString(),
            dateActive,
            status: booking.status,
            isCheckedIn
          });
          
          return dateActive && isCheckedIn;
        });

        // Find reservations (confirmed but not checked in)
        const reservedBooking = roomBookings.find(booking => {
          const isReserved = isBookingReserved(booking.status);
          const notCheckedIn = !isBookingCheckedIn(booking.status);
          
          // Check if it's a future booking OR a same-day booking that hasn't checked in yet
          const isFuture = booking.checkInDate > today;
          const isTodayNotCheckedIn = booking.checkInDate <= today && 
                                     booking.checkOutDate > today && 
                                     notCheckedIn;
          
          console.log(`Reservation check for booking ${booking.id}:`, {
            checkIn: booking.checkInDate?.toISOString(),
            checkOut: booking.checkOutDate?.toISOString(),
            today: today.toISOString(),
            status: booking.status,
            isReserved,
            notCheckedIn,
            isFuture,
            isTodayNotCheckedIn,
            result: isReserved && (isFuture || isTodayNotCheckedIn)
          });
          
          return isReserved && (isFuture || isTodayNotCheckedIn);
        });

        // Determine the display status
        let displayStatus = "Available"; // Default to available
        let bookingDetails = {
          activeBookingId: null,
          reservedBookingId: null,
          activeBooking: null,
          reservedBooking: null
        };
        
        // Priority: Occupied > Reserved > Available
        if (activeBooking) {
          displayStatus = "Occupied";
          bookingDetails.activeBookingId = activeBooking.id;
          bookingDetails.activeBooking = activeBooking;
          console.log(`Room ${room.number} set to Occupied`);
        } else if (reservedBooking) {
          displayStatus = "Reserved";
          bookingDetails.reservedBookingId = reservedBooking.id;
          bookingDetails.reservedBooking = reservedBooking;
          console.log(`Room ${room.number} set to Reserved`);
          
          // AUTOMATICALLY UPDATE THE ROOM STATUS IN DATABASE
          if (room.status !== "Reserved") {
            console.log(`Auto-updating room ${room.number} to Reserved status in database`);
            try {
              const roomRef = doc(db, "rooms", room.id);
              await updateDoc(roomRef, { 
                status: "Reserved",
                lastUpdated: Timestamp.now()
              });
            } catch (error) {
              console.error(`Error auto-updating room status:`, error);
            }
          }
        } else {
          // No active or reserved bookings
          displayStatus = "Available";
          
          // AUTOMATICALLY UPDATE THE ROOM STATUS IN DATABASE to Available if needed
          if (room.status !== "Available" && room.status !== "Maintenance") {
            console.log(`Auto-updating room ${room.number} to Available status in database`);
            try {
              const roomRef = doc(db, "rooms", room.id);
              await updateDoc(roomRef, { 
                status: "Available",
                lastUpdated: Timestamp.now()
              });
            } catch (error) {
              console.error(`Error auto-updating room status:`, error);
            }
          }
        }
        
        console.log(`Final status for room ${room.number}: ${displayStatus}`);
        console.log(`=== End Room ${room.number} Analysis ===\n`);

        return {
          ...room,
          status: displayStatus,
          dbStatus: room.status, // Keep original DB status for reference
          ...bookingDetails
        };
      }));

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
    
    // Set up auto-refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      fetchRoomsAndBookings();
    }, 120000); // 2 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Show status update message for 3 seconds
  const showStatusMessage = (message, type = "success") => {
    setStatusUpdateMessage({ message, type });
    setTimeout(() => {
      setStatusUpdateMessage(null);
    }, 3000);
  };

  // Handle status change
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
        if (reservedBookingId) {
          const bookingRef = doc(db, "bookings", reservedBookingId);
          await updateDoc(bookingRef, { 
            status: "Checked in",
            lastUpdated: Timestamp.now()
          });
          
          showStatusMessage(`Room ${roomNumber} marked as Occupied and booking updated to Checked in`);
        } else {
          showStatusMessage(`Room ${roomNumber} marked as Occupied`);
        }
      } 
      else if (newStatus === "Available") {
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

      // Update local state
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === roomId ? { ...room, status: newStatus } : room
        )
      );
      
      // Refresh data after a delay
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
      (isBookingReserved(booking.status) || isBookingCheckedIn(booking.status))
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
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-row">
                      <td colSpan="5">No rooms available</td>
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