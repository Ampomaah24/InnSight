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
    airportPickup: "No", // Default to No
    paymentOption: "Full Payment", // Default to full payment
    specialRequests: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [depositWarning, setDepositWarning] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Check if deposit option is selected
    if (e.target.name === "paymentOption" && e.target.value === "Deposit for Reservation") {
      setDepositWarning(true);
    } else if (e.target.name === "paymentOption" && e.target.value === "Full Payment") {
      setDepositWarning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    // Show alert if deposit option is selected
    if (formData.paymentOption === "Deposit for Reservation") {
      setTimeout(() => {
        alert(
          "Reminder: You must complete the deposit within 24 hours, or the room will be given out."
        );
      }, 5000); // Simulated delay before showing alert
    }
  };

  return (
    <div className="booking-container">
      <h2>Hotel Booking</h2>
      <p>Experience something new every moment.</p>

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

          {/* Airport Pickup (Radio Buttons) */}
          <div className="full-width">
            <label>Airport Pickup</label>
            <div className="radio-group">
              <label>
                <input type="radio" name="airportPickup" value="Yes" checked={formData.airportPickup === "Yes"} onChange={handleChange} />
                Yes, I need an airport pickup
              </label>
              <label>
                <input type="radio" name="airportPickup" value="No" checked={formData.airportPickup === "No"} onChange={handleChange} />
                No, I’ll arrange my own transport
              </label>
            </div>
          </div>

          {/* Payment Option */}
          <div className="full-width">
            <label>Payment Option</label>
            <select name="paymentOption" value={formData.paymentOption} onChange={handleChange}>
              <option>Full Payment</option>
              <option>Deposit for Reservation</option>
            </select>
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

          {/* Deposit Warning Message */}
          {depositWarning && (
            <p className="warning-text">
              ⚠️ You must complete the deposit within 24 hours, or the room will be given out.
            </p>
          )}

          {/* Submit Button */}
          <button type="submit" className="confirm-booking">Complete Booking</button>
        </form>
      )}
    </div>
  );
};

export default BookingPage;
