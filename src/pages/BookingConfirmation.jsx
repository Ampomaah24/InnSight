import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import "../assets/styles/BookingConfirmation.css";

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Get booking info from location state, or fall back to sensible defaults
  const booking = location.state?.booking || {};
  const totalGuests = location.state?.totalGuests || 0;
  
  useEffect(() => {
    // If we don't have an email address, we can't send a confirmation
    if (!booking.email) {
      setLoading(false);
      return;
    }
    
    const templateParams = {
      guest_name: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Guest',
      room_name: booking.roomName || 'Your room',
      room_type: booking.roomType || 'Standard',
      check_in: booking.checkIn || 'as scheduled',
      check_out: booking.checkOut || 'as scheduled',
      guests: booking.numberOfGuests || totalGuests || 1,
      email: booking.email,
      to_email: booking.email, // this is the recipient
    };
    
    setLoading(true);
    
    emailjs
      .send(
        "service_pgx5uqi", // Your Service ID
        "template_fpzc7pe", // Your Template ID
        templateParams,
        "OQbDGwLva7RM5VxU5" // Your Public Key
      )
      .then(
        (result) => {
          console.log("✅ Email sent!", result.text);
          setEmailSent(true);
          setLoading(false);
        },
        (error) => {
          console.error("❌ Email failed:", error.text);
          setEmailSent(false);
          setLoading(false);
        }
      );
  }, [booking, totalGuests]);

  if (loading) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <div className="loading-spinner"></div>
          <p>Sending confirmation email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <h2>Booking Confirmed!</h2>
        <div className="confirmation-icon">✓</div>
        
        <p>
          Thank you for your booking. {emailSent && booking.email ? (
            <>A confirmation has been sent to <strong>{booking.email}</strong>.</>
          ) : (
            <>Your reservation is confirmed.</>
          )}
        </p>
        
        {booking.checkIn && booking.checkOut && (
          <div className="booking-details">
            <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</p>
            <p><strong>Guests:</strong> {booking.numberOfGuests || totalGuests || 1}</p>
          </div>
        )}
        
        <button onClick={() => navigate("/services")}>Back to Services</button>
        <button onClick={() => navigate("/")}>Home</button>
      </div>
    </div>
  );
};

export default BookingConfirmation;