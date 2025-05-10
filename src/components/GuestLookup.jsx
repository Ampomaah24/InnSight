import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { FaSearch, FaSpinner, FaUsers, FaCalendarAlt, FaUserPlus, FaBed, FaIdBadge } from "react-icons/fa";
import "../assets/styles/GuestLookup.css";
const GuestLookupComponent = ({ 
  onSelectGuest, 
  setLookupError, 
  showAllPending = false 
}) => {
  const [lookupEmail, setLookupEmail] = useState("");
  const [pendingGuests, setPendingGuests] = useState([]);
  const [pendingGuestsLoading, setPendingGuestsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [lookupType, setLookupType] = useState("email"); // "email", "name", "allPending"
  const [lookupName, setLookupName] = useState("");
  
  // Handle guest lookup
  const handleGuestLookup = async () => {
    // For "All Pending" option, don't require email
    if (lookupType !== "allPending" && !lookupEmail && !lookupName) {
      setLookupError("Please enter search criteria");
      return;
    }
    
    setPendingGuestsLoading(true);
    setLookupError(null);
    setPendingGuests([]);
    
    try {
      const bookingsRef = collection(db, "bookings");
      let bookingsQuery;
      
      // Based on lookup type, construct the appropriate query
      if (lookupType === "email") {
        bookingsQuery = query(bookingsRef, where("email", "==", lookupEmail));
      } 
      else if (lookupType === "name") {
        // Split into first and last name
        const nameParts = lookupName.trim().split(" ");
        if (nameParts.length > 1) {
          // If we have both first and last name
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          bookingsQuery = query(
            bookingsRef, 
            where("bookerFirstName", "==", firstName),
            where("bookerLastName", "==", lastName)
          );
        } else {
          // If just one name, try to match on either first or last name
          // This is a bit tricky in Firestore, so we'll need to do two queries
          // and combine the results
          const firstNameQuerySnapshot = await getDocs(
            query(bookingsRef, where("bookerFirstName", "==", lookupName))
          );
          const lastNameQuerySnapshot = await getDocs(
            query(bookingsRef, where("bookerLastName", "==", lookupName))
          );
          
          // Combine results from both queries
          const results = [];
          firstNameQuerySnapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
          lastNameQuerySnapshot.forEach(doc => {
            // Avoid duplicates (if a doc appears in both queries)
            if (!results.some(r => r.id === doc.id)) {
              results.push({ id: doc.id, ...doc.data() });
            }
          });
          
          // Process these results directly
          const pendingGuestsList = [];
          for (const booking of results) {
            if (booking.pendingGuestAccounts && booking.guests && booking.guests.length > 0) {
              const pendingGuests = booking.guests.filter(guest => !guest.accountCreated);
              if (pendingGuests.length > 0) {
                pendingGuestsList.push({
                  ...booking,
                  pendingGuests
                });
              }
            }
          }
          
          if (pendingGuestsList.length === 0) {
            setLookupError("No pending guest registrations found for this name");
          } else {
            setPendingGuests(pendingGuestsList);
          }
          
          setPendingGuestsLoading(false);
          return;
        }
      }
      else if (lookupType === "allPending") {
        // Query for all bookings with pending guest accounts
        bookingsQuery = query(
          bookingsRef, 
          where("pendingGuestAccounts", "==", true),
          orderBy("checkIn", "asc"),
          limit(50) // Limit to avoid performance issues
        );
      }
      
      // Apply additional filters if selected
      if (showAdvancedFilters) {
        if (selectedRoom) {
          bookingsQuery = query(bookingsQuery, where("roomNumber", "==", selectedRoom));
        }
        
        if (selectedDate) {
          // Convert to date object
          const selectedDateObj = new Date(selectedDate);
          // Set to midnight
          selectedDateObj.setHours(0, 0, 0, 0);
          
          // Create a timestamp for the next day
          const nextDay = new Date(selectedDateObj);
          nextDay.setDate(selectedDateObj.getDate() + 1);
          
          // We need to find bookings where:
          // 1. Check-in date is on or before the selected date, AND
          // 2. Check-out date is on or after the selected date
          // This means the guest is staying at the hotel on the selected date
          
          // This is complex in Firestore, so we'll need to do the filtering in JavaScript
          // First, get bookings where check-in is before or on the selected date
          const checkInQuery = query(
            bookingsRef,
            where("checkIn", "<=", selectedDateObj)
          );
          
          const checkInSnapshot = await getDocs(checkInQuery);
          
          // Then filter in JavaScript for the check-out date
          const filteredBookings = [];
          checkInSnapshot.forEach(doc => {
            const booking = { id: doc.id, ...doc.data() };
            const checkOutDate = booking.checkOut instanceof Date 
              ? booking.checkOut 
              : new Date(booking.checkOut);
              
            if (checkOutDate >= selectedDateObj) {
              filteredBookings.push(booking);
            }
          });
          
          // Process these filtered bookings
          const pendingGuestsList = [];
          for (const booking of filteredBookings) {
            if (booking.pendingGuestAccounts && booking.guests && booking.guests.length > 0) {
              const pendingGuests = booking.guests.filter(guest => !guest.accountCreated);
              if (pendingGuests.length > 0) {
                pendingGuestsList.push({
                  ...booking,
                  pendingGuests
                });
              }
            }
          }
          
          if (pendingGuestsList.length === 0) {
            setLookupError("No pending guest registrations found for the selected date");
          } else {
            setPendingGuests(pendingGuestsList);
          }
          
          setPendingGuestsLoading(false);
          return;
        }
      }
      
      // Execute the query
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      if (bookingsSnapshot.empty) {
        setLookupError(`No bookings found for this ${lookupType === "email" ? "email address" : "name"}`);
        setPendingGuestsLoading(false);
        return;
      }
      
      const pendingGuestsList = [];
      
      bookingsSnapshot.forEach(docSnapshot => {
        const booking = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Check for pendingGuestAccounts flag and guests array
        if (booking.pendingGuestAccounts && booking.guests && booking.guests.length > 0) {
          // Find guests that don't have accounts created
          const pendingGuests = booking.guests.filter(guest => !guest.accountCreated);
          
          if (pendingGuests.length > 0) {
            pendingGuestsList.push({
              ...booking,
              pendingGuests
            });
          }
        }
      });
      
      if (pendingGuestsList.length === 0) {
        setLookupError(`No pending guest registrations found for this ${lookupType === "email" ? "email address" : "name"}`);
      } else {
        setPendingGuests(pendingGuestsList);
      }
    } catch (error) {
      console.error("Error looking up guest:", error);
      setLookupError("Error searching for guest bookings. Please try again.");
    } finally {
      setPendingGuestsLoading(false);
    }
  };

  // Effect to automatically load all pending guests if showAllPending is true
  useEffect(() => {
    if (showAllPending) {
      setLookupType("allPending");
      handleGuestLookup();
    }
  }, [showAllPending]);

  // Get available rooms for filtering
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setRoomsLoading(true);
        const roomsRef = collection(db, "rooms");
        const querySnapshot = await getDocs(roomsRef);
        
        const rooms = [];
        querySnapshot.forEach((doc) => {
          const room = { id: doc.id, ...doc.data() };
          rooms.push(room);
        });
        
        // Sort rooms by number
        rooms.sort((a, b) => a.roomNumber - b.roomNumber);
        setAvailableRooms(rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setRoomsLoading(false);
      }
    };
    
    if (showAdvancedFilters) {
      fetchRooms();
    }
  }, [showAdvancedFilters]);
  
  return (
    <div className="guest-lookup">
      <div className="guest-lookup__search">
        <div className="search-form">
          <div className="search-type-selector">
            <div className="search-type-tabs">
              <button 
                className={`search-type-tab ${lookupType === "email" ? 'active' : ''}`}
                onClick={() => setLookupType("email")}
              >
                Search by Email
              </button>
              <button 
                className={`search-type-tab ${lookupType === "name" ? 'active' : ''}`}
                onClick={() => setLookupType("name")}
              >
                Search by Name
              </button>
              <button 
                className={`search-type-tab ${lookupType === "allPending" ? 'active' : ''}`}
                onClick={() => setLookupType("allPending")}
              >
                All Pending Guests
              </button>
            </div>
          </div>
          
          {lookupType !== "allPending" && (
            <div className="search-form__field">
              <label htmlFor={lookupType === "email" ? "lookupEmail" : "lookupName"} className="search-form__label">
                {lookupType === "email" ? (
                  <>
                    <FaSearch className="search-form__icon" /> 
                    Booking Email Address
                  </>
                ) : (
                  <>
                    <FaSearch className="search-form__icon" /> 
                    Guest Name
                  </>
                )}
              </label>
              <div className="search-form__input-group">
                {lookupType === "email" ? (
                  <input
                    type="email"
                    id="lookupEmail"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Enter booking email"
                    className="search-form__input"
                  />
                ) : (
                  <input
                    type="text"
                    id="lookupName"
                    value={lookupName}
                    onChange={(e) => setLookupName(e.target.value)}
                    placeholder="Enter guest name"
                    className="search-form__input"
                  />
                )}
                <button 
                  onClick={handleGuestLookup} 
                  className="search-form__button"
                  disabled={pendingGuestsLoading}
                >
                  {pendingGuestsLoading ? <FaSpinner className="spinner" /> : <FaSearch />}
                  {pendingGuestsLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          )}
          
          <div className="advanced-filters-toggle">
            <button 
              className="toggle-button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
            </button>
          </div>
          
          {showAdvancedFilters && (
            <div className="advanced-filters">
              <div className="advanced-filters__row">
                <div className="advanced-filters__field">
                  <label htmlFor="selectedRoom" className="advanced-filters__label">
                    <FaBed className="advanced-filters__icon" />
                    Filter by Room
                  </label>
                  <select
                    id="selectedRoom"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="advanced-filters__select"
                  >
                    <option value="">All Rooms</option>
                    {roomsLoading ? (
                      <option disabled>Loading rooms...</option>
                    ) : (
                      availableRooms.map((room) => (
                        <option key={room.id} value={room.roomNumber}>
                          Room {room.roomNumber} - {room.type}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                <div className="advanced-filters__field">
                  <label htmlFor="selectedDate" className="advanced-filters__label">
                    <FaCalendarAlt className="advanced-filters__icon" />
                    Filter by Stay Date
                  </label>
                  <input
                    type="date"
                    id="selectedDate"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="advanced-filters__input"
                  />
                </div>
              </div>
            </div>
          )}
          
          {lookupType === "allPending" && (
            <div className="search-actions">
              <button 
                onClick={handleGuestLookup} 
                className="search-form__button search-form__button--full"
                disabled={pendingGuestsLoading}
              >
                {pendingGuestsLoading ? <FaSpinner className="spinner" /> : <FaSearch />}
                {pendingGuestsLoading ? "Loading..." : "Show All Pending Guest Registrations"}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {pendingGuests.length > 0 && (
        <div className="guest-lookup__results">
          <h3 className="section-title">
            <FaUsers /> Pending Guest Registrations {pendingGuests.length > 1 ? `(${pendingGuests.length} bookings)` : ''}
          </h3>
          
          <div className="pending-stats">
            <div className="pending-stat-item">
              <span className="pending-stat-label">Total Bookings:</span>
              <span className="pending-stat-value">{pendingGuests.length}</span>
            </div>
            <div className="pending-stat-item">
              <span className="pending-stat-label">Total Pending Guests:</span>
              <span className="pending-stat-value">
                {pendingGuests.reduce((total, booking) => total + booking.pendingGuests.length, 0)}
              </span>
            </div>
          </div>
          
          <div className="bookings-list">
            {pendingGuests.map((booking) => (
              <div className="booking-card" key={booking.id}>
                <div className="booking-card__header">
                  <h4 className="booking-card__title">
                    Booking #{booking.id.substring(0, 6)}
                  </h4>
                  <div className="booking-card__dates">
                    <span>
                      <FaCalendarAlt className="booking-card__icon" />
                      {booking.checkIn instanceof Date 
                        ? booking.checkIn.toLocaleDateString() 
                        : booking.checkIn.seconds 
                          ? new Date(booking.checkIn.seconds * 1000).toLocaleDateString()
                          : booking.checkIn}
                      {' to '}
                      {booking.checkOut instanceof Date 
                        ? booking.checkOut.toLocaleDateString() 
                        : booking.checkOut.seconds 
                          ? new Date(booking.checkOut.seconds * 1000).toLocaleDateString()
                          : booking.checkOut}
                    </span>
                  </div>
                </div>
                <div className="booking-card__details">
                  <p className="booking-card__booker">
                    <FaUserPlus className="booking-card__icon" />
                    Booked by: {booking.bookerFirstName || booking.firstName} {booking.bookerLastName || booking.lastName}
                  </p>
                  <div className="booking-card__room-info">
                    <p>
                      <FaBed className="booking-card__icon" />
                      Room: {booking.roomType || 'Standard'} ({booking.roomNumber || "Not assigned"})
                    </p>
                    {booking.primaryGuestFirstName && booking.primaryGuestLastName && (
                      <p>
                        <FaIdBadge className="booking-card__icon" />
                        Primary Guest: {booking.primaryGuestFirstName} {booking.primaryGuestLastName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="booking-card__guests">
                  <h5 className="booking-card__subtitle">
                    Pending Guest Registrations: {booking.pendingGuests.length}
                  </h5>
                  <ul className="pending-guests-list">
                    {booking.pendingGuests.map((guest, index) => (
                      <li className="pending-guest" key={index}>
                        <div className="pending-guest__name">
                          {guest.firstName} {guest.lastName}
                          {guest.isMainBooker && <span className="main-booker-tag">Main Booker</span>}
                        </div>
                        <button 
                          className="pending-guest__register-btn"
                          onClick={() => onSelectGuest(booking, index)}
                        >
                          Complete Registration
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestLookupComponent;