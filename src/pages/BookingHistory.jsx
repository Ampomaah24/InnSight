import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import "../assets/styles/BookingHistory.css";
import { FaCalendarAlt, FaBed, FaDoorOpen, FaUsers, FaTrash, FaHistory, 
         FaMoneyBillWave, FaClock, FaMapMarkerAlt, FaInfoCircle, FaEdit } from "react-icons/fa";
import NavMenu from "../components/NavMenu";

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [modifyingId, setModifyingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modifyingBooking, setModifyingBooking] = useState(null);
  
  useEffect(() => {
    fetchUserBookings();
    
    // Set up interval to refresh bookings automatically every 5 minutes
    const intervalId = setInterval(() => {
      fetchUserBookings();
    }, 300000);
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  // Helper function to safely display values that might be objects
  const safeDisplayValue = (value) => {
    if (value === undefined || value === null) return "N/A";
    if (typeof value === 'object') return String(value.toString());
    return value;
  };

  // Helper function to safely process Firebase Timestamps or dates
  const processFirebaseDate = (dateValue) => {
    // Case 1: Firebase Timestamp object with seconds and nanoseconds
    if (typeof dateValue === 'object' && dateValue !== null && 
        'seconds' in dateValue && 'nanoseconds' in dateValue) {
      return new Date(dateValue.seconds * 1000 + Math.floor(dateValue.nanoseconds / 1000000));
    }
    
    // Case 2: Already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Case 3: ISO string or Firebase timestamp string (like "2025-04-24T00:00:00.000Z")
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Case 4: Unix timestamp as number
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    // Return null for invalid dates or undefined inputs
    return null;
  };

  // Helper function to ensure the booking data always has proper date formats
  const normalizeBookingDates = (booking) => {
    const normalized = { ...booking };
    
    if (booking.bookingType === 'room') {
      // Process room booking dates
      const checkInDate = processFirebaseDate(booking.checkInDate || booking.checkIn);
      const checkOutDate = processFirebaseDate(booking.checkOutDate || booking.checkOut);
      
      normalized.checkInDate = checkInDate ? checkInDate.toISOString() : 'Unknown date';
      normalized.checkOutDate = checkOutDate ? checkOutDate.toISOString() : 'Unknown date';
    } else if (booking.bookingType === 'conference') {
      // Process conference booking dates
      const date = processFirebaseDate(booking.date);
      normalized.date = date ? date.toISOString() : 'Unknown date';
    }
    
    // Process created/updated dates
    const createdAt = processFirebaseDate(booking.createdAt);
    const updatedAt = processFirebaseDate(booking.updatedAt);
    
    normalized.createdAt = createdAt ? createdAt.toISOString() : new Date().toISOString();
    normalized.updatedAt = updatedAt ? updatedAt.toISOString() : new Date().toISOString();
    
    return normalized;
  };

  const isBookingActive = (booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of current day
    
    if (booking.bookingType === "room") {
      // For room bookings, it's active if check-in date is today or in the past
      // and checkout date is today or in the future
      try {
        // Create proper Date objects from the booking dates
        const checkInDate = processFirebaseDate(booking.checkInDate || booking.checkIn);
        const checkInDateNormalized = checkInDate ? new Date(checkInDate) : null;
        if (checkInDateNormalized) checkInDateNormalized.setHours(0, 0, 0, 0);
        
        const checkOutDate = processFirebaseDate(booking.checkOutDate || booking.checkOut);
        const checkOutDateNormalized = checkOutDate ? new Date(checkOutDate) : null;
        if (checkOutDateNormalized) checkOutDateNormalized.setHours(0, 0, 0, 0);
        
        // Normal active check
        return checkInDateNormalized && checkOutDateNormalized && 
                checkInDateNormalized <= today && checkOutDateNormalized >= today;
      } catch (err) {
        console.error("Error checking active status for room booking:", err);
        return false;
      }
    } else if (booking.bookingType === "conference") {
      // For conference bookings, it's active if the date is today
      try {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        return bookingDate.getTime() === today.getTime();
      } catch (err) {
        console.error("Error checking active status for conference booking:", err);
        return false;
      }
    }
    return false;
  };
  
  const isBookingFuture = (booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of current day
    
    if (booking.bookingType === "room") {
      // For room bookings, it's future if check-in date is in the future
      try {
        const checkInDate = processFirebaseDate(booking.checkInDate || booking.checkIn);
        const checkInDateNormalized = checkInDate ? new Date(checkInDate) : null;
        if (checkInDateNormalized) checkInDateNormalized.setHours(0, 0, 0, 0);
        
        return checkInDateNormalized && checkInDateNormalized > today;
      } catch (err) {
        console.error("Error checking future status for room booking:", err);
        return false;
      }
    } else if (booking.bookingType === "conference") {
      // For conference bookings, it's future if the date is in the future
      try {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        return bookingDate > today;
      } catch (err) {
        console.error("Error checking future status for conference booking:", err);
        return false;
      }
    }
    return false;
  };

  // Helper function to determine if a booking should show active buttons
  const shouldShowActiveButtons = (booking) => {
    // If the booking has status "Confirmed", check the dates
    if (booking.status === "Confirmed") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      try {
        // Check if check-in date is today or has passed
        const checkInDate = processFirebaseDate(booking.checkInDate || booking.checkIn);
        const checkInDateObj = checkInDate ? new Date(checkInDate) : null;
        if (checkInDateObj) checkInDateObj.setHours(0, 0, 0, 0);
        
        // Return true if check-in date is today or in the past
        return checkInDateObj && checkInDateObj.getTime() <= today.getTime();
      } catch (err) {
        console.error("Error checking active status for buttons:", err);
        return false;
      }
    }
    
    // For non-confirmed bookings, use the normal isBookingActive logic
    return isBookingActive(booking);
  };

  // Fixed this function to be async
  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get current user from session storage
      const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
      
      if (!currentUser || !currentUser.id) {
        setError("You must be logged in to view your bookings.");
        setLoading(false);
        return;
      }
      
      console.log("Fetching bookings for user:", currentUser.id);
      
      // Add timeout promise to handle network issues
      const fetchWithTimeout = async (promise, timeoutMs) => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("Request timed out"));
          }, timeoutMs);
        });
        
        try {
          const result = await Promise.race([promise, timeoutPromise]);
          clearTimeout(timer);
          return result;
        } catch (error) {
          clearTimeout(timer);
          throw error;
        }
      };
      
      // Query bookings from the single bookings collection
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(
        bookingsRef, 
        where("userId", "==", currentUser.id),
        orderBy("createdAt", "desc") // Order by creation date descending
      );
      
      const bookingsSnapshot = await fetchWithTimeout(getDocs(bookingsQuery), 15000);
      
      console.log(`Found ${bookingsSnapshot.docs.length} bookings`);
      
      // Process all bookings with data validation and date normalization
      const allBookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        const now = new Date();
        
        // Create a basic booking object with defaults for missing fields
        const booking = {
          id: doc.id,
          ...data,
          bookingType: data.bookingType || "room", // Default to room if not specified
          // Use roomName if available, otherwise use roomType. If neither, provide default
          roomName: data.roomName || data.roomType || (data.bookingType === "room" ? "Standard Room" : "Conference Room"),
          roomType: data.roomType || data.roomCategory || "standard",
          // Use numberOfGuests if available, otherwise use guests field
          guests: data.numberOfGuests || data.guests || 1,
          attendees: data.attendees || data.numberOfAttendees || 0,
          totalPrice: data.totalPrice || data.finalPrice || data.amountPaid || 0,
          status: data.status || "active",
          createdAt: data.createdAt || now.toISOString(),
          updatedAt: data.updatedAt || now.toISOString()
        };
        
        // Add type-specific fields with proper field mapping
        if (booking.bookingType === "room") {
          booking.checkInDate = data.checkInDate || data.checkIn || now.toISOString();
          booking.checkOutDate = data.checkOutDate || data.checkOut || now.toISOString();
        } else if (booking.bookingType === "conference") {
          booking.date = data.date || now.toISOString();
          booking.startTime = data.startTime || "N/A";
          booking.endTime = data.endTime || "N/A";
        }
        
        // Normalize the dates
        const normalized = normalizeBookingDates(booking);
        
        // Calculate the past status based on normalized dates
        let isPast = false;
        try {
          if (normalized.bookingType === "room") {
            const checkOutDate = new Date(normalized.checkOutDate);
            isPast = checkOutDate < now;
          } else {
            const bookingDate = new Date(normalized.date);
            isPast = bookingDate < now;
          }
        } catch (e) {
          console.error("Error determining past status:", e);
          isPast = false;
        }
        
        normalized.isPast = isPast;
        
        // Add a nice display date for sorting and display
        try {
          if (normalized.bookingType === "room") {
            const checkInDate = new Date(normalized.checkInDate);
            normalized.displayDate = format(checkInDate, "yyyy-MM-dd");
          } else {
            const bookingDate = new Date(normalized.date);
            normalized.displayDate = format(bookingDate, "yyyy-MM-dd");
          }
        } catch (err) {
          normalized.displayDate = "Unknown";
        }
        
        return normalized;
      });
      
      setBookings(allBookings);
      console.log("Bookings loaded successfully:", allBookings.length);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      if (!navigator.onLine) {
        setError("You appear to be offline. Please check your internet connection and try again.");
      } else {
        setError("Failed to load your bookings. Please try again later.");
      }
      setLoading(false);
    }
  };

  // Improved formatDate function with better error handling
  const formatDate = (dateString) => {
    if (!dateString || dateString === "Unknown date") return "N/A";
    
    try {
      // Handle timestamp object format (has seconds and nanoseconds properties)
      if (typeof dateString === 'object' && dateString !== null) {
        if (dateString.seconds !== undefined) {
          // Convert Firebase Timestamp to Date
          const date = new Date(dateString.seconds * 1000);
          return format(date, "MMM dd, yyyy");
        }
        // If it's a Date object already
        if (dateString instanceof Date) {
          return format(dateString, "MMM dd, yyyy");
        }
        // If it's some other object, stringify it for debugging
        return "N/A";
      }
      
      // Handle ISO string format
      if (typeof dateString === 'string') {
        // Check if it's a valid date string
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return "N/A";
        }
        return format(date, "MMM dd, yyyy");
      }
      
      // Default case - return as is if we can't process it
      return "N/A";
    } catch (err) {
      console.error("Error formatting date:", dateString, err);
      return "N/A";
    }
  };
  
  // Improved formatTime function with better error handling
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    
    // Handle timestamp object format
    if (typeof timeString === 'object' && timeString !== null) {
      if (timeString.seconds !== undefined) {
        // Convert Firebase Timestamp to time string
        const date = new Date(timeString.seconds * 1000);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
      return "N/A";
    }
    
    // For string time format (HH:MM)
    try {
      if (typeof timeString === 'string') {
        const [hours, minutes] = timeString.split(':');
        if (!hours || !minutes) {
          return timeString; // Return original if not in expected format
        }
        
        const hour = parseInt(hours);
        if (isNaN(hour) || hour < 0 || hour > 23) {
          return timeString; // Return original if hours invalid
        }
        
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      }
      
      return String(timeString);
    } catch (err) {
      console.error("Error formatting time:", timeString, err);
      return String(timeString);
    }
  };
  
  const handleTerminateBooking = () => {
    alert("Please contact reception to terminate your active booking. Early termination fees may apply.");
  };
  
  const handleShortenBooking = () => {
    alert("Please contact reception to shorten your active booking. Modification fees may apply.");
  };

  const handleCancelBooking = async (booking) => {
    // Only allow cancellation for future bookings
    if (!isBookingFuture(booking)) {
      alert("Only future bookings can be cancelled. Please contact reception for modifications to active bookings.");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to cancel this ${booking.bookingType} booking?`)) {
      return;
    }

    try {
      setCancellingId(booking.id);
      
      // Update the booking in the bookings collection
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Refresh the bookings list
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      alert("Booking cancelled successfully!");
    } catch (err) {
      console.error("Error cancelling booking:", err);
      
      // More specific error messages
      if (!navigator.onLine) {
        alert("You appear to be offline. Please check your internet connection and try again.");
      } else if (err.code === "permission-denied") {
        alert("You don't have permission to cancel this booking. Please contact support.");
      } else {
        alert("Failed to cancel booking. Please try again later.");
      }
    } finally {
      setCancellingId(null);
    }
  };

  // New function to handle modifying bookings
  const handleModifyBooking = async (booking) => {
    // Only allow modification for future bookings
    if (!isBookingFuture(booking)) {
      alert("Only future bookings can be modified online. Please contact reception for modifications to active bookings.");
      return;
    }
    
    // Set the booking to be modified
    setModifyingBooking(booking);
  };

  // Function to save modifications
  const handleSaveModifications = async (e) => {
    e.preventDefault();
    
    if (!modifyingBooking) return;
    
    try {
      setModifyingId(modifyingBooking.id);
      
      // Get the form data
      const formData = new FormData(e.target);
      
      // Create update object based on booking type
      let updateData = {
        updatedAt: new Date().toISOString()
      };
      
      // Get today's date and reset to start of day for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (modifyingBooking.bookingType === "room") {
        // For room bookings
        const checkInDate = new Date(formData.get("checkInDate"));
        const checkOutDate = new Date(formData.get("checkOutDate"));
        
        // Set hours to 0 for date comparison
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        
        // Validate check-in date is not in the past
        if (checkInDate < today) {
          alert("Check-in date cannot be in the past. Please select a future date.");
          setModifyingId(null);
          return;
        }
        
        // Validate check-out date is after check-in date
        if (checkInDate >= checkOutDate) {
          alert("Check-out date must be after check-in date.");
          setModifyingId(null);
          return;
        }
        
        updateData = {
          ...updateData,
          checkInDate: formData.get("checkInDate"),
          checkOutDate: formData.get("checkOutDate"),
          guests: parseInt(formData.get("guests")) || 1
        };
      } else {
        // For conference bookings
        const bookingDate = new Date(formData.get("date"));
        bookingDate.setHours(0, 0, 0, 0);
        
        // Validate conference date is not in the past
        if (bookingDate < today) {
          alert("Conference date cannot be in the past. Please select a future date.");
          setModifyingId(null);
          return;
        }
        
        // Validate start time is before end time if on the same day
        const startTime = formData.get("startTime");
        const endTime = formData.get("endTime");
        
        if (startTime >= endTime) {
          alert("End time must be after start time.");
          setModifyingId(null);
          return;
        }
        
        updateData = {
          ...updateData,
          date: formData.get("date"),
          startTime: formData.get("startTime"),
          endTime: formData.get("endTime"),
          attendees: parseInt(formData.get("attendees")) || 0
        };
      }
      
      // Update in Firestore
      const bookingRef = doc(db, "bookings", modifyingBooking.id);
      await updateDoc(bookingRef, updateData);
      
      // Refresh the bookings list and reset state
      setRefreshTrigger(prev => prev + 1);
      setModifyingBooking(null);
      
      // Show success message
      alert("Booking modified successfully!");
    } catch (err) {
      console.error("Error modifying booking:", err);
      
      // More specific error messages
      if (!navigator.onLine) {
        alert("You appear to be offline. Please check your internet connection and try again.");
      } else if (err.code === "permission-denied") {
        alert("You don't have permission to modify this booking. Please contact support.");
      } else {
        alert("Failed to modify booking. Please try again later.");
      }
    } finally {
      setModifyingId(null);
    }
  };
  const handleCancelModification = () => {
    setModifyingBooking(null);
  };
  // Render booking modification form
  const renderModificationForm = () => {
    if (!modifyingBooking) return null;
    
    // Get today's date in YYYY-MM-DD format for min attribute
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFormatted = today.toISOString().split('T')[0];
    
    if (modifyingBooking.bookingType === "room") {
      // Form for room bookings
      return (
        <div className="modify-booking-modal">
          <div className="modify-booking-content">
            <h2>Modify Room Booking</h2>
            <form onSubmit={handleSaveModifications}>
              <div className="form-group">
                <label htmlFor="checkInDate">Check-in Date:</label>
                <input 
                  type="date" 
                  id="checkInDate" 
                  name="checkInDate" 
                  required
                  min={todayFormatted} // Prevent selecting dates before today
                  defaultValue={new Date(modifyingBooking.checkInDate).toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="checkOutDate">Check-out Date:</label>
                <input 
                  type="date" 
                  id="checkOutDate" 
                  name="checkOutDate" 
                  required
                  min={todayFormatted} // Prevent selecting dates before today
                  defaultValue={new Date(modifyingBooking.checkOutDate).toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="guests">Number of Guests:</label>
                <input 
                  type="number" 
                  id="guests" 
                  name="guests" 
                  min="1" 
                  max="4" 
                  required
                  defaultValue={modifyingBooking.guests || 1}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={handleCancelModification} 
                  className="cancel-modify-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-modify-btn" 
                  disabled={modifyingId === modifyingBooking.id}
                >
                  {modifyingId === modifyingBooking.id ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    } else {
      // Form for conference bookings
      return (
        <div className="modify-booking-modal">
          <div className="modify-booking-content">
            <h2>Modify Conference Booking</h2>
            <form onSubmit={handleSaveModifications}>
              <div className="form-group">
                <label htmlFor="date">Date:</label>
                <input 
                  type="date" 
                  id="date" 
                  name="date" 
                  required
                  min={todayFormatted} // Prevent selecting dates before today
                  defaultValue={new Date(modifyingBooking.date).toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Start Time:</label>
                <input 
                  type="time" 
                  id="startTime" 
                  name="startTime" 
                  required
                  defaultValue={modifyingBooking.startTime}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">End Time:</label>
                <input 
                  type="time" 
                  id="endTime" 
                  name="endTime" 
                  required
                  defaultValue={modifyingBooking.endTime}
                />
              </div>
              <div className="form-group">
                <label htmlFor="attendees">Number of Attendees:</label>
                <input 
                  type="number" 
                  id="attendees" 
                  name="attendees" 
                  min="1" 
                  required
                  defaultValue={modifyingBooking.attendees || 0}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={handleCancelModification} 
                  className="cancel-modify-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-modify-btn" 
                  disabled={modifyingId === modifyingBooking.id}
                >
                  {modifyingId === modifyingBooking.id ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
  };
  

  const renderBookingActionButtons = (booking) => {
    // If booking is cancelled, no actions to show
    if (booking.status === "cancelled" || booking.status === "Cancelled") {
      return null;
    }
    
    // Use our helper function to determine if this booking should show active buttons
    const isActive = shouldShowActiveButtons(booking);
    
    // If active (checked in or today's check-in), show modify options
    if (isActive) {
      return (
        <div className="booking-actions active-booking-actions">
          <div className="booking-fee-notice">
            <FaInfoCircle /> <span>Active bookings can be modified at reception.</span>
          </div>
          <div className="action-buttons">
      

          </div>
        </div>
      );
    }
    
    // If booking is in the future, allow modification and cancellation
    if (isBookingFuture(booking)) {
      return (
        <div className="booking-actions">
          <div className="action-buttons">
            <button 
              onClick={() => handleModifyBooking(booking)} 
              className="modify-btn"
              disabled={modifyingBooking !== null}
            >
              <FaEdit /> Modify Booking
            </button>
            <button 
              onClick={() => handleCancelBooking(booking)}
              disabled={cancellingId === booking.id}
              className="cancel-btn"
            >
              {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"} <FaTrash />
            </button>
          </div>
        </div>
      );
    }
    
    // Otherwise it's a past booking with no actions
    return null;
  };

  const renderBookingDetails = (booking) => {
    // Determine booking status with special handling for "Confirmed" status
    const displayStatus = () => {
      // If the booking has an explicit status like "Confirmed" or "Cancelled", use it
      if (booking.status && booking.status !== "active") {
        return booking.status;
      }
      
      // Otherwise, derive the status from the date logic
      if (isBookingActive(booking)) {
        return "Active";
      } else if (isBookingFuture(booking)) {
        return "Upcoming";
      } else {
        return "Past";
      }
    };
    
    // Get the appropriate CSS class for the booking status
    const getStatusClass = () => {
      const status = booking.status?.toLowerCase() || 
        (isBookingActive(booking) ? "active" : isBookingFuture(booking) ? "upcoming" : "past");
      return status;
    };
    
    if (booking.bookingType === "room") {
      // Handle room booking display
      const roomTypeDisplay = booking.roomType === "Double bed" || booking.roomType === "Single bed" 
        ? booking.roomType 
        : (booking.roomType ? safeDisplayValue(booking.roomType) : safeDisplayValue(booking.roomName));
      
      return (
        <div className="booking-card">
          <div className="booking-header">
            <h3><FaBed /> Room Booking</h3>
            <span className={`booking-status ${getStatusClass()}`}>
              {displayStatus()}
            </span>
          </div>
          
          <div className="booking-details">
            <p><strong>Room Type:</strong> {roomTypeDisplay}</p>
            <p><strong>Check-in:</strong> {formatDate(booking.checkInDate)}</p>
            <p><strong>Check-out:</strong> {formatDate(booking.checkOutDate)}</p>
            <p><strong>Guests:</strong> <FaUsers className="icon-inline" /> {safeDisplayValue(booking.guests)}</p>
            {booking.totalPrice && 
              <p><strong>Total Price:</strong> <FaMoneyBillWave className="icon-inline" /> GH₵{parseFloat(booking.totalPrice).toFixed(2)}</p>
            }
            
          </div>
          
          {/* Only show booking actions if status is "Confirmed" or derived as "Active" or "Upcoming" */}
          {booking.status === "Confirmed" || isBookingActive(booking) || isBookingFuture(booking) ? 
            renderBookingActionButtons(booking) : null}
        </div>
      );
    } else {
      // Conference room booking with fixed date formatting
      const safeDate = booking.date || "Unknown date"; 
      const safeStartTime = booking.startTime || "N/A";
      const safeEndTime = booking.endTime || "N/A";
      
      return (
        <div className="booking-card">
          <div className="booking-header">
            <h3><FaDoorOpen /> Conference Room</h3>
            <span className={`booking-status ${getStatusClass()}`}>
              {displayStatus()}
            </span>
          </div>
          
          <div className="booking-details">
            <p><strong>Room:</strong> {safeDisplayValue(booking.roomName)}</p>
            <p><strong>Date:</strong> <FaCalendarAlt className="icon-inline" /> {formatDate(safeDate)}</p>
            <p><strong>Time:</strong> <FaClock className="icon-inline" /> {formatTime(safeStartTime)} - {formatTime(safeEndTime)}</p>
            <p><strong>Attendees:</strong> <FaUsers className="icon-inline" /> {safeDisplayValue(booking.attendees)}</p>
            {booking.totalPrice && 
              <p><strong>Total Price:</strong> <FaMoneyBillWave className="icon-inline" /> GH₵{parseFloat(booking.totalPrice).toFixed(2)}</p>
            }
           
          </div>
          
          {/* Only show booking actions if status is "Confirmed" or derived as "Active" or "Upcoming" */}
          {booking.status === "Confirmed" || isBookingActive(booking) || isBookingFuture(booking) ? 
            renderBookingActionButtons(booking) : null}
        </div>
      );
    }
  };

  const currentBookings = bookings.filter(booking => 
    (isBookingActive(booking) || isBookingFuture(booking)) && 
    booking.status !== "cancelled"
  );
  
  const pastBookings = bookings.filter(booking => 
    (!isBookingActive(booking) && !isBookingFuture(booking)) || 
    booking.status === "cancelled"
  );

  return (
    <div className="booking-history-container">
      <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      
      <div className="booking-history-header">
        <h1><FaCalendarAlt /> My Bookings</h1>
        <p>View and manage your hotel and conference room bookings</p>
      </div>

      {loading ? (
        <div className="loading-indicator">Loading your bookings...</div>
      ) : error ? (
        <div className="error-message">
          <FaInfoCircle /> {error}
          <button 
            className="retry-button" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bookings-section">
          <div className="booking-rules-notice">
            <FaInfoCircle /> <span>Active bookings can only be shortened or terminated at reception (fees may apply). Only future bookings can be cancelled without a fee.</span>
          </div>
          
          <h2><FaUsers /> Current & Upcoming Bookings</h2>
          {currentBookings.length > 0 ? (
            <div className="bookings-grid">
              {currentBookings.map(booking => (
                <div key={booking.id}>
                  {renderBookingDetails(booking)}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-bookings-message">
              <p>You don't have any current or upcoming bookings.</p>
              <div className="booking-links">
                <a href="/room-listings" className="booking-link">Browse Rooms</a>
                <a href="/conference-listings" className="booking-link">Browse Conference Rooms</a>
              </div>
            </div>
          )}

          <h2 className="past-bookings-heading"><FaHistory /> Past & Cancelled Bookings</h2>
          {pastBookings.length > 0 ? (
            <div className="bookings-grid past-bookings">
              {pastBookings.map(booking => (
                <div key={booking.id}>
                  {renderBookingDetails(booking)}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-bookings-message">You don't have any past bookings.</p>
          )}
          
        </div>
      )}
      {renderModificationForm()}
    </div>
  );
};

export default BookingHistory;