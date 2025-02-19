import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAvailableRooms } from "../services/firebaseService";
import NavMenu from "../components/NavMenu";
import "../assets/styles/RoomBooking.css";

const RoomBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract URL parameters
  const params = new URLSearchParams(location.search);
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const roomType = params.get("roomType");

  useEffect(() => {
    if (!checkIn || !checkOut || !roomType) {
      console.error("Missing query parameters for fetching rooms");
      setLoading(false);
      return;
    }

    getAvailableRooms(checkIn, checkOut, roomType)
      .then((data) => {
        console.log("Filtered Available Rooms:", data);
        setRooms(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching available rooms", error);
        setLoading(false);
      });
  }, [checkIn, checkOut, roomType]);

  if (loading) return <p>Loading available rooms...</p>;
  if (rooms.length === 0) return <p>No available rooms at the moment.</p>;

  const prevRoom = () => setCurrentIndex((prevIndex) => (prevIndex === 0 ? rooms.length - 1 : prevIndex - 1));
  const nextRoom = () => setCurrentIndex((prevIndex) => (prevIndex === rooms.length - 1 ? 0 : prevIndex + 1));

  const currentRoom = rooms[currentIndex];

  return (
    <div className="room-booking-container">
      <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <h2>Available Rooms</h2>

      <div className="room-content">
        <button onClick={prevRoom}>&lt;</button>
        <div>
          <img src={currentRoom.image} alt="Room" />
          <div>{currentIndex + 1} of {rooms.length}</div>
        </div>
        <button onClick={nextRoom}>&gt;</button>

        <div>
          <h3>Price: GHS {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>{currentRoom.amenities.map((item, index) => <li key={index}>{item}</li>)}</ul>
          <button onClick={() => navigate(`/book-room?roomId=${currentRoom.id}`)}>Book Now</button>
        </div>
      </div>
    </div>
  );
};

export default RoomBooking;
