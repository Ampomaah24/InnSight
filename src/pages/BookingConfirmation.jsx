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
  
  // Get booking info from context
  const { bookingData } = useBooking();
  
  // If no booking data in context, try to get from session sstorage
  const [booking, setBooking] = useState({});
  const [totalGuests, setTotalGuests] = useState(0);
  const [isDeposit, setIsDeposit] = useState(false);
  const [isConference, setIsConference] = useState(false);
  
  useEffect(() => {
    // First check if we have booking data in context
    if (bookingData) {
      const bookingDetails = bookingData.booking || bookingData;
      
      setIsConference(!!bookingData.totalAttendees || bookingDetails.numberOfAttendees > 0);
      setBooking(bookingDetails);
      setTotalGuests(bookingDetails.numberOfGuests || bookingData.totalAttendees || 0);
      setIsDeposit(bookingDetails.paymentOption === "Deposit for Reservation");
      console.log("Booking data from context:", bookingData);
    } else {
      const storedBooking = sessionStorage.getItem('bookingData');
      console.log("Stored booking data:", storedBooking);
      if (storedBooking) {
        const parsedBooking = JSON.parse(storedBooking);
        setBooking(parsedBooking);
        
        // Check if this is a conference booking
        setIsConference(!!parsedBooking.numberOfAttendees);
        setTotalGuests(parsedBooking.numberOfGuests || parsedBooking.numberOfAttendees || 0);
        setIsDeposit(parsedBooking.paymentOption === "Deposit for Reservation");
      } else {
        console.error("Missing booking information");
        setError("Missing booking information. Please try again.");
        setLoading(false);
        return;
      }
    }
    
    setLoading(false);
  }, [bookingData]);
  
  useEffect(() => {
    if (loading) return;
    
    if (!booking.email) {
      console.error("Missing email information");
      setError("Missing booking information. Please try again.");
      return;
    }
    
    // Store booking data in session storage for persistence
    sessionStorage.setItem('bookingData', JSON.stringify(booking));
    
    const templateParams = {
      guest_name: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'Guest',

      room_name: isConference ? 
        (booking.roomTypes || 'Conference Room') : 
        (booking.roomNames || 'Your room'),
      room_type: isConference ? 
        'Conference Booking' : 
        (booking.roomTypes || 'Standard'),
      check_in: booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'as scheduled',
      check_out: booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'as scheduled',
      guests: isConference ? 
        (booking.numberOfAttendees || totalGuests || 1) + ' attendees' : 
        (booking.numberOfGuests || totalGuests || 1) + ' guests',
      email: booking.email,
      to_email: booking.email, 
      amount_paid: booking.amount ? `GHS ${booking.amount.toFixed(2)}` : '',
      is_deposit: isDeposit ? 'Yes' : 'No',
      remainder_due: isDeposit && booking.remainderDue ? `GHS ${booking.remainderDue.toFixed(2)}` : 'None',
      booking_type: isConference ? 'Conference' : 'Room'
    };
    
    console.log("Sending email with params:", templateParams);
    
    emailjs
      .send(
        "service_pgx5uqi", // Service ID
        "template_fpzc7pe", // Template ID
        templateParams,
        "OQbDGwLva7RM5VxU5" // Public Key
      )
      .then(
        (result) => {
          console.log("✅ Email sent!", result.text);
          setEmailSent(true);
        },
        (error) => {
          console.error("❌ Email failed:", error.text);
          setEmailSent(false);
        }
      );
  }, [booking, totalGuests, isDeposit, loading, isConference]);
  
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
          
          {isConference ? (
            <>
              <p><strong>Conference Room:</strong> {booking.roomTypes || 'Conference Room'}</p>
              <p><strong>Attendees:</strong> {booking.numberOfAttendees || totalGuests || 1}</p>
            </>
          ) : (
            <>
              <p><strong>Room:</strong> {booking.roomNames || 'Standard Room'}</p>
              <p><strong>Guests:</strong> {booking.numberOfGuests || totalGuests || 1}</p>
            </>
          )}
          
          <p><strong>Check-in:</strong> {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'As scheduled'}</p>
          <p><strong>Check-out:</strong> {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'As scheduled'}</p>
          
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