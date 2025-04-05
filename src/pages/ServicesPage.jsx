import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from "../config/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/ServicesPage.css";

// Services Page Component
const ServicesPage = () => {
  const navigate = useNavigate();
  const today = new Date();

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Booking form state
  const [roomBookingDetails, setRoomBookingDetails] = useState({ checkIn: null, checkOut: null });
  const [conferenceBookingDetails, setConferenceBookingDetails] = useState({ startDate: null, endDate: null });


  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from session or Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const sessionUser = sessionStorage.getItem("currentUser");
        if (sessionUser) {
          setUser(JSON.parse(sessionUser));
          setLoading(false);
          return;
        }

        const currentUser = auth.currentUser;

        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Build user object for UI and local cache
          const userObj = {
            id: currentUser.uid,
            fname: userData.firstName || userData.fname || "User",
            lname: userData.lastName || userData.lname || "",
            photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
            email: userData.email || currentUser.email,
          };

          setUser(userObj);
          sessionStorage.setItem("currentUser", JSON.stringify(userObj));
        } else {
          // Guest user fallback
          setUser({
            fname: "Guest",
            lname: "User",
            photoURL: "/images/profile-placeholder.png",
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUser({
          fname: "Guest",
          lname: "User",
          photoURL: "/images/profile-placeholder.png",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    // Listen for session storage updates
    window.addEventListener("storage", (e) => {
      if (e.key === "currentUser") {
        try {
          const updated = JSON.parse(e.newValue);
          if (updated) setUser(updated);
        } catch {}
      }
    });

    return () => {
      window.removeEventListener("storage", () => {});
    };
  }, []);

  
  useEffect(() => {
    const intervalId = setInterval(() => {
      const stored = sessionStorage.getItem("currentUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.photoURL !== user?.photoURL ||
          parsed.fname !== user?.fname ||
          parsed.lname !== user?.lname
        ) {
          setUser(parsed);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user]);


  const toggleDropdown = (service) => {
    setSelectedService((prev) => (prev === service ? null : service));
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll(".dropdown");
      let clickedOutside = true;

      dropdowns.forEach((dropdown) => {
        if (
          dropdown.contains(event.target) ||
          event.target.closest(".service-item") === dropdown.closest(".service-item")
        ) {
          clickedOutside = false;
        }
      });

      if (clickedOutside && selectedService) {
        setSelectedService(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedService]);

  // Submit Room Booking
  const handleRoomBooking = async () => {
    const { checkIn, checkOut } = roomBookingDetails;

    if (!checkIn || !checkOut) {
      alert("Please select both check-in and check-out dates.");
      return;
    }

    if (checkOut <= checkIn) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    const diffInDays = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
    if (diffInDays > 30) {
      alert("Maximum stay is 30 days.");
      return;
    }

    try {
      await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !auth.currentUser,
      });

      // Navigate to Room Booking details
      navigate(
        `/room-booking?checkIn=${encodeURIComponent(checkIn.toISOString())}&checkOut=${encodeURIComponent(checkOut.toISOString())}`
      );
    } catch (error) {
      console.error("Error saving room booking:", error.message);
      alert("Failed to save room booking.");
    }
  };

  //  Submit Conference Booking
  const handleConferenceBooking = async () => {
    const { startDate, endDate } = conferenceBookingDetails;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    if (endDate <= startDate) {
      alert("End date must be after start date.");
      return;
    }

    const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (diffInDays > 20) {
      alert("Conference bookings can't exceed 10 days.");
      return;
    }

    try {
      await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        createdAt: serverTimestamp(),
        userId: user?.id || auth.currentUser?.uid || "guest",
        isGuest: !auth.currentUser,
      });

      // Navigate to Conference Booking details
      navigate(
        `/conference-booking?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
      );
    } catch (error) {
      console.error("Error saving conference booking:", error.message);
      alert("Failed to save conference booking.");
    }
  };


  return (
    <>
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <h1 className="booking-services-heading">Booking Services</h1>

      
        {!loading && user && (
          <div className="profile-bar" onClick={() => navigate("/profile")}>
            <div className="profile-info">
              <img
                src={user.photoURL}
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


      <div className="services-page">
        <div className="services-grid">
          
          {/*  Room Booking */}
          <div className="service-item" onClick={() => toggleDropdown("room")}>
            <img src="/src/assets/images/IMG_0111.JPG" alt="Room Booking" className="service-image" />
            <p className="service-title">Room Booking</p>
            <div
              className={`dropdown ${selectedService === "room" ? "active" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <label>Check-in Date:</label>
              <DatePicker
                selected={roomBookingDetails.checkIn}
                onChange={(date) => setRoomBookingDetails((prev) => ({ ...prev, checkIn: date }))}
                minDate={today}
                placeholderText="Select check-in date"
              />
              <label>Check-out Date:</label>
              <DatePicker
                selected={roomBookingDetails.checkOut}
                onChange={(date) => setRoomBookingDetails((prev) => ({ ...prev, checkOut: date }))}
                minDate={roomBookingDetails.checkIn || today}
                placeholderText="Select check-out date"
              />
              <button className="learn-more" onClick={handleRoomBooking}>
                Proceed to Room Booking
              </button>
            </div>
          </div>

          {/* Conference Booking */}
          <div className="service-item" onClick={() => toggleDropdown("conference")}>
            <img src="/src/assets/images/pixelcut-export.jpeg" alt="Conference Booking" className="service-image" />
            <p className="service-title">Conference Booking</p>
            <div
              className={`dropdown ${selectedService === "conference" ? "active" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <label>Start Date:</label>
              <DatePicker
                selected={conferenceBookingDetails.startDate}
                onChange={(date) =>
                  setConferenceBookingDetails((prev) => ({ ...prev, startDate: date }))
                }
                minDate={today}
                placeholderText="Select start date"
              />
              <label>End Date:</label>
              <DatePicker
                selected={conferenceBookingDetails.endDate}
                onChange={(date) =>
                  setConferenceBookingDetails((prev) => ({ ...prev, endDate: date }))
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
