import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import { useBooking } from "../components/BookingContext"; 
import "../assets/styles/CBooking.css";
import cImage1 from "../assets/images/2127160_1-2.jpg";
import cImage2 from "../assets/images/ampomaah-hotel-accra-pic-48.jpg";
import cImage3 from "../assets/images/Prague-small-conference-room-2.jpg"; 

const ConferenceBooking = () => {
  const navigate = useNavigate();
  const { bookingData, setBookingData } = useBooking(); 
  const [conference_rooms, setConferenceRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getCPlaceholder = (roomType) => {
    switch (roomType?.toLowerCase()) {
      case 'long':
        return cImage1;
      case 'big':
        return cImage2;
      case 'small':
        return cImage3;
    }
  };
  
  // Get dates from context instead of URL
  const startDate = bookingData?.startDate ? new Date(bookingData.startDate) : null;
  const endDate = bookingData?.endDate ? new Date(bookingData.endDate) : null;

  // Calculate duration between start and end dates
  const calculateDuration = () => {
    if (!startDate || !endDate) return 1;
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return days > 0 ? days : 1;
  };

  const duration = calculateDuration();

  // Redirect to services page if missing date information
  useEffect(() => {
    if (!startDate || !endDate) {
      navigate('/services');
    }
  }, [startDate, endDate, navigate]);

  useEffect(() => {
    // Fix any scrolling issues
    window.scrollTo(0, 0);
    
    // Force scrolling to work properly
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    
    if (!startDate || !endDate) {
      console.error("Missing dates in booking context for fetching conference rooms");
      setLoading(false);
      return;
    }

    const fetchAvailableConferenceRooms = async () => {
      try {
        setError(null);
        const roomsCollection = collection(db, "conference_rooms");
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };

          if (!room.bookings || room.bookings.length === 0) {
            availableRooms.push(room);
            return;
          }

          const selectedStartDate = new Date(startDate);
          const selectedEndDate = new Date(endDate);

          // Check for booking conflicts, accounting for both naming conventions
          const isBooked = room.bookings.some((booking) => {
            // Support both naming conventions (startDate/endDate and checkIn/checkOut)
            const bookedStart = booking.startDate ? new Date(booking.startDate) : 
                            (booking.checkIn ? new Date(booking.checkIn) : null);
                            
            const bookedEnd = booking.endDate ? new Date(booking.endDate) : 
                          (booking.checkOut ? new Date(booking.checkOut) : null);
            
            // Skip invalid bookings
            if (!bookedStart || !bookedEnd) return false;
            
            // Check for date overlap
            return selectedStartDate < bookedEnd && selectedEndDate > bookedStart;
          });

          if (!isBooked) {
            availableRooms.push(room);
          }
        });

        setConferenceRooms(availableRooms);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching conference rooms:", error);
        setError("Failed to load conference rooms. Please try again later.");
        setConferenceRooms([]);
        setLoading(false);
      }
    };

    fetchAvailableConferenceRooms();
  }, [startDate, endDate]);

  const prevRoom = () => setCurrentIndex((prevIndex) => (prevIndex === 0 ? conference_rooms.length - 1 : prevIndex - 1));
  const nextRoom = () => setCurrentIndex((prevIndex) => (prevIndex === conference_rooms.length - 1 ? 0 : prevIndex + 1));

  const goToServices = () => {
    navigate('/services');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Searching for available conference rooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="croom-booking-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        
        <div className="no-rooms-container">
          <div className="no-rooms-content">
            <h2>Error</h2>
            <p>{error}</p>
            <button 
              className="book-now"
              onClick={goToServices}
            >
              Return to Booking Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (conference_rooms.length === 0) {
    return (
      <div className="croom-booking-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        
        <div className="no-rooms-container">
          <div className="no-rooms-content">
            <h2>No Conference Rooms Available</h2>
            <p>We couldn't find any available conference rooms for your selected dates.</p>
            <button 
              className="book-now"
              onClick={goToServices}
            >
              Select Different Dates
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentRoom = conference_rooms[currentIndex];
  const totalPrice = currentRoom.price * duration;

  return (
    <div className="croom-booking-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>



      <h2 className="title">Conference Rooms Available</h2>

      {startDate && endDate && (
        <div className="date-info">
          <p>
            <span className="date-label">Start Date:</span> {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p>
            <span className="date-label">End Date:</span> {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p>
            <span className="date-label">Duration:</span> {duration} {duration === 1 ? 'day' : 'days'}
          </p>
        </div>
      )}

      <div className="croom-content">
        <div className="croom-image-section">
          <button className="nav-button left" onClick={prevRoom} aria-label="Previous room">&#10094;</button>
          <div className="croom-image">
            <img src={getCPlaceholder(currentRoom.type)} alt={currentRoom.name || "Conference Room"} />
            <div className="croom-pagination">{currentIndex + 1} of {conference_rooms.length}</div>
          </div>
          <button className="nav-button right" onClick={nextRoom} aria-label="Next room">&#10095;</button>
        </div>

        <div className="croom-details">
          <h3 className="room-name">{currentRoom.name || `Conference Room ${currentIndex + 1}`}</h3>
          
          <div className="room-specs">
            {currentRoom.capacity && (
              <div className="spec-item">
                <span className="spec-icon">👥</span>
                <span className="spec-text">Capacity: {currentRoom.capacity} people</span>
              </div>
            )}
            {currentRoom.size && (
              <div className="spec-item">
                <span className="spec-icon">📏</span>
                <span className="spec-text">Size: {currentRoom.size}</span>
              </div>
            )}
          </div>
          
          <h3 className="price">GHS {currentRoom.price?.toFixed(2) || "0.00"} <span>per day</span></h3>
          <p className="total-price">Total: GHS {totalPrice?.toFixed(2) || "0.00"} for {duration} {duration === 1 ? 'day' : 'days'}</p>
          
          {currentRoom.description && (
            <div className="conference-details">
              <h4>About this Conference Room</h4>
              <p>{currentRoom.description}</p>
            </div>
          )}
          
          <div className="includes">
            <h4>Facilities Included:</h4>
            <ul>
              {currentRoom.amenities && currentRoom.amenities.length > 0 ? (
                currentRoom.amenities.map((item, index) => (
                  <li key={index}>{item}</li>
                ))
              ) : (
                <li>Standard conference amenities</li>
              )}
            </ul>
          </div>

          {currentRoom.specialOffer && (
            <div className="special-offer">
              <h4>Special Offer</h4>
              <p>{currentRoom.specialOffer}</p>
            </div>
          )}

          <button
            className="book-now"
            onClick={() => {
              // Prepare selected room data
              const selectedRooms = [{
                id: currentRoom.id,
                name: currentRoom.name || `Conference Room ${currentIndex + 1}`,
                type: currentRoom.type || "Conference",
                price: currentRoom.price,
                image: currentRoom.image,
              }];

              // Update booking context with the selected room
              setBookingData({
                ...bookingData,
                selectedRooms,
                roomCategory: 'conference',
                totalPrice: totalPrice
              });

              // Navigate to booking form
              navigate("/book-room");
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceBooking;