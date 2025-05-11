import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import GuestLookupComponent from "../components/GuestLookup";

import "../assets/styles/Dashboard.css";
import "../assets/styles/UserRegistration.css";
import { 
  FaUserPlus, 
  FaSpinner, 
  FaSearch, 
  FaUserFriends, 
  FaIdCard, 
  FaBuilding, 
  FaPhone, 
  FaEnvelope, 
  FaCalendarAlt, 
  FaUsers, 
  FaBed, 
  FaArrowLeft,
  FaFilter,
  FaClipboardList,
  FaCheck,
  FaTimes,
  FaSync
} from "react-icons/fa";

const UserRegistration = () => {

  const [viewMode, setViewMode] = useState("register");
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",

    roomNumber: "",
    checkIn: "",
    checkOut: "",
    status: "confirmed",
    specialRequests: "",
    assignRoom: false, // Whether to assign a room during registration
  });

  // State for pending registrations
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filters for pending registrations
  const [roomFilter, setRoomFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Available rooms state
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [allRooms, setAllRooms] = useState([]);

  // Lookup error state
  const [lookupError, setLookupError] = useState(null);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");



  // Fetch available rooms on component mount
  useEffect(() => {
    fetchAvailableRooms();
    fetchAllRooms();
  }, []);
  
  // Effect to fetch pending registrations when viewing pending mode
  useEffect(() => {
    if (viewMode === "pending") {
      fetchPendingRegistrations();
    }
  }, [viewMode]);

  // Auto-dismiss success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedValue = type === "checkbox" ? checked : value;
  
    setFormData({
      ...formData,
      [name]: updatedValue,
    });
  
    if (name === "phone") {
      if (value && !isValidGhanaianPhoneNumber(value)) {
        setPhoneError("Invalid Ghanaian phone number");
      } else {
        setPhoneError("");
      }
    }
    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError("Invalid email address");
      } else {
        setEmailError("");
      }
    }
    
  };
  
  // Fetch all rooms for filtering
  const fetchAllRooms = async () => {
    try {
      const roomsRef = collection(db, "rooms");
      const querySnapshot = await getDocs(roomsRef);
      
      const rooms = [];
      querySnapshot.forEach((doc) => {
        const room = { id: doc.id, ...doc.data() };
        rooms.push(room);
      });
      
      // Sort rooms by number
      rooms.sort((a, b) => a.roomNumber - b.roomNumber);
      setAllRooms(rooms);
    } catch (error) {
      console.error("Error fetching all rooms:", error);
    }
  };
  const isValidGhanaianPhoneNumber = (phone) => {
    const ghanaLocalPattern = /^(0)(24|25|26|27|28|50|54|55|56|57|58|59)\d{7}$/;
    const ghanaIntlPattern = /^\+233(24|25|26|27|28|50|54|55|56|57|58|59)\d{7}$/;
    return ghanaLocalPattern.test(phone) || ghanaIntlPattern.test(phone);
  };
  
  const fetchAvailableRooms = async () => {
    try {
      setRoomsLoading(true);
      
      // Query rooms collection
      const roomsRef = collection(db, "rooms");
      const querySnapshot = await getDocs(roomsRef);
      
      if (querySnapshot.empty) {
        console.log("No rooms found in database");
        setRoomsLoading(false);
        return;
      }
      
      // Get bookings to check which rooms are occupied
      const bookingsRef = collection(db, "bookings");
      const bookingsSnapshot = await getDocs(bookingsRef);
      
      const occupiedRooms = new Set();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find occupied rooms
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
        let checkInDate, checkOutDate;
        
        if (booking.checkIn instanceof Timestamp) {
          checkInDate = booking.checkIn.toDate();
        } else if (booking.checkIn && booking.checkIn.seconds) {
          checkInDate = new Date(booking.checkIn.seconds * 1000);
        } else if (typeof booking.checkIn === 'string') {
          checkInDate = new Date(booking.checkIn);
        }
        
        if (booking.checkOut instanceof Timestamp) {
          checkOutDate = booking.checkOut.toDate();
        } else if (booking.checkOut && booking.checkOut.seconds) {
          checkOutDate = new Date(booking.checkOut.seconds * 1000);
        } else if (typeof booking.checkOut === 'string') {
          checkOutDate = new Date(booking.checkOut);
        }
        
        // Check if the room is currently occupied
        const status = (booking.status || "").toLowerCase();
        if ((status === "checked in" || status === "checked-in") && 
            booking.roomNumber && 
            checkInDate <= today && checkOutDate > today) {
          occupiedRooms.add(booking.roomNumber);
        }
      });
      
      // Filter available rooms
      const rooms = [];
      querySnapshot.forEach((doc) => {
        const room = { id: doc.id, ...doc.data() };
        
        // Debug log for the first room
        if (rooms.length === 0) {
          console.log("First room data:", room);
        }
        
        // Only add rooms that are not occupied and are active
        if (!occupiedRooms.has(room.id) && room.status !== "maintenance") {
          // Use the document ID as the roomNumber since that's how they're identified
          rooms.push({
            ...room,
            roomNumber: room.id // Use the document ID (R4, R27, etc.) as the roomNumber
          });
        }
      });
      
      // Sort rooms naturally (R1, R2, R3... R10, R11...)
      rooms.sort((a, b) => {
        const aNum = parseInt(a.roomNumber.substring(1));
        const bNum = parseInt(b.roomNumber.substring(1));
        return aNum - bNum;
      });
      
      console.log("Available rooms:", rooms);
      setAvailableRooms(rooms);
      setRoomsLoading(false);
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      setRoomsLoading(false);
    }
  };
  // Fetch all pending registrations
  const fetchPendingRegistrations = async () => {
    try {
      setPendingLoading(true);
      setError(null);
      
      // Query for all bookings with pending guest accounts
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(
        bookingsRef, 
        where("pendingGuestAccounts", "==", true)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      if (bookingsSnapshot.empty) {
        setPendingRegistrations([]);
        setPendingLoading(false);
        return;
      }
      
      const pendingBookings = [];
      
      bookingsSnapshot.forEach(doc => {
        const booking = { id: doc.id, ...doc.data() };
        
        // Check for guests array and filter to non-registered guests
        if (booking.guests && booking.guests.length > 0) {
          const pendingGuests = booking.guests.filter(guest => !guest.accountCreated);
          
          if (pendingGuests.length > 0) {
            pendingBookings.push({
              ...booking,
              pendingGuests
            });
          }
        }
      });
      
      setPendingRegistrations(pendingBookings);
      setPendingLoading(false);
      
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
      setError("Failed to load pending registrations. Please try again.");
      setPendingLoading(false);
    }
  };

  // Select a booking and guest to complete registration
  const selectBookingGuest = (booking, guestIndex) => {
    const guest = booking.pendingGuests[guestIndex];
    setSelectedBooking({
      ...booking,
      selectedGuestIndex: guestIndex,
      selectedGuest: guest
    });
    
    // Pre-fill form with available guest data
    setFormData({
      ...formData,
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      email: "", // This needs to be filled in by staff
      phone: "",
      idType: "passport",
      idNumber: "",
    

    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate form data
      if (!formData.firstName || !formData.lastName || !formData.email) {
        throw new Error("Please fill in all required fields");
      }
      
      if (formData.phone && !isValidGhanaianPhoneNumber(formData.phone)) {
        throw new Error("Please enter a valid Ghanaian phone number");
      }
      if (emailError || phoneError) {
        throw new Error("Please correct the errors in the form before submitting.");
      }
      
      
      // Prepare user data for Firestore
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        idType: formData.idType,
        idNumber: formData.idNumber,

  
        userType: "guest", // Default to guest type
        createdAt: Timestamp.now()
      };
      
      // Add user to 'users' collection
      const userDocRef = await addDoc(collection(db, "users"), userData);
      console.log("User added with ID: ", userDocRef.id);
      
      // If this is completing a pending guest registration
      if (selectedBooking) {
        // Update the booking to mark this guest as registered
        const bookingRef = doc(db, "bookings", selectedBooking.id);
        const bookingDoc = await getDoc(bookingRef);
        
        if (bookingDoc.exists()) {
          const bookingData = bookingDoc.data();
          const updatedGuests = [...bookingData.guests];
          
          // Update the specific guest's account status
          if (updatedGuests[selectedBooking.selectedGuestIndex]) {
            updatedGuests[selectedBooking.selectedGuestIndex] = {
              ...updatedGuests[selectedBooking.selectedGuestIndex],
              accountCreated: true,
              userId: userDocRef.id,
              email: formData.email
            };
          }
          
          // Check if all guests now have accounts
          const allGuestsRegistered = updatedGuests.every(guest => guest.accountCreated);
          
          // Update the booking
          await updateDoc(bookingRef, {
            guests: updatedGuests,
            pendingGuestAccounts: !allGuestsRegistered
          });
          
          setSuccess(`Guest ${formData.firstName} ${formData.lastName} registration completed successfully`);
// Update the pendingRegistrations state to remove this guest
const updatedBookingList = pendingRegistrations.map((booking) => {
  if (booking.id === selectedBooking.id) {
    const newGuests = booking.pendingGuests.filter(
      (_, index) => index !== selectedBooking.selectedGuestIndex
    );
    return {
      ...booking,
      pendingGuests: newGuests,
    };
  }
  return booking;
}).filter(booking => booking.pendingGuests.length > 0);

setPendingRegistrations(updatedBookingList);

// Reset form and UI
setSelectedBooking(null);
setSuccess(`Guest ${formData.firstName} ${formData.lastName} registration completed successfully`);


        }
      }
      // If room assignment is enabled, create a booking
      else if (formData.assignRoom && formData.roomNumber) {
        // Validate check-in and check-out dates
        if (!formData.checkIn || !formData.checkOut) {
          throw new Error("Check-in and check-out dates are required when assigning a room");
        }
        
        // Create booking data
        const bookingData = {
          userId: userDocRef.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          roomNumber: formData.roomNumber,
          checkIn: Timestamp.fromDate(new Date(formData.checkIn)),
          checkOut: Timestamp.fromDate(new Date(formData.checkOut)),
          status: formData.status,
          specialRequests: formData.specialRequests,
          createdAt: Timestamp.now(),
          guests: [{
            firstName: formData.firstName,
            lastName: formData.lastName,
            accountCreated: true,
            userId: userDocRef.id,
            isMainBooker: true,
            email: formData.email
          }],
          pendingGuestAccounts: false
        };
        
        // Add booking to 'bookings' collection
        const bookingDocRef = await addDoc(collection(db, "bookings"), bookingData);
        console.log("Booking added with ID: ", bookingDocRef.id);
        
        setSuccess(`User registered successfully and assigned to room ${formData.roomNumber}`);
      } else {
        setSuccess("User registered successfully");
      }
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        idType: "passport",
        idNumber: "",

        roomNumber: "",
        checkIn: "",
        checkOut: "",
        status: "confirmed",
        specialRequests: "",
        assignRoom: false,
      });
      
      // Refresh available rooms
      fetchAvailableRooms();
      
    } catch (error) {
      console.error("Error registering user:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle back button click from pending selection
  const handleBackFromPending = () => {
    setSelectedBooking(null);
  };
  
  // Handle back button click to return to registration form
  const handleBackToRegister = () => {
    setViewMode("register");
    setSelectedBooking(null);
    
    // Reset form data when going back to register
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
 

      roomNumber: "",
      checkIn: "",
      checkOut: "",
      status: "confirmed",
      specialRequests: "",
      assignRoom: false,
    });
  };
  
  // Apply filters to pending registrations
  const getFilteredPendingRegistrations = () => {
    return pendingRegistrations.filter(booking => {
      // Apply room filter
      if (roomFilter && booking.roomNumber !== roomFilter) {
        return false;
      }
      
      // Apply date filter
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        let checkInDate, checkOutDate;
        
        // Convert checkIn date based on its type
        if (booking.checkIn instanceof Timestamp) {
          checkInDate = booking.checkIn.toDate();
        } else if (booking.checkIn && booking.checkIn.seconds) {
          checkInDate = new Date(booking.checkIn.seconds * 1000);
        } else if (typeof booking.checkIn === 'string') {
          checkInDate = new Date(booking.checkIn);
        }
        
        // Convert checkOut date based on its type
        if (booking.checkOut instanceof Timestamp) {
          checkOutDate = booking.checkOut.toDate();
        } else if (booking.checkOut && booking.checkOut.seconds) {
          checkOutDate = new Date(booking.checkOut.seconds * 1000);
        } else if (typeof booking.checkOut === 'string') {
          checkOutDate = new Date(booking.checkOut);
        }
        
        // Check if the filter date falls within the booking period
        if (!(filterDate >= checkInDate && filterDate <= checkOutDate)) {
          return false;
        }
      }
      
      // Apply name filter
      if (nameFilter) {
        const nameFilterLower = nameFilter.toLowerCase();
        
        // Search in pending guests
        const matchingGuests = booking.pendingGuests.filter(guest => 
          (guest.firstName && guest.firstName.toLowerCase().includes(nameFilterLower)) ||
          (guest.lastName && guest.lastName.toLowerCase().includes(nameFilterLower))
        );
        
        if (matchingGuests.length === 0) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Count total pending guests
  const countTotalPendingGuests = () => {
    return pendingRegistrations.reduce((count, booking) => {
      return count + (booking.pendingGuests ? booking.pendingGuests.length : 0);
    }, 0);
  };
  
  // Format date for display
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Filtered pending registrations
  const filteredPendingRegistrations = getFilteredPendingRegistrations();

  return (
    <div className="dashboard-container">
      <Sidebar />
    
      <div className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">User Registration</h1>
          </div>
          
          <div className="dashboard-actions">
            {viewMode === "register" ? (
              <button 
                className="view-pending-button"
                onClick={() => setViewMode("pending")}
              >
                <FaUserFriends className="button-icon" />
                View Pending Registrations
              </button>
            ) : (
              <button 
                className="back-to-register-button"
                onClick={() => {
                  setViewMode("register");
                  setSelectedBooking(null);
                }}
              >
                <FaArrowLeft className="button-icon" />
                Back to New Registration
              </button>
            )}
          </div>
        </div>
        
        <div className="registration-container">
          {/* Notification Messages */}
          {error && (
            <div className="notification-message error-message">
              <FaTimes className="notification-icon" />
              <span>{error}</span>
              <button 
                className="close-notification"
                onClick={() => setError(null)}
              >
                <FaTimes />
              </button>
            </div>
          )}
          
          {success && (
            <div className="notification-message success-message">
              <FaCheck className="notification-icon" />
              <span>{success}</span>
              <button 
                className="close-notification"
                onClick={() => setSuccess(null)}
              >
                <FaTimes />
              </button>
            </div>
          )}
          
          {viewMode === "pending" && !selectedBooking ? (
            /* View Pending Registrations Mode */
            <div className="pending-registrations">
              <div className="pending-header">
                <h2 className="pending-title">
                  <FaUserFriends className="pending-icon" /> 
                  Pending Guest Registrations
                </h2>
                
                {pendingRegistrations.length > 0 && (
                  <div className="pending-summary-cards">
                    <div className="summary-card">
                      <div className="summary-card-icon">
                        <FaClipboardList />
                      </div>
                      <div className="summary-card-content">
                        <span className="summary-card-value">{pendingRegistrations.length}</span>
                        <span className="summary-card-label">Total Bookings</span>
                      </div>
                    </div>
                    
                    <div className="summary-card">
                      <div className="summary-card-icon">
                        <FaUsers />
                      </div>
                      <div className="summary-card-content">
                        <span className="summary-card-value">{countTotalPendingGuests()}</span>
                        <span className="summary-card-label">Pending Guests</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              

              
              {pendingLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner">
                    <FaSpinner />
                  </div>
                  <p className="loading-text">Loading pending registrations...</p>
                </div>
              ) : filteredPendingRegistrations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3 className="empty-title">No pending registrations found</h3>
                  {(roomFilter || dateFilter || nameFilter) && (
                    <p className="empty-description">Try adjusting your filters or clear them to see all pending registrations.</p>
                  )}
                </div>
              ) : (
                <div className="bookings-grid">
                  {filteredPendingRegistrations.map((booking) => (
                    <div className="booking-card" key={booking.id}>
                      <div className="booking-card__header">
                        <div className="booking-id">
                         
                        </div>
                        
                        <div className="booking-dates">
                          <span className="booking-label">Stay Period</span>
                          <div className="booking-dates-value">
                            <FaCalendarAlt className="booking-icon" />
                            {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="booking-card__details">
                        <div className="booking-detail">
                          <span className="booking-detail-label">
                            <FaUserPlus className="booking-detail-icon" />
                            Booked by
                          </span>
                          <span className="booking-detail-value">
                            {booking.bookerFirstName || booking.firstName} {booking.bookerLastName || booking.lastName}
                          </span>
                        </div>
                        
                        <div className="booking-detail">
                          <span className="booking-detail-label">
                            <FaBed className="booking-detail-icon" />
                            Room
                          </span>
                          <span className="booking-detail-value">
                            {booking.roomType || 'Standard'} ({booking.roomNumber || "Not assigned"})
                          </span>
                        </div>
                        
                        {booking.primaryGuestFirstName && booking.primaryGuestLastName && (
                          <div className="booking-detail">
                            <span className="booking-detail-label">
                              <FaIdCard className="booking-detail-icon" />
                              Primary Guest
                            </span>
                            <span className="booking-detail-value">
                              {booking.primaryGuestFirstName} {booking.primaryGuestLastName}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="booking-card__guests">
                        <h5 className="booking-section-title">
                          <FaUsers className="section-icon" />
                          Pending Guests ({booking.pendingGuests.length})
                        </h5>
                        
                        <ul className="pending-guests-list">
                          {booking.pendingGuests.map((guest, index) => (
                            <li className="pending-guest" key={index}>
                              <div className="guest-details">
                                <span className="guest-name">
                                  {guest.firstName} {guest.lastName}
                                </span>
                                {guest.isMainBooker && <span className="guest-tag">Main Booker</span>}
                              </div>
                              <button 
                                className="register-guest-btn"
                                onClick={() => selectBookingGuest(booking, index)}
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
              )}
            </div>
          ) : viewMode === "pending" && selectedBooking ? (
            /* Complete Registration for Selected Guest */
            <div className="complete-registration">
              <div className="section-header">
                <div className="section-header-title">
                  <div className="section-icon-container">
                    <FaUserPlus className="section-icon" />
                  </div>
                  <div className="section-title-text">
                    <h3>Complete Registration for {selectedBooking.selectedGuest.firstName} {selectedBooking.selectedGuest.lastName}</h3>
                    <p className="section-subtitle">Fill in the required information to register this guest</p>
                  </div>
                </div>
                <button 
                  className="back-button"
                  onClick={() => setSelectedBooking(null)}
                >
                  <FaArrowLeft className="back-icon" />
                  Back to Pending List
                </button>
              </div>
              
              <div className="booking-details-card">
                <h4 className="details-card-title">
                  <FaClipboardList className="details-card-icon" />
                  Booking Information
                </h4>
                <div className="booking-details-grid">
                  {selectedBooking.roomNumber && (
                    <div className="details-item">
                      <span className="details-item-label">Room Number</span>
                      <span className="details-item-value">{selectedBooking.roomNumber}</span>
                    </div>
                  )}
                  
                  <div className="details-item">
                    <span className="details-item-label">Room Type</span>
                    <span className="details-item-value">{selectedBooking.roomType || "Standard"}</span>
                  </div>
                  
                  <div className="details-item">
                    <span className="details-item-label">Check-in Date</span>
                    <span className="details-item-value">
                      {formatDate(selectedBooking.checkIn)}
                    </span>
                  </div>
                  
                  <div className="details-item">
                    <span className="details-item-label">Check-out Date</span>
                    <span className="details-item-value">
                      {formatDate(selectedBooking.checkOut)}
                    </span>
                  </div>
                  
                  <div className="details-item">
                    <span className="details-item-label">Booking Status</span>
                    <span className={`details-item-value status-badge ${(selectedBooking.status || "").toLowerCase()}`}>
                      {selectedBooking.status || "Confirmed"}
                    </span>
                  </div>
                  
                  
                </div>
              </div>
              
              <form className="registration-form" onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3 className="form-section-title">
                    <FaUserPlus className="form-section-icon" /> Guest Information
                  </h3>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="firstName" className="form-label">
                        <FaUserPlus className="form-label-icon" /> First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="form-input"
                        placeholder="Enter first name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="lastName" className="form-label">
                        <FaUserPlus className="form-label-icon" /> Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="form-input"
                        placeholder="Enter last name"
                      />
                    </div>
                    
                    <div className="form-group">
  <label htmlFor="email" className="form-label">
    <FaEnvelope className="form-label-icon" /> Email Address *
  </label>
  <input
    type="email"
    id="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    required
    className={`form-input ${emailError ? "input-error" : ""}`}
    placeholder="Enter email address"
  />
  {emailError && <small className="error-text">{emailError}</small>}
</div>

                    
                    <div className="form-group">
  <label htmlFor="phone" className="form-label">
    <FaPhone className="form-label-icon" /> Phone Number
  </label>
  <input
    type="tel"
    id="phone"
    name="phone"
    value={formData.phone}
    onChange={handleChange}
    className={`form-input ${phoneError ? "input-error" : ""}`}
    placeholder="e.g. 0241234567 or +233241234567"
  />
  {phoneError && <small className="error-text">{phoneError}</small>}
</div>

                    
                    <div className="form-group">
                      <label htmlFor="idType" className="form-label">
                        <FaIdCard className="form-label-icon" /> ID Type
                      </label>
                      <select
                        id="idType"
                        name="idType"
                        value={formData.idType}
                        onChange={handleChange}
                        className="form-select"
                      >
                        <option value="passport">Passport</option>
                        <option value="nationalId">National ID</option>
                        <option value="driverLicense">Driver's License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="idNumber" className="form-label">
                        <FaIdCard className="form-label-icon" /> ID Number
                      </label>
                      <input
                        type="text"
                        id="idNumber"
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Enter ID number"
                      />
                    </div>
                    
                 
                    
                    
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? (
                      <>
                        <FaSpinner className="spinner-icon" /> Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck className="submit-icon" /> Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Regular Registration Form */
            <div className="registration-form-container">
              <div className="registration-card">
                <div className="card-header">
                  <div className="card-icon">
                    <FaUserPlus />
                  </div>
                  <div className="card-title">
                    <h3>New Guest Registration</h3>
                    <p className="card-subtitle">Create a new user account and optionally assign a room</p>
                  </div>
                </div>
                
                <form className="registration-form" onSubmit={handleSubmit}>
                  <div className="form-section">
                    <h3 className="form-section-title">
                      <FaUserPlus className="form-section-icon" /> Guest Information
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="firstName" className="form-label">
                          <FaUserPlus className="form-label-icon" /> First Name *
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          className="form-input"
                          placeholder="Enter first name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="lastName" className="form-label">
                          <FaUserPlus className="form-label-icon" /> Last Name *
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          className="form-input"
                          placeholder="Enter last name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="email" className="form-label">
                          <FaEnvelope className="form-label-icon" /> Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="form-input"
                          placeholder="Enter email address"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                          <FaPhone className="form-label-icon" /> Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Enter phone number"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="idType" className="form-label">
                          <FaIdCard className="form-label-icon" /> ID Type
                        </label>
                        <select
                          id="idType"
                          name="idType"
                          value={formData.idType}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="passport">Passport</option>
                          <option value="nationalId">National ID</option>
                          <option value="driverLicense">Driver's License</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="idNumber" className="form-label">
                          <FaIdCard className="form-label-icon" /> ID Number
                        </label>
                        <input
                          type="text"
                          id="idNumber"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Enter ID number"
                        />
                      </div>
                      
   
                      
     
               
                    </div>
                  </div>
                  
                  {/* Room Assignment Section */}
                  <div className="form-section">
                    <div className="assign-room-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          name="assignRoom"
                          checked={formData.assignRoom}
                          onChange={handleChange}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Assign Room During Registration</span>
                      </label>
                    </div>
                    
                    {formData.assignRoom && (
                      <div className="room-assignment-section">
                        <div className="form-grid">
                          <div className="form-group">
                            <label htmlFor="roomNumber" className="form-label">
                              <FaBed className="form-label-icon" /> Room Number *
                            </label>
                           
<select
  id="roomNumber"
  name="roomNumber"
  value={formData.roomNumber}
  onChange={handleChange}
  required={formData.assignRoom}
  className="form-select"
>
  <option value="">Select a room</option>
  {roomsLoading ? (
    <option disabled>Loading rooms...</option>
  ) : availableRooms.length === 0 ? (
    <option disabled>No available rooms</option>
  ) : (
    availableRooms.map((room) => {
      // The roomNumber is now the document ID (R4, R27, etc.)
      const roomIdentifier = room.roomNumber || room.id;
      
      // Get the room type from the Firebase data
      const roomType = room.roomType || room.t_room || 'Standard';
      
      // Get the price from the Firebase data
      const price = room.price || 0;
      
      return (
        <option key={room.id} value={roomIdentifier}>
          {roomIdentifier} - {roomType} - GHS {price}/night
        </option>
      );
    })
  )}
</select>
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="status" className="form-label">
                              <FaCalendarAlt className="form-label-icon" /> Booking Status *
                            </label>
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleChange}
                              required={formData.assignRoom}
                              className="form-select"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="checked-in">Checked In</option>
                              
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="checkIn" className="form-label">
                              <FaCalendarAlt className="form-label-icon" /> Check-in Date *
                            </label>
                            <input
                              type="date"
                              id="checkIn"
                              name="checkIn"
                              value={formData.checkIn}
                              onChange={handleChange}
                              required={formData.assignRoom}
                              min={new Date().toISOString().split('T')[0]}
                              className="form-input"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="checkOut" className="form-label">
                              <FaCalendarAlt className="form-label-icon" /> Check-out Date *
                            </label>
                            <input
                              type="date"
                              id="checkOut"
                              name="checkOut"
                              value={formData.checkOut}
                              onChange={handleChange}
                              required={formData.assignRoom}
                              min={formData.checkIn || new Date().toISOString().split('T')[0]}
                              className="form-input"
                            />
                          </div>
                        </div>
                        
                        <div className="form-group full-width">
                          <label htmlFor="specialRequests" className="form-label">
                            <FaCalendarAlt className="form-label-icon" /> Special Requests
                          </label>
                          <textarea
                            id="specialRequests"
                            name="specialRequests"
                            value={formData.specialRequests}
                            onChange={handleChange}
                            rows="3"
                            className="form-textarea"
                            placeholder="Enter any special requests or notes"
                          ></textarea>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" className="cancel-button">
                      Cancel
                    </button>
                    <button type="submit" className="submit-button" disabled={loading}>
                      {loading ? (
                        <>
                          <FaSpinner className="spinner-icon" /> Processing...
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="submit-icon" /> Register Guest
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;