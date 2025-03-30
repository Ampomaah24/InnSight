import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";
import {
  collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc
} from "firebase/firestore";
import { PaystackConsumer } from "react-paystack";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../assets/styles/BookingPage.css";

const getRoomCapacity = (type) => {
  switch ((type || "").toLowerCase()) {
    case "single bed": return 1;
    case "double bed": return 2;
    case "twin bed": return 4;
    default: return 1;
  }
};

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const params = new URLSearchParams(location.search);
  const selectedRooms = params.get("rooms") ? JSON.parse(decodeURIComponent(params.get("rooms"))) : [];
  const checkInParam = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : "";
  const checkOutParam = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : "";
  const roomCategory = params.get("roomCategory") || "regular";
  const discount = parseFloat(params.get("discount")) || 0;

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    airportPickup: "No", pickupDate: "", pickupTime: "", flightNumber: "",
    paymentOption: "Full Payment", specialRequests: "",
    checkIn: checkInParam, checkOut: checkOutParam,
    alsoBookingStay: "No"
  });

  const [phoneError, setPhoneError] = useState(false);

  const [guestCounts, setGuestCounts] = useState(() => {
    const initial = {};
    selectedRooms.forEach((room, idx) => { initial[room.id || idx] = 1; });
    return initial;
  });

  const checkInDate = new Date(formData.checkIn);
  const checkOutDate = new Date(formData.checkOut);
  const numberOfDays = (checkOutDate - checkInDate) / (1000 * 3600 * 24) || 1;

  const totalAmount = selectedRooms.reduce((acc, room) => {
    const originalPrice = Number(room.price || 0);
    const discountedPrice = discount ? originalPrice - (originalPrice * discount / 100) : originalPrice;
    return acc + (discountedPrice * numberOfDays);
  }, 0);

  const paymentAmount = formData.paymentOption === "Deposit for Reservation"
    ? totalAmount * 0.2
    : totalAmount;

  const totalGuests = Object.values(guestCounts).reduce((sum, val) => sum + Number(val), 0);
  const maxGuestsAllowed = selectedRooms.reduce((sum, room) => sum + getRoomCapacity(room.t_room || ""), 0);

  useEffect(() => {
    if (auth.currentUser?.email) {
      setFormData((prev) => ({ ...prev, email: auth.currentUser.email }));
    }
  }, [auth.currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
    setPhoneError(!isValidPhoneNumber(value || ""));
  };

  const handleGuestChange = (roomId, value) => {
    const isConference = roomCategory === "conference";
    const roomType = selectedRooms.find(r => (r.id || r.t_room) === roomId)?.t_room || "";
    const max = getRoomCapacity(roomType);
    const guests = isConference ? Number(value) : Math.min(Number(value), max);
    setGuestCounts({ ...guestCounts, [roomId]: guests });
  };

  const isAirportPickupValid =
    formData.airportPickup === "No" ||
    formData.alsoBookingStay === "Yes" ||
    (formData.pickupDate && formData.pickupTime && formData.flightNumber);

  const isFormValid =
    Object.values({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
    }).every(val => val && val.trim() !== "") &&
    (roomCategory === "conference" || totalGuests <= maxGuestsAllowed) &&
    isValidPhoneNumber(formData.phone || "") &&
    isAirportPickupValid;

  const completeBooking = async () => {
    try {
      for (const room of selectedRooms) {
        const roomId = room.id || room.t_room;
        const guestCount = Number(guestCounts[roomId]) || 1;

        const roomQuery = query(
          collection(db, roomCategory === "conference" ? "conference_rooms" : "rooms"),
          where(roomCategory === "conference" ? "type" : "t_room", "==", roomCategory === "conference" ? room.type : room.t_room),
          where("availability", "==", true)
        );

        const roomSnapshot = await getDocs(roomQuery);
        if (roomSnapshot.empty) {
          alert(`No available rooms of type: ${room.t_room || room.type}`);
          continue;
        }

        const assignedRoom = roomSnapshot.docs[0];
        const dbRoomId = assignedRoom.id;
        const roomData = assignedRoom.data();
        const roomRef = doc(db, roomCategory === "conference" ? "conference_rooms" : "rooms", dbRoomId);

        const formatDateWithNoon = (dateStr) => {
          const date = new Date(dateStr);
          date.setHours(12, 0, 0, 0);
          return date.toISOString();
        };

        await updateDoc(roomRef, {
          bookings: [...(roomData.bookings || []), {
            checkIn: formatDateWithNoon(formData.checkIn),
            checkOut: formatDateWithNoon(formData.checkOut),
          }]
        });

        await addDoc(collection(db, roomCategory === "conference" ? "conferenceBookings" : "bookings"), {
          userId: auth.currentUser?.uid || "guest",
          roomType: room.t_room || room.type,
          roomName: room.name || "Unnamed",
          roomNumber: dbRoomId,
          price: Number(room.price || 0) * numberOfDays,
          numberOfGuests: guestCount,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          airportPickup: formData.airportPickup,
          pickupDetails: (formData.airportPickup === "Yes" && formData.alsoBookingStay === "No") ? {
            pickupDate: formData.pickupDate,
            pickupTime: formData.pickupTime,
            flightNumber: formData.flightNumber,
            airportLocation: "Kotoka International Airport"
          } : null,
          paymentOption: formData.paymentOption,
          specialRequests: formData.specialRequests,
          roomCategory,
          status: "Confirmed",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      alert("Booking failed: " + err.message);
    }
  };

  const config = {
    reference: new Date().getTime().toString(),
    email: formData.email,
    amount: Math.round(paymentAmount * 100),
    publicKey: "pk_test_8b02dfc94aa31f78f2f3214086e81616365346c5",
    currency: "GHS",
  };

  const onSuccess = async (reference) => {
    await addDoc(collection(db, "transactions"), {
      type: "income",
      amount: paymentAmount,
      category: "Room Booking",
      description: `Payment for ${selectedRooms.map(r => r.name || r.t_room).join(", ")}`,
      date: new Date(),
      reference: reference.reference,
      createdBy: auth.currentUser?.uid || "guest",
      paymentOption: formData.paymentOption,
    });

    await completeBooking();

    if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
      const query = new URLSearchParams({
        fromConference: "true",
        discount: "20",
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
      }).toString();
      navigate(`/room-booking?${query}`);
    } else {
      navigate("/booking-confirmation", { state: { totalGuests } });
    }
  };

  return (
    <div className="booking-page-wrapper">
      <div className="booking-illustration">
        <img src="src/assets/images/IMG_0123.JPG" alt="Booking" />
      </div>
      <div className="booking-container">
        <h2>Book Your Room</h2>
        <p>Please complete the form to confirm your stay.</p>

        <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
          {/* Basic Info */}
          <div><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
          <div><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
          <div><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
          <div>
            <label>Phone</label>
            <PhoneInput
              international
              defaultCountry="GH"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={phoneError ? "error" : ""}
            />
            {phoneError && <small style={{ color: "red" }}>Please enter a valid international phone number</small>}
          </div>

          {/* Guest Count */}
          {selectedRooms.map((room, idx) => {
            const roomId = room.id || idx;
            const isConference = roomCategory === "conference";
            const max = getRoomCapacity(room.t_room || "");
            return (
              <div className="guest-input-row full-width" key={roomId}>
                <label>
                  {isConference
                    ? `Number of Attendees for ${room.name || room.type}`
                    : `Guests for ${room.t_room || room.name} (Max ${max})`}
                </label>
                <input
                  type="number"
                  min="1"
                  {...(!isConference && { max })}
                  value={guestCounts[roomId]}
                  onChange={(e) => handleGuestChange(roomId, e.target.value)}
                />
              </div>
            );
          })}

          {/* Conference Stay Option */}
          {roomCategory === "conference" && (
            <div>
              <label>Also booking rooms to stay?</label>
              <select
                name="alsoBookingStay"
                value={formData.alsoBookingStay}
                onChange={handleChange}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          )}

          {/* Airport Pickup */}
          {formData.alsoBookingStay === "No" && (
            <>
              <div><label>Airport Pickup</label>
                <select name="airportPickup" value={formData.airportPickup} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {formData.airportPickup === "Yes" && (
                <>
                  <div className="pickup-row full-width">
                    <div className="half-width">
                      <label>Pickup Date</label>
                      <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} required />
                    </div>
                    <div className="half-width">
                      <label>Pickup Time</label>
                      <input type="time" name="pickupTime" value={formData.pickupTime} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="full-width">
                    <label>Flight Number</label>
                    <input type="text" name="flightNumber" value={formData.flightNumber} onChange={handleChange} placeholder="e.g., KQ 507" required />
                  </div>
                </>
              )}
            </>
          )}

          {/* Payment and Requests */}
          <div className="full-width">
            <label>Payment Option</label>
            <select name="paymentOption" value={formData.paymentOption} onChange={handleChange}>
              <option>Full Payment</option>
              <option>Deposit for Reservation</option>
            </select>
          </div>

          <div className="full-width">
            <label>Special Requests</label>
            <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} />
          </div>

          {/* Summary */}
          <div className="full-width booking-info">
            <p><strong>Check-In:</strong> {new Date(formData.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-Out:</strong> {new Date(formData.checkOut).toLocaleDateString()}</p>
            <p><strong>Total:</strong> GHS {totalAmount.toFixed(2)}</p>
            <p><strong>Paying:</strong> GHS {paymentAmount.toFixed(2)}</p>
            {formData.paymentOption === "Deposit for Reservation" && (
              <small style={{ color: "orange" }}>20% deposit applied. Remaining due at check-in.</small>
            )}
            {discount > 0 && (
              <small style={{ color: "green" }}>
                {discount}% discount applied for booking for conference attendees
              </small>
            )}
          </div>

          {/* Pay Button */}
          <div className="full-width">
            <PaystackConsumer {...config} onSuccess={onSuccess} onClose={() => alert("Payment cancelled")}>
              {({ initializePayment }) => (
                <button type="button" className="confirm-booking" onClick={() => {
                  if (!isFormValid) {
                    alert("Please complete all fields correctly. Ensure phone number and pickup info (if applicable) are valid.");
                  } else {
                    initializePayment();
                  }
                }}>
                  Complete Booking
                </button>
              )}
            </PaystackConsumer>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
