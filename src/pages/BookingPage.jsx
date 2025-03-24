import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { PaystackButton } from "react-paystack";
import "../assets/styles/BookingPage.css";

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const params = new URLSearchParams(location.search);
  const selectedRooms = params.get("rooms") ? JSON.parse(decodeURIComponent(params.get("rooms"))) : [];
  const checkInParam = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : "";
  const checkOutParam = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : "";
  const roomCategory = params.get("roomCategory") || "regular";

  const totalAmount = selectedRooms.reduce(
    (acc, room) => acc + Number(room.price || 0),
    0
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    numberOfGuests: "",
    checkIn: "",
    checkOut: "",
    airportPickup: "No",
    paymentOption: "Full Payment",
    specialRequests: "",
  });

  useEffect(() => {
    if (auth.currentUser?.email) {
      setFormData((prev) => ({ ...prev, email: auth.currentUser.email }));
    }
  }, [auth.currentUser]);

  useEffect(() => {
    if (checkInParam && checkOutParam) {
      setFormData((prev) => ({
        ...prev,
        checkIn: checkInParam,
        checkOut: checkOutParam,
      }));
    }
  }, [checkInParam, checkOutParam]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const completeBooking = async () => {
    try {
      for (const room of selectedRooms) {
        let roomQuery;

        if (roomCategory === "conference") {
          if (!room.type) {
            alert("Room type is missing. Cannot proceed.");
            continue;
          }
          roomQuery = query(
            collection(db, "conference_rooms"),
            where("type", "==", room.type),
            where("availability", "==", true)
          );
        } else {
          if (!room.t_room) {
            alert("Room type is missing. Cannot proceed.");
            continue;
          }
          roomQuery = query(
            collection(db, "rooms"),
            where("t_room", "==", room.t_room),
            where("availability", "==", true)
          );
        }

        const roomSnapshot = await getDocs(roomQuery);
        if (roomSnapshot.empty) {
          alert(`No available rooms of type: ${roomCategory === "conference" ? room.type : room.t_room}`);
          continue;
        }

        const assignedRoom = roomSnapshot.docs[0];
        const roomId = assignedRoom.id;
        const roomData = assignedRoom.data();

        const roomRef = doc(db, roomCategory === "conference" ? "conference_rooms" : "rooms", roomId);
        const formatDateWithNoon = (dateStr) => {
          const date = new Date(dateStr);
          date.setHours(12, 0, 0, 0);
          return date.toISOString();
        };

        await updateDoc(roomRef, {
          bookings: [
            ...(roomData.bookings || []),
            {
              startDate: formatDateWithNoon(formData.checkIn),
              endDate: formatDateWithNoon(formData.checkOut),
            },
          ],
        });

        const bookingsCollection = roomCategory === "conference" ? "conferenceBookings" : "bookings";

        const newBooking = {
          userId: auth.currentUser?.uid || "guest",
          roomType: roomCategory === "conference" ? room.type : room.t_room,
          roomName: room.name || "Unnamed",
          roomNumber: roomId, 
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
          roomCategory,
          status: "Confirmed",
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, bookingsCollection), newBooking);

        // ✅ Redirect to confirmation page
        navigate("/booking-confirmation", { state: { booking: newBooking } });
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed. Please try again. " + error.message);
    }
  };

  const config = {
    reference: new Date().getTime().toString(),
    email: formData.email,
    amount: totalAmount * 100,
    publicKey: "pk_test_8b02dfc94aa31f78f2f3214086e81616365346c5",
    currency: "GHS",
  };

  const onSuccess = async (reference) => {
    console.log("Payment successful.");
    try {
      const transactionData = {
        type: "income",
        amount: totalAmount,
        category: "Room Booking",
        description: `Payment for ${roomCategory} room(s): ${selectedRooms.map(r => r.name || r.t_room).join(", ")}`,
        date: new Date(),
        reference: reference.reference,
        createdBy: auth.currentUser?.uid || "guest",
      };

      await addDoc(collection(db, "transactions"), transactionData);

      await completeBooking();
    } catch (error) {
      console.error("Error recording payment:", error.message);
    }
  };

  const onClose = () => {
    alert("Payment was cancelled.");
  };

  return (
    <div className="booking-container">
      <h2>Hotel Booking</h2>
      <p>Experience something new every moment.</p>

      <div className="booking-summary">
        <h3>Booking Details</h3>
        <p><strong>Check-In:</strong> {new Date(checkInParam).toLocaleDateString()}</p>
  <p><strong>Check-Out:</strong> {new Date(checkOutParam).toLocaleDateString()}</p>


        <div className="selected-rooms-dropdown">
          <label><strong>Selected Rooms</strong></label>
          <select>
            {selectedRooms.map((room) => (
              <option key={room.id}>
                {room.name || room.t_room} - GHS {room.price}
              </option>
            ))}
          </select>
        </div>

        <p className="total-amount">
          <strong>Total Price:</strong> GHS {totalAmount.toFixed(2)}
        </p>
      </div>

      <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
        <div><label>First Name</label><input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} /></div>
        <div><label>Last Name</label><input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} /></div>
        <div><label>Email</label><input type="email" name="email" required value={formData.email} onChange={handleChange} /></div>
        <div><label>Phone</label><input type="tel" name="phone" required value={formData.phone} onChange={handleChange} /></div>
        <div><label>Number of Guests</label><input type="number" name="numberOfGuests" required value={formData.numberOfGuests} onChange={handleChange} /></div>
        <div>
          <label>Airport Pickup</label>
          <select name="airportPickup" value={formData.airportPickup} onChange={handleChange}>
            <option value="No">No</option><option value="Yes">Yes</option>
          </select>
        </div>
        <div>
          <label>Payment Option</label>
          <select name="paymentOption" value={formData.paymentOption} onChange={handleChange}>
            <option>Full Payment</option><option>Deposit for Reservation</option>
          </select>
        </div>
        <div>
          <label>Special Requests</label>
          <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} />
        </div>

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
