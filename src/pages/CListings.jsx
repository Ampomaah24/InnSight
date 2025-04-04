import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavMenu from "../components/NavMenu"; // Import NavMenu component
import "../assets/styles/CListings.css";

const CListings = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fix scroll position on page load
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

  // Conference Room Data
  const conferenceRooms = [
    {
      title: "Big Conference Room",
      description:
        "A spacious and fully equipped room ideal for large corporate meetings, seminars, and events. Includes a projector, high-speed internet, and modern seating.",
      image: "/images/big-conference.jpg",
      price: 8000.00,
      features: ["Projector", "High-speed Wi-Fi", "Seating for 50", "Catering Available"],
      type: "Large"
    },
    {
      title: "Long Conference Room",
      description:
        "Perfect for board meetings and executive discussions. This long conference room features a sleek table, premium chairs, and video conferencing facilities.",
      image: "/images/long-conference.jpg",
      price: 5000.00,
      features: ["Video Conferencing", "Executive Chairs", "Whiteboard", "Coffee Service"],
      type: "Executive"
    },
    {
      title: "Small Conference Room",
      description:
        "A cozy and professional space for small team meetings or private discussions. Features soundproofing, a smart TV, and comfortable seating.",
      image: "/images/small-conference.jpg",
      price: 3000.00,
      features: ["Smart TV", "Soundproofing", "Seating for 10", "Presentation Tools"],
      type: "Small"
    },
  ];

  // Handler for booking button
  const handleBookNow = (roomType) => {
    // Navigate to conference booking page with room type as query parameter
    navigate(`/services?roomType=${roomType}`);
  };

  return (
    <div className="main-container">
      {/* NavMenu in top left - Remove the inline styles that were causing transparency */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="clistings-page">
        <h2 className="page-title">Conference Room Listings</h2>
        <div className="clistings-list">
          {conferenceRooms.map((room, index) => (
            <div key={index} className="clistings-card">
              <div className="clistings-info">
                <h3 className="clistings-title">{room.title}</h3>
                
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
                
                <p className="clistings-description">{room.description}</p>
                
                <div className="price-info">
                  GHS {room.price.toFixed(2)} <span className="per-day">per day</span>
                </div>
                
                <button 
                  className="book-now"
                  onClick={() => handleBookNow(room.type.toLowerCase())}
                >
                  BOOK NOW
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.375rem' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              
              <div className="clistings-image">
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

export default CListings;