import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/RoomListings.css";
import roomImage1 from "../assets/images/pixelcut-export-4.jpg";
import roomImage2 from "../assets/images/Ampomaah-Hotel-Accra-Exterior-2.jpg";
import roomImage3 from "../assets/images/ampomaah-hotel-2.jpg"; 


const RoomListings = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Room descriptions to room types
  const roomDescriptions = {
    "single bed": "Enjoy a comfortable stay in our Single Room, designed for solo travelers or business guests. It comes with a soft, high-quality single bed, fresh bedding, and everything you need to relax or get work done. The room is cozy, well-organized, and perfect for a quiet and restful stay.",
    "double bed": "Our Double Room is a great choice if you want more space. It features a large, comfortable double bed with soft bedding, making it ideal for couples or anyone who likes extra room while sleeping. The room is stylish, peaceful, and perfect for a relaxing visit.",
    "twin bed": "The Twin Room has two separate single beds, each with soft sheets and comfortable pillows. It’s a great option for friends, work colleagues, or family members traveling together. Each bed is designed to give you a good night’s sleep, and the room is set up so both guests can feel comfortable."
  };

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

  useEffect(() => {
    window.scrollTo(0, 0);
    

    const handleResize = () => {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        document.body.style.overflow = '';
      }, 10);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch and group rooms from Firestore
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const roomsCollection = collection(db, "rooms");

        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);

        const roomsByType = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const roomType = (data.t_room || 'standard').toLowerCase();
          
          if (!roomsByType[roomType]) {
            roomsByType[roomType] = {
              type: data.t_room || 'Standard',
              title: `${data.t_room || 'Standard'} Room`,
              description: roomDescriptions[roomType] || "A comfortable room with modern amenities.",
              image: getRoomPlaceholder(roomType),
              price: data.price || 500,
              features: data.amenities || ["Free Wi-Fi", "Flat-screen TV"],
              count: 1,
              lowestPrice: data.price || 500,
              highestPrice: data.price || 500
            };
          } else {
            // Update room count
            roomsByType[roomType].count += 1;

            if (data.price < roomsByType[roomType].lowestPrice) {
              roomsByType[roomType].lowestPrice = data.price;
            }
            if (data.price > roomsByType[roomType].highestPrice) {
              roomsByType[roomType].highestPrice = data.price;
            }

            if (data.amenities) {
              data.amenities.forEach(amenity => {
                if (!roomsByType[roomType].features.includes(amenity)) {
                  roomsByType[roomType].features.push(amenity);
                }
              });
            }
          }
        });
        
        const groupedRoomTypes = Object.values(roomsByType);
        
        setRoomTypes(groupedRoomTypes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setError("Failed to load rooms. Please try again later.");
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Handler for booking button
  const handleBookNow = (roomType) => {
    navigate(`/services?roomType=${roomType.toLowerCase()}`);
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading available rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="error-container">
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (roomTypes.length === 0) {
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="no-rooms-container">
          <p className="no-rooms-text">No rooms are currently available. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">

      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="rlistings-page">
        <h2 className="page-title">Room Types</h2>
        <div className="rlistings-list">
          {roomTypes.map((roomType, index) => (
            <div key={index} className="rlistings-card">
              <div className="rlistings-info">
                <h3 className="rlistings-title">{roomType.title}</h3>
                
                <div className="room-availability">
                  <span className="availability-badge">{roomType.count} rooms</span>
                </div>
                
                <div className="room-features">
                  {roomType.features.slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
                
                <p className="rlistings-description">{roomType.description}</p>
                
                <div className="price-info">
                  {roomType.lowestPrice === roomType.highestPrice ? (
                    <>GHS {roomType.lowestPrice.toFixed(2)}</>
                  ) : (
                    <>GHS {roomType.lowestPrice.toFixed(2)} - {roomType.highestPrice.toFixed(2)}</>
                  )}
                  <span className="per-night"> per night</span>
                </div>
                
                <button 
                  className="book-now"
                  onClick={() => handleBookNow(roomType.type.toLowerCase())}
                >
                  Book Now
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.375rem' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              
              <div className="rlistings-image">
                <img src={roomType.image} alt={roomType.title} />
                <div className="room-type-badge">{roomType.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomListings;