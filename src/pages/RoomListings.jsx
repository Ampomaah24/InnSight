import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavMenu from "../components/NavMenu"; // Import NavMenu component
import "../assets/styles/RoomListings.css";

const RoomListings = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fix scroll position on page load and ensure content is visible
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Add event listener to handle resize and ensure content visibility
    const handleResize = () => {
      // Force a reflow to ensure content renders correctly
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        document.body.style.overflow = '';
      }, 10);
    };

    window.addEventListener('resize', handleResize);
    
    // Call once on component mount
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Room Data with enhanced details
  const rooms = [
    {
      title: "Single Room",
      description:
        "A cozy and well-appointed space designed for solo travelers. Features a plush single bed, a sleek work desk, and a private en-suite bathroom. Enjoy high-speed Wi-Fi, a flat-screen TV, and complimentary refreshments.",
      image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 600.00,
      features: ["Free Wi-Fi", "Flat-screen TV", "En-suite bathroom", "Workspace"],
      type: "Single"
    },
    {
      title: "Double Room",
      description:
        "Elegantly designed for couples or solo guests seeking extra comfort. Features a luxurious queen-sized bed, a stylish seating area, and premium amenities like air conditioning, minibar, and a smart TV.",
      image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 700.00,
      features: ["Queen-sized bed", "Air conditioning", "Minibar", "Smart TV"],
      type: "Double"
    },
    {
      title: "Twin-Bed Room",
      description:
        "Designed for shared accommodation, this room offers two separate beds, making it ideal for friends or family. Equipped with a work desk, storage space, free Wi-Fi, and a relaxing ambiance.",
      image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 800.00,
      features: ["Two separate beds", "Work desk", "Storage space", "Free Wi-Fi"],
      type: "Twin"
    },
  ];

  // Handler for booking button
  const handleBookNow = (roomType) => {
    // Navigate to services page with room type as query parameter
    navigate(`/services?roomType=${roomType}`);
  };

  return (
    <div className="main-container">
      {/* NavMenu in top left */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="rlistings-page">
        <h2 className="page-title">Room Listings</h2>
        <div className="rlistings-list">
          {rooms.map((room, index) => (
            <div key={index} className="rlistings-card">
              <div className="rlistings-info">
                <h3 className="rlistings-title">{room.title}</h3>
                
                <div className="room-features">
                  {room.features.map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
                
                <p className="rlistings-description">{room.description}</p>
                
                <div className="price-info">
                  GHS {room.price.toFixed(2)} <span className="per-night">per night</span>
                </div>
                
                <button 
                  className="book-now"
                  onClick={() => handleBookNow(room.type.toLowerCase())}
                >
                  Book Now
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '6px' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              
              <div className="rlistings-image">
                <img src={room.image} alt={room.title} />
                <div className="room-type-badge">{room.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomListings;