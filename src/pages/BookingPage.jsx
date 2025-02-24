import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Extract roomType from URL params
  const params = new URLSearchParams(location.search);
  const roomType = params.get("roomType");
  const checkInParam = params.get("checkIn");
  const checkOutParam = params.get("checkOut");

  const checkIn = checkInParam ? new Date(decodeURIComponent(checkInParam)) : "";
  const checkOut = checkOutParam ? new Date(decodeURIComponent(checkOutParam)) : "";

  // State to store fetched booking details
  const [roomPrice, setRoomPrice] = useState(null);
  const [loading, setLoading] = useState(true);


  // State for form data (Auto-filled fields: roomType, checkIn, checkOut, price)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: "",
    roomType: roomType || "", // Auto-filled
    checkIn: "", // Format to YYYY-MM-DD
    checkOut: "", // Format to YYYY-MM-DD
    airportPickup: "No", // Default
    paymentOption: "Full Payment", // Default
    specialRequests: "",
  });

  useEffect(() => {
    setFormData(prev => {
      const formattedCheckIn = checkIn ? new Date(checkIn).toISOString().split("T")[0] : "";
      const formattedCheckOut = checkOut ? new Date(checkOut).toISOString().split("T")[0] : "";
  
      // Only update state if the values are actually changing
      if (prev.checkIn !== formattedCheckIn || prev.checkOut !== formattedCheckOut) {
        return {
          ...prev,
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut,
        };
      }
      return prev;
    });
  }, [checkIn, checkOut]);
    

  useEffect(() => {
    if (!roomType) {
      console.error("❌ No room type provided in URL parameters.");
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        console.log("📡 Fetching booking details for room type:", roomType);

        // Check in `roomBookings`
        const roomBookingQuery = query(
          collection(db, "roomBookings"),
          where("roomType", "==", roomType)
        );

        const conferenceBookingQuery = query(
          collection(db, "conferenceBookings"),
          where("roomType", "==", roomType)
        );

        const roomBookingSnapshot = await getDocs(roomBookingQuery);
        const conferenceBookingSnapshot = await getDocs(conferenceBookingQuery);

        let booking = null;

        if (!roomBookingSnapshot.empty) {
          booking = roomBookingSnapshot.docs[0].data();
        } else if (!conferenceBookingSnapshot.empty) {
          booking = conferenceBookingSnapshot.docs[0].data();
        }

        if (!booking) {
          console.warn("⚠️ No booking found for this room type.");
          setLoading(false);
          return;
        }

        console.log("✅ Booking details found:", booking);

        // Auto-fill only check-in, check-out, and room type
        setFormData((prev) => ({
          ...prev,
          roomType: booking.roomType,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }));

        // Fetch room price based on room type
        await fetchRoomPrice(booking.roomType);

      } catch (error) {
        console.error("❌ Error fetching booking details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [roomType]);

  // Fetch room price based on room type
  const fetchRoomPrice = async (roomType) => {
    try {
      console.log("📡 Fetching price for room type:", roomType);

      const roomQuery = query(
        collection(db, "rooms"),
        where("t_room", "==", roomType)
      );

      const conferenceRoomQuery = query(
        collection(db, "conference_rooms"),
        where("type", "==", roomType)
      );

      const roomSnapshot = await getDocs(roomQuery);
      const conferenceSnapshot = await getDocs(conferenceRoomQuery);

      let price = null;

      if (!roomSnapshot.empty) {
        price = roomSnapshot.docs[0].data().price;
      } else if (!conferenceSnapshot.empty) {
        price = conferenceSnapshot.docs[0].data().price;
      }

      if (price !== null) {
        console.log("💰 Room price found:", price);
        setRoomPrice(price);
      } else {
        console.warn("⚠️ No price found for this room type.");
      }
    } catch (error) {
      console.error("❌ Error fetching room price:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("Please log in to book a room.");
      navigate("/login");
      return;
    }

    try {
      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
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

  if (loading) return <p>Loading booking details...</p>;

  return (
    <div className="booking-container">
      <h2>Hotel Booking</h2>
      <p>Experience something new every moment.</p>

      <form className="booking-form" onSubmit={handleSubmit}>
        {/* Check-In Date */}
        <div>
          <label>Check-In Date</label>
          <input type="date" name="checkIn" value={formData.checkIn} readOnly />
        </div>

        {/* Check-Out Date */}
        <div>
          <label>Check-Out Date</label>
          <input type="date" name="checkOut" value={formData.checkOut} readOnly />
        </div>

        {/* Room Type */}
        <div>
          <label>Room Type</label>
          <input type="text" name="roomType" value={formData.roomType} readOnly />
        </div>

        {/* Price */}
        <div>
          <label>Price</label>
          <input type="text" value={roomPrice ? `GHS ${roomPrice}` : "Not available"} readOnly />
        </div>

        {/* Number of Guests */}
        <div>
          <label>Number of Guests</label>
          <input type="number" name="numberOfGuests" required value={formData.numberOfGuests} onChange={handleChange} placeholder="e.g., 2" />
        </div>

        {/* Airport Pickup */}
        <div>
          <label>Airport Pickup</label>
          <select name="airportPickup" value={formData.airportPickup} onChange={handleChange}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
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
          <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} placeholder="Any special requests?"></textarea>
        </div>



        {/* Submit Button */}
        <button type="submit" className="confirm-booking">Complete Booking</button>
      </form>
    </div>
  );
};

export default BookingPage;
