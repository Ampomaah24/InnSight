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
  const [selectedRooms, setSelectedRooms] = useState([]);

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

        const selectedCheckIn = new Date(checkIn);
        const selectedCheckOut = new Date(checkOut);

        // ✅ Adjust times to 12 PM
        selectedCheckIn.setHours(12, 0, 0, 0);
        selectedCheckOut.setHours(12, 0, 0, 0);

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };

          const bookings = room.bookings || [];

          const isBooked = bookings.some((booking) => {
            if (!booking.checkIn || !booking.checkOut) return false;

            const bookedCheckIn = new Date(booking.checkIn);
            const bookedCheckOut = new Date(booking.checkOut);

            // ✅ Force checkout to 12 PM
            bookedCheckOut.setHours(12, 0, 0, 0);

            return selectedCheckIn < bookedCheckOut && selectedCheckOut > bookedCheckIn;
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

  const groupedRooms = rooms.reduce((acc, room) => {
    const type = room.t_room || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

  const changeRoomIndex = (roomType, direction) => {
    setRoomIndexes((prevIndexes) => {
      const totalRooms = groupedRooms[roomType].length;
      const currentIndex = prevIndexes[roomType];
      let newIndex = direction === "next"
        ? (currentIndex + 1) % totalRooms
        : (currentIndex - 1 + totalRooms) % totalRooms;
      return { ...prevIndexes, [roomType]: newIndex };
    });
  };

  const toggleRoomSelection = (room) => {
    setSelectedRooms((prevSelected) => {
      const isSelected = prevSelected.some((r) => r.id === room.id);
      return isSelected
        ? prevSelected.filter((r) => r.id !== room.id)
        : [...prevSelected, room];
    });
  };

  if (loading) return <p>Loading available rooms...</p>;
  if (rooms.length === 0) return <p>No available rooms at the moment.</p>;

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
              <button className="nav-button left" onClick={() => changeRoomIndex(roomType, "prev")}>&lt;</button>

              <div className="room-image-container">
                <img className="room-image" src={currentRoom.image} alt={currentRoom.t_room} />
                <div className="room-pagination">{currentIndex + 1} of {groupedRooms[roomType].length}</div>
              </div>

              <button className="nav-button right" onClick={() => changeRoomIndex(roomType, "next")}>&gt;</button>

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
                  {selectedRooms.some((r) => r.id === currentRoom.id)
                    ? "Deselect Room"
                    : "Select Room"}
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
            const encodedRooms = encodeURIComponent(JSON.stringify(selectedRooms));
            const encodedCheckIn = encodeURIComponent(checkIn);
            const encodedCheckOut = encodeURIComponent(checkOut);

            navigate(`/book-room?rooms=${encodedRooms}&checkIn=${encodedCheckIn}&checkOut=${encodedCheckOut}`);
          }}
        >
          Proceed to Booking ({selectedRooms.length})
        </button>
      )}
    </div>
  );
};

export default RoomBooking;
