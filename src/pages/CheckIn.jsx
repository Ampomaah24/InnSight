import React, { useState, useEffect } from "react";
import { collection, query, getDocs, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import "../assets/styles/CheckIn.css";

const CheckIn = () => {
  const [bookedGuests, setBookedGuests] = useState([]);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', 'tomorrow', 'all'
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatedRoom, setUpdatedRoom] = useState(null);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  
  // Get today's date at midnight for accurate comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get day after tomorrow for range check
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all rooms first to have their info available
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const roomsData = {};
      const roomNumberToId = {}; // Map room numbers to document IDs
      
      roomsSnapshot.docs.forEach(doc => {
        const roomData = doc.data();
        roomsData[doc.id] = {
          id: doc.id,
          ...roomData,
          name: roomData.name || doc.id
        };
        
        // Create mapping from room number/name to document ID
        if (roomData.name) {
          roomNumberToId[roomData.name] = doc.id;
        }
      });
      
      setRooms({ roomsData, roomNumberToId }); // Store both the room data and the mapping
      
      // Fetch all bookings from Firestore
      const bookingsQuery = query(collection(db, "bookings"));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Looking at the Firestore database structure, direct field mapping
      const bookingsData = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Parse dates safely
        let checkInDate, checkOutDate;
        try {
          if (data.checkIn instanceof Timestamp) {
            checkInDate = data.checkIn.toDate();
          } else if (data.checkIn && data.checkIn.seconds) {
            checkInDate = new Date(data.checkIn.seconds * 1000);
          } else {
            checkInDate = new Date(data.checkIn);
          }
          
          if (data.checkOut instanceof Timestamp) {
            checkOutDate = data.checkOut.toDate();
          } else if (data.checkOut && data.checkOut.seconds) {
            checkOutDate = new Date(data.checkOut.seconds * 1000);
          } else {
            checkOutDate = new Date(data.checkOut);
          }
        } catch (e) {
          console.error("Error parsing dates for doc", doc.id, e);
          checkInDate = new Date();
          checkOutDate = new Date();
        }
        
        // Get room details if available
        const roomId = roomNumberToId[data.roomNumber] || null;
        const roomDetails = roomId ? roomsData[roomId] : null;
        
        // Based on the Firestore structure, use booker information for guest name
        const fullName = data.bookerFirstName && data.bookerLastName 
          ? `${data.bookerFirstName} ${data.bookerLastName}`.trim()
          : data.bookerFirstName || data.bookerLastName || 'Guest';
        
        return {
          id: doc.id,
          ...data,
          fullName: fullName,
          checkInFormatted: formatDate(checkInDate),
          checkOutFormatted: formatDate(checkOutDate),
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          isCheckingInToday: isSameDay(checkInDate, today),
          isCheckingOutToday: isSameDay(checkOutDate, today),
          isCheckingInTomorrow: isSameDay(checkInDate, tomorrow),
          isExpired: checkOutDate < today && (data.status === "Checked in" || data.status === "Confirmed"),
          roomDetails,
          roomId // Store the actual room document ID
        };
      }).filter(booking => booking.checkInDate && booking.checkOutDate); // Filter out bookings with invalid dates

      // Sort by relevance for today's operations
      const sortedBookings = bookingsData.sort((a, b) => {
        // If it's after noon, prioritize checkouts
        const isPM = new Date().getHours() >= 12;
        
        if (isPM) {
          // Show checkouts first in the afternoon
          if (a.isCheckingOutToday && !b.isCheckingOutToday) return -1;
          if (!a.isCheckingOutToday && b.isCheckingOutToday) return 1;
          
          // Then show today's check-ins
          if (a.isCheckingInToday && !b.isCheckingInToday) return -1;
          if (!a.isCheckingInToday && b.isCheckingInToday) return 1;
        } else {
          // Show check-ins first in the morning
          if (a.isCheckingInToday && !b.isCheckingInToday) return -1;
          if (!a.isCheckingInToday && b.isCheckingInToday) return 1;
          
          // Then show today's checkouts
          if (a.isCheckingOutToday && !b.isCheckingOutToday) return -1;
          if (!a.isCheckingOutToday && b.isCheckingOutToday) return 1;
        }
        
        // Then show tomorrow's check-ins
        if (a.isCheckingInTomorrow && !b.isCheckingInTomorrow) return -1;
        if (!a.isCheckingInTomorrow && b.isCheckingInTomorrow) return 1;
        
        // Then sort by check-in date
        return a.checkInDate - b.checkInDate;
      });
      
      setBookedGuests(sortedBookings);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Check if two dates are the same day
  function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }
  
  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return "N/A";
    
    try {
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Invalid Date";
    }
  };

  // Handle Check-in action
  const handleCheckIn = async (bookingId) => {
    try {
      setUpdatingStatus(true);
      
      // Get the booking data
      const booking = bookedGuests.find(guest => guest.id === bookingId);
      if (!booking) {
        console.error("Booking not found");
        setUpdatingStatus(false);
        return;
      }
      
      // Update booking status in Firestore
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { 
        status: "Checked in",
        lastUpdated: Timestamp.now()
      });

      // Update room status if room ID is available
      if (booking.roomId) {
        const roomRef = doc(db, "rooms", booking.roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          // Update room status to Occupied
          await updateDoc(roomRef, { 
            status: "Occupied",
            lastUpdated: Timestamp.now()
          });
          
          setUpdatedRoom({
            number: booking.roomNumber,
            available: false
          });
          
          console.log(`Updated room ${booking.roomNumber} (ID: ${booking.roomId}) status to Occupied`);
        } else {
          console.warn(`Room ${booking.roomNumber} (ID: ${booking.roomId}) not found in database`);
        }
      } else {
        console.warn(`No room ID found for room number ${booking.roomNumber}`);
      }

      // Update UI
      setBookedGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === bookingId ? { ...guest, status: "Checked in" } : guest
        )
      );
      
      setUpdatingStatus(false);
      
      // Refresh data after a short delay to ensure all UI elements are updated
      setTimeout(() => fetchData(), 1000);
    } catch (error) {
      console.error("Error checking in:", error);
      setUpdatingStatus(false);
    }
  };

  // Handle Check-out action
  const handleCheckOut = async (bookingId) => {
    try {
      setUpdatingStatus(true);
      
      // Get the booking data
      const booking = bookedGuests.find(guest => guest.id === bookingId);
      if (!booking) {
        console.error("Booking not found");
        setUpdatingStatus(false);
        return;
      }
      
      // Update booking status in Firestore
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { 
        status: "Checked out",
        lastUpdated: Timestamp.now() 
      });

      // Update room status if room ID is available
      if (booking.roomId) {
        const roomRef = doc(db, "rooms", booking.roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          // Update room status to Available
          await updateDoc(roomRef, { 
            status: "Available",
            lastUpdated: Timestamp.now()
          });
          
          setUpdatedRoom({
            number: booking.roomNumber,
            available: true
          });
          
          console.log(`Updated room ${booking.roomNumber} (ID: ${booking.roomId}) status to Available`);
        } else {
          console.warn(`Room ${booking.roomNumber} (ID: ${booking.roomId}) not found in database`);
        }
      } else {
        console.warn(`No room ID found for room number ${booking.roomNumber}`);
      }

      // Update UI
      setBookedGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === bookingId ? { ...guest, status: "Checked out" } : guest
        )
      );
      
      setUpdatingStatus(false);
      
      // Refresh data after a short delay to ensure all UI elements are updated
      setTimeout(() => fetchData(), 1000);
    } catch (error) {
      console.error("Error checking out:", error);
      setUpdatingStatus(false);
    }
  };
  
  // Handle expired stays
  const processExpiredStay = async (bookingId) => {
    try {
      setUpdatingStatus(true);
      
      const booking = bookedGuests.find(guest => guest.id === bookingId);
      if (!booking) {
        console.error("Booking not found");
        setUpdatingStatus(false);
        return;
      }
      
      // Update booking status
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { 
        status: "Checked out",
        lastUpdated: Timestamp.now(),
        notes: (booking.notes || '') + `\n${new Date().toLocaleString()}: Auto-checked out due to expired stay.`
      });
      
      // Update room status if room ID is available
      if (booking.roomId) {
        const roomRef = doc(db, "rooms", booking.roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          await updateDoc(roomRef, { 
            status: "Available",
            lastUpdated: Timestamp.now()
          });
          
          setUpdatedRoom({
            number: booking.roomNumber,
            available: true
          });
        }
      }
      
      // Update UI
      setBookedGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === bookingId ? { 
            ...guest, 
            status: "Checked out",
            isExpired: false 
          } : guest
        )
      );
      
      setUpdatingStatus(false);
      setTimeout(() => fetchData(), 1000);
    } catch (error) {
      console.error("Error processing expired stay:", error);
      setUpdatingStatus(false);
    }
  };
  
  // Get status class
  const getStatusClass = (status) => {
    if (!status) return 'pending';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'confirmed';
      case 'checked in':
      case 'checked-in':
        return 'checked-in';
      case 'checked out':
      case 'checked-out':
        return 'checked-out';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      default:
        return 'pending';
    }
  };
  
  // Filter guests based on search, time frame, and expired status
  const filteredGuests = bookedGuests.filter(guest => {
    // Name search filter with null check to prevent toLowerCase errors
    const guestName = (guest.fullName || '').toLowerCase();
    const nameMatch = searchTerm ? guestName.includes(searchTerm.toLowerCase()) : true;
    
    // Time frame filter
    let timeFrameMatch = true;
    if (!categoryFilter && !showExpiredOnly) {
      if (timeFilter === 'today') {
        timeFrameMatch = guest.isCheckingInToday || guest.isCheckingOutToday;
      } else if (timeFilter === 'tomorrow') {
        timeFrameMatch = guest.isCheckingInTomorrow;
      }
    }

    let categoryMatch = true;
    switch (categoryFilter) {
      case "checked-in":
        categoryMatch = guest.status?.toLowerCase() === "checked in" || guest.status?.toLowerCase() === "checked-in";
        break;
      case "confirmed":
        categoryMatch = guest.status?.toLowerCase() === "confirmed";
        break;
      case "expired":
        categoryMatch = guest.isExpired;
        break;
      default:
        categoryMatch = true;
    }
    // Expired reservation filter
    const expiredMatch = showExpiredOnly ? guest.isExpired : true;
    
    return nameMatch && categoryMatch && (showExpiredOnly ? guest.isExpired : timeFrameMatch);

  });
  
  // Get counts for tabs
  const todayCount = bookedGuests.filter(guest => guest.isCheckingInToday || guest.isCheckingOutToday).length;
  const tomorrowCount = bookedGuests.filter(guest => guest.isCheckingInTomorrow).length;
  const expiredCount = bookedGuests.filter(guest => guest.isExpired).length;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Check-in / Check-out</h1>
          {updatedRoom && (
            <div className={`room-update-notice ${updatedRoom.available ? 'room-freed' : 'room-occupied'}`}>
              Room {updatedRoom.number} is now {updatedRoom.available ? 'available' : 'occupied'}
            </div>
          )}
        </div>

        <div className="operation-summary">
          <div className="summary-card">
            <div className="summary-title">Today's Check-ins</div>
            <div className="summary-value">{bookedGuests.filter(guest => guest.isCheckingInToday).length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Today's Check-outs</div>
            <div className="summary-value">{bookedGuests.filter(guest => guest.isCheckingOutToday).length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Tomorrow's Arrivals</div>
            <div className="summary-value">{bookedGuests.filter(guest => guest.isCheckingInTomorrow).length}</div>
          </div>
          <div className="summary-card warning-card">
            <div className="summary-title">Expired Stays</div>
            <div className="summary-value">{bookedGuests.filter(guest => guest.isExpired).length}</div>
          </div>
        </div>

        <div className="filters-container">
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by guest name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="time-filter-tabs">
              <div 
                className={`filter-tab ${timeFilter === 'today' && !showExpiredOnly ? 'active' : ''}`}
                onClick={() => { setTimeFilter('today'); setShowExpiredOnly(false); }}
              >
                Today's Activity ({todayCount})
              </div>
              <div 
                className={`filter-tab ${timeFilter === 'tomorrow' && !showExpiredOnly ? 'active' : ''}`}
                onClick={() => { setTimeFilter('tomorrow'); setShowExpiredOnly(false); }}
              >
                Tomorrow's Arrivals ({tomorrowCount})
              </div>
              <div 
                className={`filter-tab ${timeFilter === 'all' && !showExpiredOnly ? 'active' : ''}`}
                onClick={() => { setTimeFilter('all'); setShowExpiredOnly(false); }}
              >
                All Reservations
              </div>
              <div 
                className={`filter-tab warning ${showExpiredOnly ? 'active' : ''}`}
                onClick={() => { setShowExpiredOnly(!showExpiredOnly); }}
              >
                Expired Stays ({expiredCount})

              </div>
              <div className="category-filter">
  <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
    className="category-dropdown"
  >
    <option value="">Category </option>
    <option value="checked-in">Checked In</option>
    <option value="confirmed">Confirmed Only</option>

  </select>
</div>

            </div>
          </div>
        </div>

        {/* Guests Table */}
        <div className="table-container">
          <h2 className="table-title">
            {showExpiredOnly ? 'Expired Stays' : 
             timeFilter === 'today' ? 'Today\'s Activity' :
             timeFilter === 'tomorrow' ? 'Tomorrow\'s Arrivals' : 'All Reservations'}
          </h2>
          {loading ? (
            <div className="loading">Loading reservations...</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="checkin-table">
                  <thead>
                    <tr>
                      <th>Guest Name</th>
                      <th>Check-in Date</th>
                      <th>Check-out Date</th>
                      <th>Room Type</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.length > 0 ? (
                      filteredGuests.map((guest) => (
                        <tr key={guest.id} className={guest.isExpired ? 'expired-row' : ''}>
                          <td>{guest.fullName}</td>
                          <td className={guest.isCheckingInToday ? 'highlight-cell' : ''}>
                            {guest.checkInFormatted}
                            {guest.isCheckingInToday && <span className="today-tag">Today</span>}
                          </td>
                          <td className={guest.isCheckingOutToday ? 'highlight-cell' : ''}>
                            {guest.checkOutFormatted}
                            {guest.isCheckingOutToday && <span className="today-tag">Today</span>}
                          </td>
                          <td>{guest.roomType}</td>
                          <td>{guest.roomNumber || "Not assigned"}</td>
                          <td>
                            <span className={`status ${getStatusClass(guest.status)}`}>
                              {guest.status || "Pending"}
                              {guest.isExpired && <span className="expired-tag">Expired</span>}
                            </span>
                          </td>
                          <td className="actions-cell">
{["Confirmed", "Reserved"].includes(guest.status) && !guest.isExpired ? (
  <button 
    className="action-btn check-in-btn"
    onClick={() => handleCheckIn(guest.id)}
    disabled={updatingStatus}
  >
    Check In
  </button>
) : ["Confirmed", "Reserved"].includes(guest.status) && guest.isExpired ? (
  <button 
    className="action-btn check-in-btn disabled"
    disabled
    title="This reservation is expired and cannot be checked in."
  >
    Expired
  </button>
) : null}


                            {(guest.status === "Checked in" || guest.status === "Checked-in") && (
                              <button 
                                className="action-btn check-out-btn"
                                onClick={() => handleCheckOut(guest.id)}
                                disabled={updatingStatus}
                              >
                                Check Out
                              </button>
                            )}
                            {guest.isExpired && (
                              <button 
                                className="action-btn process-btn"
                                onClick={() => processExpiredStay(guest.id)}
                                disabled={updatingStatus}
                              >
                                Process
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="empty-row">
                        <td colSpan="7">No reservations found matching your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="pagination">
                <div className="showing-entries">
                  Showing {filteredGuests.length} of {bookedGuests.length} entries
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIn;