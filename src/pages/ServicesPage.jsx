import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from "../config/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/ServicesPage.css";

const ServicesPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const today = new Date();

  const [roomBookingDetails, setRoomBookingDetails] = useState({
    checkIn: null,
    checkOut: null,
  });

  const [conferenceBookingDetails, setConferenceBookingDetails] = useState({
    startDate: null,
    endDate: null,
  });

  // State for user profile data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile data - with sessionStorage check
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First check sessionStorage for cached user data
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        }
        
        // If not in sessionStorage, get from Firestore
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Create user object
            const userObj = {
              id: currentUser.uid,
              fname: userData.firstName || userData.fname || "User",
              lname: userData.lastName || userData.lname || "",
              photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
              email: userData.email || currentUser.email
            };
            
            // Save to state
            setUser(userObj);
            
            // Cache in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          } else {
            // Fallback to auth data
            const userObj = {
              id: currentUser.uid,
              fname: currentUser.displayName?.split(' ')[0] || "User",
              lname: currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              photoURL: currentUser.photoURL || "/images/profile-placeholder.png",
              email: currentUser.email
            };
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          }
        } else {
          // Default user for demo purposes if not logged in
          setUser({
            fname: "Guest",
            lname: "User",
            photoURL: "/images/profile-placeholder.png"
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to default profile
        setUser({
          fname: "Guest",
          lname: "User",
          photoURL: "/images/profile-placeholder.png"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    
    // Add listener for storage events to catch updates from other tabs/pages
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

  const toggleDropdown = (service) => {
    // Close other dropdowns when opening a new one
    setSelectedService(selectedService === service ? null : service);
  };

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll('.dropdown');
      let clickedOutside = true;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target) || 
            event.target.closest('.service-item') === dropdown.closest('.service-item')) {
          clickedOutside = false;
        }
      });
      
      if (clickedOutside && selectedService) {
        setSelectedService(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedService]);

  // ✅ Handles Room Booking Submission
  const handleRoomBooking = async () => {
    const { checkIn, checkOut } = roomBookingDetails;

    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        createdAt: new Date().toISOString(),
        userId: user?.id || auth.currentUser?.uid || "guest",
      });

      navigate(
        `/room-booking?checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving room booking:", error.message);
      alert(`Failed to save room booking: ${error.message}`);
    }
  };

  // ✅ Handles Conference Booking Submission
  const handleConferenceBooking = async () => {
    const { startDate, endDate } = conferenceBookingDetails;

    if (!startDate || !endDate) {
      alert("Please select a start date and end date!");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: new Date().toISOString(),
        userId: user?.id || auth.currentUser?.uid || "guest",
      });

      navigate(
        `/conference-booking?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving conference booking:", error);
      alert("Failed to save conference booking. Please try again.");
    }
  };

  // Check for profile photo updates every 5 seconds
  useEffect(() => {
    const checkProfileUpdates = () => {
      const sessionUser = sessionStorage.getItem('currentUser');
      if (sessionUser) {
        const parsedUser = JSON.parse(sessionUser);
        // Only update if there's a difference (prevents unnecessary re-renders)
        if (parsedUser.photoURL !== user?.photoURL ||
            parsedUser.fname !== user?.fname ||
            parsedUser.lname !== user?.lname) {
          setUser(parsedUser);
        }
      }
    };
    
    const intervalId = setInterval(checkProfileUpdates, 5000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  // Function to handle profile click
  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <>
      {/* Top Navigation Bar - Moved outside and detached from services-page */}
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <h1 className="booking-services-heading">Booking Services</h1>

        {/* Top-right profile section */}
        {!loading && user && (
          <div className="profile-bar" onClick={handleProfileClick}>
            <div className="profile-info">
              <img
                src={user.photoURL || "/images/profile-placeholder.png"}
                alt="Profile"
                className="profile-pic"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/images/profile-placeholder.png";
                }}
              />
              <span className="profile-name">
                {user.fname} {user.lname}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Services Page Content - Separated from nav */}
      <div className="services-page">
        {/* Booking Options */}
        <div className="services-grid">
          {/* ✅ Room Booking */}
          <div className="service-item" onClick={() => toggleDropdown("room")}>
            <img
              src="/src/assets/images/IMG_0111.JPG"
              alt="Room Booking"
              className="service-image"
            />
            <p className="service-title">Room Booking</p>
            <div
              className={`dropdown ${selectedService === "room" ? "active" : ""}`}
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

              <button className="learn-more" onClick={handleRoomBooking}>
                Proceed to Room Booking
              </button>
            </div>
          </div>

          {/* ✅ Conference Booking */}
          <div className="service-item" onClick={() => toggleDropdown("conference")}>
            <img
              src="/src/assets/images/pixelcut-export.jpeg"
              alt="Conference Booking"
              className="service-image"
            />
            <p className="service-title">Conference Booking</p>
            <div
              className={`dropdown ${
                selectedService === "conference" ? "active" : ""
              }`}
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

              <button className="learn-more" onClick={handleConferenceBooking}>
                Proceed to Conference Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServicesPage;