


import { collection, getDocs, doc, updateDoc, Timestamp, addDoc, 
  query, where, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { getAuth } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Reservations.css";
import { useState, useEffect, useCallback, useMemo } from "react";

const Reservations = () => {
  const [roomReservations, setRoomReservations] = useState([]);
  const [conferenceReservations, setConferenceReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("room"); // "room" or "conference"
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(1);
  const [notes, setNotes] = useState("");
  const [dataChanged, setDataChanged] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [includePastReservations, setIncludePastReservations] = useState(false);
  // Enhanced extend stay states
  const [isRoomAvailable, setIsRoomAvailable] = useState(true);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [baseRate, setBaseRate] = useState(0);
  const [extensionRateDetails, setExtensionRateDetails] = useState({
    baseRate: 0,
    adjustedRate: 0,
    regularDays: 0,
    highSeasonDays: 0,
    totalCost: 0,
    discount: 0,
    hours: 0
  });
  
  // Extension settings
  const MIN_EXTENSION_DAYS = 1;
  
  // Get current auth user
  const auth = getAuth();

  // Function to map venue IDs to human-readable names
  const getVenueName = (venueId) => {
    if (!venueId) return "N/A";
    
    // Map of venue IDs to readable names
    const venueMap = {
      "91g3slvSNINm9MmxGpmv": "Long Room",
      "HI3gExv7FXT5Mkon6VIE": "Big Room",
      "wGerfyOvyM3uXAI6ykn1": "Small Room"
    };
    
    return venueMap[venueId] || "Conference Room";
  };

  // Helper function to get guest name consistently from booking data
  const getGuestNameFromBookingData = (data) => {
    // First try primary guest fields
    if (data.primaryGuestFirstName || data.primaryGuestLastName) {
      return `${data.primaryGuestFirstName || ''} ${data.primaryGuestLastName || ''}`.trim();
    }
    
    // Then check guests array
    if (data.guests && Array.isArray(data.guests) && data.guests.length > 0) {
      const firstGuest = data.guests[0];
      if (firstGuest && (firstGuest.firstName || firstGuest.lastName)) {
        return `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`.trim();
      }
    }
    
    // Then try booker fields
    if (data.bookerFirstName || data.bookerLastName) {
      return `${data.bookerFirstName || ''} ${data.bookerLastName || ''}`.trim();
    }
    
    // Finally fall back to legacy fields
    return `${data.firstName || ''} ${data.lastName || ''}`.trim() || "Guest";
  };

  // Helper function to check if a date falls within a high season period
  const isHighSeason = (date) => {
    const month = date.getMonth();
    // Define high season months: June-August (summer) and December (holiday season)
    return (month >= 5 && month <= 7) || month === 11;
  };
  const normalizeToMidnight = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };
  
  // Helper function to calculate extension rate based on tiered pricing
  const calculateExtensionRate = (originalRate, days) => {
    // No discounts for extensions
    return originalRate;
  };

  const calculateConferenceExtensionCost = useCallback((baseDailyRate, extendDays) => {
    const adjustedRate = baseDailyRate;
    const totalCost = adjustedRate * extendDays;
  
    return {
      baseRate: baseDailyRate,
      adjustedRate,
      days: extendDays,
      totalCost,
      discount: 0
    };
  }, []);
  
  
  
  // Calculate extension cost for room bookings
  const calculateExtensionCost = useCallback((baseRate, currentCheckOut, extensionDays) => {
    let regularDays = 0;
    let highSeasonDays = 0;
    
    const tempDate = new Date(currentCheckOut);
    for (let i = 0; i < extensionDays; i++) {
      tempDate.setDate(tempDate.getDate() + 1);
      if (isHighSeason(tempDate)) {
        highSeasonDays++;
      } else {
        regularDays++;
      }
    }
    
    const adjustedRate = calculateExtensionRate(baseRate, extensionDays);
    
    const regularCost = adjustedRate * regularDays;
    const highSeasonCost = adjustedRate * 1.25 * highSeasonDays; // 25% premium for high season
    
    const totalCost = regularCost + highSeasonCost;
    
    return {
      baseRate,
      adjustedRate,
      regularDays,
      highSeasonDays,
      regularCost,
      highSeasonCost,
      totalCost,
      discount: 0 // No discounts for extensions
    };
  }, []);

  const calculatedNewCheckoutDate = useMemo(() => {
    if (!selectedReservation) return null;
  
    if (activeTab === "room") {
      const baseDate = normalizeToMidnight(selectedReservation.checkOutDate);
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + parseInt(extendDays));
      return newDate;
    } else {
      // Fixed: Now adding days for conference bookings too
      const newDate = new Date(selectedReservation.checkOutDate);
      newDate.setDate(newDate.getDate() + parseInt(extendDays));
      return newDate;
    }
  }, [selectedReservation, extendDays, activeTab]);
  
  
  
  
  // Recalculate extension cost when days or base rate changes (without API calls)
  useEffect(() => {
    if (!selectedReservation || !isModalOpen || !baseRate) return;
    
    if (activeTab === "room") {
      const costDetails = calculateExtensionCost(
        baseRate,
        selectedReservation.checkOutDate,
        extendDays
      );
      
      setExtensionRateDetails(costDetails);
    } else {
      // For conference bookings, we use hours instead of days
      const extensionDays = extendDays;

      
      const costDetails = calculateConferenceExtensionCost(
        baseRate,
        extendDays
      );
      
      
      
      setExtensionRateDetails(costDetails);
    }
  }, [extendDays, baseRate, selectedReservation, isModalOpen, activeTab, calculateExtensionCost, calculateConferenceExtensionCost]);

  const checkRoomAvailability = useCallback(async (roomId, currentCheckOut, newCheckOut) => {
    console.log('Checking Room Availability:', {
      roomId,
      currentCheckOut: currentCheckOut.toISOString(),
      newCheckOut: newCheckOut.toISOString()
    });
  
    if (!roomId) {
      console.warn('No room ID provided');
      return false;
    }
    
    try {
      const bookingsRef = collection(db, "bookings");
      const roomBookingsQuery = query(
        bookingsRef,
        where("roomNumber", "==", roomId),
        where("status", "not-in", ["Cancelled", "Terminated"])
      );
      
      const bookingSnapshot = await getDocs(roomBookingsQuery);
      
      console.log(`Found ${bookingSnapshot.docs.length} existing bookings for room ${roomId}`);
      
      const conflictingBookings = bookingSnapshot.docs.filter(doc => {
        // Add proper null checking for selectedReservation
        if (selectedReservation && doc.id === selectedReservation.id) return false;
        
        const bookingData = doc.data();
        
        // Consistent date parsing with detailed logging
        const parseDate = (dateField, fieldName) => {
          try {
            if (dateField instanceof Timestamp) {
              return dateField.toDate();
            } else if (dateField?.seconds) {
              return new Date(dateField.seconds * 1000);
            } else if (dateField instanceof Date) {
              return dateField;
            } else {
              return new Date(dateField);
            }
          } catch (error) {
            console.error(`Error parsing ${fieldName}:`, dateField, error);
            return null;
          }
        };
        
        const bookingCheckIn = parseDate(bookingData.checkIn, 'checkIn');
        const bookingCheckOut = parseDate(bookingData.checkOut, 'checkOut');
        
        if (!bookingCheckIn || !bookingCheckOut) {
          console.warn('Invalid dates for booking:', bookingData);
          return false;
        }
        
        // Comprehensive conflict logging with stricter overlap check
        // This checks if ANY part of the new extension period overlaps with an existing booking
        const overlap = 
          // New extension period starts during an existing booking
          (newCheckOut > bookingCheckIn && newCheckOut <= bookingCheckOut) ||
          // Current checkout falls within an existing booking
          (currentCheckOut > bookingCheckIn && currentCheckOut < bookingCheckOut) ||
          // An existing booking intersects with the extension period
          (bookingCheckIn >= currentCheckOut && bookingCheckIn < newCheckOut) ||
          // Extension completely covers an existing booking
          (currentCheckOut <= bookingCheckIn && newCheckOut >= bookingCheckOut);
        
        if (overlap) {
          console.warn('🚨 CONFLICT DETECTED 🚨', {
            roomId,
            bookingId: doc.id,
            bookingStatus: bookingData.status,
            conflictDetails: {
              bookingCheckIn: bookingCheckIn.toISOString(),
              bookingCheckOut: bookingCheckOut.toISOString(),
              currentExtensionStart: currentCheckOut.toISOString(),
              currentExtensionEnd: newCheckOut.toISOString()
            }
          });
        }
        
        return overlap;
      });
      
      const isAvailable = conflictingBookings.length === 0;
      
      console.log(`Room ${roomId} availability:`, isAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE');
      
      return isAvailable;
    } catch (error) {
      console.error("Error checking room availability:", error);
      return false;
    }
  }, [selectedReservation]);
  
  // Similarly, the findAvailableRooms function should be updated to include null checks
  // and be wrapped in useCallback with proper dependencies:
  
  const findAvailableRooms = useCallback(async (roomType, currentCheckOut, newCheckOut) => {
    console.log('Finding Available Rooms:', {
      roomType,
      currentCheckOut: currentCheckOut.toISOString(),
      newCheckOut: newCheckOut.toISOString()
    });
  
    try {
      const roomsRef = collection(db, "rooms");
      const roomsQuery = query(
        roomsRef, 
        where("t_room", "==", roomType),
        where("availability", "==", true)
      );
      const roomsSnapshot = await getDocs(roomsQuery);
      
      console.log(`Found ${roomsSnapshot.docs.length} rooms of type ${roomType}`);
      
      const availableRoomPromises = roomsSnapshot.docs.map(async (roomDoc) => {
        const roomId = roomDoc.id;
        const roomData = roomDoc.data();
        
        // Skip the current room being extended (if applicable)
        if (selectedReservation && roomId === selectedReservation.roomNumber) {
          console.log(`Skipping current room ${roomId}`);
          return null;
        }
        
        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(
          bookingsRef,
          where("roomNumber", "==", roomId),
          where("status", "not-in", ["Cancelled", "Terminated"])
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        console.log(`Checking ${bookingsSnapshot.docs.length} bookings for room ${roomId}`);
        
        // Check for any booking conflicts
        const hasConflict = bookingsSnapshot.docs.some(bookingDoc => {
          const bookingData = bookingDoc.data();
          
          // Parse dates consistently
          const parseDate = (dateField) => {
            if (dateField instanceof Timestamp) return dateField.toDate();
            if (dateField?.seconds) return new Date(dateField.seconds * 1000);
            return new Date(dateField);
          };
          
          const bookingCheckIn = parseDate(bookingData.checkIn);
          const bookingCheckOut = parseDate(bookingData.checkOut);
          
          // Detailed date overlap check with stricter conditions
          const overlap = 
            (newCheckOut > bookingCheckIn && newCheckOut <= bookingCheckOut) ||
            (currentCheckOut > bookingCheckIn && currentCheckOut < bookingCheckOut) ||
            (bookingCheckIn >= currentCheckOut && bookingCheckIn < newCheckOut);
          
          if (overlap) {
            console.log('Conflicting Booking Found:', {
              roomId,
              bookingId: bookingDoc.id,
              bookingCheckIn: bookingCheckIn.toISOString(),
              bookingCheckOut: bookingCheckOut.toISOString(),
              currentCheckOut: currentCheckOut.toISOString(),
              newCheckOut: newCheckOut.toISOString()
            });
          }
          
          return overlap;
        });
        
        // If no conflicts, return the room
        if (!hasConflict) {
          console.log(`Room ${roomId} is available for extension`);
          return {
            id: roomId,
            name: roomData.name || `Room ${roomId}`,
            type: roomData.t_room,
            price: roomData.price
          };
        }
        
        console.log(`Room ${roomId} is NOT available for extension`);
        return null;
      });
      
      const availableRooms = (await Promise.all(availableRoomPromises))
        .filter(room => room !== null);
      
      console.log('Total Available Rooms:', availableRooms);
      return availableRooms;
    } catch (error) {
      console.error("Error finding available rooms:", error);
      return [];
    }
  }, [selectedReservation]);
  // Function to update bookings when a guest stays in the same room
  const updateSameRoomBookings = async (roomId, originalBookingId, extensionBookingId, 
                                  currentCheckOut, newCheckOut, guestName) => {
    try {
      // Get reference to the room document
      const roomRef = doc(db, "rooms", roomId);
      
      // Get current room data
      const roomSnapshot = await getDoc(roomRef);
      
      if (!roomSnapshot.exists()) {
        console.warn(`Room ${roomId} document does not exist`);
        return;
      }
      
      const roomData = roomSnapshot.data();
      
      // Get current bookings array or initialize if not exists
      const bookings = roomData.bookings || [];
      
      // Format dates consistently
      const formatFirestoreDate = (date) => {
        if (date instanceof Date) {
          return Timestamp.fromDate(date);
        }
        return date; // If already a Timestamp, leave as is
      };
      
      // Find and update the original booking's checkout date
      let updatedBookings = bookings.map(booking => {
        if (booking.bookingId === originalBookingId) {
          // Don't change the checkout date of the original booking
          // Just mark it as extended
          return {
            ...booking,
            hasBeenExtended: true,
            extensionBookingId: extensionBookingId,
            lastUpdated: Timestamp.now()
          };
        }
        return booking;
      });
      
      // Add a new booking entry for the extension period
      updatedBookings.push({
        bookingId: extensionBookingId,
        checkIn: formatFirestoreDate(currentCheckOut),
        checkOut: formatFirestoreDate(newCheckOut),
        guestName: guestName,
        isExtension: true,
        originalBookingId: originalBookingId,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      });
      
      // Sort bookings by check-in date
      updatedBookings.sort((a, b) => {
        const dateA = a.checkIn instanceof Timestamp ? a.checkIn.toDate() : new Date(a.checkIn);
        const dateB = b.checkIn instanceof Timestamp ? b.checkIn.toDate() : new Date(b.checkIn);
        return dateA - dateB;
      });
      
      // Update the room document
      await updateDoc(roomRef, {
        bookings: updatedBookings,
        lastUpdated: Timestamp.now()
      });
      
      console.log(`Updated room ${roomId} bookings for extension`);
      
    } catch (error) {
      console.error(`Error updating room ${roomId} bookings:`, error);
      throw error;
    }
  };

  // Function to update bookings when a guest moves to a different room
  const updateRoomBookings = async (oldRoomId, newRoomId, originalBookingId, extensionBookingId,
                                currentCheckOut, newCheckOut, guestName) => {
    try {
      // 1. Update the old room - mark the booking as completed on original checkout
      const oldRoomRef = doc(db, "rooms", oldRoomId);
      const oldRoomSnapshot = await getDoc(oldRoomRef);
      
      if (oldRoomSnapshot.exists()) {
        const oldRoomData = oldRoomSnapshot.data();
        const oldBookings = oldRoomData.bookings || [];
        
        // Update the original booking without changing its checkout
        let updatedOldBookings = oldBookings.map(booking => {
          if (booking.bookingId === originalBookingId) {
            return {
              ...booking,
              hasBeenExtended: true,
              guestMovedToRoom: newRoomId,
              extensionBookingId: extensionBookingId,
              lastUpdated: Timestamp.now()
            };
          }
          return booking;
        });
        
        // Update the old room document
        await updateDoc(oldRoomRef, {
          bookings: updatedOldBookings,
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Updated original room ${oldRoomId} bookings`);
      } else {
        console.warn(`Original room ${oldRoomId} document does not exist`);
      }
      
      // 2. Update the new room - add the extension booking
      const newRoomRef = doc(db, "rooms", newRoomId);
      const newRoomSnapshot = await getDoc(newRoomRef);
      
      if (newRoomSnapshot.exists()) {
        const newRoomData = newRoomSnapshot.data();
        const newBookings = newRoomData.bookings || [];
        
        // Format dates consistently
        const formatFirestoreDate = (date) => {
          if (date instanceof Date) {
            return Timestamp.fromDate(date);
          }
          return date; // If already a Timestamp, leave as is
        };
        
        // Add extension booking to new room
        newBookings.push({
          bookingId: extensionBookingId,
          checkIn: formatFirestoreDate(currentCheckOut),
          checkOut: formatFirestoreDate(newCheckOut),
          guestName: guestName,
          isExtension: true,
          originalBookingId: originalBookingId,
          originalRoom: oldRoomId,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
        
        // Sort bookings by check-in date
        newBookings.sort((a, b) => {
          const dateA = a.checkIn instanceof Timestamp ? a.checkIn.toDate() : new Date(a.checkIn);
          const dateB = b.checkIn instanceof Timestamp ? b.checkIn.toDate() : new Date(b.checkIn);
          return dateA - dateB;
        });
        
        // Update the new room document
        await updateDoc(newRoomRef, {
          bookings: newBookings,
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Updated new room ${newRoomId} bookings for extension`);
      } else {
        console.warn(`New room ${newRoomId} document does not exist`);
      }
      
    } catch (error) {
      console.error(`Error updating room bookings for room change:`, error);
      throw error;
    }
  };

  // Send extension confirmation email
  const sendExtensionConfirmation = async (reservation, extensionDays, extensionCost, newCheckout) => {
    try {
      // Here you would call a server endpoint to handle email sending
      console.log("Would send email confirmation to:", reservation.email);
      console.log("Extension details:", {
        guestName: reservation.guestName,
        roomNumber: reservation.roomNumber,
        originalCheckout: formatDate(reservation.checkOutDate),
        newCheckout: formatDate(newCheckout),
        extensionDays,
        extensionCost
      });
      
      return true;
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      return false;
    }
  };

  // Fetch reservations from Firestore
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        
        // Room bookings
        const roomSnapshot = await getDocs(query(
          collection(db, "bookings"),
          // Filter out incomplete bookings
          where("status", "!=", "Incomplete")
        ));
        
        let rooms = roomSnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Parse dates safely with error handling
          let checkInDate, checkOutDate, createdAt;
          try {
            const rawCheckOut = data.extendedCheckOut || data.checkOut;
          
            // ✅ Add this block
            const rawCheckIn = data.checkIn;
            if (rawCheckIn instanceof Timestamp) {
              checkInDate = rawCheckIn.toDate();
            } else if (rawCheckIn?.seconds) {
              checkInDate = new Date(rawCheckIn.seconds * 1000);
            } else {
              checkInDate = new Date(rawCheckIn);
            }
          
            // ✅ Existing logic for checkOut
            if (rawCheckOut instanceof Timestamp) {
              checkOutDate = rawCheckOut.toDate();
            } else if (rawCheckOut && rawCheckOut.seconds) {
              checkOutDate = new Date(rawCheckOut.seconds * 1000);
            } else {
              checkOutDate = new Date(rawCheckOut);
            }
            
            
            if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt && data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else if (data.timestamp instanceof Timestamp) {
              createdAt = data.timestamp.toDate();
            } else if (data.timestamp && data.timestamp.seconds) {
              createdAt = new Date(data.timestamp.seconds * 1000);
            } else {
              createdAt = new Date();
            }
          } catch (e) {
            console.error("Error parsing dates for doc", doc.id, e);
            checkInDate = new Date();
            checkOutDate = new Date();
            createdAt = new Date();
          }
          
          // Calculate stay length in days
          const stayLengthMs = checkOutDate - checkInDate;
          const stayLengthDays = Math.ceil(stayLengthMs / (1000 * 60 * 60 * 24));
          
          // Get guest name using our helper function
          const guestName = getGuestNameFromBookingData(data);
          
          return {
            id: doc.id,
            ...data,
            checkInFormatted: formatDate(checkInDate),
            checkOutFormatted: formatDate(checkOutDate),
            createdAtFormatted: formatDate(createdAt),
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            createdAt: createdAt,
            stayLength: stayLengthDays,
            month: checkInDate.getMonth() + 1, // 1-12 for Jan-Dec
            year: checkInDate.getFullYear(),
            guestName: guestName
          };
        });

        // Conference room bookings
        const confSnapshot = await getDocs(query(
          collection(db, "conferenceBookings"),
          // Filter out incomplete bookings
          where("status", "!=", "Incomplete")
        ));
        
        let conferences = confSnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Parse dates safely with error handling
          let checkInDate, checkOutDate, createdAt;
          try {
            if (data.checkIn instanceof Timestamp) {
              checkInDate = data.checkIn.toDate();
            } else if (data.checkIn && data.checkIn.seconds) {
              checkInDate = new Date(data.checkIn.seconds * 1000);
            } else {
              checkInDate = new Date(data.checkIn);
            }
            
            if (data.checkOut instanceof Timestamp) {
              checkOutDate = data.checkOut.toDate();
            } else if (data.checkOut && data.checkOut.seconds) {
              checkOutDate = new Date(data.checkOut.seconds * 1000);
            } else {
              checkOutDate = new Date(data.checkOut);
            }
            
            if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt && data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else if (data.timestamp instanceof Timestamp) {
              createdAt = data.timestamp.toDate();
            } else if (data.timestamp && data.timestamp.seconds) {
              createdAt = new Date(data.timestamp.seconds * 1000);
            } else {
              createdAt = new Date();
            }
          } catch (e) {
            console.error("Error parsing dates for doc", doc.id, e);
            checkInDate = new Date();
            checkOutDate = new Date();
            createdAt = new Date();
          }
          
          // Calculate event length in hours
          const eventLengthMs = checkOutDate - checkInDate;
          const eventLengthHours = Math.ceil(eventLengthMs / (1000 * 60 * 60));
          
          const venueId = data.room || data.venue;
          const venueName = data.roomName || getVenueName(venueId) || "N/A";
          
          
          // Get organizer/guest name using our helper function
          const guestName = getGuestNameFromBookingData(data);
          
          return {
            id: doc.id,
            ...data,
            checkInFormatted: formatDate(checkInDate),
            checkOutFormatted: formatDate(checkOutDate),
            
            createdAtFormatted: formatDate(createdAt),
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            createdAt: createdAt,
            eventLength: eventLengthHours,
            month: checkInDate.getMonth() + 1, // 1-12 for Jan-Dec
            year: checkInDate.getFullYear(),
            venue: venueName,
            venueId: venueId,
            guestName: guestName
          };
        });

        // Sort by check-in date (ascending)
        const sortedRooms = rooms.sort((a, b) => a.checkInDate - b.checkInDate);
        const sortedConf = conferences.sort((a, b) => a.checkInDate - b.checkInDate);

        setRoomReservations(sortedRooms);
        setConferenceReservations(sortedConf);
        setLoading(false);
        setDataChanged(false);
      } catch (error) {
        console.error("Error fetching reservations:", error);
        setLoading(false);
      }
    };

    fetchReservations();
  }, [dataChanged]);
  
 
const setupExtensionModal = useCallback(async () => {
  if (!selectedReservation || !isModalOpen) return;
  
  try {
    setIsProcessing(true);
    
    // Reset the fields
    setExtendDays(MIN_EXTENSION_DAYS);
    setNotes("");
    
// Calculate new checkout date
let newCheckoutDate;
if (activeTab === "room") {
  const baseCheckOut = normalizeToMidnight(selectedReservation.checkOutDate);
  newCheckoutDate = new Date(baseCheckOut);
  newCheckoutDate.setDate(baseCheckOut.getDate() + parseInt(extendDays));
} else {
  newCheckoutDate = new Date(selectedReservation.checkOutDate);
  newCheckoutDate.setDate(newCheckoutDate.getDate() + parseInt(extendDays));
}
    
    
    // For room bookings, check availability and find alternatives
    if (activeTab === "room") {
      const roomAvailable = await checkRoomAvailability(
        selectedReservation.roomNumber,
        selectedReservation.checkOutDate,
        newCheckoutDate
      );
      
      setIsRoomAvailable(roomAvailable);
      
      // If room is not available, find alternative rooms
      if (!roomAvailable) {
        const alternatives = await findAvailableRooms(
          selectedReservation.roomType,
          selectedReservation.checkOutDate,
          newCheckoutDate
        );
        
        setAvailableRooms(alternatives);
        if (alternatives.length > 0) {
          setSelectedNewRoom(alternatives[0].id);
        }
      }
      
      // Calculate base daily rate for room bookings
      let calculatedBaseRate = 0;
      if (selectedReservation.originalPrice && selectedReservation.stayLength) {
        calculatedBaseRate = selectedReservation.originalPrice / selectedReservation.stayLength;
      } else {
        // Try to get room price from database as fallback
        try {
          if (selectedReservation.roomNumber) {
            const roomRef = doc(db, "rooms", selectedReservation.roomNumber);
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
              calculatedBaseRate = roomSnap.data().price || 100;
            } else {
              calculatedBaseRate = 100; // Default if price not available
            }
          } else {
            calculatedBaseRate = 100; // Default fallback
          }
        } catch (error) {
          console.error("Error fetching room price:", error);
          calculatedBaseRate = 100; // Default fallback on error
        }
      }
      
      setBaseRate(calculatedBaseRate);
      
      // Calculate initial cost details
      const costDetails = calculateExtensionCost(
        calculatedBaseRate,
        selectedReservation.checkOutDate,
        MIN_EXTENSION_DAYS
      );
      
      setExtensionRateDetails(costDetails);
    } else {
      // For conference bookings
      setIsRoomAvailable(true); // Conference venues don't check for room availability
      
      // Conference bookings use hours instead of days
      const extensionHours = MIN_EXTENSION_DAYS * 8;
      
      // For conference bookings, we need to determine the hourly rate
      let calculatedBaseRate = 0;
      if (selectedReservation.originalPrice && selectedReservation.eventLength) {
        // Calculate from the original booking
        const totalDays = Math.ceil((new Date(selectedReservation.checkOutDate) - new Date(selectedReservation.checkInDate)) / (1000 * 60 * 60 * 24));
calculatedBaseRate = selectedReservation.originalPrice / totalDays;

      } else {
        // Try to get venue price from database as fallback
        try {
          if (selectedReservation.venueId) {
            const venueRef = doc(db, "conferenceVenues", selectedReservation.venueId);
            const venueSnap = await getDoc(venueRef);
            if (venueSnap.exists()) {
              calculatedBaseRate = venueSnap.data().hourlyRate || 50;
            } else {
              calculatedBaseRate = 50; // Default if price not available
            }
          } else {
            calculatedBaseRate = 50; // Default fallback
          }
        } catch (error) {
          console.error("Error fetching venue price:", error);
          calculatedBaseRate = 50; // Default fallback on error
        }
      }
      
      setBaseRate(calculatedBaseRate);
      
      // Use conference-specific pricing function
      const costDetails = calculateConferenceExtensionCost(baseRate, extendDays);

      
      setExtensionRateDetails(costDetails);
    }
    setIsProcessing(false);
  } catch (error) {
    console.error("Error setting up extension modal:", error);
    setIsProcessing(false);
  }
}, [selectedReservation, isModalOpen, activeTab, MIN_EXTENSION_DAYS, checkRoomAvailability, findAvailableRooms, calculateExtensionCost, calculateConferenceExtensionCost]);

// Then use it in useEffect
useEffect(() => {
  setupExtensionModal();
}, [setupExtensionModal]);

  // Helper function to format dates
  const formatDate = (date, includeTime = false) => {
    if (!date) return "N/A";
    
    try {
      if (includeTime) {
        return date.toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Invalid Date";
    }
  };
  
  const extendStay = async () => {
    if (!selectedReservation || !extendDays) return;
    
    try {
      setIsProcessing(true);
      
      // Calculate new checkout date
      const baseCheckOut = normalizeToMidnight(selectedReservation.checkOutDate);
      const newCheckoutDate = new Date(baseCheckOut);
      newCheckoutDate.setDate(baseCheckOut.getDate() + parseInt(extendDays));
      
      // For conference bookings, we use hours instead of days
      const isConference = activeTab === "conference";
      const extensionUnit = isConference ? "hours" : "days";
      const extensionAmount = isConference ? (extendDays * 8) : extendDays;
      
      // Check room availability for the extension period (only for room bookings)
      let roomAvailable = true;
      if (!isConference) {
        roomAvailable = await checkRoomAvailability(
          selectedReservation.roomNumber,
          selectedReservation.checkOutDate,
          newCheckoutDate
        );
      }
      
      let roomId = isConference 
      ? (selectedReservation.venueId || selectedReservation.venue || selectedReservation.room || "unknown")
      : selectedReservation.roomNumber;
    
    
      
      // If room is not available, use selected alternative (only for room bookings)
      if (!isConference && !roomAvailable && selectedNewRoom) {
        roomId = selectedNewRoom;
      } else if (!isConference && !roomAvailable && availableRooms.length === 0) {
        alert("No rooms available for the requested extension period.");
        setIsProcessing(false);
        return;
      }
      
      // Use extension cost from calculated details
      const extensionCost = extensionRateDetails.totalCost;
      
      // Format extension note with billing details
      const extensionNote = notes 
        ? `${new Date().toLocaleString()}: Extended by ${extendDays} day(s). Additional charge: ${extensionCost.toFixed(2)}. ${notes}` 
        : `${new Date().toLocaleString()}: Extended by ${extendDays} day(s). Additional charge: ${extensionCost.toFixed(2)}.`;
  
      // Get current timestamp
      const now = Timestamp.now();
      
      // Create extension history record
// Create extension history record
const extensionHistoryRecord = {
  id: `ext-${Date.now()}`,
  date: now,
  originalCheckOut: selectedReservation.checkOutDate || now, // fallback to now if undefined
  newCheckOut: newCheckoutDate || now, // fallback to now if undefined
  days: isConference ? 0 : (extendDays || 0), // default to 0 if undefined
  hours: isConference ? (extendDays * 8 || 0) : 0, // default to 0 if undefined
  cost: extensionCost || 0, // default to 0 if undefined
  approvedBy: auth.currentUser?.uid || "unknown",
  approvedByName: auth.currentUser?.displayName || "Staff",
  roomChanged: roomId !== (isConference ? selectedReservation.venueId : selectedReservation.roomNumber),
  oldRoomNumber: isConference ? (selectedReservation.venueId || "") : (selectedReservation.roomNumber || ""),
  newRoomNumber: roomId || "",
  notes: notes || ""
};
      
      // Collection reference
      const collectionName = activeTab === "room" ? "bookings" : "conferenceBookings";
      const bookingsRef = collection(db, collectionName);
      
      // 1. Update original reservation 
      const originalReservationRef = doc(db, collectionName, selectedReservation.id);
      
      // Get extension history or create if it doesn't exist
      const extensionHistory = selectedReservation.extensionHistory 
        ? [...selectedReservation.extensionHistory, extensionHistoryRecord] 
        : [extensionHistoryRecord];
      
        await updateDoc(originalReservationRef, {
          hasBeenExtended: true,
          lastUpdated: now,
          extensionHistory: extensionHistory || [], // ensure array
          notes: selectedReservation.notes 
            ? `${selectedReservation.notes}\n${extensionNote}`
            : extensionNote
        });
      
        
        const extensionBookingData = {
          // Ensure all required fields have defaults
          checkIn: Timestamp.fromDate(selectedReservation.checkOutDate || new Date()),
          checkOut: Timestamp.fromDate(newCheckoutDate || new Date()),
          status: "Confirmed",
          primaryGuestFirstName: selectedReservation.primaryGuestFirstName || "",
          primaryGuestLastName: selectedReservation.primaryGuestLastName || "",
        bookerFirstName: selectedReservation.bookerFirstName || "",
        bookerLastName: selectedReservation.bookerLastName || "",
        email: selectedReservation.email || "",
        phone: selectedReservation.phone || "", 
        guests: selectedReservation.guests || [],
        
        // Payment information - FIXED: Ensure these are never undefined
        originalPrice: extensionRateDetails.totalCost || 0,
        remainderDue: extensionRateDetails.totalCost || 0,
        deposit: 0, // No deposit for extension
        paymentMethod: selectedReservation.paymentMethod || "Unknown",
        
        // Extension specific fields
        isExtension: true, 
        originalBookingId: selectedReservation.id,
        
        // Metadata
        createdAt: now,
        lastUpdated: now,
        notes: `Extension booking created from reservation #${selectedReservation.id}. ${notes || ""}`
      };
      
      // Add type-specific fields
      if (activeTab === "room") {
        extensionBookingData.roomNumber = roomId;
        extensionBookingData.roomType = selectedReservation.roomType || "";
        extensionBookingData.extensionDays = extendDays;
      } else {
        // Conference booking specific fields - following same pattern as room bookings
        extensionBookingData.room = roomId; // or venue field
        extensionBookingData.venue = roomId;
        extensionBookingData.extensionDays = extendDays;
  
        // Add any additional fields that exist in the original conference booking
        if (selectedReservation.packageType) {
          extensionBookingData.packageType = selectedReservation.packageType;
        }
        if (typeof selectedReservation.attendees !== 'undefined') {
          extensionBookingData.attendees = selectedReservation.attendees;
        }
      }
      
      // Validate critical fields before creating the booking
      if (
        extensionBookingData.originalPrice === undefined ||
        extensionBookingData.remainderDue === undefined
      ) {
        console.error("❌ Prevented addDoc due to undefined field values:", {
          originalPrice: extensionBookingData.originalPrice,
          remainderDue: extensionBookingData.remainderDue
        });
        alert("Failed to extend stay due to pricing calculation error. Please try again.");
        setIsProcessing(false);
        return;
      }
      if (!roomId || roomId === "unknown") {
        console.error("❌ Cannot create booking: roomId is undefined or invalid for conference.");
        alert("Failed to extend booking due to missing venue information.");
        setIsProcessing(false);
        return;
      }
      
      let newBookingId = null;
      if (activeTab === "room" && roomId === selectedReservation.roomNumber) {
        // Same room: DO NOT update 'checkOut', add 'extendedCheckOut' instead
        await updateDoc(originalReservationRef, {
          extendedCheckOut: Timestamp.fromDate(newCheckoutDate),
          hasBeenExtended: true,
          lastUpdated: now,
          extensionHistory,
          notes: selectedReservation.notes 
            ? `${selectedReservation.notes}\n${extensionNote}`
            : extensionNote
        });
      
        newBookingId = selectedReservation.id; // reuse ID
      
        await updateSameRoomBookings(
          roomId,
          selectedReservation.id,
          selectedReservation.id,
          selectedReservation.checkOutDate,
          newCheckoutDate,
          selectedReservation.guestName
        );
      }
      else if (activeTab === "conference" && roomId === selectedReservation.venueId) {
        // Same conference venue: Just update extendedCheckOut + history
        await updateDoc(originalReservationRef, {
          extendedCheckOut: Timestamp.fromDate(newCheckoutDate),
          hasBeenExtended: true,
          lastUpdated: now,
          extensionHistory,
          notes: selectedReservation.notes 
            ? `${selectedReservation.notes}\n${extensionNote}`
            : extensionNote
        });
      
        newBookingId = selectedReservation.id; // reuse ID
      } else {
        // Room change or different venue: create new booking
        const newBookingRef = await addDoc(bookingsRef, extensionBookingData);
        newBookingId = newBookingRef.id;
      
        await updateDoc(originalReservationRef, {
          extensionBookingId: newBookingId,
          hasBeenExtended: true,
          lastUpdated: now,
          extensionHistory,
          notes: selectedReservation.notes 
            ? `${selectedReservation.notes}\n${extensionNote}`
            : extensionNote
        });
      
        if (activeTab === "room") {
          await updateRoomBookings(
            selectedReservation.roomNumber,
            roomId,
            selectedReservation.id,
            newBookingId,
            selectedReservation.checkOutDate,
            newCheckoutDate,
            selectedReservation.guestName
          );
        }
      }
      
      
      // Validate before updating original booking
      if (!newBookingId) {
        console.error("❌ Failed to create extension booking");
        alert("Failed to extend stay due to internal error. Please try again.");
        setIsProcessing(false);
        return;
      }
      
      // 3. Update the original booking with reference to extension
      await updateDoc(originalReservationRef, {
        extensionBookingId: newBookingId
      });
      
      // 4. Update room documents as needed (only for room bookings)
      if (activeTab === "room") {
        if (roomId !== selectedReservation.roomNumber) {
          // Handle room change case - update both old and new room
          await updateRoomBookings(selectedReservation.roomNumber, roomId, selectedReservation.id, newBookingId, 
                                selectedReservation.checkOutDate, newCheckoutDate, selectedReservation.guestName);
        } else {
          // Same room case - just update the room's bookings array
          await updateSameRoomBookings(roomId, selectedReservation.id, newBookingId, 
                                    selectedReservation.checkOutDate, newCheckoutDate, selectedReservation.guestName);
        }
      }
      
      // 5. Add transaction record for billing/finance tracking
      const transactionData = {
        bookingId: newBookingId,
        originalBookingId: selectedReservation.id,
        guestName: selectedReservation.guestName,
        type: "Extension",
        amount: extensionCost,
        date: now,
        description: activeTab === "room" 
          ? `Stay extension by ${extendDays} days` 
          : `Venue booking extension by ${extendDays * 8} hours`,
        paymentStatus: "Outstanding",
        userId: auth.currentUser?.uid || "unknown"
      };
      
      // Add booking type specific fields
      if (activeTab === "room") {
        transactionData.roomNumber = roomId;
        transactionData.regularDays = extensionRateDetails.regularDays;
        transactionData.highSeasonDays = extensionRateDetails.highSeasonDays;
        transactionData.roomChanged = roomId !== selectedReservation.roomNumber;
        transactionData.originalRoom = selectedReservation.roomNumber;
        transactionData.newRoom = roomId;
      } else {
        transactionData.venueId = roomId;
        transactionData.venue = getVenueName(roomId);
        transactionData.hours = extendDays * 8;
      }
      
      await addDoc(collection(db, "transactions"), transactionData);
      
      // 6. Send email confirmation if available
      if (selectedReservation.email) {
        await sendExtensionConfirmation(
          {
            ...selectedReservation,
            roomNumber: roomId,
            extensionBookingId: newBookingId
          },
          extendDays,
          extensionCost,
          newCheckoutDate
        );
      }
      
      // Reset state and show success message
      setIsModalOpen(false);
      setSelectedReservation(null);
      setExtendDays(MIN_EXTENSION_DAYS);
      setNotes("");
      setDataChanged(true);
      setIsProcessing(false);
      setAvailableRooms([]);
      setSelectedNewRoom("");
      
      // Prepare success message based on booking type
      let successMessage = "";
      if (activeTab === "room") {
        successMessage = roomId !== selectedReservation.roomNumber
          ? `Stay extension created successfully! New booking #${newBookingId} in Room ${roomId}. Additional charge of GHS ${extensionCost.toFixed(2)} has been added to the guest's bill.`
          : `Stay extension created successfully! New booking #${newBookingId}. Additional charge of GHS ${extensionCost.toFixed(2)} has been added to the guest's bill.`;
      } else {
        // Conference booking success message
        successMessage = `Venue booking extended successfully! Additional ${extendDays} days added. Additional charge of GHS ${extensionCost.toFixed(2)} has been added to the invoice.`;
      }
      
      setSuccessMessage(successMessage);
      setShowSuccessPopup(true);
      
      // Hide popup after 4 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 4000);
      
    } catch (error) {
      console.error("Error extending stay:", error);
      setIsProcessing(false);
      alert("Failed to extend stay. Please try again.");
    }
  };

// Function to terminate a reservation
const terminateReservation = async () => {
  if (!selectedReservation) return;

  try {
    setIsProcessing(true);
    const collectionName = activeTab === "room" ? "bookings" : "conferenceBookings";
    
    // ✅ Move this line up and define it first
    let reservationToTerminate = selectedReservation;

    // ✅ Check if it's an extension
    if (reservationToTerminate.isExtension && reservationToTerminate.originalBookingId) {
      const originalRef = doc(db, collectionName, reservationToTerminate.originalBookingId);
      const originalSnap = await getDoc(originalRef);
      if (originalSnap.exists()) {
        reservationToTerminate = { id: originalSnap.id, ...originalSnap.data() };
      }
    }

    const reservationRef = doc(db, collectionName, reservationToTerminate.id);

  
    // Get current timestamp
    const now = Timestamp.now();
    
    // Create termination note
    const terminationNote = `${new Date().toLocaleString()}: Reservation terminated by ${auth.currentUser?.displayName || "Staff"}.`;
    
    await updateDoc(reservationRef, {
      status: "Terminated",
      lastUpdated: now,
      terminationDate: now,
      terminatedBy: auth.currentUser?.uid || "unknown",
      terminatedByName: auth.currentUser?.displayName || "Staff",
      notes: `${reservationToTerminate.notes || ''}\n${terminationNote}`
    });
    
    // Update room availability if applicable
    if (activeTab === "room" && reservationToTerminate.roomNumber) {
      const roomRef = doc(db, "rooms", reservationToTerminate.roomNumber);
      
      try {
        const roomSnapshot = await getDoc(roomRef);
        if (roomSnapshot.exists()) {
          const roomData = roomSnapshot.data();
          const bookings = roomData.bookings || [];
          
          // Filter out this booking from the room's bookings array
          const updatedBookings = bookings.filter(booking => 
            booking.bookingId !== reservationToTerminate.id
          );
          
          await updateDoc(roomRef, { 
            isAvailable: true,
            bookings: updatedBookings,
            lastUpdated: now
          });
        } else {
          // Fallback if room document doesn't exist
          await updateDoc(roomRef, { 
            isAvailable: true,
            lastUpdated: now
          });
        }
      } catch (error) {
        console.error("Error updating room availability:", error);
      }
    }
    
    // Add a record to terminations collection for tracking/reporting
    try {
      await addDoc(collection(db, "terminations"), {
        bookingId: reservationToTerminate.id,
        guestName: reservationToTerminate.guestName,
        roomNumber: reservationToTerminate.roomNumber || reservationToTerminate.room || "N/A",
        originalCheckIn: Timestamp.fromDate(reservationToTerminate.checkInDate),
        originalCheckOut: Timestamp.fromDate(reservationToTerminate.checkOutDate),
        terminationDate: now,
        reason: "Manual termination by staff",
        terminatedBy: auth.currentUser?.uid || "unknown",
        terminatedByName: auth.currentUser?.displayName || "Staff"
      });
      
    } catch (error) {
      console.error("Error adding termination record:", error);
    }
    
    // Close any open modal and reset state
    setConfirmationModalOpen(false);
    setSelectedReservation(null);
    setDataChanged(true);
    setIsProcessing(false);
    
    // Show success popup
    setSuccessMessage("Reservation terminated successfully");
    setShowSuccessPopup(true);
    
    // Hide popup after 4 seconds
    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 4000);
    
  } catch (error) {
    console.error("Error terminating reservation:", error);
    setIsProcessing(false);
    alert("Failed to terminate reservation. Please try again.");
  }
};

// Get status class
const getStatusClass = (status) => {
  if (!status) return 'pending';
  
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'checked in':
    case 'checked-in':
      return 'checked-in';
    case 'checked out':
    case 'checked-out':
      return 'checked-out';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'terminated':
      return 'terminated';
    default:
      return 'pending';
  }
};

// Get months for filtering
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1];
};


const getUniqueMonths = () => {
  const data = activeTab === "room" ? roomReservations : conferenceReservations;
  const uniqueMonths = new Set();
  
  data.forEach(res => {
    const monthYear = `${res.month}-${res.year}`;
    uniqueMonths.add(monthYear);
  });
  
  return Array.from(uniqueMonths)
    .sort((a, b) => {
      const [monthA, yearA] = a.split('-').map(Number);
      const [monthB, yearB] = b.split('-').map(Number);
      
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    })
    .map(monthYear => {
      const [month, year] = monthYear.split('-').map(Number);
      return {
        value: monthYear,
        label: `${getMonthName(month)} ${year}`
      };
    });
};

const filterData = (data) => {
  return data.filter(res => {
    // Name search
    const nameMatch = res.guestName ? 
      res.guestName.toLowerCase().includes(search.toLowerCase()) : 
      `${res.firstName || ''} ${res.lastName || ''}`.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const statusMatch = filterStatus ? 
      (res.status || '').toLowerCase() === filterStatus.toLowerCase() : 
      true;

    // Date filter
    let dateMatch = true;
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filterDateObj.setHours(0, 0, 0, 0);

      const checkInDate = new Date(res.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);

      const checkOutDate = new Date(res.checkOutDate);
      checkOutDate.setHours(0, 0, 0, 0);

      dateMatch = (checkInDate <= filterDateObj && checkOutDate >= filterDateObj);
    }

    // Month filter
    let monthMatch = true;
    if (filterMonth) {
      const [month, year] = filterMonth.split('-').map(Number);
      monthMatch = (res.month === month && res.year === year);
    }

    // Past Reservation filter - Fixed logic
    let pastMatch = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resCheckOut = new Date(res.checkOutDate);
    resCheckOut.setHours(0, 0, 0, 0);
    
    // If we want to show ONLY past reservations
    if (includePastReservations === true) {
      pastMatch = resCheckOut < today;
    }
    // If we want to show ONLY current/future reservations (default behavior)
    else if (includePastReservations === false) {
      pastMatch = resCheckOut >= today;
    }

    return nameMatch && statusMatch && dateMatch && monthMatch && pastMatch;
  });
};


// Get the active data based on the current tab
const activeData = activeTab === "room" ? roomReservations : conferenceReservations;
const filteredData = filterData(activeData);

// Calculate statistics
const getStatistics = () => {
  const total = filteredData.length;
  const confirmed = filteredData.filter(res => 
    (res.status || '').toLowerCase() === 'confirmed').length;
  const checkedIn = filteredData.filter(res => 
    (res.status || '').toLowerCase() === 'checked in' || 
    (res.status || '').toLowerCase() === 'checked-in').length;
  const checkedOut = filteredData.filter(res => 
    (res.status || '').toLowerCase() === 'checked out' || 
    (res.status || '').toLowerCase() === 'checked-out').length;
  const cancelled = filteredData.filter(res => 
    (res.status || '').toLowerCase() === 'cancelled' || 
    (res.status || '').toLowerCase() === 'canceled' ||
    (res.status || '').toLowerCase() === 'terminated').length;
  
  return { total, confirmed, checkedIn, checkedOut, cancelled };
};

const stats = getStatistics();

return (
  <div className="dashboard-container">
    <Sidebar />
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <p className="page-subtitle">Comprehensive reservation management</p>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-title">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card confirmed-card">
          <div className="stat-title">Confirmed</div>
          <div className="stat-value">{stats.confirmed}</div>
        </div>
        <div className="stat-card checked-in-card">
          <div className="stat-title">Checked In</div>
          <div className="stat-value">{stats.checkedIn}</div>
        </div>
        <div className="stat-card checked-out-card">
          <div className="stat-title">Checked Out</div>
          <div className="stat-value">{stats.checkedOut}</div>
        </div>
        <div className="stat-card cancelled-card">
          <div className="stat-title">Cancelled/Terminated</div>
          <div className="stat-value">{stats.cancelled}</div>
        </div>
      </div>

      <div className="filters-container">
  <div className="filters-row">
    <div className="search-box">
      <input
        type="text"
        placeholder="Search by guest name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    <div className="filter-box">
      <select 
        value={filterStatus} 
        onChange={(e) => setFilterStatus(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Checked in">Checked in</option>
        <option value="Checked out">Checked out</option>
        <option value="Cancelled">Cancelled</option>
        <option value="Terminated">Terminated</option>
      </select>
    </div>
    <div className="filter-box">
      <select 
        value={filterMonth} 
        onChange={(e) => setFilterMonth(e.target.value)}
      >
        <option value="">All Months</option>
        {getUniqueMonths().map(month => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
    <div className="filter-box">
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        placeholder="Filter by specific date"
      />
    </div>
    <div className="filter-box toggle-box">
  <label className="toggle-label">
    <span>Show Past Reservations</span>
    <input
      type="checkbox"
      checked={includePastReservations}
      onChange={(e) => setIncludePastReservations(e.target.checked)}
    />
    <span className="toggle-switch"></span>
  </label>
</div>


  </div>
</div>
      {/* Tab Selector */}
      <div className="tabs-container">
        <div 
          className={`tab ${activeTab === "room" ? "active" : ""}`}
          onClick={() => setActiveTab("room")}
        >
          Room Bookings
        </div>
        <div 
          className={`tab ${activeTab === "conference" ? "active" : ""}`}
          onClick={() => setActiveTab("conference")}
        >
          Conference Bookings
        </div>
      </div>

      {/* Reservations Table */}
      <div className="table-container">
        {loading || isProcessing ? (
          <div className="loading">
            {isProcessing ? "Processing your request..." : "Loading reservations..."}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="reservations-table">
              <thead>
  <tr>
    <th>Guest Name</th>
    <th>Check-in</th>
    <th>Check-out</th>
    <th>Extended Check-out</th> {/* <-- NEW */}
    <th>{activeTab === "room" ? "Room" : "Venue"}</th>
    <th>{activeTab === "room" ? "Stay" : "Duration"}</th>
    <th>Created</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {filteredData.length > 0 ? (
    filteredData.map((res) => (
      <tr key={res.id}>
        <td>{res.guestName}</td>
        <td>{res.checkInFormatted}</td>
        <td>{res.checkOutFormatted}</td>
        <td>
          {res.extendedCheckOut
            ? formatDate(
                res.extendedCheckOut instanceof Timestamp
                  ? res.extendedCheckOut.toDate()
                  : new Date(res.extendedCheckOut)
              )
            : "—"}
        </td>
        <td>
          {activeTab === "room"
            ? res.roomNumber || res.room || "N/A"
            : res.venue || getVenueName(res.room || res.venueId)}
        </td>
        <td>
          {activeTab === "room"
            ? `${res.stayLength} night${res.stayLength !== 1 ? "s" : ""}`
            : `${res.eventLength} hour${res.eventLength !== 1 ? "s" : ""}`}
        </td>
        <td>{res.createdAtFormatted}</td>
        <td>
          <span className={`status ${getStatusClass(res.status)}`}>
            {res.status || "Pending"}
            {res.hasPendingExtensionRequest && (
              <span className="pending-tag"> (Extension Pending)</span>
            )}
          </span>
        </td>
        <td className="actions-cell">
          {(res.status === "Confirmed" ||
            res.status === "Checked in" ||
            res.status === "Checked-in") && (
            <>
              <button
                className="action-btn extend-btn"
                onClick={() => {
                  setSelectedReservation(res);
                  setIsModalOpen(true);
                }}
                title="Extend Stay"
                disabled={res.hasPendingExtensionRequest}
              >
                Extend
              </button>

              <button
                className="action-btn cancel-btn"
                onClick={() => {
                  setSelectedReservation(res);
                  setConfirmationModalOpen(true);
                }}
                title="Terminate Reservation"
              >
                Terminate
              </button>
            </>
          )}
        </td>
      </tr>
    ))
  ) : (
    <tr className="empty-row">
      <td colSpan="9">No reservations found matching your criteria.</td>
    </tr>
  )}
</tbody>

              </table>
            </div>
            
            <div className="pagination">
              <div className="showing-entries">
                Showing {filteredData.length} of {activeData.length} entries
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    
    {/* Extension Modal */}
    {isModalOpen && selectedReservation && (
      <div className="modal-overlay">
        <div className="modal-content modal-content-large">
          <div className="modal-header">
            <h3>Extend {activeTab === "room" ? "Stay" : "Booking"}</h3>
            <button className="close-btn" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>×</button>
          </div>
          
          <div className="modal-body">
            {isProcessing ? (
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Processing your request...</p>
              </div>
            ) : (
              <>
<div className="reservation-summary-box">
  <h4 className="summary-heading">Reservation Summary</h4>
  <div className="summary-grid">
    <div className="summary-item">
      <span className="summary-label">Guest:</span>
      <span className="summary-value">{selectedReservation.guestName}</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">{activeTab === "room" ? "Room:" : "Venue:"}</span>
      <span className="summary-value">
        {activeTab === "room"
          ? (selectedReservation.roomNumber || selectedReservation.room || "N/A")
          : (selectedReservation.venue || getVenueName(selectedReservation.venueId || selectedReservation.room) || "N/A")}
      </span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Check-in:</span>
      <span className="summary-value">{selectedReservation.checkInFormatted}</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Check-out:</span>
      <span className="summary-value">{selectedReservation.checkOutFormatted}</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">{activeTab === "room" ? "Stay:" : "Duration:"}</span>
      <span className="summary-value">
        {activeTab === "room"
          ? `${selectedReservation.stayLength} night${selectedReservation.stayLength !== 1 ? 's' : ''}`
          : `${selectedReservation.eventLength} hour${selectedReservation.eventLength !== 1 ? 's' : ''}`}
      </span>
    </div>
  </div>
</div>

              
                <div className="extension-form">
                  <h4>Extension Details</h4>
                  
                  <div className="form-group">
                    <label>
                      {activeTab === "conference" 
                        ? `Extend by (days):` 
                        : `Extend by (days):`}
                    </label>
                    <input 
                      type="number" 
                      min={activeTab === "conference" ? 1 : MIN_EXTENSION_DAYS} 
                      value={extendDays < (activeTab === "conference" ? 1 : MIN_EXTENSION_DAYS) 
                        ? (activeTab === "conference" ? 1 : MIN_EXTENSION_DAYS) 
                        : extendDays} 
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setExtendDays(Math.max(activeTab === "conference" ? 1 : MIN_EXTENSION_DAYS, value));
                      }}
                    />
                    <small className="form-help-text">
                      {activeTab === "conference" 
                        ? `Minimum extension is 1 day` 
                        : `Minimum extension is ${MIN_EXTENSION_DAYS} day`}
                    </small>
                  </div>
                  
                  <div className="new-checkout-preview">
  <label>New Check-out Date:</label>
  <div className="preview-date">
    {calculatedNewCheckoutDate ? formatDate(calculatedNewCheckoutDate, false) : "N/A"}
  </div>
</div>

                  
                  {activeTab === "room" && !isRoomAvailable && (
                    <div className="room-unavailable-alert">
                      <h4 className="alert-title">⚠️ Room Not Available</h4>
                      <p>The selected room is already booked during your extended stay period.</p>
                      
                      {availableRooms.length > 0 ? (
                        <div className="alternative-rooms">
                          <h5>Alternative Rooms:</h5>
                          <div className="room-selection">
                            {availableRooms.map(room => (
                              <div 
                                key={room.id} 
                                className={`room-option ${selectedNewRoom === room.id ? 'selected' : ''}`}
                                onClick={() => setSelectedNewRoom(room.id)}
                              >
                                <input 
                                  type="radio" 
                                  name="newRoom" 
                                  value={room.id} 
                                  checked={selectedNewRoom === room.id}
                                  onChange={() => setSelectedNewRoom(room.id)}
                                />
                                <span className="room-details">
                                  Room {room.id} | {room.type} | GHS {room.price.toFixed(2)} per night
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="no-rooms-alert">No alternative rooms are available for this extension period.</p>
                      )}
                    </div>
                  )}
                  
                  <div className="cost-details-box">
                    <h4>Cost Details</h4>
                    
                    <div className="cost-breakdown">
                      <div className="cost-row">
                        <span className="cost-label">
                          {activeTab === "conference" ? "Base daily rate:" : "Base daily rate:"}
                        </span>
                        <span className="cost-value">GHS {extensionRateDetails.baseRate.toFixed(2)}</span>
                      </div>
                      
                      {activeTab === "conference" ? (
    <div className="cost-row">
    <span className="cost-label">Days:</span>
    <span className="cost-value">
      {extensionRateDetails.days} day{extensionRateDetails.days !== 1 ? "s" : ""} × GHS {extensionRateDetails.adjustedRate.toFixed(2)}
    </span>
  </div>
  
                      ) : (
                        <>
                          <div className="cost-row">
                            <span className="cost-label">Regular season days:</span>
                            <span className="cost-value">
                              {extensionRateDetails.regularDays} days × GHS {extensionRateDetails.adjustedRate.toFixed(2)}
                            </span>
                          </div>
                          
                          {extensionRateDetails.highSeasonDays > 0 && (
                            <div className="cost-row">
                              <span className="cost-label">High season days:</span>
                              <span className="cost-value">
                                {extensionRateDetails.highSeasonDays} days × GHS {(extensionRateDetails.adjustedRate * 1.25).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="cost-row total-row">
                        <span className="cost-label">Total extension cost:</span>
                        <span className="cost-value total-cost">GHS {extensionRateDetails.totalCost.toFixed(2)}</span>
                      </div>
                      
                      {extensionRateDetails.discount > 0 && (
                        <div className="cost-row discount-row">
                          <span className="cost-label">Discount applied:</span>
                          <span className="cost-value discount">-GHS {extensionRateDetails.discount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Notes:</label>
                    <textarea 
                      rows="3" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reason for extension (optional)"
                    ></textarea>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              className="cancel-button" 
              onClick={() => setIsModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </button>
            
            <button 
              className="confirm-button" 
              onClick={extendStay}
              disabled={isProcessing || (activeTab === "room" && !isRoomAvailable && availableRooms.length > 0 && !selectedNewRoom)}
            >
              {activeTab === "room" && !isRoomAvailable && availableRooms.length > 0 
                ? 'Confirm Alternative Room' 
                : 'Confirm Extension'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Termination Confirmation Modal */}
    {confirmationModalOpen && selectedReservation && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Confirm Termination</h3>
            <button className="close-btn" onClick={() => setConfirmationModalOpen(false)} disabled={isProcessing}>×</button>
          </div>
          
          <div className="modal-body">
            <p>Are you sure you want to terminate this reservation?</p>
            <div className="reservation-details">
              <p><strong>Guest:</strong> {selectedReservation.guestName}</p>
              <p><strong>{activeTab === "room" ? "Room" : "Venue"}:</strong> {selectedReservation.roomNumber || selectedReservation.room || selectedReservation.venue || "N/A"}</p>
              <p><strong>Check-in:</strong> {selectedReservation.checkInFormatted}</p>
              <p><strong>Check-out:</strong> {selectedReservation.checkOutFormatted}</p>
            </div>
            <p className="warning-text">This action cannot be undone.</p>
          </div>
          
          <div className="modal-footer">
            <button 
              className="cancel-button" 
              onClick={() => setConfirmationModalOpen(false)} 
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button 
              className="delete-button" 
              onClick={terminateReservation} 
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Terminate Reservation"}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {showSuccessPopup && (
  <div className="center-success-message">
    {successMessage}
  </div>
)}

  </div>
);
};

export default Reservations;