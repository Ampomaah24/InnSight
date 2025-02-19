import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase"; 
import { collection, doc, addDoc, updateDoc, arrayUnion } from "firebase/firestore";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

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
    t_room: "Standard Room",
    airportPickup: "No",
    paymentOption: "Full Payment",
    specialRequests: "",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("Please log in to book a room.");
      navigate("/login");
      return;
    }

    try {
      // ✅ Save booking with `t_room`
      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        roomId,
        checkIn,
        checkOut,
        t_room: formData.t_room, // ✅ Ensure t_room is stored
        ...formData,
        createdAt: new Date().toISOString(),
      });

      console.log("Booking saved:", bookingRef.id);

      // ✅ Update room's "bookings" field in Firestore
      const roomRef = doc(db, "rooms", roomId);
      await updateDoc(roomRef, {
        bookings: arrayUnion({
          checkIn,
          checkOut,
          userId: auth.currentUser.uid,
        }),
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
      <form onSubmit={handleSubmit}>
        <label>First Name</label>
        <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} />
        <label>Last Name</label>
        <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} />
        <button type="submit">Complete Booking</button>
      </form>
    </div>
  );
};

export default BookingPage;
