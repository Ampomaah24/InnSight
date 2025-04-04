import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Reservations.css";

const Reservations = () => {
  const [roomReservations, setRoomReservations] = useState([]);
  const [conferenceReservations, setConferenceReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("room"); // "room" or "conference"
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(1);
  const [notes, setNotes] = useState("");
  const [dataChanged, setDataChanged] = useState(false);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        
        // Regular room bookings
        const roomSnapshot = await getDocs(collection(db, "bookings"));
        let rooms = roomSnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Parse dates safely with error handling
          let checkInDate, checkOutDate, createdAt;
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
            
            if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt && data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else if (data.timestamp instanceof Timestamp) {
              createdAt = data.timestamp.toDate();
            } else if (data.timestamp && data.timestamp.seconds) {
              createdAt = new Date(data.timestamp.seconds * 1000);
            } else {
              createdAt = new Date();
            }
          } catch (e) {
            console.error("Error parsing dates for doc", doc.id, e);
            checkInDate = new Date();
            checkOutDate = new Date();
            createdAt = new Date();
          }
          
          // Calculate stay length in days
          const stayLengthMs = checkOutDate - checkInDate;
          const stayLengthDays = Math.ceil(stayLengthMs / (1000 * 60 * 60 * 24));
          
          return {
            id: doc.id,
            ...data,
            checkInFormatted: formatDate(checkInDate),
            checkOutFormatted: formatDate(checkOutDate),
            createdAtFormatted: formatDate(createdAt),
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            createdAt: createdAt,
            stayLength: stayLengthDays,
            month: checkInDate.getMonth() + 1, // 1-12 for Jan-Dec
            year: checkInDate.getFullYear()
          };
        });

        // Conference room bookings
        const confSnapshot = await getDocs(collection(db, "conferenceBookings"));
        let conferences = confSnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Parse dates safely with error handling
          let checkInDate, checkOutDate, createdAt;
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
            
            if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt && data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else if (data.timestamp instanceof Timestamp) {
              createdAt = data.timestamp.toDate();
            } else if (data.timestamp && data.timestamp.seconds) {
              createdAt = new Date(data.timestamp.seconds * 1000);
            } else {
              createdAt = new Date();
            }
          } catch (e) {
            console.error("Error parsing dates for doc", doc.id, e);
            checkInDate = new Date();
            checkOutDate = new Date();
            createdAt = new Date();
          }
          
          // Calculate event length in hours
          const eventLengthMs = checkOutDate - checkInDate;
          const eventLengthHours = Math.ceil(eventLengthMs / (1000 * 60 * 60));
          
          return {
            id: doc.id,
            ...data,
            checkInFormatted: formatDate(checkInDate, true),
            checkOutFormatted: formatDate(checkOutDate, true),
            createdAtFormatted: formatDate(createdAt),
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            createdAt: createdAt,
            eventLength: eventLengthHours,
            month: checkInDate.getMonth() + 1, // 1-12 for Jan-Dec
            year: checkInDate.getFullYear()
          };
        });

        // Sort by check-in date (ascending)
        const sortedRooms = rooms.sort((a, b) => a.checkInDate - b.checkInDate);
        const sortedConf = conferences.sort((a, b) => a.checkInDate - b.checkInDate);

        setRoomReservations(sortedRooms);
        setConferenceReservations(sortedConf);
        setLoading(false);
        setDataChanged(false);
      } catch (error) {
        console.error("Error fetching reservations:", error);
        setLoading(false);
      }
    };

    fetchReservations();
  }, [dataChanged]);
  
  // Helper function to format dates
  const formatDate = (date, includeTime = false) => {
    if (!date) return "N/A";
    
    try {
      if (includeTime) {
        return date.toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Invalid Date";
    }
  };

  // Function to extend a stay
  const extendStay = async () => {
    if (!selectedReservation || !extendDays) return;
    
    try {
      // Calculate new checkout date
      const newCheckoutDate = new Date(selectedReservation.checkOutDate);
      newCheckoutDate.setDate(newCheckoutDate.getDate() + parseInt(extendDays));
      
      // Update the reservation in Firestore
      const collectionName = activeTab === "room" ? "bookings" : "conferenceBookings";
      const reservationRef = doc(db, collectionName, selectedReservation.id);
      
      await updateDoc(reservationRef, {
        checkOut: Timestamp.fromDate(newCheckoutDate),
        lastUpdated: Timestamp.now(),
        notes: notes ? `${selectedReservation.notes || ''}\n${new Date().toLocaleString()}: Extended stay by ${extendDays} days. ${notes}` : 
                      `${selectedReservation.notes || ''}\n${new Date().toLocaleString()}: Extended stay by ${extendDays} days.`
      });
      
      // Close modal and reset state
      setIsModalOpen(false);
      setSelectedReservation(null);
      setExtendDays(1);
      setNotes("");
      setDataChanged(true);
      
      alert("Stay extended successfully!");
    } catch (error) {
      console.error("Error extending stay:", error);
      alert("Failed to extend stay. Please try again.");
    }
  };
  
  // Function to cancel a reservation
  const cancelReservation = async (reservation) => {
    if (!reservation) return;
    
    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }
    
    try {
      const collectionName = activeTab === "room" ? "bookings" : "conferenceBookings";
      const reservationRef = doc(db, collectionName, reservation.id);
      
      await updateDoc(reservationRef, {
        status: "Cancelled",
        lastUpdated: Timestamp.now(),
        notes: `${reservation.notes || ''}\n${new Date().toLocaleString()}: Reservation cancelled.`
      });
      
      // Update room availability if applicable
      if (activeTab === "room" && reservation.roomNumber) {
        const roomRef = doc(db, "rooms", reservation.roomNumber);
        await updateDoc(roomRef, { 
          isAvailable: true,
          lastUpdated: Timestamp.now()
        });
      }
      
      setDataChanged(true);
      alert("Reservation cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      alert("Failed to cancel reservation. Please try again.");
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
  
  // Get months for filtering
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };
  
  // Get unique months from data
  const getUniqueMonths = () => {
    const data = activeTab === "room" ? roomReservations : conferenceReservations;
    const uniqueMonths = new Set();
    
    data.forEach(res => {
      const monthYear = `${res.month}-${res.year}`;
      uniqueMonths.add(monthYear);
    });
    
    return Array.from(uniqueMonths)
      .sort((a, b) => {
        const [monthA, yearA] = a.split('-').map(Number);
        const [monthB, yearB] = b.split('-').map(Number);
        
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
      })
      .map(monthYear => {
        const [month, year] = monthYear.split('-').map(Number);
        return {
          value: monthYear,
          label: `${getMonthName(month)} ${year}`
        };
      });
  };
  
  // Filter data based on search terms, status, and date filters
  const filterData = (data) => {
    return data.filter(res => {
      // Name search
      const nameMatch = res.guestName ? 
        res.guestName.toLowerCase().includes(search.toLowerCase()) : 
        `${res.firstName || ''} ${res.lastName || ''}`.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const statusMatch = filterStatus ? 
        (res.status || '').toLowerCase() === filterStatus.toLowerCase() : 
        true;
      
      // Date filter (for specific date)
      let dateMatch = true;
      if (filterDate) {
        const filterDateObj = new Date(filterDate);
        filterDateObj.setHours(0, 0, 0, 0);
        
        const checkInDate = new Date(res.checkInDate);
        checkInDate.setHours(0, 0, 0, 0);
        
        const checkOutDate = new Date(res.checkOutDate);
        checkOutDate.setHours(0, 0, 0, 0);
        
        dateMatch = (checkInDate <= filterDateObj && checkOutDate >= filterDateObj);
      }
      
      // Month filter
      let monthMatch = true;
      if (filterMonth) {
        const [month, year] = filterMonth.split('-').map(Number);
        monthMatch = (res.month === month && res.year === year);
      }
      
      return nameMatch && statusMatch && dateMatch && monthMatch;
    });
  };

  // Get the active data based on the current tab
  const activeData = activeTab === "room" ? roomReservations : conferenceReservations;
  const filteredData = filterData(activeData);
  
  // Calculate statistics
  const getStatistics = () => {
    const total = filteredData.length;
    const confirmed = filteredData.filter(res => 
      (res.status || '').toLowerCase() === 'confirmed').length;
    const checkedIn = filteredData.filter(res => 
      (res.status || '').toLowerCase() === 'checked in' || 
      (res.status || '').toLowerCase() === 'checked-in').length;
    const checkedOut = filteredData.filter(res => 
      (res.status || '').toLowerCase() === 'checked out' || 
      (res.status || '').toLowerCase() === 'checked-out').length;
    const cancelled = filteredData.filter(res => 
      (res.status || '').toLowerCase() === 'cancelled' || 
      (res.status || '').toLowerCase() === 'canceled').length;
    
    return { total, confirmed, checkedIn, checkedOut, cancelled };
  };
  
  const stats = getStatistics();

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Reservations</h1>
          <p className="page-subtitle">Comprehensive reservation management</p>
        </div>

        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-title">Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card confirmed-card">
            <div className="stat-title">Confirmed</div>
            <div className="stat-value">{stats.confirmed}</div>
          </div>
          <div className="stat-card checked-in-card">
            <div className="stat-title">Checked In</div>
            <div className="stat-value">{stats.checkedIn}</div>
          </div>
          <div className="stat-card checked-out-card">
            <div className="stat-title">Checked Out</div>
            <div className="stat-value">{stats.checkedOut}</div>
          </div>
          <div className="stat-card cancelled-card">
            <div className="stat-title">Cancelled</div>
            <div className="stat-value">{stats.cancelled}</div>
          </div>
        </div>

        <div className="filters-container">
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by guest name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-box">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked in">Checked in</option>
                <option value="Checked out">Checked out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-box">
              <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">All Months</option>
                {getUniqueMonths().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-box">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Filter by specific date"
              />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="tabs-container">
          <div 
            className={`tab ${activeTab === "room" ? "active" : ""}`}
            onClick={() => setActiveTab("room")}
          >
            Room Bookings
          </div>
          <div 
            className={`tab ${activeTab === "conference" ? "active" : ""}`}
            onClick={() => setActiveTab("conference")}
          >
            Conference Bookings
          </div>
        </div>

        {/* Reservations Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">Loading reservations...</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="reservations-table">
                  <thead>
                    <tr>
                      <th>Guest Name</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>{activeTab === "room" ? "Room" : "Venue"}</th>
                      <th>{activeTab === "room" ? "Stay" : "Duration"}</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((res) => (
                        <tr key={res.id}>
                          <td>{res.guestName || `${res.firstName || ''} ${res.lastName || ''}`}</td>
                          <td>{res.checkInFormatted}</td>
                          <td>{res.checkOutFormatted}</td>
                          <td>{res.roomNumber || res.room || "N/A"}</td>
                          <td>
                            {activeTab === "room" 
                              ? `${res.stayLength} night${res.stayLength !== 1 ? 's' : ''}` 
                              : `${res.eventLength} hour${res.eventLength !== 1 ? 's' : ''}`}
                          </td>
                          <td>{res.createdAtFormatted}</td>
                          <td>
                            <span className={`status ${getStatusClass(res.status)}`}>
                              {res.status || "Pending"}
                            </span>
                          </td>
                          <td className="actions-cell">
                            {(res.status === "Confirmed" || res.status === "Checked in" || res.status === "Checked-in") && (
                              <>
                                <button 
                                  className="action-btn extend-btn"
                                  onClick={() => {
                                    setSelectedReservation(res);
                                    setIsModalOpen(true);
                                  }}
                                  title="Extend Stay"
                                >
                                  Extend
                                </button>
                                
                                <button 
                                  className="action-btn cancel-btn"
                                  onClick={() => cancelReservation(res)}
                                  title="Cancel Reservation"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="empty-row">
                        <td colSpan="8">No reservations found matching your criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="pagination">
                <div className="showing-entries">
                  Showing {filteredData.length} of {activeData.length} entries
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Extension Modal */}
      {isModalOpen && selectedReservation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Extend Stay</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Guest: <strong>{selectedReservation.guestName || `${selectedReservation.firstName} ${selectedReservation.lastName}`}</strong></p>
              <p>Current Check-in: <strong>{selectedReservation.checkInFormatted}</strong></p>
              <p>Current Check-out: <strong>{selectedReservation.checkOutFormatted}</strong></p>
              
              <div className="form-group">
                <label>Extend by (days):</label>
                <input 
                  type="number" 
                  min="1" 
                  value={extendDays} 
                  onChange={(e) => setExtendDays(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Notes:</label>
                <textarea 
                  rows="3" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for extension (optional)"
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="confirm-button" onClick={extendStay}>Confirm Extension</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;