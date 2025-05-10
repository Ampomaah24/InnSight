import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from "../config/firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import ChatWidget from "../components/ChatWidget";
import "../assets/styles/ServicesPage.css";
import ProfileSection from "../components/ProfileSection";
// Import images directly if using webpack/vite
import roomImage from "../assets/images/IMG_0111.JPG";
import conferenceImage from "../assets/images/pixelcut-export.jpeg";
import { useBooking } from "../components/BookingContext";

const ServicesPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [conferenceDropdownOpen, setConferenceDropdownOpen] = useState(false);
  const today = new Date();
  const [roomBookingDetails, setRoomBookingDetails] = useState({
    checkIn: null,
    checkOut: null,
  });
  const [conferenceBookingDetails, setConferenceBookingDetails] = useState({
    startDate: null,
    endDate: null,
  });

  // Loading states for availability checks
  const [checkingRoomAvailability, setCheckingRoomAvailability] = useState(false);
  const [checkingConferenceAvailability, setCheckingConferenceAvailability] = useState(false);
  
  // Error messages for availability
  const [roomAvailabilityError, setRoomAvailabilityError] = useState("");
  const [conferenceAvailabilityError, setConferenceAvailabilityError] = useState("");
  
  // State for user profile data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get the setBookingData function from our context
  const { setBookingData } = useBooking();

  // Fetch user profile data - with sessionStorage check
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          console.log("Using user from sessionStorage:", parsedUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        }
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Make sure fname is not "Guest"
            const userObj = {
              id: currentUser.uid,
              fname: userData.firstName || userData.fname || currentUser.displayName?.split(' ')[0] || "User",
              lname: userData.lastName || userData.lname || currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              fullName: userData.fullName || `${userData.firstName || userData.fname || ""} ${userData.lastName || userData.lname || ""}`.trim(),
              photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
              avatar: userData.avatar || null,
              email: userData.email || currentUser.email
            };
            
            console.log("Created user object from Firestore:", userObj);
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          } else {
            // No user document, create from auth
            const userObj = {
              id: currentUser.uid,
              fname: currentUser.displayName?.split(' ')[0] || "User",
              lname: currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              fullName: currentUser.displayName || "User",
              photoURL: currentUser.photoURL || "/images/profile-placeholder.png",
              email: currentUser.email
            };
            
            console.log("Created user object from Auth (no Firestore doc):", userObj);
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          }
        } else {
          // No auth user
          console.log("No authenticated user, setting to Guest");
          setUser({
            fname: "Guest",
            lname: "User",
            fullName: "Guest User",
            photoURL: "/images/profile-placeholder.png"
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUser({
          fname: "Guest",
          lname: "User",
          fullName: "Guest User",
          photoURL: "/images/profile-placeholder.png"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
    
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser') {
        try {
          const newUserData = JSON.parse(e.newValue);
          if (newUserData) {
            setUser(newUserData);
          }
        } catch (error) {
          console.error("Error parsing updated user data:", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getAvatarSource = () => {
    if (user?.avatar) return user.avatar;
    if (user?.photoURL) return user.photoURL;
    return "/images/profile-placeholder.png";
  };

  const toggleRoomDropdown = (event) => {
    event.stopPropagation();
    if (event.currentTarget === event.target.closest('.service-item')) {
      setConferenceDropdownOpen(false);
      setRoomDropdownOpen(prev => !prev);
      // Clear any previous errors when opening/closing dropdown
      setRoomAvailabilityError("");
    }
  };

  const toggleConferenceDropdown = (event) => {
    event.stopPropagation();
    if (event.currentTarget === event.target.closest('.service-item')) {
      setRoomDropdownOpen(false);
      setConferenceDropdownOpen(prev => !prev);
      // Clear any previous errors when opening/closing dropdown
      setConferenceAvailabilityError("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const roomServiceItem = document.querySelector('.room-service-item');
      const conferenceServiceItem = document.querySelector('.conference-service-item');
      const roomDropdown = document.querySelector('.room-dropdown');
      const conferenceDropdown = document.querySelector('.conference-dropdown');
      
      const clickedInRoom = (roomServiceItem && roomServiceItem.contains(event.target)) ||
        (roomDropdown && roomDropdown.contains(event.target));
      const clickedInConference = (conferenceServiceItem && conferenceServiceItem.contains(event.target)) ||
        (conferenceDropdown && conferenceDropdown.contains(event.target));
      
      if (!clickedInRoom && roomDropdownOpen) {
        setRoomDropdownOpen(false);
      }
      if (!clickedInConference && conferenceDropdownOpen) {
        setConferenceDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roomDropdownOpen, conferenceDropdownOpen]);

  // New function to check room availability
  const checkRoomAvailability = async (checkIn, checkOut) => {
    if (!checkIn || !checkOut) {
      setRoomAvailabilityError("Please select both check-in and check-out dates");
      return false;
    }
    
    try {
      setCheckingRoomAvailability(true);
      setRoomAvailabilityError("");
      
      // Format dates for comparison
      const selectedCheckIn = new Date(checkIn);
      const selectedCheckOut = new Date(checkOut);
      
      // Verify dates are valid
      if (selectedCheckOut <= selectedCheckIn) {
        setRoomAvailabilityError("Check-out date must be after check-in date");
        return false;
      }
      
      // Query rooms collection
      const roomsCollection = collection(db, "rooms");
      const q = query(roomsCollection, where("availability", "==", true));
      const querySnapshot = await getDocs(q);
      
      // Check if any rooms are available for these dates
      let availableRoomsCount = 0;
      
      querySnapshot.forEach((doc) => {
        const room = doc.data();
        
        // If no bookings array or empty bookings, room is available
        if (!room.bookings || room.bookings.length === 0) {
          availableRoomsCount++;
          return;
        }
        
        // Check for date conflicts
        const hasConflict = room.bookings.some(booking => {
          if (!booking.checkIn || !booking.checkOut) return false;
          
          const bookedCheckIn = new Date(booking.checkIn);
          const bookedCheckOut = new Date(booking.checkOut);
          
          // Check if there's an overlap
          return selectedCheckIn < bookedCheckOut && selectedCheckOut > bookedCheckIn;
        });
        
        if (!hasConflict) {
          availableRoomsCount++;
        }
      });
      
      if (availableRoomsCount === 0) {
        setRoomAvailabilityError("No rooms available for these dates. Please try different dates.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking room availability:", error);
      setRoomAvailabilityError("Error checking availability. Please try again.");
      return false;
    } finally {
      setCheckingRoomAvailability(false);
    }
  };

  // New function to check conference room availability
  const checkConferenceAvailability = async (startDate, endDate) => {
    if (!startDate || !endDate) {
      setConferenceAvailabilityError("Please select both start and end dates");
      return false;
    }
    
    try {
      setCheckingConferenceAvailability(true);
      setConferenceAvailabilityError("");
      
      // Format dates for comparison
      const selectedStartDate = new Date(startDate);
      const selectedEndDate = new Date(endDate);
      
      // Verify dates are valid
      if (selectedEndDate <= selectedStartDate) {
        setConferenceAvailabilityError("End date must be after start date");
        return false;
      }
      
      // Query conference rooms collection
      const roomsCollection = collection(db, "conference_rooms");
      const q = query(roomsCollection, where("availability", "==", true));
      const querySnapshot = await getDocs(q);
      
      // Check if any conference rooms are available for these dates
      let availableRoomsCount = 0;
      
      querySnapshot.forEach((doc) => {
        const room = doc.data();
        
        // If no bookings array or empty bookings, room is available
        if (!room.bookings || room.bookings.length === 0) {
          availableRoomsCount++;
          return;
        }
        
        // Check for date conflicts
        const hasConflict = room.bookings.some(booking => {
          // Support both naming conventions
          const bookedStart = booking.startDate ? new Date(booking.startDate) : 
                            (booking.checkIn ? new Date(booking.checkIn) : null);
          
          const bookedEnd = booking.endDate ? new Date(booking.endDate) : 
                          (booking.checkOut ? new Date(booking.checkOut) : null);
          
          // Skip invalid bookings
          if (!bookedStart || !bookedEnd) return false;
          
          // Check if there's an overlap
          return selectedStartDate < bookedEnd && selectedEndDate > bookedStart;
        });
        
        if (!hasConflict) {
          availableRoomsCount++;
        }
      });
      
      if (availableRoomsCount === 0) {
        setConferenceAvailabilityError("No conference rooms available for these dates. Please try different dates.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking conference availability:", error);
      setConferenceAvailabilityError("Error checking availability. Please try again.");
      return false;
    } finally {
      setCheckingConferenceAvailability(false);
    }
  };

  const handleRoomBooking = async (event) => {
    // Prevent event propagation to parent elements
    event.preventDefault();
    event.stopPropagation();
    
    const { checkIn, checkOut } = roomBookingDetails;
    if (!checkIn || !checkOut) {
      setRoomAvailabilityError("Please select check-in and check-out dates!");
      return;
    }
    
    // Check availability first
    const isAvailable = await checkRoomAvailability(checkIn, checkOut);
    if (!isAvailable) {
      return;
    }
    
    try {
      const isLoggedIn = !!auth.currentUser;
      await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn
      });
      
      // Store in context instead of URL params
      setBookingData({
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn,
        fromServices: true // Flag to indicate the origin of this data
      });
      
      // Navigate without params
      navigate('/room-booking');
    } catch (error) {
      console.error("Error saving room booking:", error.message);
      setRoomAvailabilityError(`Failed to save room booking: ${error.message}`);
    }
  };

  const handleConferenceBooking = async (event) => {
    // Prevent event propagation to parent elements
    event.preventDefault();
    event.stopPropagation();
    
    const { startDate, endDate } = conferenceBookingDetails;
    if (!startDate || !endDate) {
      setConferenceAvailabilityError("Please select a start date and end date!");
      return;
    }
    
    // Check availability first
    const isAvailable = await checkConferenceAvailability(startDate, endDate);
    if (!isAvailable) {
      return;
    }
    
    try {
      const isLoggedIn = !!auth.currentUser;
      
      // Save booking to Firestore for record keeping
      await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn
      });
      
      // Store in context instead of URL params
      setBookingData({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn,
        roomCategory: "conference", // Flag to indicate this is a conference booking
        fromServices: true // Flag to indicate the origin of this data
      });
      
      // Navigate without params
      navigate('/conference-booking');
    } catch (error) {
      console.error("Error saving conference booking:", error);
      setConferenceAvailabilityError("Failed to save conference booking. Please try again.");
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <>
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <h1 className="booking-services-heading">Booking Services</h1>
        {!loading && (
          <>
            {console.log("About to render ProfileSection with user:", user)}
            <ProfileSection
              user={user}
              onLogout={() => {
                auth.signOut()
                  .then(() => {
                    sessionStorage.removeItem('currentUser');
                    navigate('/login');
                  })
                  .catch(error => console.error("Error signing out:", error));
              }}
            />
          </>
        )}
      </div>
      <div className="services-page">
        <div className="services-grid">
          {/* Room Booking */}
          <div className="service-item room-service-item" onClick={toggleRoomDropdown}>
            <img
              src={roomImage || "/images/room-default.jpg"}
              alt="Room Booking"
              className="service-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/room-placeholder.jpg";
              }}
            />
            <p className="service-title">Room Booking</p>
            <div
              className={`dropdown room-dropdown ${roomDropdownOpen ? "active" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <label>Check-in Date:</label>
              <DatePicker
                selected={roomBookingDetails.checkIn}
                onChange={(date) =>
                  setRoomBookingDetails((prev) => ({ ...prev, checkIn: date }))
                }
                minDate={today}
                placeholderText="Select check-in date"
              />
              <label>Check-out Date:</label>
              <DatePicker
                selected={roomBookingDetails.checkOut}
                onChange={(date) =>
                  setRoomBookingDetails((prev) => ({ ...prev, checkOut: date }))
                }
                minDate={roomBookingDetails.checkIn || today}
                placeholderText="Select check-out date"
              />
              
              {/* Display room availability error */}
              {roomAvailabilityError && (
                <div className="availability-error">{roomAvailabilityError}</div>
              )}
              
              <button 
                className={`learn-more ${checkingRoomAvailability ? 'checking' : ''}`} 
                onClick={handleRoomBooking}
                disabled={checkingRoomAvailability}
              >
                {checkingRoomAvailability ? 'Checking Availability...' : 'Proceed to Room Booking'}
              </button>
            </div>
          </div>
          {/* Conference Booking */}
          <div className="service-item conference-service-item" onClick={toggleConferenceDropdown}>
            <img
              src={conferenceImage || "/images/conference-default.jpg"}
              alt="Conference Booking"
              className="service-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/conference-placeholder.jpg";
              }}
            />
            <p className="service-title">Conference Booking</p>
            <div
              className={`dropdown conference-dropdown ${conferenceDropdownOpen ? "active" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <label>Start Date:</label>
              <DatePicker
                selected={conferenceBookingDetails.startDate}
                onChange={(date) =>
                  setConferenceBookingDetails((prev) => ({
                    ...prev,
                    startDate: date,
                  }))
                }
                minDate={today}
                placeholderText="Select start date"
              />
              <label>End Date:</label>
              <DatePicker
                selected={conferenceBookingDetails.endDate}
                onChange={(date) =>
                  setConferenceBookingDetails((prev) => ({
                    ...prev,
                    endDate: date,
                  }))
                }
                minDate={conferenceBookingDetails.startDate || today}
                placeholderText="Select end date"
              />
              
              {/* Display conference availability error */}
              {conferenceAvailabilityError && (
                <div className="availability-error">{conferenceAvailabilityError}</div>
              )}
              
              <button 
                className={`learn-more ${checkingConferenceAvailability ? 'checking' : ''}`} 
                onClick={handleConferenceBooking}
                disabled={checkingConferenceAvailability}
              >
                {checkingConferenceAvailability ? 'Checking Availability...' : 'Proceed to Conference Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ChatWidget />
    </>
  );
};

export default ServicesPage;