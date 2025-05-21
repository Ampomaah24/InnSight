import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; 
import NavMenu from "../components/NavMenu";
import "../assets/styles/RoomBooking.css";
import { useBooking } from "../components/BookingContext"; 
import roomImage1 from "../assets/images/pixelcut-export-4.jpg";
import roomImage2 from "../assets/images/ampomaah-hotel-2.jpg";
import roomImage3 from "../assets/images/Ampomaah-Hotel-Accra-Exterior-2.jpg"; 


const RoomBooking = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Get booking data from context
  const { bookingData, setBookingData } = useBooking();

  const getRoomPlaceholder = (roomType) => {
    switch (roomType?.toLowerCase()) {
      case 'single bed':
        return roomImage1;
      case 'double bed':
        return roomImage2;
      case 'twin bed':
        return roomImage3;
    }
  };

  // App state variables
  const [rooms, setRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomIndexes, setRoomIndexes] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [roomCounts, setRoomCounts] = useState({}); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  // Discounts pullled from Firestore
  const [discounts, setDiscounts] = useState({
    conferenceAttendeeDiscount: 0,
    corporateDiscount: 0,
    groupDiscountMinRooms: 0,
    groupDiscountRate: 0,
    longStayDiscount: 0,
    longStayMinNights: 0,
  
  });

  // Extracting booking data 
  const checkIn = bookingData?.checkIn || null;
  const checkOut = bookingData?.checkOut || null;
  const fromConference = bookingData?.fromConference === true;

  useEffect(() => {
    if (!bookingData || !checkIn || !checkOut) {
      navigate('/services');
    }
  }, [bookingData, checkIn, checkOut, navigate]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    
    return () => unsubscribe();
  }, [auth]);


  useEffect(() => {
    if (!isLoggedIn) {
      console.log("User not logged in, skipping discount fetch");
      return;
    }
      // Fetch discounts from saved admin settings in firebase 
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
       
          });
        } else {
          console.warn("Discounts document doesn't exist");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    };

    fetchDiscounts();
  }, [isLoggedIn]); 


  useEffect(() => {
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
    

    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
    const root = document.getElementById('root');
    if (root) {
      root.style.minHeight = '100vh';
      root.style.paddingTop = '0';
      root.style.overflow = 'visible';
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
      console.error("Missing booking data for fetching rooms");
      setLoading(false);
      return;
    }

    // Fetch available rooms from db
    const getAvailableRooms = async () => {
      try {
        const roomsCollection = collection(db, "rooms");
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        let availableRooms = [];
        const initialRoomCounts = {}; 

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };
          if (!room.bookings || room.bookings.length === 0) {
            availableRooms.push(room);
         
            initialRoomCounts[room.t_room] = (initialRoomCounts[room.t_room] || 0) + 1;
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

          if (!isBooked) {
            availableRooms.push(room);
            initialRoomCounts[room.t_room] = (initialRoomCounts[room.t_room] || 0) + 1;
          }
        });

        setRooms(availableRooms);
        setLoading(false);

        const initialIndexes = {};
        availableRooms.forEach((room) => {
          if (!initialIndexes[room.t_room]) initialIndexes[room.t_room] = 0;
        });
        setRoomIndexes(initialIndexes);
      
        const initialSelectionCounts = {};
        Object.keys(initialRoomCounts).forEach(roomType => {
          initialSelectionCounts[roomType] = 0;
        });
        setRoomCounts(initialSelectionCounts);
      } catch (error) {
        console.error("Error fetching available rooms:", error);
        setRooms([]);
        setLoading(false);
      }
    };

    getAvailableRooms();
  }, [checkIn, checkOut]);

  // Grouping rooms by type
  const groupedRooms = rooms.reduce((acc, room) => {
    const type = room.t_room || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

  
  const roomAvailabilityCounts = Object.keys(groupedRooms).reduce((acc, type) => {
    acc[type] = groupedRooms[type].length;
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

  //  function to handle multiple rooms of the same type
  const toggleRoomSelection = (room) => {
    const roomType = room.t_room;
    
    setRoomCounts(prevCounts => {
      const currentCount = prevCounts[roomType] || 0;
      let newCount;

      if (currentCount >= roomAvailabilityCounts[roomType]) {
        newCount = 0;
      } else {
        newCount = currentCount + 1;
      }
      updateSelectedRooms(roomType, newCount);
      
      return { ...prevCounts, [roomType]: newCount };
    });
  };
  
  const updateSelectedRooms = (roomType, count) => {
    setSelectedRooms(prevSelected => {
      const filteredRooms = prevSelected.filter(r => r.t_room !== roomType);
      if (count === 0) {
        return filteredRooms;
      }

      const roomsToAdd = groupedRooms[roomType].slice(0, count);
      return [...filteredRooms, ...roomsToAdd];
    });
  };

  //  function to decrease room count
  const decreaseRoomCount = (roomType) => {
    setRoomCounts(prevCounts => {
      const currentCount = prevCounts[roomType] || 0;
      if (currentCount <= 0) return prevCounts; 
      
      const newCount = currentCount - 1;
      updateSelectedRooms(roomType, newCount);
      return { ...prevCounts, [roomType]: newCount };
    });
  };

  // function to increase room count
  const increaseRoomCount = (roomType) => {
    setRoomCounts(prevCounts => {
      const currentCount = prevCounts[roomType] || 0;
      const maxAvailable = roomAvailabilityCounts[roomType] || 0;
      
      if (currentCount >= maxAvailable) return prevCounts; 
      
      const newCount = currentCount + 1;
      updateSelectedRooms(roomType, newCount);
      return { ...prevCounts, [roomType]: newCount };
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

  const getApplicableDiscount = () => {
    // No discounts for guest users
    if (!isLoggedIn) {
      return 0;
    }

    if (fromConference) {
      return discounts.conferenceAttendeeDiscount; 
    }
    
    if (nights >= discounts.longStayMinNights) {
      return discounts.longStayDiscount;
    }
 
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) {
      return discounts.groupDiscountRate;
    }
    
    return 0; 
  };


  const getDiscountName = () => {
    if (!isLoggedIn) return '';
    
    if (fromConference) return 'Conference Attendee';
    if (nights >= discounts.longStayMinNights) return 'Long Stay';
    if (selectedRooms.length >= discounts.groupDiscountMinRooms) return 'Group Booking';
    return '';
  };

  const applicableDiscount = getApplicableDiscount();
  const discountName = getDiscountName();

  const goToHome = () => {
    navigate('/');
  };

  const goToLogin = () => {
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  };
  
  const proceedToBooking = () => {
    if (selectedRooms.length === 0) {
      alert("Please select at least one room to book");
      return;
    }
    
    setBookingData({
      ...bookingData, 
      rooms: selectedRooms,
      nights,
      discount: {
        rate: applicableDiscount,
        type: discountName
      },
      roomCategory: "regular"
    });
    
    // Navigate to booking page with no URL parameters
    navigate('/book-room');
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
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
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
          <button onClick={goToLogin} className="login-button">Log In</button>
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
          
       
          const discount = getApplicableDiscount();
          const discountedPrice = discount > 0
            ? currentRoom.price - (currentRoom.price * discount / 100)
            : currentRoom.price;
            
          const totalRooms = groupedRooms[roomType].length;
          const totalPrice = discountedPrice * nights;
          const currentRoomCount = roomCounts[roomType] || 0;
          const maxAvailable = roomAvailabilityCounts[roomType] || 0;

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
                    src={getRoomPlaceholder(roomType)} 
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

         
                  <div className="room-quantity-selector">
                    <span>Number of Rooms: </span>
                    <div className="quantity-controls">
                      <button 
                        className="quantity-btn" 
                        onClick={() => decreaseRoomCount(roomType)}
                        disabled={currentRoomCount <= 0}
                      >
                        -
                      </button>
                      <span className="quantity-display">{currentRoomCount}</span>
                      <button 
                        className="quantity-btn" 
                        onClick={() => increaseRoomCount(roomType)}
                        disabled={currentRoomCount >= maxAvailable}
                      >
                        +
                      </button>
                    </div>
                    <div className="availability-info">
                      {maxAvailable} available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedRooms.length > 0 && (
        <button
          className="proceed-booking"
          onClick={proceedToBooking}
        >
          Book {selectedRooms.length} {selectedRooms.length === 1 ? 'Room' : 'Rooms'}
        </button>
      )}
    </div>
  );
};

export default RoomBooking;