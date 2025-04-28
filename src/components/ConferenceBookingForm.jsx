import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../config/firebase";
import {
  collection, addDoc, serverTimestamp, query, where, getDocs, 
  runTransaction, doc, getDoc
} from "firebase/firestore";
import { PaystackConsumer } from "react-paystack";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import NavMenu from "../components/NavMenu";
import { useBooking } from "../components/BookingContext"; // Import the booking context
import "../assets/styles/BookingPage.css";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const ConferenceBookingForm = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { bookingData, setBookingData } = useBooking(); // Use booking context
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [discounts, setDiscounts] = useState({
    conferenceAttendeeDiscount: 0
  });

  // Check if we have the necessary data in the context
  useEffect(() => {
    if (!bookingData || !bookingData.selectedRooms || bookingData.selectedRooms.length === 0) {
      setError("No conference rooms selected. Please select a room first.");
      setLoading(false);
    } else if (!bookingData.startDate || !bookingData.endDate) {
      setError("Missing date information. Please select dates first.");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [bookingData]);

  // Extract data from context instead of URL
  const selectedRooms = bookingData?.selectedRooms || [];
  const checkInParam = bookingData?.startDate || "";
  const checkOutParam = bookingData?.endDate || "";
  const discountFromContext = bookingData?.discount || 0;
  const discountType = bookingData?.discountType || "";

  // Simplified form data for conference booking
  const [formData, setFormData] = useState({
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "",
    idType: "",
    idNumber: "",
    numberOfAttendees: 1, // New field for simple attendee count
    specialRequests: "",
    checkIn: checkInParam, 
    checkOut: checkOutParam,
    alsoBookingStay: "No" // Whether they want to book accommodation too
  });

  const [phoneError, setPhoneError] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email }));
      }
    });
    
    return () => unsubscribe();
  }, [auth]);

  // Generate CSRF token
  useEffect(() => {
    const generateToken = () => {
      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    setCsrfToken(generateToken());
  }, []);

  // Fetch discounts if needed
  useEffect(() => {
    if (discountFromContext > 0) {
      setDiscounts(prev => ({ 
        ...prev, 
        conferenceAttendeeDiscount: discountFromContext 
      }));
      setLoading(false);
      return;
    }

    if (!isLoggedIn) {
      console.log("User not logged in, skipping discount fetch");
      setLoading(false);
      return;
    }

    const fetchDiscounts = async () => {
      try {
        const discountsRef = doc(db, "settings", "discounts");
        const docSnap = await getDoc(discountsRef);
        
        if (docSnap.exists()) {
          const discountData = docSnap.data();
          setDiscounts({
            conferenceAttendeeDiscount: discountData.conferenceAttendeeDiscount || 0,
            longStayDiscount: discountData.longStayDiscount || 0,
            longStayMinNights: discountData.longStayMinNights || 7
          });
        } else {
          console.warn("Discounts document doesn't exist");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
        setError("Failed to load discount information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, [discountFromContext, isLoggedIn]);

  // Fix scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Calculate dates and total amount
  const checkInDate = new Date(formData.checkIn);
  const checkOutDate = new Date(formData.checkOut);
  const numberOfDays = Math.max(1, (checkOutDate - checkInDate) / (1000 * 3600 * 24));

  // Apply any applicable discount
  const applicableDiscount = discountFromContext > 0 ? discountFromContext : (isLoggedIn ? discounts.conferenceAttendeeDiscount : 0);
  const actualDiscountName = discountType || (applicableDiscount > 0 ? 'Conference Attendee' : '');

  // Calculate total amount
  const totalAmount = selectedRooms.reduce((acc, room) => {
    const originalPrice = Number(room.price || 0);
    const discountedPrice = applicableDiscount ? originalPrice - (originalPrice * applicableDiscount / 100) : originalPrice;
    return acc + (discountedPrice * numberOfDays);
  }, 0);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
  };
  
  const handlePhoneChange = (value) => {
    const isValid = isValidPhoneNumber(value || "");
    setFormData((prev) => ({ ...prev, phone: value }));
    setPhoneError(!isValid);
  };

  // Form validation
  const isFormValid =
    Object.values({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      idType: formData.idType,
      idNumber: formData.idNumber,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
    }).every(val => val && val.trim() !== "") &&
    !phoneError &&
    formData.numberOfAttendees > 0;

  // Complete booking process
 // In your ConferenceBookingForm.jsx, update the completeBooking function:

const completeBooking = async () => {
  try {
    const bookingPromises = [];
    
    // Process each conference room
    for (const room of selectedRooms) {
      const checkInFormatted = new Date(formData.checkIn);
      checkInFormatted.setHours(12, 0, 0, 0);
      
      const checkOutFormatted = new Date(formData.checkOut);
      checkOutFormatted.setHours(12, 0, 0, 0);

      // First, try to find the exact room type
      let roomQuery = query(
        collection(db, "conference_rooms"),
        where("availability", "==", true),
        where("type", "==", room.type)
      );

      let roomSnapshot = await getDocs(roomQuery);
      
      // If no rooms of exact type, show a specific error
      if (roomSnapshot.empty) {
        throw new Error(`No conference rooms of type "${room.type}" are available.`);
      }

      // Find a room without date conflicts
      let roomBooked = false;
      
      for (const roomDoc of roomSnapshot.docs) {
        if (roomBooked) break;
        
        const roomRef = roomDoc.ref;
        
        try {
          // Use transaction to check and update room availability
          await runTransaction(db, async (transaction) => {
            const roomData = (await transaction.get(roomRef)).data();
            const existingBookings = roomData.bookings || [];
            
            // Check for overlaps with any existing bookings
            const hasOverlap = existingBookings.some(booking => {
              // Support both naming conventions (checkIn/checkOut)
              const existingCheckIn = new Date(booking.checkIn);
              const existingCheckOut = new Date(booking.checkOut);
              
              // Check if there's an overlap between the requested dates and existing booking
              return (checkInFormatted < existingCheckOut && checkOutFormatted > existingCheckIn);
            });
            
            if (hasOverlap) {
              throw new Error(`Room ${roomData.name || roomRef.id} is already booked for these dates.`);
            }
            
            // Update room with new booking
            transaction.update(roomRef, {
              bookings: [...existingBookings, {
                checkIn: checkInFormatted.toISOString(),
                checkOut: checkOutFormatted.toISOString()
              }]
            });
          });
          
          // If transaction successful, room is available - proceed with booking creation
          roomBooked = true;
          
          // Calculate prices with discount
          const originalPrice = Number(room.price || 0) * numberOfDays * formData.numberOfAttendees;
          const discountedPrice = applicableDiscount ? 
            originalPrice - (originalPrice * applicableDiscount / 100) : 
            originalPrice;
          
          // Create booking document
          const newBooking = {
            // Main booker info
            userId: auth.currentUser?.uid || "guest",
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            idType: formData.idType,
            idNumber: formData.idNumber,
            
            // Room details
            roomType: room.type,
            roomName: room.name || "Conference Room",
            roomNumber: roomRef.id,
            roomCategory: "conference",
            
            // Conference specifics
            numberOfAttendees: formData.numberOfAttendees,
            
            // Booking dates
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            
            // Payment info
            originalPrice: originalPrice,
            discountApplied: applicableDiscount,
            discountType: actualDiscountName,
            finalPrice: discountedPrice,
            amountPaid: discountedPrice, // Always full payment for conference
            remainderDue: 0,
            paymentStatus: "Paid in Full",
            paymentOption: "Full Payment",
            
            // Follow-up info
            alsoBookingStay: formData.alsoBookingStay,
            
            // Security
            csrfToken: csrfToken,
            
            // Additional info
            specialRequests: formData.specialRequests,
            status: "Confirmed",
            createdAt: serverTimestamp(),
            
            // Group booking info
            bookingGroupId: csrfToken,
            totalRoomsInBooking: selectedRooms.length
          };
          
          // Create the booking document
          const bookingRef = collection(db, "conferenceBookings");
          bookingPromises.push(addDoc(bookingRef, newBooking));
          
          break; // Found and booked a room, move to next room in selection
          
        } catch (error) {
          // This specific room was unavailable - try the next one
          console.log(`Room ${roomRef.id} unavailable:`, error.message);
          continue;
        }
      }
      
      // If we couldn't book any room, throw a specific error
      if (!roomBooked) {
        throw new Error(`All conference rooms of type "${room.type}" are already booked for these dates.`);
      }
    }
    
    // Wait for all booking documents to be created
    await Promise.all(bookingPromises);
    return true;
  } catch (err) {
    console.error("Conference booking failed:", err);
    throw err;
  }
};

  // Paystack configuration
  const config = {
    reference: `${csrfToken}_${new Date().getTime().toString()}`,
    email: formData.email,
    amount: Math.round(totalAmount * 100), // Always full payment for conference
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: "GHS",
    metadata: {
      userId: auth.currentUser?.uid || "guest",
      bookingType: "conference",
      csrfToken: csrfToken,
      rooms: selectedRooms.map(room => room.id || room.type).join(','),
      checkInDate: formData.checkIn,
      checkOutDate: formData.checkOut,
      totalRooms: selectedRooms.length,
      totalAttendees: formData.numberOfAttendees
    }
  };

  // Handle successful payment
  const onSuccess = async (reference) => {
    try {
      setProcessingPayment(true);
            
      // Add transaction record
      await addDoc(collection(db, "transactions"), {
        type: "income",
        amount: totalAmount,
        category: "Conference Booking",
        description: `Conference booking for ${formData.numberOfAttendees} attendees: ${selectedRooms.map(r => r.type).join(", ")}`,
        date: new Date(),
        reference: reference.reference,
        createdBy: auth.currentUser?.uid || "guest",
        isGuest: !auth.currentUser,
        userDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        paymentOption: "Full Payment",
        isDeposit: false,
        totalAmount: totalAmount,
        remainderDue: 0,
        csrfToken: csrfToken,
        totalRooms: selectedRooms.length,
        totalAttendees: formData.numberOfAttendees
      });
      
      // Complete booking with Firestore transaction
      await completeBooking();
            
      // Prepare booking object for confirmation page or redirect to room booking
      if (formData.alsoBookingStay === "Yes") {
        // Update booking context for room booking
        setBookingData({
          ...bookingData,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          fromConference: true,
          discount: applicableDiscount,
          discountType: "Conference Attendee",
          csrfToken: csrfToken
        });
        
        navigate("/room-booking");
        return;
      }
      
      // For normal flow, navigate to confirmation page
      const bookingDetails = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        roomTypes: selectedRooms.map(r => r.type).join(", "),
        numberOfAttendees: formData.numberOfAttendees,
        numberOfRooms: selectedRooms.length,
        paymentOption: "Full Payment",
        amount: totalAmount,
        totalAmount: totalAmount,
        remainderDue: 0,
        specialRequests: formData.specialRequests,
        bookingReference: reference.reference,
        bookingGroupId: csrfToken
      };
      
      // Update booking context with confirmation details
      setBookingData({
        ...bookingData,
        booking: bookingDetails,
        totalAttendees: formData.numberOfAttendees,
        totalRooms: selectedRooms.length,
        isDeposit: false,
        csrfToken
      });
      
      navigate("/booking-confirmation");
      
    } catch (error) {
      console.error("Error in payment processing:", error);
      setError(`Payment processing error: ${error.message}`);
      setProcessingPayment(false);
    }
  };

  // Function to go to login page
  const goToLogin = () => {
    // Save current state to context before redirecting
    setBookingData({
      ...bookingData,
      returnPath: "/conference-book"
    });
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="booking-page">
        <div className="loading">
          
          <p>Loading conference booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-page">
        <div className="error">
          <h3 className="error__title">Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/conference-booking')}
            className="button button--primary"
          >
            Back to Conference Selection
          </button>
        </div>
      </div>
    );
  }

  if (selectedRooms.length === 0) {
    return (
      <div className="booking-page">
        <div className="error">
          <h3 className="error__title">No Conference Rooms Selected</h3>
          <p>Please select conference rooms before proceeding to booking.</p>
          <button 
            onClick={() => navigate('/conference-booking')}
            className="button button--primary"
          >
            Go to Conference Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* NavMenu in top left */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="booking-page">
        <div className="booking-page__wrapper">
          <div className="booking-page__illustration">
            <img src="src/assets/images/IMG_0123.JPG" alt="Conference Booking" />
          </div>
          <div className="booking-page__container">
            <h2 className="booking-page__title">Book Your Conference</h2>
            <p className="booking-page__subtitle">Please complete the form to confirm your conference booking.</p>

            {!isLoggedIn && (
              <div className="login-prompt">
                <p className="login-prompt__text">Sign in to access exclusive discounts!</p>
                <button className="login-button" onClick={goToLogin}>Log In</button>
              </div>
            )}

            {processingPayment ? (
              <div className="loading">
                <div className="loading__spinner" />
                <p>Processing your payment. Please wait...</p>
              </div>
            ) : (
              <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
                {/* Hidden CSRF token field */}
                <input type="hidden" name="csrfToken" value={csrfToken} />
                
                {/* Basic Info - Conference Booker */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Booking Contact Information</h3>
                  <p>Please provide your details as the primary contact for this conference booking.</p>
                  
                  <div className="guest-form__grid">
                    <div className="form-field">
                      <label className="form-field__label form-field__required">First Name</label>
                      <input 
                        type="text" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        className="form-field__input"
                        required 
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field__label form-field__required">Last Name</label>
                      <input 
                        type="text" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleChange}
                        className="form-field__input"
                        required 
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field__label form-field__required">Email</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange}
                        className="form-field__input" 
                        required 
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field__label form-field__required">Phone</label>
                      <PhoneInput
                        international
                        defaultCountry="GH"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={`phone-input__container ${phoneError ? "phone-input__container--error" : ""}`}
                      />
                      {phoneError && (
                        <small className="phone-input__error">Please enter a valid international phone number</small>
                      )}
                    </div>
                    <div className="form-field">
                      <label className="form-field__label form-field__required">ID Type</label>
                      <select 
                        name="idType" 
                        value={formData.idType} 
                        onChange={handleChange}
                        className="form-field__select"
                        required
                      >
                        <option value="">Select ID Type</option>
                        <option value="passport">Passport</option>
                        <option value="national_id">National ID</option>
                        <option value="driver_license">Driver's License</option>
                        <option value="other">Other Government-issued ID</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-field__label form-field__required">ID Number</label>
                      <input 
                        type="text" 
                        name="idNumber" 
                        value={formData.idNumber} 
                        onChange={handleChange}
                        className="form-field__input"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Conference Information */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Conference Details</h3>
                  
                  <div className="guest-form__grid">
                    <div className="form-field">
                      <label className="form-field__label form-field__required">Number of Attendees</label>
                      <input 
                        type="number" 
                        name="numberOfAttendees" 
                        value={formData.numberOfAttendees} 
                        onChange={handleChange}
                        min="1"
                        className="form-field__input"
                        required 
                      />
                    </div>
                    
                    <div className="form-field">
                      <label className="form-field__label">Need Accommodation?</label>
                      <select 
                        name="alsoBookingStay" 
                        value={formData.alsoBookingStay} 
                        onChange={handleChange}
                        className="form-field__select"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes, I need to book rooms too</option>
                      </select>
                      <small className="form-field__help">You'll be redirected to room booking after completing this form</small>
                    </div>
                  </div>
                </div>

                <div className="booking-form__full-width">
                  <div className="form-field">
                    <label className="form-field__label">Special Requests</label>
                    <textarea 
                      name="specialRequests" 
                      value={formData.specialRequests} 
                      onChange={handleChange} 
                      placeholder="e.g., Special equipment needs, catering preferences, setup instructions" 
                      rows="3" 
                      maxLength="500"
                      className="form-field__textarea"
                    />
                  </div>
                </div>

                {/* Booking Summary */}
                <div className="booking-form__full-width">
                  <div className="booking-summary">
                    <h3 className="section__heading">Booking Summary</h3>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Check-In:</span>
                      <span className="booking-summary__value">{new Date(formData.checkIn).toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Check-Out:</span>
                      <span className="booking-summary__value">{new Date(formData.checkOut).toLocaleDateString(undefined, {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Duration:</span>
                      <span className="booking-summary__value">{numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Conference Rooms:</span>
                      <span className="booking-summary__value">{selectedRooms.length} ({selectedRooms.map(r => r.name).join(', ')})</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Attendees:</span>
                      <span className="booking-summary__value">{formData.numberOfAttendees}</span>
                    </div>
                    {applicableDiscount > 0 && (
                      <div className="booking-summary__item">
                        <span className="booking-summary__label">Discount:</span>
                        <span className="booking-summary__value">{applicableDiscount}% {actualDiscountName}</span>
                      </div>
                    )}
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Total Amount:</span>
                      <span className="booking-summary__value">GHS {totalAmount.toFixed(2)}</span>
                    </div>
                    
                    {applicableDiscount > 0 && (
                      <div className="booking-summary__discount">
                        {applicableDiscount}% {actualDiscountName} discount applied
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Button */}
                <div className="booking-form__full-width">
                  <PaystackConsumer {...config} onSuccess={onSuccess} onClose={() => setProcessingPayment(false)}>
                    {({ initializePayment }) => (
                      <button 
                        type="button" 
                        className="button button--primary button--large button--full-width" 
                        onClick={() => {
                          if (!isFormValid) {
                            alert("Please complete all required fields correctly.");
                          } else {
                            
                            initializePayment();
                          }
                        }}
                        disabled={processingPayment}
                      >
                        {processingPayment ? "Processing..." : "Complete Booking"}
                      </button>
                    )}
                  </PaystackConsumer>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConferenceBookingForm;