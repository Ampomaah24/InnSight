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
  const [roomIndexes, setRoomIndexes] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]); // Store selected rooms

  const params = new URLSearchParams(location.search);
  const checkIn = params.get("checkIn") ? decodeURIComponent(params.get("checkIn")) : null;
  const checkOut = params.get("checkOut") ? decodeURIComponent(params.get("checkOut")) : null;

  useEffect(() => {
    if (!checkIn || !checkOut) {
      console.error("❌ Missing query parameters for fetching rooms");
      setLoading(false);
      return;
    }

    const getAvailableRooms = async () => {
      try {
        console.log("📡 Fetching available rooms for:", { checkIn, checkOut });

        const roomsCollection = collection(db, "rooms");
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };

          // If no bookings exist, the room is available
          if (!room.bookings || room.bookings.length === 0) {
            availableRooms.push(room);
            return;
          }

          // Convert check-in/check-out dates for comparison
          const selectedCheckIn = new Date(checkIn);
          const selectedCheckOut = new Date(checkOut);

          const isBooked = room.bookings.some((booking) => {
            if (!booking.checkIn || !booking.checkOut) return false;
            const bookedCheckIn = new Date(booking.checkIn);
            const bookedCheckOut = new Date(booking.checkOut);
            return selectedCheckIn <= bookedCheckOut && selectedCheckOut >= bookedCheckIn;
          });

          if (!isBooked) availableRooms.push(room);
        });

        console.log("🏠 Final Available Rooms:", availableRooms);
        setRooms(availableRooms);
        setLoading(false);

        const initialIndexes = {};
        availableRooms.forEach((room) => {
          if (!initialIndexes[room.t_room]) initialIndexes[room.t_room] = 0;
        });
        setRoomIndexes(initialIndexes);
      } catch (error) {
        console.error("❌ Error fetching available rooms:", error);
        setRooms([]);
        setLoading(false);
      }
    };

    getAvailableRooms();
  }, [checkIn, checkOut]);

  if (loading) return <p>Loading available rooms...</p>;
  if (rooms.length === 0) return <p>No available rooms at the moment.</p>;

  // ✅ Group rooms by type
  const groupedRooms = rooms.reduce((acc, room) => {
    const type = room.t_room || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

  // ✅ Function to update the index when navigating rooms
  const changeRoomIndex = (roomType, direction) => {
    setRoomIndexes((prevIndexes) => {
      const totalRooms = groupedRooms[roomType].length;
      const currentIndex = prevIndexes[roomType];
      let newIndex = direction === "next" ? (currentIndex + 1) % totalRooms : (currentIndex - 1 + totalRooms) % totalRooms;
      return { ...prevIndexes, [roomType]: newIndex };
    });
  };

  // ✅ Function to select/deselect a room
  const toggleRoomSelection = (room) => {
    setSelectedRooms((prevSelected) => {
      const isSelected = prevSelected.some((r) => r.id === room.id);
      return isSelected ? prevSelected.filter((r) => r.id !== room.id) : [...prevSelected, room];
    });
  };

  return (
    <div className="room-booking-container">
      <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <h2 className="available-rooms-heading">Available Rooms</h2>

      {Object.keys(groupedRooms).map((roomType) => {
        const currentIndex = roomIndexes[roomType] || 0;
        const currentRoom = groupedRooms[roomType][currentIndex];

        return (
          <div key={roomType} className="room-type-section">
            <h3 className="room-type-title">{roomType}</h3>
            <div className="room-content">
              <button className="nav-button left" onClick={() => changeRoomIndex(roomType, "prev")}>
                &lt;
              </button>

              <div className="room-image-container">
                <img className="room-image" src={currentRoom.image} alt={currentRoom.t_room} />
                <div className="room-pagination">{currentIndex + 1} of {groupedRooms[roomType].length}</div>
              </div>

              <button className="nav-button right" onClick={() => changeRoomIndex(roomType, "next")}>
                &gt;
              </button>

              <div className="room-details">
                <h3>Price: GHS {currentRoom.price}</h3>
                <h4>Includes:</h4>
                <ul>
                  {currentRoom.amenities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                <button
                  className={`select-room ${selectedRooms.some((r) => r.id === currentRoom.id) ? "selected" : ""}`}
                  onClick={() => toggleRoomSelection(currentRoom)}
                >
                  {selectedRooms.some((r) => r.id === currentRoom.id) ? "Deselect Room" : "Select Room"}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {selectedRooms.length > 0 && (
        <button
          className="proceed-booking"
          onClick={() => {
            navigate(`/book-room?rooms=${encodeURIComponent(JSON.stringify(selectedRooms))}`);
          }}
        >
          Proceed to Booking ({selectedRooms.length})
        </button>
      )}
    </div>
  );
};

export default RoomBooking;
