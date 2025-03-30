import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import "../assets/styles/BookingConfirmation.css";

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking;

  useEffect(() => {
    if (booking && booking.email) {
      const templateParams = {
        guest_name: `${booking.firstName} ${booking.lastName}`,
        room_name: booking.roomName,
        room_type: booking.roomType,
        check_in: booking.checkIn,
        check_out: booking.checkOut,
        guests: booking.numberOfGuests,
        email: booking.email,
        to_email: booking.email, // this is the recipient
      };

      emailjs
        .send(
          "service_pgx5uqi",       // ✅ Your Service ID
          "template_fpzc7pe",      // ✅ Your Template ID
          templateParams,
          "OQbDGwLva7RM5VxU5"       // ✅ Your Public Key
        )
        .then(
          (result) => {
            console.log("✅ Email sent!", result.text);
          },
          (error) => {
            console.error("❌ Email failed:", error.text);
          }
        );
    }
  }, [booking]);

  return (
    <div className="confirmation-page">
      <h2>Booking Confirmed!</h2>
      <p>
        Thank you for your booking. A confirmation has been sent to{" "}
        <strong>{booking?.email}</strong>.
      </p>
      <button onClick={() => navigate("/services")}>Back</button>
    </div>
  );
};

export default BookingConfirmation;
