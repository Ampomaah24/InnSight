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
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ Extract URL parameters safely and log them
  const params = new URLSearchParams(location.search);
  const checkIn = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : null;
  const checkOut = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : null;
  const roomType = params.get("roomType") ? decodeURIComponent(params.get("roomType")).trim() : null;

  console.log("🔍 Extracted Query Params:", { checkIn, checkOut, roomType });

  useEffect(() => {
    if (!checkIn || !checkOut || !roomType) {
      console.error("❌ Missing query parameters for fetching rooms");
      setLoading(false);
      return;
    }

    const getAvailableRooms = async () => {
      try {
        console.log("📡 Fetching available rooms for:", { checkIn, checkOut, roomType });

        const roomsCollection = collection(db, "rooms");

        // ✅ Ensure `roomType` matches Firestore format exactly
        const q = query(
          roomsCollection,
          where("t_room", "==", roomType.trim()),
          where("availability", "==", true)
        );

        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        console.log("🔥 Firestore returned rooms:", querySnapshot.docs.map(doc => doc.data()));

        if (querySnapshot.empty) {
          console.warn("⚠️ No rooms found matching query parameters!");
          setRooms([]);
          setLoading(false);
          return;
        }

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };
          console.log("🏨 Checking Room:", room);

          // If there are no bookings, consider the room available
          if (!room.bookings || room.bookings.length === 0) {
            console.log("✅ Room is available (no bookings):", room);
            availableRooms.push(room);
            return;
          }

          // Convert check-in/check-out dates for comparison
          const selectedCheckIn = new Date(checkIn);
          const selectedCheckOut = new Date(checkOut);

          // Check if the room is already booked for the selected period
          const isBooked = room.bookings.some((booking) => {
            if (!booking.checkIn || !booking.checkOut) {
              console.warn("⚠️ Invalid booking entry:", booking);
              return false; // Skip invalid entries
            }

            const bookedCheckIn = new Date(booking.checkIn);
            const bookedCheckOut = new Date(booking.checkOut);

            console.log("📅 Comparing with booking:", { bookedCheckIn, bookedCheckOut });

            return (
              selectedCheckIn <= bookedCheckOut && selectedCheckOut >= bookedCheckIn
            );
          });

          if (!isBooked) {
            console.log("✅ Room is available:", room);
            availableRooms.push(room);
          } else {
            console.log("❌ Room is booked:", room);
          }
        });

        console.log("🏠 Final Available Rooms:", availableRooms);
        setRooms(availableRooms);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching available rooms:", error);
        setRooms([]);
        setLoading(false);
      }
    };

    getAvailableRooms();
  }, [checkIn, checkOut, roomType]);

  if (loading) return <p>Loading available rooms...</p>;
  if (rooms.length === 0) return <p>No available rooms at the moment.</p>;

  const prevRoom = () => setCurrentIndex((prevIndex) => (prevIndex === 0 ? rooms.length - 1 : prevIndex - 1));
  const nextRoom = () => setCurrentIndex((prevIndex) => (prevIndex === rooms.length - 1 ? 0 : prevIndex + 1));

  const currentRoom = rooms[currentIndex];

  return (
    <div className="room-booking-container">
      <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <h2 className="available-rooms-heading">Available Rooms</h2>

      <div className="room-content">
        <button className="nav-button left" onClick={prevRoom}>&lt;</button>
        <div>
          <img className="room-image" src={currentRoom.image} alt="Room" />

          <div className="room-pagination">{currentIndex + 1} of {rooms.length}</div>
        </div>
        <button className = "nav-button right" onClick={nextRoom}>&gt;</button>

        <div className = "room-details">
          <h3>Price: GHS {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>{currentRoom.amenities.map((item, index) => <li key={index}>{item}</li>)}</ul>
          <button className = "book-now" onClick={() => navigate(`/book-room?roomId=${currentRoom.id}`)}>Book Now</button>
        </div>
      </div>
    </div>
  );
};

export default RoomBooking;