import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import "../assets/styles/BookingConfirmation.css";
import { useBooking } from "../components/BookingContext";

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get booking info from context instead of location state
  const { bookingData } = useBooking();
  
  // If no booking data in context, try to get from session storage
  const [booking, setBooking] = useState({});
  const [totalGuests, setTotalGuests] = useState(0);
  const [isDeposit, setIsDeposit] = useState(false);
  
  useEffect(() => {
    // First check if we have booking data in context
    if (bookingData) {
      setBooking(bookingData);
      setTotalGuests(bookingData.numberOfGuests || 0);
      setIsDeposit(bookingData.paymentOption === "Deposit for Reservation");
      console.log("Booking data from context:", bookingData);
    } else {
      // Try to get booking data from session storage
      const storedBooking = sessionStorage.getItem('bookingData');
      console.log("Stored booking data:", storedBooking);
      if (storedBooking) {
        const parsedBooking = JSON.parse(storedBooking);
        setBooking(parsedBooking);
        setTotalGuests(parsedBooking.numberOfGuests || 0);
        setIsDeposit(parsedBooking.paymentOption === "Deposit for Reservation");
      } else {
        // No booking data found
        console.error("Missing booking information");
        setError("Missing booking information. Please try again.");
        setLoading(false);
        return;
      }
    }
  }, [bookingData]);
  
  useEffect(() => {
    // Check if we have booking data, if not don't proceed
    if (!booking.email || !booking.checkIn) {
      if (!loading) { // Only set error if initial loading is complete
        console.error("Missing booking information");
        setError("Missing booking information. Please try again.");
      }
      return;
    }
    
    // Store booking data in session storage for persistence
    sessionStorage.setItem('bookingData', JSON.stringify(booking));
    
    const templateParams = {
      guest_name: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Guest',
      room_name: booking.roomNames || 'Your room',
      room_type: booking.roomTypes || 'Standard',
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
  }, [booking, totalGuests, isDeposit, loading]);
  
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
          <p><strong>Room:</strong> {booking.roomNames || 'Standard Room'}</p>
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