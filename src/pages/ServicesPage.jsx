import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
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

  const toggleDropdown = (service) => {
    setSelectedService(selectedService === service ? null : service);
  };

  // ✅ Handles Room Booking Submission
  const handleRoomBooking = async () => {
    const { checkIn, checkOut } = roomBookingDetails;
  
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }
  
    try {
      console.log("Saving room booking...");
      const docRef = await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        createdAt: new Date().toISOString(),
      });

      console.log("Room booking saved:", docRef.id);
     
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
      console.log("Saving conference booking...");
      const docRef = await addDoc(collection(db, "conferenceBookings"), {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
  
        createdAt: new Date().toISOString(),
      });

      console.log("Conference booking saved:", docRef.id);
      alert("Conference booking saved!");
      navigate(
        `/conference-booking?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
    } catch (error) {
      console.error("Error saving conference booking:", error);
      alert("Failed to save conference booking. Please try again.");
    }
  };

  return (
    <div className="services-page">
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <h1 className="booking-services-heading">Booking Services</h1>
      </div>

      <div className="services-grid">
        {/* ✅ Room Booking */}
        <div className="service-item" onClick={() => toggleDropdown("room")}>
          <img src="src/assets/images/IMG_0111.JPG" alt="Room Booking" className="service-image" />
          <p className="service-title">Room Booking</p>
          <div className={`dropdown ${selectedService === "room" ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
            <label>Check-in Date:</label>
            <DatePicker 
              selected={roomBookingDetails.checkIn} 
              onChange={(date) => setRoomBookingDetails(prev => ({ ...prev, checkIn: date }))}
              minDate={today} 
            />

            <label>Check-out Date:</label>
            <DatePicker 
              selected={roomBookingDetails.checkOut} 
              onChange={(date) => setRoomBookingDetails(prev => ({ ...prev, checkOut: date }))}
              minDate={roomBookingDetails.checkIn || today} 
            />

         
            <button className="learn-more" onClick={handleRoomBooking}>Proceed to Room Booking</button>
          </div>
        </div>

        {/* Conference Booking */}
        <div className="service-item" onClick={() => toggleDropdown("conference")}>
          <img src="src/assets/images/pixelcut-export.jpeg" alt="Conference Booking" className="service-image" />
          <p className="service-title">Conference Booking</p>
          <div className={`dropdown ${selectedService === "conference" ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
            <label>Start Date:</label>
            <DatePicker 
              selected={conferenceBookingDetails.startDate} 
              onChange={(date) => setConferenceBookingDetails(prev => ({ ...prev, startDate: date }))}
              minDate={today} 
            />

            <label>End Date:</label>
            <DatePicker 
              selected={conferenceBookingDetails.endDate} 
              onChange={(date) => setConferenceBookingDetails(prev => ({ ...prev, endDate: date }))}
              minDate={conferenceBookingDetails.startDate || today} 
            />

        

            <button className="learn-more" onClick={handleConferenceBooking}>Proceed to Conference Booking</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
