import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { PaystackButton } from "react-paystack";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Extract multiple selected rooms from URL params
  const params = new URLSearchParams(location.search);
  const selectedRooms = params.get("rooms")
    ? JSON.parse(decodeURIComponent(params.get("rooms")))
    : [];
  const checkInParam = params.get("checkIn")
    ? decodeURIComponent(params.get("checkIn"))
    : "";
  const checkOutParam = params.get("checkOut")
    ? decodeURIComponent(params.get("checkOut"))
    : "";

  // Calculate total amount (in GHS) from selected rooms
  const totalAmount = selectedRooms.reduce(
    (acc, room) => acc + Number(room.price || 0),
    0
  );

  // State for form data (one form for all selected rooms)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "", // Auto-populated if the user is logged in
    phone: "",
    numberOfGuests: "",
    checkIn: "", // Autofilled from URL
    checkOut: "", // Autofilled from URL
    airportPickup: "No",
    paymentOption: "Full Payment",
    specialRequests: "",
  });

  // Autofill email if the user is logged in
  useEffect(() => {
    if (auth.currentUser && auth.currentUser.email) {
      setFormData((prev) => ({
        ...prev,
        email: auth.currentUser.email,
      }));
    }
  }, [auth.currentUser]);

  // Autofill check-in and check-out fields from URL parameters
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      checkIn: checkInParam,
      checkOut: checkOutParam,
    }));
  }, [checkInParam, checkOutParam]);

  // Handle form changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Complete the booking after successful payment
  const completeBooking = async () => {
    if (!auth.currentUser) {
      alert("Please log in to book a room.");
      navigate("/login");
      return;
    }
    try {
      // Save a booking for each selected room
      const bookingPromises = selectedRooms.map((room) =>
        addDoc(collection(db, "bookings"), {
          userId: auth.currentUser.uid,
          roomType: room.t_room,
          price: Number(room.price || 0),
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          numberOfGuests: Number(formData.numberOfGuests),
          airportPickup: formData.airportPickup,
          paymentOption: formData.paymentOption,
          specialRequests: formData.specialRequests,
          createdAt: serverTimestamp(),
        })
      );

      await Promise.all(bookingPromises);
      alert("Booking successful for all selected rooms!");
      navigate("/my-bookings");
    } catch (error) {
      console.error("Error saving booking:", error);  
      alert("Booking failed. Please try again. " + error.message);
    }
  };

  // Configuration for PaystackButton
  const config = {
    reference: new Date().getTime().toString(),
    email: formData.email,
    amount: totalAmount * 100, // Amount in pesewas (if totalAmount is in GHS)
    publicKey: "pk_test_8b02dfc94aa31f78f2f3214086e81616365346c5", // Replace with your actual Paystack public key
    currency: "GHS",
  };

  const onSuccess = (reference) => {
    console.log("Payment successful with reference:", reference);
    completeBooking();
  };

  const onClose = () => {
    alert("Payment was cancelled.");
  };

  return (
    <div className="booking-container">
      <h2>Hotel Booking</h2>
      <p>Experience something new every moment.</p>

      {/* Booking Details */}
      <div className="booking-summary">
        <h3>Booking Details</h3>
        <p>
          <strong>Check-In:</strong> {formData.checkIn}
        </p>
        <p>
          <strong>Check-Out:</strong> {checkOutParam}
        </p>

        {/* Selected Rooms Dropdown */}
        <div className="selected-rooms-dropdown">
          <label>
            <strong>Selected Rooms</strong>
          </label>
          <select>
            {selectedRooms.map((room, index) => (
              <option key={room.id}>
                {room.t_room} - GHS {room.price}
              </option>
            ))}
          </select>
        </div>

        <p className="total-amount">
          <strong>Total Price:</strong> GHS {totalAmount.toFixed(2)}
        </p>
      </div>

      {/* Booking Form */}
      <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
        {/* Personal Details */}
        <div>
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Number of Guests</label>
          <input
            type="number"
            name="numberOfGuests"
            required
            value={formData.numberOfGuests}
            onChange={handleChange}
            placeholder="e.g., 2"
          />
        </div>

        {/* Autofilled Check-In and Check-Out */}
        <div>
          <label>Check-In</label>
          <input
            type="date"
            name="checkIn"
            required
            value={formData.checkIn}
            readOnly
          />
        </div>

        <div>
          <label>Check-Out</label>
          <input
            type="date"
            name="checkOut"
            required
            value={formData.checkOut}
            readOnly
          />
        </div>

        {/* Additional Options */}
        <div>
          <label>Airport Pickup</label>
          <select
            name="airportPickup"
            value={formData.airportPickup}
            onChange={handleChange}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div>
          <label>Payment Option</label>
          <select
            name="paymentOption"
            value={formData.paymentOption}
            onChange={handleChange}
          >
            <option>Full Payment</option>
            <option>Deposit for Reservation</option>
          </select>
        </div>

        <div>
          <label>Special Requests</label>
          <textarea
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleChange}
            placeholder="Any special requests?"
          ></textarea>
        </div>

        {/* Paystack Payment Button */}
        <PaystackButton
          className="confirm-booking"
          text="Complete Booking"
          {...config}
          onSuccess={onSuccess}
          onClose={onClose}
          disabled={!formData.email || totalAmount <= 0}
        />
      </form>
    </div>
  );
};

export default BookingPage;