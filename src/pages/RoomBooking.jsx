import React, { useState } from "react";
import NavMenu from "../components/NavMenu"; // Import NavMenu
import "../assets/styles/RoomBooking.css";

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
];

const RoomBooking = () => {
  const [menuOpen, setMenuOpen] = useState(false); // Manage dropdown menu state
  const [currentIndex, setCurrentIndex] = useState(0);

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
    <div className="room-booking-container">
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <h2 className="title">Available Rooms</h2>

      <div className="room-content">
        <button className="nav-button left" onClick={prevRoom}>
          &lt;
        </button>

        <div className="room-image">
          <img src={currentRoom.image} alt="Room" />
          <div className="room-pagination">
            <span>{currentIndex + 1}</span>
            <span>of</span>
            <span>{rooms.length}</span>
          </div>
        </div>

        <button className="nav-button right" onClick={nextRoom}>
          &gt;
        </button>

        <div className="room-details">
          <h3 className="price">Price: {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>
            {currentRoom.includes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          
          {/* Book Now Button */}
          <button className="book-now">Book Now</button>
        </div>
      </div>
    </div>
  );
};

export default RoomBooking;
