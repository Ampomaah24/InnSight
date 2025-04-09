import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Add auth import
import NavMenu from "../components/NavMenu";
import "../assets/styles/RoomBooking.css";

const RoomBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth(); // Initialize auth

  // App state variables
  const [rooms, setRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomIndexes, setRoomIndexes] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login state

  // Discount configuration pulled from Firestore
  const [discounts, setDiscounts] = useState({
    conferenceAttendeeDiscount: 0,
    corporateDiscount: 0,
    groupDiscountMinRooms: 0,
    groupDiscountRate: 0,
    longStayDiscount: 0,
    longStayMinNights: 0,
    // weekdayDiscount: 0
  });

  // Extract query parameters from the URL
  const params = new URLSearchParams(location.search);
  const checkIn = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : null;
  const checkOut = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : null;
  const fromConference = params.get("fromConference") === "true";

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    
    return () => unsubscribe();
  }, [auth]);

  // Fetch discounts from Firestore ONLY if user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      console.log("User not logged in, skipping discount fetch");
      return;
    }
    
    const fetchDiscounts = async () => {
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
            // weekdayDiscount: discountData.weekdayDiscount || 0
          });
        } else {
          console.warn("Discounts document doesn't exist");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    };

    fetchDiscounts();
  }, [isLoggedIn]); // Only run when isLoggedIn changes

  // Fix for scrolling issues
  useEffect(() => {
    // Reset any scrollTop that might be causing the cutoff
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
    
    // Force scrolling to work properly
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    

    const root = document.getElementById('root');
    if (root) {
      root.style.minHeight = '100vh';
      root.style.paddingTop = '0';
      root.style.overflow = 'visible';
    }
    

    const container = document.querySelector('.room-booking-container');
    if (container) {
      container.style.marginTop = '0';
    }
    
  
    setTimeout(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => {
    
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (root) {
        root.style.minHeight = '';
        root.style.paddingTop = '';
        root.style.overflow = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!checkIn || !checkOut) {
      console.error(" Missing query parameters for fetching rooms");
      setLoading(false);
      return;
    }

     //  Fetch available rooms from Firestore
    const getAvailableRooms = async () => {
      try {
        const roomsCollection = collection(db, "rooms");
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };
          if (!room.bookings || room.bookings.length === 0) {
            availableRooms.push(room);
            return;
          }

          const selectedCheckIn = new Date(checkIn);
          const selectedCheckOut = new Date(checkOut);

          const isBooked = room.bookings.some((booking) => {
            if (!booking.checkIn || !booking.checkOut) return false;
            const bookedCheckIn = new Date(booking.checkIn);
            const bookedCheckOut = new Date(booking.checkOut);
            return selectedCheckIn <= bookedCheckOut && selectedCheckOut >= bookedCheckIn;
          });

          if (!isBooked) availableRooms.push(room);
        });

        setRooms(availableRooms);
        setLoading(false);

        const initialIndexes = {};
        availableRooms.forEach((room) => {
          if (!initialIndexes[room.t_room]) initialIndexes[room.t_room] = 0;
        });
        setRoomIndexes(initialIndexes);
      } catch (error) {
        console.error(" Error fetching available rooms:", error);
        setRooms([]);
        setLoading(false);
      }
    };

    getAvailableRooms();
  }, [checkIn, checkOut]);

  //  Group rooms by type
  const groupedRooms = rooms.reduce((acc, room) => {
    const type = room.t_room || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

  const changeRoomIndex = (roomType, direction) => {
    setRoomIndexes((prevIndexes) => {
      const totalRooms = groupedRooms[roomType].length;
      const currentIndex = prevIndexes[roomType];
      let newIndex = direction === "next"
        ? (currentIndex + 1) % totalRooms
        : (currentIndex - 1 + totalRooms) % totalRooms;
      return { ...prevIndexes, [roomType]: newIndex };
    });
  };

  const toggleRoomSelection = (room) => {
    setSelectedRooms((prevSelected) => {
      const isSelected = prevSelected.some((r) => r.id === room.id);
      return isSelected
        ? prevSelected.filter((r) => r.id !== room.id)
        : [...prevSelected, room];
    });
  };

  // Calculate nights between check-in and check-out
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return nights > 0 ? nights : 1;
  };

  const nights = calculateNights();
  
  // Determine which discount to apply - only if user is logged in
  const getApplicableDiscount = () => {
    // No discounts for logged-out users
    if (!isLoggedIn) {
      return 0;
    }
    
    // Priority of discounts
    if (fromConference) {
      return discounts.conferenceAttendeeDiscount; // Conference attendee discount
    }
    
    // Long stay discount if staying longer than min nights
    if (nights >= discounts.longStayMinNights) {
      return discounts.longStayDiscount;
    }
    
    // Group discount if selecting more than min rooms
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) {
      return discounts.groupDiscountRate;
    }
    
    return 0; // No discount applies
  };

  // Get discount name for display
  const getDiscountName = () => {
    if (!isLoggedIn) return '';
    
    if (fromConference) return 'Conference Attendee';
    if (nights >= discounts.longStayMinNights) return 'Long Stay';
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) return 'Group Booking';
    return '';
  };

  const applicableDiscount = getApplicableDiscount();
  const discountName = getDiscountName();

  // Function to return to home page
  const goToHome = () => {
    navigate('/');
  };

  // Function to go to login page
  const goToLogin = () => {
    // Save current selection in session storage if needed
    navigate('/login', { state: { returnPath: location.pathname + location.search } });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Searching for available rooms...</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="no-rooms-container">
        <div className="nav-container">
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="no-rooms-content">
          <h2>No Available Rooms</h2>
          <p>We couldn't find any available rooms for your selected dates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-booking-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
         
      <div className="back-button-container">
        <h2 className="available-rooms-heading">Available Rooms</h2>
      </div>
      
      {!isLoggedIn && (
        <div className="login-prompt">
          <p>Sign in to access exclusive discounts!</p>
          
        </div>
      )}

      <div className="rooms-list">
        {checkIn && checkOut && (
          <div className="booking-dates-info">
            <p>
              <span className="date-label">Check In:</span> {new Date(checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p>
              <span className="date-label">Check Out:</span> {new Date(checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p>
              <span className="date-label">Duration:</span> {nights} {nights === 1 ? 'night' : 'nights'}
            </p>
          </div>
        )}

        {Object.keys(groupedRooms).map((roomType) => {
          const currentIndex = roomIndexes[roomType] || 0;
          const currentRoom = groupedRooms[roomType][currentIndex];
          
          // Apply discount if applicable
          const discount = getApplicableDiscount();
          const discountedPrice = discount > 0
            ? currentRoom.price - (currentRoom.price * discount / 100)
            : currentRoom.price;
            
          const totalRooms = groupedRooms[roomType].length;
          const totalPrice = discountedPrice * nights;

          return (
            <div key={roomType} className="room-type-section">
              <h3 className="room-type-title">{roomType}</h3>

              <div className="room-row">
                <div className="image-carousel">
                  
                  <button 
                    className="carousel-btn prev" 
                    onClick={() => changeRoomIndex(roomType, "prev")}
                  ></button>
                  <img 
                    src={currentRoom.image || "/placeholder-room.jpg"} 
                    alt={`${roomType} room`} 
                    className="room-image" 
                  />
                  <button 
                    className="carousel-btn next" 
                    onClick={() => changeRoomIndex(roomType, "next")}
                  ></button>
                  <div className="image-pagination">{currentIndex + 1} of {totalRooms}</div>
                </div>

                <div className="room-info">
                  <div className="room-name">{roomType} Room</div>
                  
                  <div className="price-section">
                    {discount > 0 && (
                      <div className="original-price" style={{ textDecoration: "line-through", color: "#999", fontSize: "0.9em" }}>
                        GHS {currentRoom.price.toFixed(2)}
                      </div>
                    )}
                    <h3>GHS {discountedPrice.toFixed(2)} <span className="per-night">per night</span></h3>
                    <p className="total-price">Total: GHS {totalPrice.toFixed(2)} for {nights} {nights === 1 ? 'night' : 'nights'}</p>
                    {discount > 0 && (
                      <small className="discount-label">{discount}% {discountName} discount applied</small>
                    )}
                  </div>

                  <div className="includes-section">
                    <h4>Room Includes:</h4>
                    <ul>
                      {currentRoom.amenities && currentRoom.amenities.map((item, index) => (
                        <li key={index}><span className="check">✓</span> {item}</li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    className={`select-room ${selectedRooms.some(r => r.id === currentRoom.id) ? 'selected' : ''}`}
                    onClick={() => toggleRoomSelection(currentRoom)}
                  >
                    {selectedRooms.some(r => r.id === currentRoom.id) ? 'Room Selected' : 'Select Room'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedRooms.length > 0 && (
        <button
          className="proceed-booking"
          onClick={() => {
            const encodedRooms = encodeURIComponent(JSON.stringify(selectedRooms));
            const encodedCheckIn = encodeURIComponent(checkIn);
            const encodedCheckOut = encodeURIComponent(checkOut);
            const query = new URLSearchParams({
              rooms: encodedRooms,
              checkIn: encodedCheckIn,
              checkOut: encodedCheckOut,
              roomCategory: "regular"
            }).toString();
            
            navigate(`/book-room?${query}`);
          }}
        >
          Book {selectedRooms.length} {selectedRooms.length === 1 ? 'Room' : 'Rooms'}
        </button>
      )}
    </div>
  );
};

export default RoomBooking;