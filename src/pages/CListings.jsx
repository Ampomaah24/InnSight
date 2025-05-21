import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/CListings.css";

const CListings = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [conferenceRooms, setConferenceRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Room descriptions  mapped to room types
  const roomDescriptions = {
    "large": "Our Grand Hall provides a spacious setting for large events. With high ceilings, large windows, and good lighting, this area can be arranged for conferences, or formal dinners. The neutral colors work well with any decoration theme, and the room includes sound equipment and presentation technology.",
    "executive": "Perfect for board meetings and executive discussions. This long conference room features a sleek table, premium chairs, and video conferencing facilities.",
    "small": "The Mini Hall offers an intimate space for smaller meetings and gatherings. It's ideal for business discussions, small training sessions, or private celebrations. The room is equipped with necessary technology for presentations and includes access to an outdoor terrace.",
    "big": "Our Grand Hall provides a spacious setting for large events. With high ceilings, large windows, and good lighting, this area can be arranged for conferences, or formal dinners. The neutral colors work well with any decoration theme, and the room includes sound equipment and presentation technology.",
    "long": "Perfect for board meetings and executive discussions. This long conference room features a sleek table, premium chairs, and video conferencing facilities."
  };

  
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Add event listener to handle resizing 
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

  // Fetch conference rooms from db
  useEffect(() => {
    const fetchConferenceRooms = async () => {
      try {
        setLoading(true);
        const roomsCollection = collection(db, "conference_rooms");
        
  
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        
        const roomData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
     
          const roomType = (data.type || '').toLowerCase();
          
          roomData.push({
            id: doc.id,
            title: data.name || `${data.type || 'Conference'} Room`,
            description: roomDescriptions[roomType] || "A professionally equipped conference room for your business needs.",
            image: data.image || "/images/conference-default.jpg",
            price: data.price || 3000,
            features: data.amenities || ["Wi-Fi", "Presentation Equipment"],
            type: data.type || "Conference"
          });
        });
        
        setConferenceRooms(roomData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching conference rooms:", error);
        setError("Failed to load conference rooms. Please try again later.");
        setLoading(false);
      }
    };

    fetchConferenceRooms();
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
          <p className="loading-text">Loading conference rooms...</p>
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

  if (conferenceRooms.length === 0) {
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="no-rooms-container">
          <p className="no-rooms-text">No conference rooms are currently available. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="clistings-page">
        <h2 className="page-title">Conference Room Listings</h2>
        <div className="clistings-list">
          {conferenceRooms.map((room, index) => (
            <div key={room.id || index} className="clistings-card">
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