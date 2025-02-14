import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import NavMenu from "../components/NavMenu"; // Import the NavMenu component
import "../assets/styles/ServicesPage.css";

const ServicesPage = () => {
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState(null);
  const [roomBookingDates, setRoomBookingDates] = useState({ checkIn: null, checkOut: null });
  const [conferenceBookingDates, setConferenceBookingDates] = useState({ checkIn: null, checkOut: null });

  const toggleDropdown = (service) => {
    setSelectedService(selectedService === service ? null : service);
  };

  const today = new Date();

  const handleRoomBooking = () => {
    if (!roomBookingDates.checkIn || !roomBookingDates.checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }

    navigate(
      `/room-booking?checkIn=${roomBookingDates.checkIn.toISOString()}&checkOut=${roomBookingDates.checkOut.toISOString()}`
    );
  };

  const handleConferenceBooking = () => {
    if (!conferenceBookingDates.checkIn || !conferenceBookingDates.checkOut) {
      alert("Please select check-in and check-out dates!");
      return;
    }

    navigate(
      `/conference-booking?checkIn=${conferenceBookingDates.checkIn.toISOString()}&checkOut=${conferenceBookingDates.checkOut.toISOString()}`
    );
  };

  return (
    <div className="services-page">
      <NavMenu /> {/* Use NavMenu here instead of the back button */}

      <div className="services-grid">
        {/* Room Booking */}
        <div className="service-item" onClick={() => toggleDropdown("room")}>
          <img src="src/assets/images/IMG_0111.JPG" alt="Room Booking" className="service-image" />
          <p className="service-title">Room Booking</p>

          {selectedService === "room" && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <label>Check-in Date:</label>
              <DatePicker 
                selected={roomBookingDates.checkIn} 
                onChange={date => setRoomBookingDates(prev => ({ ...prev, checkIn: date }))}
                placeholderText="Select check-in date"
                minDate={today} 
              />

              <label>Check-out Date:</label>
              <DatePicker 
                selected={roomBookingDates.checkOut} 
                onChange={date => setRoomBookingDates(prev => ({ ...prev, checkOut: date }))}
                placeholderText="Select check-out date"
                minDate={roomBookingDates.checkIn || today} 
              />

              <button className="learn-more" onClick={handleRoomBooking}>Proceed to Room Booking</button>
            </div>
          )}
        </div>

        {/* Conference Room Booking */}
        <div className="service-item" onClick={() => toggleDropdown("conference")}>
          <img src="src/assets/images/pixelcut-export.jpeg" alt="Conference Room Booking" className="service-image" />
          <p className="service-title">Conference Room Booking</p>

          {selectedService === "conference" && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <label>Check-in Date:</label>
              <DatePicker 
                selected={conferenceBookingDates.checkIn} 
                onChange={date => setConferenceBookingDates(prev => ({ ...prev, checkIn: date }))}
                placeholderText="Select check-in date"
                minDate={today} 
              />

              <label>Check-out Date:</label>
              <DatePicker 
                selected={conferenceBookingDates.checkOut} 
                onChange={date => setConferenceBookingDates(prev => ({ ...prev, checkOut: date }))}
                placeholderText="Select check-out date"
                minDate={conferenceBookingDates.checkIn || today} 
              />

              <button className="learn-more" onClick={handleConferenceBooking}>Proceed to Conference Booking</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
