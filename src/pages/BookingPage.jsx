import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/BookingPage.css"; 

const BookingPage = () => {
  const navigate = useNavigate(); 
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    roomType: "Standard Room",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Here, you can integrate with Firebase or any backend for booking storage.
  };

  return (
    <div className="booking-container">
      <h2>Room Booking</h2>
      <p>Fill in your details to complete your reservation.</p>

      {isSubmitted ? (
        <div className="success-message">
          <h3>Booking Confirmed!</h3>
          <p>Thank you, {formData.name}! Your room has been booked successfully.</p>
          <button className="back-button" onClick={() => navigate("/room-booking")}>
            Back to Rooms
          </button>
        </div>
      ) : (
        <form className="booking-form" onSubmit={handleSubmit}>
          <label>Name</label>
          <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Enter your full name" />

          <label>Email</label>
          <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email" />

          <label>Phone</label>
          <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" />

          <label>Room Type</label>
          <select name="roomType" value={formData.roomType} onChange={handleChange}>
            <option>Standard Room</option>
            <option>Deluxe Room</option>
            <option>Executive Suite</option>
          </select>

          <button type="submit" className="confirm-booking">Complete Booking</button>
        </form>
      )}
    </div>
  );
};

export default BookingPage;
