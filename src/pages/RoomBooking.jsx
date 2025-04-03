import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/RoomBooking.css";

const RoomBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomIndexes, setRoomIndexes] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]);

  const params = new URLSearchParams(location.search);
  const checkIn = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : null;
  const checkOut = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : null;
  const fromConference = params.get("fromConference") === "true";
  const discount = parseFloat(params.get("discount")) || 0;

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
    
    // Fix any potential CSS issues that might be affecting the container height
    const root = document.getElementById('root');
    if (root) {
      root.style.minHeight = '100vh';
      root.style.paddingTop = '0';
      root.style.overflow = 'visible';
    }
    
    // Remove any large margin-top that might be causing cutoff
    const container = document.querySelector('.room-booking-container');
    if (container) {
      container.style.marginTop = '0';
    }
    
    // Force layout recalculation
    setTimeout(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => {
      // Clean up when component unmounts
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
      console.error("❌ Missing query parameters for fetching rooms");
      setLoading(false);
      return;
    }

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
        console.error("❌ Error fetching available rooms:", error);
        setRooms([]);
        setLoading(false);
      }
    };

    getAvailableRooms();
  }, [checkIn, checkOut]);

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
          <button 
            className="back-button" 
            onClick={() => navigate('/')}
          >
            Return to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-booking-container">
      {/* Moved NavMenu to a container with left alignment */}
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <h2 className="available-rooms-heading">Available Rooms</h2>

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
          const discountedPrice = fromConference
            ? currentRoom.price - (currentRoom.price * discount / 100)
            : currentRoom.price;
          const totalRooms = groupedRooms[roomType].length;
          const totalPrice = discountedPrice * nights;

          return (
            <div key={roomType} className="room-type-section">
              <h3 className="room-type-title">{roomType}</h3>

              <div className="room-row">
                <div className="image-carousel">
                  {/* Updated carousel buttons to use CSS arrows instead of HTML entities */}
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
                    <h3>GHS {discountedPrice.toFixed(2)} <span className="per-night">per night</span></h3>
                    <p className="total-price">Total: GHS {totalPrice.toFixed(2)} for {nights} {nights === 1 ? 'night' : 'nights'}</p>
                    {fromConference && (
                      <small className="discount-label">{discount}% conference discount applied</small>
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
              roomCategory: "regular",
              ...(fromConference && { discount: discount.toString(), fromConference: "true" }),
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