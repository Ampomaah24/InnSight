import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../config/firebase";

import {
  collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc
} from "firebase/firestore";
import { PaystackConsumer } from "react-paystack";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import NavMenu from "../components/NavMenu";
import "../assets/styles/BookingPage.css";

// Add this to your CSS file or append it to the component
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

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState({
    conferenceAttendeeDiscount: 0,
    corporateDiscount: 0,
    groupDiscountMinRooms: 0,
    groupDiscountRate: 0,
    longStayDiscount: 0,
    longStayMinNights: 0,
    weekdayDiscount: 0
  });

  const params = new URLSearchParams(location.search);
  const selectedRooms = params.get("rooms") ? JSON.parse(decodeURIComponent(params.get("rooms"))) : [];
  const checkInParam = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : "";
  const checkOutParam = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : "";
  const roomCategory = params.get("roomCategory") || "regular";
  const fromConference = params.get("fromConference") === "true";
  const discountFromURL = parseFloat(params.get("discount")) || 0;
  const discountType = params.get("discountType") ? decodeURIComponent(params.get("discountType")) : "";

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    airportPickup: "No", pickupDate: "", pickupTime: "", flightNumber: "",
    paymentOption: "Full Payment", specialRequests: "",
    checkIn: checkInParam, checkOut: checkOutParam,
    alsoBookingStay: "No"
  });

  const [phoneError, setPhoneError] = useState(false);
  
  const [pickupDateError, setPickupDateError] = useState(false);

  const [guestCounts, setGuestCounts] = useState(() => {
    const initial = {};
    selectedRooms.forEach((room, idx) => { initial[room.id || idx] = 1; });
    return initial;
  });

  // Fetch discounts from Firestore if we don't have a discount from URL
  useEffect(() => {
    const fetchDiscounts = async () => {
      // If we already have discount from URL params, use it
      if (discountFromURL > 0) {
        setDiscounts(prev => ({ 
          ...prev, 
          conferenceAttendeeDiscount: fromConference ? discountFromURL : prev.conferenceAttendeeDiscount 
        }));
        setLoading(false);
        return;
      }

      try {
        const discountsRef = doc(db, "settings", "discounts");
        const docSnap = await getDoc(discountsRef);
        
        if (docSnap.exists()) {
          const discountData = docSnap.data();
          console.log("Fetched discount data:", discountData);
          
          setDiscounts({
            conferenceAttendeeDiscount: discountData.conferenceAttendeeDiscount || 0,
            corporateDiscount: discountData.corporateDiscount || 0,
            groupDiscountMinRooms: discountData.groupDiscountMinRooms || 0,
            groupDiscountRate: discountData.groupDiscountRate || 0,
            longStayDiscount: discountData.longStayDiscount || 0,
            longStayMinNights: discountData.longStayMinNights || 0,
            weekdayDiscount: discountData.weekdayDiscount || 0
          });
        } else {
          console.warn("Discounts document doesn't exist");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, [discountFromURL, fromConference]);

  // Fix scroll to top on page load
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

  const checkInDate = new Date(formData.checkIn);
  const checkOutDate = new Date(formData.checkOut);
  const numberOfDays = (checkOutDate - checkInDate) / (1000 * 3600 * 24) || 1;

  // Determine which discount to apply
  const getApplicableDiscount = () => {
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
    
    // Weekday discount if check-in is on weekday (Monday-Thursday)
    const checkInDay = checkInDate.getDay();
    if (checkInDay >= 1 && checkInDay <= 4) { // Monday=1, Thursday=4
      return discounts.weekdayDiscount;
    }
    
    return 0; // No discount applies
  };

  // Calculate the effective discount
  const applicableDiscount = getApplicableDiscount();
  const actualDiscountName = discountType || (
    fromConference ? 'Conference Attendee' : 
    numberOfDays >= discounts.longStayMinNights ? 'Long Stay' :
    selectedRooms.length >= discounts.groupDiscountMinRooms ? 'Group Booking' :
    checkInDate.getDay() >= 1 && checkInDate.getDay() <= 4 ? 'Weekday' : ''
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

  useEffect(() => {
    if (auth.currentUser?.email) {
      setFormData((prev) => ({ ...prev, email: auth.currentUser.email }));
    }
  }, [auth.currentUser]);

// Modify the handleChange function to automatically set pickup date when airportPickup is set to "Yes"
const handleChange = (e) => {
  const { name, value } = e.target;
  
  // If the user is selecting airport pickup as "Yes", automatically set the pickup date
  if (name === 'airportPickup' && value === 'Yes') {
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      pickupDate: prev.checkIn // Automatically set pickup date to match check-in date
    }));
    setPickupDateError(false); // Clear any pickup date error
    return;
  }
  
  // Special validation for pickup date
  if (name === 'pickupDate') {
    const pickupDate = new Date(value);
    const checkInDate = new Date(formData.checkIn);
    
    // Reset dates to midnight for comparison
    pickupDate.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    // Set error if pickup date is not equal to check-in date
    setPickupDateError(pickupDate.getTime() !== checkInDate.getTime());
  }
  
  setFormData(prev => ({ ...prev, [name]: value }));
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

  // This is the fixed version of the completeBooking function that properly checks for room availability
// to prevent overlapping bookings

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
        alert(`No available rooms of type: ${room.t_room || room.type}`);
        continue;
      }

      // Find a room without date conflicts
      let availableRoom = null;
      
      for (const roomDoc of roomSnapshot.docs) {
        const roomData = roomDoc.data();
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
        
        if (!hasOverlap) {
          availableRoom = roomDoc;
          break;
        }
      }

      if (!availableRoom) {
        alert(`No available rooms of type: ${room.t_room || room.type} for the selected dates.`);
        continue;
      }

      const dbRoomId = availableRoom.id;
      const roomData = availableRoom.data();
      const roomRef = doc(db, roomCategory === "conference" ? "conference_rooms" : "rooms", dbRoomId);

      // Update room with new booking
      await updateDoc(roomRef, {
        bookings: [...(roomData.bookings || []), {
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

      // Add booking record with proper deposit info
      await addDoc(collection(db, roomCategory === "conference" ? "conferenceBookings" : "bookings"), {
        userId: auth.currentUser?.uid || "guest",
        email: formData.email,
        roomType: room.t_room || room.type,
        roomName: room.name || "Unnamed",
        
        roomNumber: dbRoomId,
        originalPrice: originalPrice,
        discountApplied: applicableDiscount,
        discountType: actualDiscountName,
        finalPrice: discountedPrice,
        amountPaid: amountPaid,
        remainderDue: remainderDue,
        depositRate: isDeposit ? depositRate : null, // Store the deposit rate for reference
        paymentStatus: isDeposit ? "Partial Payment" : "Paid in Full",
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

  // Replace the current onSuccess function with this improved version
// that properly passes booking information to the confirmation page
// This is the onSuccess function from BookingPage.js that needs to be updated
// to properly handle deposits versus full payments

const onSuccess = async (reference) => {
  try {
    // Calculate how much was actually paid in this transaction
    const amountPaid = paymentAmount;
    
    // Determine if this is a deposit or full payment
    const isDeposit = formData.paymentOption === "Deposit for Reservation";
    
    // First add the transaction
    await addDoc(collection(db, "transactions"), {
      type: "income",
      amount: amountPaid,
      category: "Room Booking",
      description: `${isDeposit ? "Deposit" : "Full payment"} for ${selectedRooms.map(r => r.name || r.t_room).join(", ")}`,
      date: new Date(),
      reference: reference.reference,
      createdBy: auth.currentUser?.uid || "guest",
      paymentOption: formData.paymentOption,
      isDeposit: isDeposit,
      totalAmount: totalAmount, // Store the total amount for reference
      remainderDue: isDeposit ? (totalAmount - amountPaid) : 0 // Calculate remainder due for deposits
    });

    // Complete booking
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
      totalAmount: totalAmount, // Include total amount
      remainderDue: isDeposit ? (totalAmount - amountPaid) : 0, // Include remainder for deposits
      specialRequests: formData.specialRequests,
      airportPickup: formData.airportPickup === "Yes"
    };

    if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
      const query = new URLSearchParams({
        fromConference: "true",
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
      }).toString();
      navigate(`/room-booking?${query}`);
    } else {
      navigate("/booking-confirmation", { 
        state: { 
          booking: bookingDetails,
          totalGuests,
          isDeposit // Pass deposit flag to confirmation page
        } 
      });
    }
  } catch (error) {
    console.error("Error in payment processing:", error);
    alert("There was an error processing your payment. Please try again.");
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

          <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
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
  <input 
    type="date" 
    name="pickupDate" 
    value={formData.pickupDate} 
    readOnly  // Make the field read-only since it must match check-in date
    className={pickupDateError ? "error" : ""} 
  />
  {pickupDateError && 
    <small style={{ color: "red" }}>Pickup date must be the same as your check-in date</small>
  }
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
              <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange} placeholder="e.g., I'll be arriving late, please hold my reservation" rows="3" />
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
              {/* <button 
                type="button" 
                className="back-to-home" 
                onClick={() => navigate("/")}
                style={{
                  padding: '10px 20px',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: '1'
                }}
              >
                Back to Home
              </button> */}
              
{/*               <button
  type="button"
  onClick={() =>
    navigate(
      `/room-booking?checkIn=${encodeURIComponent(formData.checkIn)}&checkOut=${encodeURIComponent(formData.checkOut)}`
    )
  }
>
  Back to Rooms
</button>
 */}
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
    </>
  );
};

export default BookingPage;