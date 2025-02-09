import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Ensure you have React Router set up
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
  // Add more room objects as needed
];

const RoomBooking = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
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
    <div className="room-booking-container">
      {/* Back Button */}
      <button className="back-button" onClick={() => navigate("/")}>
        &#8592; Back
      </button>

      {/* Title */}
      <h2 className="title">Available Rooms</h2>

      <div className="room-content">
        <button className="nav-button left" onClick={prevRoom}>
          &lt;
        </button>
        <div className="room-image">
          <img src={currentRoom.image} alt="Room" />
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
        </div>
      </div>
      <div className="room-pagination">
        {currentIndex + 1} of {rooms.length}
      </div>
    </div>
  );
};

export default RoomBooking;
