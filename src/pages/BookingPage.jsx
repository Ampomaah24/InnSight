import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import ConferenceBookingForm from "../components/ConferenceBookingForm"; 
import { useBooking } from "../components/BookingContext";

// Use environment variable directly from .env file
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

// Get room capacity based on type
const getRoomCapacity = (type) => {
  switch ((type || "").toLowerCase()) {
    case "single bed": return 1;
    case "double bed": return 2;
    case "twin bed": return 4;
    default: return 1;
  }
};

// Get room description based on type
const getRoomDescription = (type) => {
  switch ((type || "").toLowerCase()) {
    case "single bed": 
      return "Comfortable room with a single bed, suitable for one person";
    case "double bed": 
      return "Spacious room with a double bed, perfect for couples";
    case "twin bed": 
      return "Large room with two beds, ideal for families or groups";
    default: 
      return "Standard accommodation";
  }
};

// Get room amenities based on type
const getRoomAmenities = (type) => {
  const basicAmenities = ["Free Wi-Fi", "TV", "Air conditioning", "Private bathroom"];
  
  switch ((type || "").toLowerCase()) {
    case "single bed":
      return [...basicAmenities, "Work desk", "Coffee maker"];
    case "double bed":
      return [...basicAmenities, "Mini fridge", "Sitting area", "Coffee maker"];
    case "twin bed":
      return [...basicAmenities, "Mini fridge", "Sitting area", "Extra floor space", "Coffee maker"];
    default:
      return basicAmenities;
  }
};

// Create simplified guest template - just name fields
const createEmptyGuest = () => ({
  firstName: "",
  lastName: ""
});

const BookingPage = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Use our booking context hook
  const { bookingData, clearBookingData,setBookingData } = useBooking();
  
  // If no booking data in context, redirect back to room booking
  useEffect(() => {
    if (!bookingData) {
      navigate('/room-booking');
    }
  }, [bookingData, navigate]);

  // Extract booking data from context
  const selectedRooms = bookingData?.rooms || [];
  const checkInParam = bookingData?.checkIn || "";
  const checkOutParam = bookingData?.checkOut || "";
  const roomCategory = bookingData?.roomCategory || "regular";
  const fromConference = bookingData?.fromConference || false;
  const discountFromContext = bookingData?.discount?.rate || 0;
  const discountType = bookingData?.discount?.type || "";
  
  // If this is a conference booking, render the conference booking form
  if (roomCategory === "conference") {
    return <ConferenceBookingForm />;
  }

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

  // New state to track which room is assigned to main booker
  const [mainBookerRoomId, setMainBookerRoomId] = useState(null);

  // Main guest form data
  const [formData, setFormData] = useState({
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "",
    idType: "",
    idNumber: "",
    airportPickup: "No", 
    pickupDate: "", 
    pickupTime: "", 
    flightNumber: "",
    paymentOption: roomCategory === "conference" ? "Full Payment" : "Full Payment", 
    specialRequests: "",
    checkIn: checkInParam, 
    checkOut: checkOutParam,
    alsoBookingStay: "No"
  });

  // Additional guests for each room
  const [roomGuests, setRoomGuests] = useState(() => {
    const initialRoomGuests = {};
    

    selectedRooms.forEach((room, idx) => {
      const roomId = room.id || idx;
      const capacity = getRoomCapacity(room.t_room || "");
      
      initialRoomGuests[roomId] = {
        roomType: room.t_room || "Standard",
        roomName: room.name || `Room ${idx + 1}`,
        roomDescription: getRoomDescription(room.t_room) || "Comfortable accommodation",
        roomAmenities: getRoomAmenities(room.t_room) || [],
        guestCount: 1,
        capacity,
        guests: [createEmptyGuest()], 
        isMainBookerRoom: false 
      };
    });
    return initialRoomGuests;
  });

  const [phoneError, setPhoneError] = useState(false);
  const [pickupDateError, setPickupDateError] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
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

  // Set the mainBookerRoomId automatically if there's only one room
  useEffect(() => {
    if (selectedRooms.length === 1 && !mainBookerRoomId) {
     
      const singleRoomId = selectedRooms[0].id || 0;
      setMainBookerRoomId(singleRoomId);
      

      setRoomGuests(prev => {
        const updatedRooms = { ...prev };
        if (updatedRooms[singleRoomId]) {
          updatedRooms[singleRoomId] = {
            ...updatedRooms[singleRoomId],
            isMainBookerRoom: true
          };
        }
        return updatedRooms;
      });
    }
  }, [selectedRooms, mainBookerRoomId]);

  // Fetch discounts from Firestore if we don't have a discount from context
  useEffect(() => {
    // If we already have discount from context, use it and skip Firestore fetch
    if (discountFromContext > 0) {
      setDiscounts(prev => ({ 
        ...prev, 
        conferenceAttendeeDiscount: fromConference ? discountFromContext : prev.conferenceAttendeeDiscount 
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
  }, [discountFromContext, fromConference, isLoggedIn]);


  useEffect(() => {
    window.scrollTo(0, 0);
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

  const getApplicableDiscount = () => {
    // If we have a discount from context, use that
    if (discountFromContext > 0) {
      return discountFromContext;
    }
    
    // No discounts for non-logged in users
    if (!isLoggedIn) {
      return 0;
    }
    
    // Long stay discount if staying longer than min nights
    if (numberOfDays >= discounts.longStayMinNights) {
      return discounts.longStayDiscount;
    }
    
    // Conference discount - only apply if booking BOTH conference AND rooms
    if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
      return discounts.conferenceAttendeeDiscount;
    }
    
    // Group discount if booking more than min rooms
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) {
      return discounts.groupDiscountRate;
    }
    
    return 0; // No discount applies
  };
  
  // Add this new function for determining discount names
  const getDiscountName = () => {
    if (discountType) {
      return discountType;
    }
    
    if (numberOfDays >= discounts.longStayMinNights) {
      return 'Long Stay';
    }
    
    if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
      return 'Conference Attendee';
    }
    
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) {
      return 'Group Booking';
    }
    
    return '';
  };
  
// Find this section in the code around line 359-360:
  
  // Calculate the effective discount
  const actualDiscountName = getDiscountName();
  
  // Add this line to call getApplicableDiscount() and store its result
  const applicableDiscount = getApplicableDiscount();

  // Calculate total amount
  const totalAmount = selectedRooms.reduce((acc, room) => {
    const originalPrice = Number(room.price || 0);
    const discountedPrice = applicableDiscount ? originalPrice - (originalPrice * applicableDiscount / 100) : originalPrice;
    return acc + (discountedPrice * numberOfDays);
  }, 0);

  // Calculate payment amount based on payment option
  const paymentAmount = (roomCategory === "conference" || formData.paymentOption === "Full Payment")
    ? totalAmount  // For conference bookings or full payment option
    : totalAmount * 0.2; 

  // Get total guest count
  const getTotalGuests = () => {
    return Object.values(roomGuests).reduce((total, room) => {
      return total + room.guestCount;
    }, 0);
  };

  // Handle main booker room selection
  const assignMainBookerToRoom = (roomId) => {

    if (mainBookerRoomId) {
      setRoomGuests(prev => {
        const updatedRooms = { ...prev };
        
     
        if (updatedRooms[mainBookerRoomId]) {
          updatedRooms[mainBookerRoomId] = {
            ...updatedRooms[mainBookerRoomId],
            isMainBookerRoom: false
          };
          
          // Reset the first guest in the previous main booker room to empty
          if (updatedRooms[mainBookerRoomId].guests && updatedRooms[mainBookerRoomId].guests.length > 0) {
            updatedRooms[mainBookerRoomId].guests[0] = createEmptyGuest();
          }
        }
        
        return updatedRooms;
      });
    }
    
    // Set the new main booker room
    setMainBookerRoomId(roomId);
    
    // Update the new main booker room with main booker's details
    setRoomGuests(prev => {
      const updatedRooms = { ...prev };
      
      // Mark the new room as main booker's
      updatedRooms[roomId] = {
        ...updatedRooms[roomId],
        isMainBookerRoom: true
      };
      
      // Update the first guest in this room with main booker's details (just names)
      if (updatedRooms[roomId].guests && updatedRooms[roomId].guests.length > 0) {
        updatedRooms[roomId].guests[0] = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          isMainBooker: true
        };
      }
      
      return updatedRooms;
    });
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
    
    // If this is the main booker's name and we have a selected main booker room, 
    // update the first guest name in that room
    if (['firstName', 'lastName'].includes(name) && mainBookerRoomId) {
      updateGuest(mainBookerRoomId, 0, name, value);
    }
  };
  
  const handlePhoneChange = (value) => {
    const isValid = isValidPhoneNumber(value || "");
    setFormData((prev) => ({ ...prev, phone: value }));
    setPhoneError(!isValid);
  };

  // Handle guest count change
  const handleGuestCountChange = (roomId, newCount) => {
    setRoomGuests(prev => {
      const room = { ...prev[roomId] };
      const count = Math.min(Math.max(1, Number(newCount) || 1), room.capacity);
      
      // If increasing count, add empty guests
      if (count > room.guests.length) {
        const newGuests = [...room.guests];
        for (let i = room.guests.length; i < count; i++) {
          newGuests.push(createEmptyGuest());
        }
        room.guests = newGuests;
      } 
      // If decreasing count, remove guests from the end
      else if (count < room.guests.length) {
        room.guests = room.guests.slice(0, count);
      }
      
      room.guestCount = count;
      return { ...prev, [roomId]: room };
    });
  };
  
  // Update an individual guest's information (just names now)
  const updateGuest = (roomId, guestIndex, field, value) => {
    setRoomGuests(prev => {
      const room = { ...prev[roomId] };
      const guests = [...room.guests];
      
      // Create guest if it doesn't exist
      if (!guests[guestIndex]) {
        guests[guestIndex] = createEmptyGuest();
      }
      
      // Update the field
      guests[guestIndex] = {
        ...guests[guestIndex],
        [field]: sanitizeInput(value)
      };
      
      // If this is updating a guest in the main booker's room and it's the first guest,
      // also update the main form data
      const isMainBookersRoom = roomId === mainBookerRoomId && guestIndex === 0;
      if (isMainBookersRoom && ['firstName', 'lastName'].includes(field)) {
        setFormData(formData => ({
          ...formData,
          [field]: value
        }));
      }
      
      return {
        ...prev,
        [roomId]: {
          ...room,
          guests
        }
      };
    });
  };

  // Form validation
  const isAirportPickupValid =
    formData.airportPickup === "No" ||
    formData.alsoBookingStay === "Yes" ||
    (formData.pickupDate && formData.pickupTime && formData.flightNumber && !pickupDateError);

  const validateGuests = () => {
    // For single room, the main booker is automatically assigned
    if (selectedRooms.length === 1 && mainBookerRoomId) {
      // Just validate that all guests have names filled in
      for (const roomId in roomGuests) {
        const room = roomGuests[roomId];
        
        // Validate all guests have names
        for (let i = 0; i < room.guestCount; i++) {
          const guest = room.guests[i];
          if (!guest || !guest.firstName || !guest.lastName) {
            return false;
          }
        }
      }
      return true;
    }
    
    // For multiple rooms, check if main booker has been assigned to a room
    if (!mainBookerRoomId) {
      return false;
    }
    
    // Validate each room's guests (just need names)
    for (const roomId in roomGuests) {
      const room = roomGuests[roomId];
      
      // Validate all guests have names
      for (let i = 0; i < room.guestCount; i++) {
        const guest = room.guests[i];
        if (!guest || !guest.firstName || !guest.lastName) {
          return false;
        }
      }
    }
    return true;
  };

  const isFormValid =
    // Main booker must have complete information
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
    isAirportPickupValid &&
    validateGuests();

  // Use Firestore transaction for booking to prevent race conditions
  const completeBooking = async () => {
    try {
      const bookingPromises = [];
      
      // For each selected room, find an available room and book it
      for (const room of selectedRooms) {
        const roomId = room.id || room.t_room;
        const roomInfo = roomGuests[roomId] || { guests: [], guestCount: 1 };
        
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
            // Use transaction to check and update room availability
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
            });
            
            // If transaction successful, room is available - proceed with booking creation
            roomBooked = true;
            
            // Calculate prices with discount
            const originalPrice = Number(room.price || 0) * numberOfDays;
            const discountedPrice = applicableDiscount ? 
              originalPrice - (originalPrice * applicableDiscount / 100) : 
              originalPrice;

            // Check if this is a deposit payment (never for conference bookings)
            const isDeposit = roomCategory !== "conference" && formData.paymentOption === "Deposit for Reservation";
            const depositRate = 0.2; // 20% deposit
            const amountPaid = isDeposit ? discountedPrice * depositRate : discountedPrice;
            const remainderDue = isDeposit ? discountedPrice - amountPaid : 0;
            
            // Process guests for this room
            const roomGuestsList = roomInfo.guests || [];
            const roomGuestCount = roomInfo.guestCount || 1;
            
            // Determine primary guest for this room
            const isMainBookerRoom = roomId === mainBookerRoomId;
            
            // Get the first guest's info as the primary guest for this room
            const primaryGuest = roomGuestsList[0] || { firstName: "", lastName: "" };
            
            // If this is the main booker's room, the primary guest is the main booker
            const primaryGuestFirstName = isMainBookerRoom ? formData.firstName : primaryGuest.firstName;
            const primaryGuestLastName = isMainBookerRoom ? formData.lastName : primaryGuest.lastName;
            
            // Create a clean array of guest info
            const guestListForRoom = roomGuestsList.slice(0, roomGuestCount).map((guest, index) => {
              const isMainBooker = isMainBookerRoom && index === 0;
              
              // For the main booker, include all details
              if (isMainBooker) {
                return {
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  email: formData.email,
                  phone: formData.phone,
                  idType: formData.idType,
                  idNumber: formData.idNumber,
                  isMainBooker: true,
                  accountCreated: true  // Main booker already has account
                };
              }
              
              // For other guests, just names and flag for pending account creation
              return {
                firstName: guest.firstName,
                lastName: guest.lastName,
                accountCreated: false,  // Accounts will be created on arrival
                isMainBooker: false
              };
            });
            
            // Create booking document
            const newBooking = {
              // Main booker info (who made the transaction - this stays the same for all rooms)
              userId: auth.currentUser?.uid || "guest",
              email: formData.email,
              bookerFirstName: formData.firstName,
              bookerLastName: formData.lastName,
              bookerPhone: formData.phone,
              bookerIdType: formData.idType,
              bookerIdNumber: formData.idNumber,
              
              // Primary guest info for this specific room (may be different from booker)
              primaryGuestFirstName: primaryGuestFirstName,
              primaryGuestLastName: primaryGuestLastName,
              isMainBookerRoom: isMainBookerRoom,
              
              // Room details
              roomType: room.t_room || room.type,
              roomName: room.name || "Unnamed",
              roomNumber: roomRef.id,
              roomCategory,
              numberOfGuests: roomGuestCount,
              
              // Guest info specific to this room
              guests: guestListForRoom,
              
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
              paymentOption: roomCategory === "conference" ? "Full Payment" : formData.paymentOption,
              
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
              
              // Group booking information
              bookingGroupId: csrfToken,
              totalRoomsInBooking: selectedRooms.length,
              
              // Flag to indicate that additional guests need account creation on arrival
              pendingGuestAccounts: true
            };
            
            // Create the booking document and store the promise
            const bookingRef = collection(db, roomCategory === "conference" ? "conferenceBookings" : "bookings");
            bookingPromises.push(addDoc(bookingRef, newBooking));
            
            break; // Found and booked a room, move to next room in selection
            
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
      
      // Wait for all booking documents to be created
      await Promise.all(bookingPromises);
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
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: "GHS",
    metadata: {
      userId: auth.currentUser?.uid || "guest",
      bookingType: roomCategory,
      csrfToken: csrfToken,
      rooms: selectedRooms.map(room => room.id || room.t_room).join(','),
      checkInDate: formData.checkIn,
      checkOutDate: formData.checkOut,
      totalRooms: selectedRooms.length,
      totalGuests: getTotalGuests()
    }
  };

  // Handle successful payment
  const onSuccess = async (reference) => {
    try {
      // Immediately set processing state to show loading indicator
      setProcessingPayment(true);
      
      // Calculate how much was actually paid in this transaction
      const amountPaid = paymentAmount;
      
      // Determine if this is a deposit or full payment (never deposit for conference)
      const isDeposit = roomCategory !== "conference" && formData.paymentOption === "Deposit for Reservation";
      
      // First add the transaction
      await addDoc(collection(db, "transactions"), {
        type: "income",
        amount: amountPaid,
        category: roomCategory === "conference" ? "Conference Booking" : "Room Booking",
        description: `${isDeposit ? "Deposit" : "Full payment"} for ${selectedRooms.length} rooms: ${selectedRooms.map(r => r.t_room || r.type).join(", ")}`,
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
        paymentOption: roomCategory === "conference" ? "Full Payment" : formData.paymentOption,
        isDeposit: isDeposit,
        totalAmount: totalAmount,
        remainderDue: isDeposit ? (totalAmount - amountPaid) : 0,
        csrfToken: csrfToken,
        totalRooms: selectedRooms.length,
        totalGuests: getTotalGuests()
      });
      
      // Complete booking with Firestore transaction
      await completeBooking();
      
      // Calculate total guests across all rooms
      const totalGuests = getTotalGuests();
      
      // Prepare booking object for the context and confirmation page
      const bookingDetails = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        roomNames: selectedRooms.map(r => r.name || `Room ${r.id || 0}`).join(", "),
        roomTypes: selectedRooms.map(r => r.t_room || r.type).join(", "),
        numberOfGuests: totalGuests,
        numberOfRooms: selectedRooms.length,
        paymentOption: roomCategory === "conference" ? "Full Payment" : formData.paymentOption,
        amount: amountPaid,
        totalAmount: totalAmount,
        remainderDue: isDeposit ? (totalAmount - amountPaid) : 0,
        specialRequests: formData.specialRequests,
        airportPickup: formData.airportPickup === "Yes",
        bookingReference: reference.reference,
        bookingGroupId: csrfToken
      };

      if (roomCategory === "conference" && formData.alsoBookingStay === "Yes") {
        // Update context with minimal info needed for the next step
        setBookingData({
          fromConference: true,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          csrfToken: csrfToken
        });
        
        // Navigate without URL parameters
        navigate('/room-booking');
        return; // Exit early
      }
      
      // Store booking details in context for confirmation page
      setBookingData(bookingDetails);
      sessionStorage.setItem('bookingData', JSON.stringify(bookingDetails));

      // Navigate to confirmation page without state
      navigate("/booking-confirmation");
      
    } catch (error) {
      console.error("Error in payment processing:", error);
      setError(`Payment processing error: ${error.message}`);
      setProcessingPayment(false);
    }
  };

  // Function to go to login page
  const goToLogin = () => {
    // Save current path to redirect back after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  };

  if (loading) {
    return (
      <>
        <style>{embedded_css}</style>
        <div className="booking-page">
          <div className="loading">
            <div className="loading__spinner" />
            <p>Loading booking details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{embedded_css}</style>
        <div className="booking-page">
          <div className="error">
            <h3 className="error__title">Error</h3>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/room-booking')}
              className="button button--primary"
            >
              Back to Room Selection
            </button>
          </div>
        </div>
      </>
    );
  }

  if (selectedRooms.length === 0) {
    return (
      <>
        <style>{embedded_css}</style>
        <div className="booking-page">
          <div className="error">
            <h3 className="error__title">No Rooms Selected</h3>
            <p>Please select rooms before proceeding to booking.</p>
            <button 
              onClick={() => navigate('/room-booking')}
              className="button button--primary"
            >
              Go to Room Selection
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{embedded_css}</style>
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="booking-page">
        <div className="booking-page__wrapper">
          <div className="booking-page__illustration">
            <img src="src/assets/images/IMG_0123.JPG" alt="Booking" />
          </div>
          <div className="booking-page__container">
            <h2 className="booking-page__title">Book Your {selectedRooms.length > 1 ? 'Rooms' : 'Room'}</h2>
            <p className="booking-page__subtitle">Please complete the form to confirm your stay.</p>

            {!isLoggedIn && (
              <div className="login-prompt">
                <p className="login-prompt__text">Sign in to access exclusive discounts!</p>
                <button className="login-button" onClick={goToLogin}>Log In</button>
              </div>
            )}

            {processingPayment ? (
              <div className="loading">
                <p>Processing your payment. Please wait...</p>
              </div>
            ) : (
              <form className="booking-form" onSubmit={(e) => e.preventDefault()}>
                {/* Hidden CSRF token field */}
                <input type="hidden" name="csrfToken" value={csrfToken} />
                
                {/* Basic Info - Main Booker */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Main Booker Information</h3>
                  <p>Please provide your details as the primary contact for this booking.</p>
                  
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
                
               
                {selectedRooms.length > 1 && (
                  <div className="booking-form__full-width room-selection">
                    <h3 className="section__heading">Main Booker's Room</h3>
                    <p>Please select which room you will stay in:</p>
                    
                    <div className="room-selection__buttons">
                      {selectedRooms.map((room, index) => {
                        const roomId = room.id || index;
                        
                        return (
                          <button 
                            key={roomId}
                            type="button"
                            className={`room-selection__button ${roomId === mainBookerRoomId ? 'room-selection__button--selected' : ''}`}
                            onClick={() => assignMainBookerToRoom(roomId)}
                          >
                            {room.name || `${room.t_room || 'Standard'} Room ${index + 1}`}
                          </button>
                        );
                      })}
                    </div>
                    
                    {!mainBookerRoomId && (
                      <div className="notification notification--warning">
                        Please select a room for yourself as the main booker
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple Rooms Guest Information - Simplified for just names */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Guest Names</h3>
                  <p>Please provide the names of all guests who will be staying. Full registration will be completed upon arrival.</p>
                
                  {selectedRooms.length > 0 && selectedRooms.map((room, roomIndex) => {
                    const roomId = room.id || roomIndex;
                    const roomInfo = roomGuests[roomId] || { 
                      guests: [], 
                      guestCount: 1, 
                      capacity: getRoomCapacity(room.t_room || ''),
                      roomType: room.t_room || 'Standard', 
                      roomName: room.name || `Room ${roomIndex + 1}`,
                      roomDescription: getRoomDescription(room.t_room),
                      roomAmenities: getRoomAmenities(room.t_room)
                    };
                    const isMainBookerRoom = roomId === mainBookerRoomId;
                    
                    return (
                      <div className="booking-form__full-width room-card" key={roomId}>
                        <div className="room-card__header">
                          <h4 className="room-card__title">
                            {room.name || `Room ${roomIndex + 1}`}
                            <span className="room-card__type">{room.t_room || 'Standard'}</span>
                            {isMainBookerRoom && (
                              <span className="room-card__main-booker">Main Booker</span>
                            )}
                          </h4>
                          
                          {/* Guest count selector */}
                          <div className="room-card__guests">
                            <div className="room-card__guest-count">
                              <label className="room-card__guest-count-label">Number of Guests:</label>
                              <select 
                                value={roomInfo.guestCount}
                                onChange={(e) => handleGuestCountChange(roomId, e.target.value)}
                                className="form-field__select room-card__guest-count-select"
                              >
                                {[...Array(roomInfo.capacity || getRoomCapacity(room.t_room))].map((_, i) => (
                                  <option key={i+1} value={i+1}>{i+1}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        {/* Room description and amenities */}
                        <div className="room-card__info">
                          <p>{roomInfo.roomDescription}</p>
                          <div className="room-card__amenities">
                            <strong>Amenities:</strong> {roomInfo.roomAmenities.join(', ')}
                          </div>
                        </div>
                        
                        {/* Guest information forms - Simplified to just names */}
                        {roomInfo.guests.map((guest, guestIndex) => {
                          // Check if this is the main booker
                          const isMainBooker = isMainBookerRoom && guestIndex === 0;
                          
                          return (
                            <div 
                              key={`${roomId}-guest-${guestIndex}`} 
                              className={`guest-form ${isMainBooker ? 'guest-form--main-booker' : ''}`}
                            >
                              <h5 className="guest-form__header">Guest {guestIndex + 1}</h5>
                              
                              {isMainBooker ? (
                                <p>Using main booker information from above</p>
                              ) : (
                                // For other guests, just collect names
                                <div className="guest-form__grid">
                                  <div className="form-field">
                                    <label className="form-field__label form-field__required">First Name</label>
                                    <input 
                                      type="text"
                                      value={guest.firstName || ''}
                                      onChange={(e) => updateGuest(roomId, guestIndex, 'firstName', e.target.value)}
                                      className="form-field__input"
                                      required
                                    />
                                  </div>
                                  <div className="form-field">
                                    <label className="form-field__label form-field__required">Last Name</label>
                                    <input 
                                      type="text"
                                      value={guest.lastName || ''}
                                      onChange={(e) => updateGuest(roomId, guestIndex, 'lastName', e.target.value)}
                                      className="form-field__input"
                                      required
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Note about accounts being created at check-in */}
                              {!isMainBooker && (
                                <div className="notification notification--info">
                                  Guest registration will be completed upon arrival
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Airport Pickup Section */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Additional Services</h3>
                  <div className="form-field">
                    <label className="form-field__label">Airport Pickup</label>
                    <select 
                      name="airportPickup" 
                      value={formData.airportPickup} 
                      onChange={handleChange}
                      className="form-field__select"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {formData.airportPickup === "Yes" && (
                    <div className="booking-form__full-width">
                      <div className="guest-form__grid">
                        <div className="form-field">
                          <label className="form-field__label">Pickup Date (same as Check-In)</label>
                          <input 
                            type="text"
                            readOnly 
                            className="form-field__input form-field__readonly" 
                            value={new Date(formData.checkIn).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-field__label form-field__required">Pickup Time</label>
                          {/* Here's the modified time picker component */}
                          <input 
                            type="time" 
                            name="pickupTime" 
                            value={formData.pickupTime} 
                            onChange={handleChange}
                            className="form-field__input" 
                            required 
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-field__label form-field__required">Flight Number</label>
                          <input 
                            type="text" 
                            name="flightNumber" 
                            value={formData.flightNumber} 
                            onChange={handleChange} 
                            placeholder="e.g., KQ 507"
                            className="form-field__input" 
                            required 
                          />
                        </div>
                        <div className="form-field">
                          <label className="form-field__label">Airport</label>
                          <input 
                            type="text" 
                            value="Kotoka International Airport"
                            className="form-field__input form-field__readonly"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Option */}
                <div className="booking-form__full-width">
                  <h3 className="section__heading">Payment Details</h3>
                  <div className="form-field">
                    <label className="form-field__label">Payment Option</label>
                    {roomCategory === "conference" ? (
                      // For conference bookings, only show Full Payment option
                      <select 
                        name="paymentOption" 
                        value="Full Payment" 
                        disabled
                        className="form-field__select"
                      >
                        <option>Full Payment</option>
                      </select>
                    ) : (
                      // For regular room bookings, show all payment options
                      <select 
                        name="paymentOption" 
                        value={formData.paymentOption} 
                        onChange={handleChange}
                        className="form-field__select"
                      >
                        <option>Full Payment</option>
                        <option>Deposit for Reservation</option>
                      </select>
                    )}
                    {roomCategory === "conference" && (
                      <small className="form-field__help">Conference bookings require full payment</small>
                    )}
                  </div>
                </div>

                <div className="booking-form__full-width">
                  <div className="form-field">
                    <label className="form-field__label">Special Requests</label>
                    <textarea 
                      name="specialRequests" 
                      value={formData.specialRequests} 
                      onChange={handleChange} 
                      placeholder="e.g., I'll be arriving late, please hold my reservation" 
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
                      <span className="booking-summary__value">{numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'}</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Rooms:</span>
                      <span className="booking-summary__value">{selectedRooms.length} ({selectedRooms.map(r => r.t_room || r.type).join(', ')})</span>
                    </div>
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Total Guests:</span>
                      <span className="booking-summary__value">{getTotalGuests()}</span>
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
                    <div className="booking-summary__item">
                      <span className="booking-summary__label">Amount Due Now:</span>
                      <span className="booking-summary__value">GHS {paymentAmount.toFixed(2)}</span>
                    </div>
                    
                    {formData.paymentOption === "Deposit for Reservation" && roomCategory !== "conference" && (
                      <div className="booking-summary__deposit">
                        20% deposit applied. Remaining GHS {(totalAmount - paymentAmount).toFixed(2)} due at check-in.
                      </div>
                    )}
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
                          if (selectedRooms.length > 1 && !mainBookerRoomId) {
                            alert("Please select which room you will stay in as the main booker.");
                          } else if (!isFormValid) {

                            alert("Please complete all required fields correctly. Ensure all guest names are provided.");
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