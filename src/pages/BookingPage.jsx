import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: "",
    arrivalDate: "",
    arrivalTime: "",
    roomType: "Standard Room",
    freePickup: "",
    specialRequests: "",
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
  };

  return (
    <div className="booking-container">
      <h2>Booking</h2>
     
      {isSubmitted ? (
        <div className="success-message">
          <h3>Booking Confirmed!</h3>
          <p>Thank you, {formData.firstName}! Your room has been booked successfully.</p>
          <button className="confirm-booking" onClick={() => navigate("/room-booking")}>
            Back to Rooms
          </button>
        </div>
      ) : (
        <form className="booking-form" onSubmit={handleSubmit}>
          {/* First Name & Last Name */}
          <div>
            <label>First Name</label>
            <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="Enter your first name" />
          </div>

          <div>
            <label>Last Name</label>
            <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Enter your last name" />
          </div>

          {/* Email & Phone */}
          <div>
            <label>Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Enter your email" />
          </div>

          <div>
            <label>Phone</label>
            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" />
          </div>

          {/* Number of Guests */}
          <div>
            <label>Number of Guests</label>
            <input type="number" name="numberOfGuests" required value={formData.numberOfGuests} onChange={handleChange} placeholder="e.g., 2" />
          </div>

          {/* Arrival Date & Time */}
          <div>
            <label>Arrival Date</label>
            <input type="date" name="arrivalDate" required value={formData.arrivalDate} onChange={handleChange} />
          </div>

          <div>
            <label>Arrival Time</label>
            <input type="time" name="arrivalTime" required value={formData.arrivalTime} onChange={handleChange} />
          </div>

          {/* Room Type (Dropdown) */}
          <div className="full-width">
            <label>Room Type</label>
            <select name="roomType" value={formData.roomType} onChange={handleChange}>
              <option>Standard Room</option>
              <option>Deluxe Room</option>
              <option>Executive Suite</option>
            </select>
          </div>

          {/* Free Pickup (Radio Buttons) */}
          <div className="full-width">
            <label>Free Pickup?</label>
            <div className="radio-group">
              <label>
                <input type="radio" name="freePickup" value="Yes" onChange={handleChange} />
                Yes, pick me up on arrival
              </label>
              <label>
                <input type="radio" name="freePickup" value="No" onChange={handleChange} />
                No, I’ll make my own way
              </label>
            </div>
          </div>

          {/* Special Requests */}
          <div className="full-width">
            <label>Special Requests</label>
            <textarea
              name="specialRequests"
              className="special-requests"
              value={formData.specialRequests}
              onChange={handleChange}
              placeholder="Any special requirements?"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button type="submit" className="confirm-booking">Complete Booking</button>
        </form>
      )}
    </div>
  );
};

export default BookingPage;
