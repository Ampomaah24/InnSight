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
    roomType: "Single bed", // Default selection
  });

  const [conferenceBookingDetails, setConferenceBookingDetails] = useState({
    eventDate: null,
    duration: "Half Day",
    numAttendees: "",
  });

  const toggleDropdown = (service) => {
    setSelectedService(selectedService === service ? null : service);
  };

  const handleRoomBooking = async () => {
    const { checkIn, checkOut, roomType } = roomBookingDetails;
  
    if (!checkIn || !checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }
  
    try {
      console.log("Attempting to save room booking to Firestore...");
      console.log("Booking Details:", {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        roomType: roomType,
        createdAt: new Date().toISOString(),
      });
  
      const docRef = await addDoc(collection(db, "roomBookings"), {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        roomType: roomType,
        createdAt: new Date().toISOString(),
      });
  
      console.log("Room booking saved with ID:", docRef.id);
      alert("Room booking saved!");
      navigate(
        `/room-booking?checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}&roomType=${roomType}`
      );
    } catch (error) {
      console.error("Error saving room booking:", error.message);
      alert(`Failed to save room booking: ${error.message}`);
    }
  };
  

  const handleConferenceBooking = async () => {
    const { eventDate, duration, numAttendees } = conferenceBookingDetails;

    if (!eventDate || !numAttendees) {
      alert("Please select an event date and enter the number of attendees!");
      return;
    }

    try {
      console.log("Saving conference booking details to Firestore...");
      await addDoc(collection(db, "conferenceBookings"), {
        eventDate: eventDate.toISOString(),
        duration: duration,
        numAttendees: numAttendees,
        createdAt: new Date().toISOString(),
      });

      console.log("Conference booking details saved!");
      navigate(
        `/conference-booking?eventDate=${eventDate.toISOString()}&duration=${duration}&numAttendees=${numAttendees}`
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
        {/* Room Booking */}
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

            <label>Room Type:</label>
            <select 
              value={roomBookingDetails.roomType} 
              onChange={(e) => setRoomBookingDetails(prev => ({ ...prev, roomType: e.target.value }))}>
              <option value="Single bed">Single bed</option>
              <option value="Double bed">Double bed</option>
              <option value="Twin bed">Twin bed</option>
            </select>

            <button className="learn-more" onClick={handleRoomBooking}>Proceed to Room Booking</button>
          </div>
        </div>

        {/* Conference Booking */}
        <div className="service-item" onClick={() => toggleDropdown("conference")}>
          <img src="src/assets/images/pixelcut-export.jpeg" alt="Conference Booking" className="service-image" />
          <p className="service-title">Conference Booking</p>
          <div className={`dropdown ${selectedService === "conference" ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
            <label>Event Date:</label>
            <DatePicker 
              selected={conferenceBookingDetails.eventDate} 
              onChange={(date) => setConferenceBookingDetails(prev => ({ ...prev, eventDate: date }))}
              minDate={today} 
            />

            <label>Duration:</label>
            <select 
              value={conferenceBookingDetails.duration} 
              onChange={(e) => setConferenceBookingDetails(prev => ({ ...prev, duration: e.target.value }))}>
              <option value="Half Day">Half Day</option>
              <option value="Full Day">Full Day</option>
            </select>

            <label>Number of Attendees:</label>
            <input 
              type="number" 
              min="1"
              placeholder="Enter number of attendees"
              value={conferenceBookingDetails.numAttendees}
              onChange={(e) => setConferenceBookingDetails(prev => ({ ...prev, numAttendees: e.target.value }))}
            />

            <button className="learn-more" onClick={handleConferenceBooking}>Proceed to Conference Booking</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
