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

  // Extract multiple selected rooms from URL params
  const params = new URLSearchParams(location.search);
  const selectedRooms = params.get("rooms") ? JSON.parse(decodeURIComponent(params.get("rooms"))) : [];
  const checkIn = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : "";
  const checkOut = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : "";

  // Ensure prices are parsed as numbers and calculate total amount
  const totalAmount = selectedRooms.reduce((acc, room) => acc + Number(room.price || 0), 0);

  // State for user form input (one form for all selected rooms)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: "",
    airportPickup: "No",
    paymentOption: "Full Payment",
    specialRequests: "",
  });

  // Handle form changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle booking for multiple rooms
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("Please log in to book a room.");
      navigate("/login");
      return;
    }

    try {
      // Store each room booking
      const bookingPromises = selectedRooms.map((room) =>
        addDoc(collection(db, "bookings"), {
          userId: auth.currentUser.uid,
          roomType: room.t_room,
          price: Number(room.price || 0), // Ensure numeric price
          checkIn,
          checkOut,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          numberOfGuests: formData.numberOfGuests,
          airportPickup: formData.airportPickup,
          paymentOption: formData.paymentOption,
          specialRequests: formData.specialRequests,
          createdAt: new Date().toISOString(),
        })
      );

      await Promise.all(bookingPromises);

      alert("Booking successful for all selected rooms!");
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

      {/* Booking Details */}
      <div className="booking-summary">
        <h3>Booking Details</h3>
        <p><strong>Check-In:</strong> {checkIn}</p>
        <p><strong>Check-Out:</strong> {checkOut}</p>

        {/* Selected Rooms Dropdown */}
        <div className="selected-rooms-dropdown">
          <label><strong>Selected Rooms</strong></label>
          <select>
            {selectedRooms.map((room, index) => (
              <option key={room.id}>
                {room.t_room} - GHS {room.price}
              </option>
            ))}
          </select>
        </div>

        <p className="total-amount"><strong>Total Price:</strong> GHS {totalAmount.toFixed(2)}</p>
      </div>

      <form className="booking-form" onSubmit={handleSubmit}>
        {/* Personal Details */}
        <div>
          <label>First Name</label>
          <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} />
        </div>

        <div>
          <label>Last Name</label>
          <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} />
        </div>

        <div>
          <label>Email</label>
          <input type="email" name="email" required value={formData.email} onChange={handleChange} />
        </div>

        <div>
          <label>Phone</label>
          <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} />
        </div>

        <div>
          <label>Number of Guests</label>
          <input type="number" name="numberOfGuests" required value={formData.numberOfGuests} onChange={handleChange} placeholder="e.g., 2" />
        </div>

        {/* Additional Options */}
        <div>
          <label>Airport Pickup</label>
          <select name="airportPickup" value={formData.airportPickup} onChange={handleChange}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div>
          <label>Payment Option</label>
          <select name="paymentOption" value={formData.paymentOption} onChange={handleChange}>
            <option>Full Payment</option>
            <option>Deposit for Reservation</option>
          </select>
        </div>

        <div>
          <label>Special Requests</label>
          <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} placeholder="Any special requests?"></textarea>
        </div>

        {/* Submit Button */}
        <button type="submit" className="confirm-booking">Complete Booking</button>
      </form>
    </div>
  );
};

export default BookingPage;
