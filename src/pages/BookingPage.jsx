import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";
import { collection, addDoc } from "firebase/firestore";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Extract booking details from URL params
  const params = new URLSearchParams(location.search);
  const roomId = params.get("roomId");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: "",
    roomType: "Standard Room",
    airportPickup: "No",
    paymentOption: "Full Payment",
    specialRequests: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [depositWarning, setDepositWarning] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (e.target.name === "paymentOption" && e.target.value === "Deposit for Reservation") {
      setDepositWarning(true);
    } else if (e.target.name === "paymentOption") {
      setDepositWarning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!auth.currentUser) {
      alert("Please log in to book a room.");
      navigate("/login");
      return;
    }

    try {
      // Store booking in Firestore
      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid, // Store user ID
        roomId, // Store room ID
        checkIn,
        checkOut,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        numberOfGuests: formData.numberOfGuests,
        roomType: formData.roomType,
        airportPickup: formData.airportPickup,
        paymentOption: formData.paymentOption,
        specialRequests: formData.specialRequests,
        createdAt: new Date().toISOString(),
      });

      alert("Booking successful!");
      navigate("/my-bookings");
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("Booking failed. Please try again.");
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

          {/* Room Type */}
          <div className="full-width">
            <label>Room Type</label>
            <select name="roomType" value={formData.roomType} onChange={handleChange}>
              <option>Standard Room</option>
              <option>Deluxe Room</option>
              <option>Executive Suite</option>
            </select>
          </div>

          {/* Airport Pickup */}
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
