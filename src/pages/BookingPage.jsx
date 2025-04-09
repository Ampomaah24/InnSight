import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../config/firebase";
import {
  collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc,
  runTransaction
} from "firebase/firestore";
import { PaystackConsumer } from "react-paystack";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import NavMenu from "../components/NavMenu";
import "../assets/styles/BookingPage.css";

// Use environment variable directly from .env file
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

// Phone input styles remain the same
const phoneInputStyles = `
  .PhoneInput {
    width: 100%;
    margin-bottom: 15px;
  }
  
  .PhoneInputInput {
    height: 40px;
    padding: 8px 12px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
  }
  input.error {
    border: 1px solid red;
    background-color: #fff0f0;
  }
  .PhoneInputCountry {
    margin-right: 10px;
    align-items: center;
  }
`;

const getRoomCapacity = (type) => {
  switch ((type || "").toLowerCase()) {
    case "single bed": return 1;
    case "double bed": return 2;
    case "twin bed": return 4;
    default: return 1;
  }
};

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state
  const [discounts, setDiscounts] = useState({
    conferenceAttendeeDiscount: 0,
    corporateDiscount: 0,
    groupDiscountMinRooms: 0,
    groupDiscountRate: 0,
    longStayDiscount: 0,
    longStayMinNights: 0,
  });

  // Safely parse URL parameters
  const getURLParams = () => {
    try {
      const params = new URLSearchParams(location.search);
      let selectedRooms = [];
      
      if (params.get("rooms")) {
        try {
          selectedRooms = JSON.parse(decodeURIComponent(params.get("rooms")));
          // Validate array structure
          if (!Array.isArray(selectedRooms)) {
            throw new Error("Invalid rooms format");
          }
        } catch (e) {
          console.error("Error parsing rooms parameter:", e);
          selectedRooms = [];
        }
      }
      
      return {
        selectedRooms,
        checkInParam: params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : "",
        checkOutParam: params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : "",
        roomCategory: params.get("roomCategory") || "regular",
        fromConference: params.get("fromConference") === "true",
        discountFromURL: parseFloat(params.get("discount")) || 0,
        discountType: params.get("discountType") ? decodeURIComponent(params.get("discountType")) : ""
      };
    } catch (error) {
      console.error("Error processing URL parameters:", error);
      setError("Invalid URL parameters. Please try again.");
      return {
        selectedRooms: [],
        checkInParam: "",
        checkOutParam: "",
        roomCategory: "regular",
        fromConference: false,
        discountFromURL: 0,
        discountType: ""
      };
    }
  };

  const {
    selectedRooms,
    checkInParam,
    checkOutParam,
    roomCategory,
    fromConference,
    discountFromURL,
    discountType
  } = getURLParams();

  const [formData, setFormData] = useState({
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "",
    airportPickup: "No", 
    pickupDate: "", 
    pickupTime: "", 
    flightNumber: "",
    paymentOption: "Full Payment", 
    specialRequests: "",
    checkIn: checkInParam, 
    checkOut: checkOutParam,
    alsoBookingStay: "No"
  });

  const [phoneError, setPhoneError] = useState(false);
  const [pickupDateError, setPickupDateError] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [guestCounts, setGuestCounts] = useState(() => {
    const initial = {};
    selectedRooms.forEach((room, idx) => { 
      initial[room.id || idx] = 1; 
    });
    return initial;
  });

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    
    return () => unsubscribe();
  }, [auth]);

  // Generate CSRF token
  useEffect(() => {
    // In a real app, this would be fetched from the server
    const generateToken = () => {
      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    setCsrfToken(generateToken());
  }, []);

  // Fetch discounts from Firestore if we don't have a discount from URL
  useEffect(() => {
    // If we already have discount from URL params, use it and skip Firestore fetch
    if (discountFromURL > 0) {
      setDiscounts(prev => ({ 
        ...prev, 
        conferenceAttendeeDiscount: fromConference ? discountFromURL : prev.conferenceAttendeeDiscount 
      }));
      setLoading(false);
      return;
    }

    // Skip discount fetch if user is not logged in
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
            corporateDiscount: discountData.corporateDiscount || 0,
            groupDiscountMinRooms: discountData.groupDiscountMinRooms || 0,
            groupDiscountRate: discountData.groupDiscountRate || 0,
            longStayDiscount: discountData.longStayDiscount || 0,
            longStayMinNights: discountData.longStayMinNights || 0,
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
  }, [discountFromURL, fromConference, isLoggedIn]); // Added isLoggedIn dependency

  // Fix scroll to top on page load and inject styles
  useEffect(() => {
    window.scrollTo(0, 0);

    // Inject phone input styles
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(phoneInputStyles));
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Auto-populate email if user is logged in
  useEffect(() => {
    if (auth.currentUser?.email) {
      setFormData((prev) => ({ ...prev, email: auth.currentUser.email }));
    }
  }, [auth.currentUser]);

  // Calculate dates and discounts
  const checkInDate = new Date(formData.checkIn);
  const checkOutDate = new Date(formData.checkOut);
  const numberOfDays = Math.max(1, (checkOutDate - checkInDate) / (1000 * 3600 * 24));

  // Determine which discount to apply
  const getApplicableDiscount = () => {
    // No discounts for non-logged in users (unless from URL)
    if (!isLoggedIn && discountFromURL === 0) {
      return 0;
    }
    
    // If we have a discount from URL, use it
    if (discountFromURL > 0) {
      return discountFromURL;
    }
    
    // Priority of discounts
    if (fromConference) {
      return discounts.conferenceAttendeeDiscount; // Conference attendee discount
    }
    
    // Long stay discount if staying longer than min nights
    if (numberOfDays >= discounts.longStayMinNights) {
      return discounts.longStayDiscount;
    }
    
    // Group discount if booking more than min rooms
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) {
      return discounts.groupDiscountRate;
    }
    
    return 0; // No discount applies
  };

  // Calculate the effective discount
  const applicableDiscount = getApplicableDiscount();
  const actualDiscountName = discountType || (
    fromConference ? 'Conference Attendee' : 
    numberOfDays >= discounts.longStayMinNights ? 'Long Stay' :
    selectedRooms.length >= discounts.groupDiscountMinRooms ? 'Group Booking' : ''
  );

  const totalAmount = selectedRooms.reduce((acc, room) => {
    const originalPrice = Number(room.price || 0);
    const discountedPrice = applicableDiscount ? originalPrice - (originalPrice * applicableDiscount / 100) : originalPrice;
    return acc + (discountedPrice * numberOfDays);
  }, 0);

  const paymentAmount = formData.paymentOption === "Deposit for Reservation"
    ? totalAmount * 0.2
    : totalAmount;

  const totalGuests = Object.values(guestCounts).reduce((sum, val) => sum + Number(val), 0);
  const maxGuestsAllowed = selectedRooms.reduce((sum, room) => sum + getRoomCapacity(room.t_room || ""), 0);

  // Function to go to login page
  const goToLogin = () => {
    // Save current selection in session storage if needed
    navigate('/login', { state: { returnPath: location.pathname + location.search } });
  };

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for airport pickup
    if (name === 'airportPickup') {
      if (value === 'Yes') {
        // When user selects "Yes" for airport pickup, automatically set pickup date to check-in date
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          pickupDate: prev.checkIn // Auto-set pickup date to match check-in date
        }));
        setPickupDateError(false); // Clear any previous errors
      } else {
        // Normal processing for "No" selection
        setFormData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
      }
      return;
    }
    
    // Special handling for check-in date changes - update pickup date if airport pickup is enabled
    if (name === 'checkIn' && formData.airportPickup === 'Yes') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        pickupDate: value // Keep pickup date in sync with check-in date
      }));
      setPickupDateError(false);
      return;
    }
    
    // Regular field updates with sanitization
    setFormData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
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

  // Form validation
  const isAirportPickupValid =
    formData.airportPickup === "No" ||
    formData.alsoBookingStay === "Yes" ||
    (formData.pickupDate && formData.pickupTime && formData.flightNumber && !pickupDateError);

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

  // Use Firestore transaction for booking to prevent race conditions
  const completeBooking = async () => {
    try {
      for (const room of selectedRooms) {
        const roomId = room.id || room.t_room;
        const guestCount = Number(guestCounts[roomId]) || 1;

        // Format dates for comparison
        const formatDateWithNoon = (dateStr) => {
          const date = new Date(dateStr);
          date.setHours(12, 0, 0, 0);
          return date.toISOString();
        };
        
        const checkInFormatted = formatDateWithNoon(formData.checkIn);
        const checkOutFormatted = formatDateWithNoon(formData.checkOut);

        // Query rooms by type
        const roomQuery = query(
          collection(db, roomCategory === "conference" ? "conference_rooms" : "rooms"),
          where(roomCategory === "conference" ? "type" : "t_room", "==", roomCategory === "conference" ? room.type : room.t_room),
          where("availability", "==", true)
        );

        const roomSnapshot = await getDocs(roomQuery);
        if (roomSnapshot.empty) {
          throw new Error(`No available rooms of type: ${room.t_room || room.type}`);
        }

        // Find a room without date conflicts using transactions
        let roomBooked = false;
        
        for (const roomDoc of roomSnapshot.docs) {
          if (roomBooked) break;
          
          const roomRef = roomDoc.ref;
          
          try {
            // Use transaction to prevent race conditions
            await runTransaction(db, async (transaction) => {
              const roomData = (await transaction.get(roomRef)).data();
              const existingBookings = roomData.bookings || [];
              
              // Check if there's any overlap with existing bookings
              const hasOverlap = existingBookings.some(booking => {
                const existingCheckIn = new Date(booking.checkIn);
                const existingCheckOut = new Date(booking.checkOut);
                const newCheckIn = new Date(checkInFormatted);
                const newCheckOut = new Date(checkOutFormatted);
                
                // Overlap occurs if:
                // (new check-in is before existing check-out) AND (new check-out is after existing check-in)
                return (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn);
              });
              
              if (hasOverlap) {
                // Skip this room and try the next one
                throw new Error("Room unavailable for these dates");
              }
              
              // Update room with new booking
              transaction.update(roomRef, {
                bookings: [...existingBookings, {
                  checkIn: checkInFormatted,
                  checkOut: checkOutFormatted,
                }]
              });
              
              // Calculate prices with discount
              const originalPrice = Number(room.price || 0) * numberOfDays;
              const discountedPrice = applicableDiscount ? 
                originalPrice - (originalPrice * applicableDiscount / 100) : 
                originalPrice;

              // Check if this is a deposit payment
              const isDeposit = formData.paymentOption === "Deposit for Reservation";
              const depositRate = 0.2; // 20% deposit
              const amountPaid = isDeposit ? discountedPrice * depositRate : discountedPrice;
              const remainderDue = isDeposit ? discountedPrice - amountPaid : 0;
              
              // Create booking document
              const bookingRef = collection(db, roomCategory === "conference" ? "conferenceBookings" : "bookings");
              const newBooking = {
                // User identification
                userId: auth.currentUser?.uid || "guest",
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                
                // Room details
                roomType: room.t_room || room.type,
                roomName: room.name || "Unnamed",
                roomNumber: roomRef.id,
                roomCategory,
                numberOfGuests: guestCount,
                
                // Booking dates
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                
                // Payment info
                originalPrice: originalPrice,
                discountApplied: applicableDiscount,
                discountType: actualDiscountName,
                finalPrice: discountedPrice,
                amountPaid: amountPaid,
                remainderDue: remainderDue,
                depositRate: isDeposit ? depositRate : null,
                paymentStatus: isDeposit ? "Partial Payment" : "Paid in Full",
                paymentOption: formData.paymentOption,
                
                // Additional services
                airportPickup: formData.airportPickup,
                pickupDetails: (formData.airportPickup === "Yes") ? {
                  pickupDate: formData.pickupDate,
                  pickupTime: formData.pickupTime,
                  flightNumber: formData.flightNumber,
                  airportLocation: "Kotoka International Airport"
                } : null,
                
                // For conference bookings
                alsoBookingStay: roomCategory === "conference" ? formData.alsoBookingStay : null,
                
                // Security and verification
                csrfToken: csrfToken,
                
                // Additional info
                specialRequests: formData.specialRequests,
                status: "Confirmed",
                createdAt: serverTimestamp(),
              };
              
              transaction.set(doc(bookingRef), newBooking);
              roomBooked = true;
            });
            
            // If we made it here, the transaction succeeded
            break;
            
          } catch (error) {
            // This specific room was unavailable - try the next one
            console.log(`Room ${roomRef.id} unavailable:`, error.message);
            continue;
          }
        }
        
        if (!roomBooked) {
          throw new Error(`No available rooms of type: ${room.t_room || room.type} for the selected dates.`);
        }
      }
      return true;
    } catch (err) {
      console.error("Booking failed:", err);
      throw err;
    }
  };

  // Paystack configuration
  const config = {
    reference: `${csrfToken}_${new Date().getTime().toString()}`,
    email: formData.email,
    amount: Math.round(paymentAmount * 100),
    publicKey: PAYSTACK_PUBLIC_KEY, // From environment variables
    currency: "GHS",
    metadata: {
      userId: auth.currentUser?.uid || "guest",
      bookingType: roomCategory,
      csrfToken: csrfToken,
      rooms: selectedRooms.map(room => room.id || room.t_room).join(','),
      checkInDate: formData.checkIn,
      checkOutDate: formData.checkOut
    }
  };

  // Handle successful payment
  const onSuccess = async (reference) => {
    try {
      // Immediately set processing state to show loading indicator
      setProcessingPayment(true);
      
      // Verify the payment reference with your backend before proceeding
      // This should be done server-side in a real app:
      // const paymentVerified = await verifyPaymentWithServer(reference.reference);
      // if (!paymentVerified) throw new Error("Payment verification failed");
      
      // Calculate how much was actually paid in this transaction
      const amountPaid = paymentAmount;
      
      // Determine if this is a deposit or full payment
      const isDeposit = formData.paymentOption === "Deposit for Reservation";
      
      // First add the transaction
      await addDoc(collection(db, "transactions"), {
        type: "income",
        amount: amountPaid,
        category: roomCategory === "conference" ? "Conference Booking" : "Room Booking",
        description: `${isDeposit ? "Deposit" : "Full payment"} for ${selectedRooms.map(r => r.name || r.t_room).join(", ")}`,
        date: new Date(),
        reference: reference.reference,
        createdBy: auth.currentUser?.uid || "guest",
        isGuest: !auth.currentUser, // ✅ Required for Firestore rules
        userDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        },
        paymentOption: formData.paymentOption,
        isDeposit: isDeposit,
        totalAmount: totalAmount,
        remainderDue: isDeposit ? (totalAmount - amountPaid) : 0,
        csrfToken: csrfToken
      });
      

      // Complete booking with Firestore transaction
      await completeBooking();
      
      // Prepare booking object for confirmation page
      const bookingDetails = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        roomName: selectedRooms.map(r => r.name || r.t_room).join(", "),
        roomType: selectedRooms.map(r => r.t_room || r.type).join(", "),
        numberOfGuests: totalGuests,
        paymentOption: formData.paymentOption,
        amount: amountPaid,
        totalAmount: totalAmount,
        remainderDue: isDeposit ? (totalAmount - amountPaid) : 0,
        specialRequests: formData.specialRequests,
        airportPickup: formData.airportPickup === "Yes",
        bookingReference: reference.reference
      };

      if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
        const query = new URLSearchParams({
          fromConference: "true",
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          csrfToken: csrfToken
        }).toString();
        navigate(`/room-booking?${query}`);
        return; // Exit early
      }
      
      // For normal flow, navigate to confirmation page
      navigate("/booking-confirmation", { 
        state: { 
          booking: bookingDetails,
          totalGuests,
          isDeposit,
          csrfToken
        } 
      });
      
    } catch (error) {
      console.error("Error in payment processing:", error);
      setError(`Payment processing error: ${error.message}`);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <div className="error-container">
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/room-booking')}
            className="back-to-rooms-btn"
          >
            Back to Room Selection
          </button>
        </div>
      </div>
    );
  }

  if (selectedRooms.length === 0) {
    return (
      <div className="main-container">
        <div className="error-container">
          <h3>No Rooms Selected</h3>
          <p>Please select rooms before proceeding to booking.</p>
          <button 
            onClick={() => navigate('/room-booking')}
            className="back-to-rooms-btn"
          >
            Go to Room Selection
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

      <div className="booking-page-wrapper">
        <div className="booking-illustration">
          <img src="src/assets/images/IMG_0123.JPG" alt="Booking" />
        </div>
        <div className="booking-container">
          <h2>Book Your Room</h2>
          <p>Please complete the form to confirm your stay.</p>

  {/*         {!isLoggedIn && (
            <div className="login-prompt">
              <p>Sign in to access exclusive discounts!</p>
              <button className="login-btn" onClick={goToLogin}>Log In</button>
            </div>
          )} */}

          {processingPayment ? (
            <div className="processing-payment">
              <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
              <p>Processing your payment. Please wait...</p>
            </div>
          ) : (
            <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
              {/* Hidden CSRF token field */}
              <input type="hidden" name="csrfToken" value={csrfToken} />
              
              {/* Basic Info */}
              <div><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
              <div><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
              <div><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
              <div className="phone-input-container" style={{ width: '100%' }}>
                <label>Phone</label>
                <PhoneInput
                  international
                  defaultCountry="GH"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`PhoneInput ${phoneError ? "error" : ""}`}
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
              <div>
                <label>Airport Pickup</label>
                <select name="airportPickup" value={formData.airportPickup} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {formData.airportPickup === "Yes" && (
                <>
                  <div className="pickup-row full-width">
                    <div className="half-width">
                      <label>Pickup Date (same as Check-In)</label>
                      <input 
                        type="text" 
                        readOnly 
                        className="readonly-field" 
                        value={new Date(formData.checkIn).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                      />
                    </div>
                    <div className="half-width">
                      <label>Pickup Time</label>
                      <input 
                        type="time" 
                        name="pickupTime" 
                        value={formData.pickupTime} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="full-width">
                    <label>Flight Number</label>
                    <input 
                      type="text" 
                      name="flightNumber" 
                      value={formData.flightNumber} 
                      onChange={handleChange} 
                      placeholder="e.g., KQ 507" 
                      required 
                    />
                  </div>
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
                <textarea 
                  name="specialRequests" 
                  value={formData.specialRequests} 
                  onChange={handleChange} 
                  placeholder="e.g., I'll be arriving late, please hold my reservation" 
                  rows="3" 
                  maxLength="500" // Limit request length
                />
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
                {applicableDiscount > 0 && (
                  <small style={{ color: "green" }}>
                    {applicableDiscount}% {actualDiscountName} discount applied
                  </small>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="full-width button-container" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                {/* Navigation buttons were here */}
              </div>

              {/* Pay Button */}
              <div className="full-width">
                <PaystackConsumer {...config} onSuccess={onSuccess} onClose={() => setProcessingPayment(false)}>
                  {({ initializePayment }) => (
                    <button 
                      type="button" 
                      className="confirm-booking" 
                      onClick={() => {
                        if (!isFormValid) {
                          alert("Please complete all fields correctly. Ensure phone number and pickup info (if applicable) are valid.");
                        } else {
                          setProcessingPayment(true);
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
    </>
  );
};

export default BookingPage;