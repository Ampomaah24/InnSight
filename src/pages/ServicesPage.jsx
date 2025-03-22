import React, { useState } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/ServicesPage.css"; // Import updated CSS

const ServicesPage = () => {
  // State for dropdown visibility
  const [selectedService, setSelectedService] = useState(null);
  const [roomBookingDates, setRoomBookingDates] = useState({ checkIn: null, checkOut: null });
  const [conferenceBookingDates, setConferenceBookingDates] = useState({ checkIn: null, checkOut: null });

  // Function to toggle dropdown when clicking on a service
  const toggleDropdown = (service) => {
    setSelectedService(selectedService === service ? null : service);
  };

  return (
    <div className="services-page">
      {/* Back Button */}
      <div className="back-button">
        <Link to="/">← Booking Services</Link>
      </div>

      {/* Services Grid */}
      <div className="services-grid">
        {/* Room Booking */}
        <div className="service-item" onClick={() => toggleDropdown("room")}>
          <img src="src/assets/images/IMG_0111.JPG" alt="Room Booking" className="service-image" />
          <p className="service-title">Room Booking</p>

          {/* Dropdown for Date Selection */}
          {selectedService === "room" && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <label>Check-in Date:</label>
              <DatePicker 
                selected={roomBookingDates.checkIn} 
                onChange={date => setRoomBookingDates(prev => ({ ...prev, checkIn: date }))}
                placeholderText="Select check-in date"
              />

              <label>Check-out Date:</label>
              <DatePicker 
                selected={roomBookingDates.checkOut} 
                onChange={date => setRoomBookingDates(prev => ({ ...prev, checkOut: date }))}
                placeholderText="Select check-out date"
              />
            </div>
          )}
        </div>

        {/* Conference Room Booking */}
        <div className="service-item" onClick={() => toggleDropdown("conference")}>
          <img src="/src/assets/images/pixelcut-export.jpeg" alt="Conference Room Booking" className="service-image" />
          <p className="service-title">Conference Room Booking</p>

          {/* Dropdown for Date Selection */}
          {selectedService === "conference" && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <label>Check-in Date:</label>
              <DatePicker 
                selected={conferenceBookingDates.checkIn} 
                onChange={date => setConferenceBookingDates(prev => ({ ...prev, checkIn: date }))}
                placeholderText="Select check-in date"
              />

              <label>Check-out Date:</label>
              <DatePicker 
                selected={conferenceBookingDates.checkOut} 
                onChange={date => setConferenceBookingDates(prev => ({ ...prev, checkOut: date }))}
                placeholderText="Select check-out date"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
