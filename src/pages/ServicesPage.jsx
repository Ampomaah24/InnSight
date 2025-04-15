import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from "../config/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp  } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import ChatWidget from "../components/ChatWidget"; // Import the ChatWidget component
import "../assets/styles/ServicesPage.css";

// Import images directly if using webpack/vite
import roomImage from "../assets/images/IMG_0111.JPG"; // Update with your actual image name
import conferenceImage from "../assets/images/pixelcut-export.jpeg"; // Update with your actual image name

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

            // Create user object with support for base64 avatar
            const userObj = {
              id: currentUser.uid,
              fname: userData.firstName || userData.fname || "User",
              lname: userData.lastName || userData.lname || "",
              photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
              avatar: userData.avatar || null, // Add support for base64 avatar
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

  // Get avatar source - prioritize base64 avatar over photoURL
  const getAvatarSource = () => {
    if (user?.avatar) {
      return user.avatar; // Use base64 image if available
    }
    if (user?.photoURL) {
      return user.photoURL; // Fallback to photoURL if available
    }
    return "/images/profile-placeholder.png"; // Default fallback
  };

  const toggleRoomDropdown = (event) => {
    event.stopPropagation(); // Stop the click from bubbling up to the document
    setRoomDropdownOpen(!roomDropdownOpen);
    if (conferenceDropdownOpen) setConferenceDropdownOpen(false);
  };
  
  const toggleConferenceDropdown = (event) => {
    event.stopPropagation(); // Stop the click from bubbling up to the document
    setConferenceDropdownOpen(!conferenceDropdownOpen);
    if (roomDropdownOpen) setRoomDropdownOpen(false);
  };

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
  
      if (clickedOutside) {
        // Close dropdowns if they're open and the click was outside
        if (roomDropdownOpen) setRoomDropdownOpen(false);
        if (conferenceDropdownOpen) setConferenceDropdownOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roomDropdownOpen, conferenceDropdownOpen]);

  // ✅ Handles Room Booking Submission
  const handleRoomBooking = async () => {
    const { checkIn, checkOut } = roomBookingDetails;

    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }

    try {
      const isLoggedIn = !!auth.currentUser;
      const docRef = await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn
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
      const isLoggedIn = !!auth.currentUser;
      const docRef = await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn // Add this field
      });
  
      navigate(
        `/conference-booking?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving conference booking:", error);
      alert("Failed to save conference booking. Please try again.");
    }
  };

  // Function to handle profile click
  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <>
      {/* Top Navigation Bar - Fixed positioning */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <h1 className="booking-services-heading">Booking Services</h1>

        {/* Top-right profile section - now with only the profile image */}
        {!loading && user && (
          <div className="profile-avatar" onClick={handleProfileClick}>
            <img
              src={getAvatarSource()}
              alt="Profile"
              className="profile-pic"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/profile-placeholder.png";
              }}
            />
          </div>
        )}
      </div>

      {/* Services Page Content */}
      <div className="services-page">
        {/* Booking Options */}
        <div className="services-grid">
          {/* ✅ Room Booking */}
          <div className="service-item" onClick={toggleRoomDropdown}>
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
              className={`dropdown ${roomDropdownOpen ? "active" : ""}`}
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
          <div className="service-item" onClick={toggleConferenceDropdown}>
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
              className={`dropdown ${conferenceDropdownOpen ? "active" : ""}`}
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

      {/* Include the ChatWidget component */}
      <ChatWidget />
    </>
  );
};

export default ServicesPage;