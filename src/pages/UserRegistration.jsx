import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import TopRightProfile from "../components/TopRightProfile";
import "../assets/styles/Dashboard.css";
import "../assets/styles/UserRegistration.css";
import { FaUserPlus, FaSpinner } from "react-icons/fa";

const UserRegistration = () => {
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    idType: "passport",
    idNumber: "",
    nationality: "",
    address: "",
    roomNumber: "",
    checkIn: "",
    checkOut: "",
    status: "confirmed",
    userType: "guest", // Default user type
    specialRequests: "",
    assignRoom: false, // Whether to assign a room during registration
  });

  // Available rooms state
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch available rooms on component mount
  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Fetch available rooms from database
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
        // Only add rooms that are not occupied and are active
        if (!occupiedRooms.has(room.roomNumber) && room.status !== "maintenance") {
          rooms.push(room);
        }
      });
      
      // Sort rooms by number
      rooms.sort((a, b) => a.roomNumber - b.roomNumber);
      setAvailableRooms(rooms);
      setRoomsLoading(false);
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      setRoomsLoading(false);
    }
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
      
      let userCredential = null;
      
      // Only create auth account if it's a staff member
      if (formData.userType !== "guest") {
        // Check if password is provided for staff accounts
        if (!formData.password || formData.password.length < 6) {
          throw new Error("Staff accounts require a password (minimum 6 characters)");
        }
        
        // Create user account in Firebase Auth
        userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      }
      
      // Prepare user data for Firestore
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        idType: formData.idType,
        idNumber: formData.idNumber,
        nationality: formData.nationality,
        address: formData.address,
        userType: formData.userType,
        createdAt: Timestamp.now(),
        uid: userCredential ? userCredential.user.uid : null,
      };
      
      // Add user to 'users' collection
      const userDocRef = await addDoc(collection(db, "users"), userData);
      console.log("User added with ID: ", userDocRef.id);
      
      // If room assignment is enabled, create a booking
      if (formData.assignRoom && formData.roomNumber) {
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
        password: "",
        phone: "",
        idType: "passport",
        idNumber: "",
        nationality: "",
        address: "",
        roomNumber: "",
        checkIn: "",
        checkOut: "",
        status: "confirmed",
        userType: "guest",
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

  return (
    <div className="dashboard-container">
      <Sidebar />
      <TopRightProfile />
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">User Registration</h1>
          <p className="dashboard-subtitle">Register new users and assign rooms</p>
        </div>
        
        {/* Registration Form */}
        <div className="registration-container">
          <div className="registration-form-container">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3 className="section-title">
                  <FaUserPlus /> User Information
                </h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="userType">User Type *</label>
                    <select
                      id="userType"
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      required
                    >
                      <option value="guest">Guest</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  
                  {formData.userType !== "guest" && (
                    <div className="form-group">
                      <label htmlFor="password">Password *</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={formData.userType !== "guest"}
                        minLength={6}
                      />
                    </div>
                  )}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="idType">ID Type</label>
                    <select
                      id="idType"
                      name="idType"
                      value={formData.idType}
                      onChange={handleChange}
                    >
                      <option value="passport">Passport</option>
                      <option value="nationalId">National ID</option>
                      <option value="driverLicense">Driver's License</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="idNumber">ID Number</label>
                    <input
                      type="text"
                      id="idNumber"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nationality">Nationality</label>
                    <input
                      type="text"
                      id="nationality"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Room Assignment Section */}
              <div className="form-section">
                <div className="form-row assign-room-toggle">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      name="assignRoom"
                      checked={formData.assignRoom}
                      onChange={handleChange}
                    />
                    <span className="checkmark"></span>
                    Assign Room During Registration
                  </label>
                </div>
                
                {formData.assignRoom && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="roomNumber">Room Number *</label>
                        <select
                          id="roomNumber"
                          name="roomNumber"
                          value={formData.roomNumber}
                          onChange={handleChange}
                          required={formData.assignRoom}
                        >
                          <option value="">Select a room</option>
                          {roomsLoading ? (
                            <option disabled>Loading rooms...</option>
                          ) : availableRooms.length === 0 ? (
                            <option disabled>No available rooms</option>
                          ) : (
                            availableRooms.map((room) => (
                              <option key={room.id} value={room.roomNumber}>
                                Room {room.roomNumber} - {room.type} (${room.rate}/night)
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="status">Booking Status *</label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          required={formData.assignRoom}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="checked-in">Checked In</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="checkIn">Check-in Date *</label>
                        <input
                          type="date"
                          id="checkIn"
                          name="checkIn"
                          value={formData.checkIn}
                          onChange={handleChange}
                          required={formData.assignRoom}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="checkOut">Check-out Date *</label>
                        <input
                          type="date"
                          id="checkOut"
                          name="checkOut"
                          value={formData.checkOut}
                          onChange={handleChange}
                          required={formData.assignRoom}
                          min={formData.checkIn || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="specialRequests">Special Requests</label>
                      <textarea
                        id="specialRequests"
                        name="specialRequests"
                        value={formData.specialRequests}
                        onChange={handleChange}
                        rows="3"
                      ></textarea>
                    </div>
                  </>
                )}
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-register" disabled={loading}>
                  {loading ? (
                    <>
                      <FaSpinner className="spinner" /> Registering...
                    </>
                  ) : (
                    "Register User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;