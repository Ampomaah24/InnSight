import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from "../config/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import ChatWidget from "../components/ChatWidget";
import "../assets/styles/ServicesPage.css";
import ProfileSection from "../components/ProfileSection";
// Import images directly if using webpack/vite
import roomImage from "../assets/images/IMG_0111.JPG";
import conferenceImage from "../assets/images/pixelcut-export.jpeg";

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
    }
  };

  const toggleConferenceDropdown = (event) => {
    event.stopPropagation();
    if (event.currentTarget === event.target.closest('.service-item')) {
      setRoomDropdownOpen(false);
      setConferenceDropdownOpen(prev => !prev);
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

  const handleRoomBooking = async (event) => {
    // Prevent event propagation to parent elements
    event.preventDefault();
    event.stopPropagation();
    
    const { checkIn, checkOut } = roomBookingDetails;
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates!");
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
      
      navigate(
        `/room-booking?checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving room booking:", error.message);
      alert(`Failed to save room booking: ${error.message}`);
    }
  };

  const handleConferenceBooking = async (event) => {
    // Prevent event propagation to parent elements
    event.preventDefault();
    event.stopPropagation();
    
    const { startDate, endDate } = conferenceBookingDetails;
    if (!startDate || !endDate) {
      alert("Please select a start date and end date!");
      return;
    }
    
    try {
      const isLoggedIn = !!auth.currentUser;
      await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !isLoggedIn
      });
      
      navigate(
        `/conference-booking?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving conference booking:", error);
      alert("Failed to save conference booking. Please try again.");
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
              <button 
                className="learn-more" 
                onClick={handleRoomBooking}
              >
                Proceed to Room Booking
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
              <button 
                className="learn-more" 
                onClick={handleConferenceBooking}
              >
                Proceed to Conference Booking
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