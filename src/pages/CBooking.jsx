import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Ensure you have React Router set up
import "../assets/styles/CBooking.css";
import NavMenu from "../components/NavMenu"; 



const rooms = [
  {
    id: 1,
    image: "src/assets/images/IMG_0111.JPG", // Replace with actual image path
    price: "GHS 600",
    includes: [
      "Access to 24hr Wifi",
      "Access to in-room amenities",
      "Breakfast, lunch and dinner",
      "Free laundry services",
    ],
  },
  {
    id: 2,
    image: "src/assets/images/pixelcut-export.jpeg",
    price: "GHS 700",
    includes: [
      "Access to 24hr Wifi",
      "Access to in-room amenities",
      "Breakfast, lunch and dinner",
      "Spa Access",
    ],
  },
  {
    id: 3,
    image: "src/assets/images/pixelcut-export.jpeg",
    price: "GHS 800",
    includes: [
      "Access to 24hr Wifi",
      "Access to in-room amenities",
      "Breakfast, lunch and dinner",
      "Spa Access",
    ],
  },
  // Add more room objects as needed
];

const RoomBooking = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false); 
  const navigate = useNavigate(); // React Router navigation

  const prevRoom = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? rooms.length - 1 : prevIndex - 1
    );
  };

  const nextRoom = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === rooms.length - 1 ? 0 : prevIndex + 1
    );
  };

  const currentRoom = rooms[currentIndex];

  return (
    <div className="croom-booking-container">
      
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      {/* Back Button */}
      <button className="back-button" onClick={() => navigate("/")}>
        &#8592; Back
      </button>

      {/* Title */}
      <h2 className="title">Conference Rooms Available</h2>

      <div className="croom-content">
        <button className="nav-button left" onClick={prevRoom}>
          &lt;
        </button>
        <div className="croom-image">
          <img src={currentRoom.image} alt="Room" />
          <div className="croom-pagination">
        {currentIndex + 1} of {rooms.length}
      </div>
        </div>
        <button className="nav-button right" onClick={nextRoom}>
          &gt;
        </button>
        <div className="croom-details">
          <h3 className="price">Price: {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>
            {currentRoom.includes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <button className="book-now" onClick={() => navigate("/book-room")}>Book Now</button>
        </div>
      </div>

    </div>
  );
};

export default RoomBooking;

