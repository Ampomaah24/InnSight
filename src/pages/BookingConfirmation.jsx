import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import "../assets/styles/BookingConfirmation.css";

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get booking info from location state, or fall back to sensible defaults
  const booking = location.state?.booking || {};
  const totalGuests = location.state?.totalGuests || 0;
  const isDeposit = location.state?.isDeposit || false;
  
  useEffect(() => {
    // Check if we have booking data, if not redirect to home
    if (!booking.email || !booking.checkIn) {
      console.error("Missing booking information");
      setError("Missing booking information. Please try again.");
      setLoading(false);
      return;
    }
    
    const templateParams = {
      guest_name: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Guest',
      room_name: booking.roomName || 'Your room',
      room_type: booking.roomType || 'Standard',
      check_in: booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'as scheduled',
      check_out: booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'as scheduled',
      guests: booking.numberOfGuests || totalGuests || 1,
      email: booking.email,
      to_email: booking.email, // this is the recipient
      amount_paid: booking.amount ? `GHS ${booking.amount.toFixed(2)}` : '',
      is_deposit: isDeposit ? 'Yes' : 'No',
      remainder_due: isDeposit && booking.remainderDue ? `GHS ${booking.remainderDue.toFixed(2)}` : 'None'
    };
    
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
          // Don't show error to user, just log it - they still have their booking
        }
      );
  }, [booking, totalGuests, isDeposit]);
  
  if (loading) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <div className="loading-spinner"></div>
          <p>Finalizing your booking and sending confirmation email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/")}>Return to Home</button>
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
        
        <div className="booking-details">
          <p><strong>Name:</strong> {booking.firstName} {booking.lastName}</p>
          <p><strong>Room:</strong> {booking.roomName || 'Standard Room'}</p>
          <p><strong>Check-in:</strong> {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'As scheduled'}</p>
          <p><strong>Check-out:</strong> {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'As scheduled'}</p>
          <p><strong>Guests:</strong> {booking.numberOfGuests || totalGuests || 1}</p>
          
          {/* Payment information */}
          <p><strong>Amount Paid:</strong> GHS {booking.amount ? booking.amount.toFixed(2) : '0.00'}</p>
          {isDeposit && booking.remainderDue > 0 && (
            <p className="deposit-info"><strong>Remaining Balance:</strong> GHS {booking.remainderDue.toFixed(2)} (due at check-in)</p>
          )}
          
          {/* Additional services */}
          {booking.airportPickup && (
            <p><strong>Airport Pickup:</strong> Included</p>
          )}
          
          {booking.specialRequests && (
            <p><strong>Special Requests:</strong> {booking.specialRequests}</p>
          )}
        </div>
        
        <div className="action-buttons">
          <button onClick={() => navigate("/services")}>Other Services</button>
          <button onClick={() => navigate("/")}>Return Home</button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;