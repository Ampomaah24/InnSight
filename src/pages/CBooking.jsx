import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/CBooking.css";

const ConferenceBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conference_rooms, setConferenceRooms] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const params = new URLSearchParams(location.search);
  const startDate = params.get("startDate") ? new Date(decodeURIComponent(params.get("startDate"))) : null;
  const endDate = params.get("endDate") ? new Date(decodeURIComponent(params.get("endDate"))) : null;

  useEffect(() => {
    if (!startDate || !endDate) {
      console.error("❌ Missing query parameters for fetching conference rooms");
      setLoading(false);
      return;
    }

    const fetchAvailableConferenceRooms = async () => {
      try {
        const roomsCollection = collection(db, "conference_rooms");
        const q = query(roomsCollection, where("availability", "==", true));
        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };

          if (!room.bookings || room.bookings.length === 0) {
            availableRooms.push(room);
            return;
          }

          const selectedStartDate = new Date(startDate);
          const selectedEndDate = new Date(endDate);

          const isBooked = room.bookings.some((booking) => {
            if (!booking.startDate || !booking.endDate) return false;
            const bookedStart = new Date(booking.startDate);
            const bookedEnd = new Date(booking.endDate);
            return selectedStartDate <= bookedEnd && selectedEndDate >= bookedStart;
          });

          if (!isBooked) {
            availableRooms.push(room);
          }
        });

        setConferenceRooms(availableRooms);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching conference rooms:", error);
        setConferenceRooms([]);
        setLoading(false);
      }
    };

    fetchAvailableConferenceRooms();
  }, [startDate, endDate]);

  if (loading) return <p>Loading available conference rooms...</p>;
  if (conference_rooms.length === 0) return <p>No available conference rooms at the moment.</p>;

  const prevRoom = () => setCurrentIndex((prevIndex) => (prevIndex === 0 ? conference_rooms.length - 1 : prevIndex - 1));
  const nextRoom = () => setCurrentIndex((prevIndex) => (prevIndex === conference_rooms.length - 1 ? 0 : prevIndex + 1));

  const currentRoom = conference_rooms[currentIndex];

  return (
    <div className="croom-booking-container">
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <h2 className="title">Conference Rooms Available</h2>

      <div className="croom-content">
        <button className="nav-button left" onClick={prevRoom}>&lt;</button>
        <div className="croom-image">
          <img src={currentRoom.image} alt="Room" />
          <div className="croom-pagination">{currentIndex + 1} of {conference_rooms.length}</div>
        </div>
        <button className="nav-button right" onClick={nextRoom}>&gt;</button>

        <div className="croom-details">
          <h3 className="price">Price: GHS {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>
            {currentRoom.amenities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <button
            className="book-now"
            onClick={() => {
              // 🔧 Ensure all necessary fields are passed along
              const selectedRooms = [{
                id: currentRoom.id,
                name: currentRoom.name,
                type: currentRoom.type,
                price: currentRoom.price,
                image: currentRoom.image,
              }];

              const checkIn = startDate?.toISOString().split("T")[0];
              const checkOut = endDate?.toISOString().split("T")[0];

              const encodedRooms = encodeURIComponent(JSON.stringify(selectedRooms));
              const encodedCheckIn = encodeURIComponent(checkIn);
              const encodedCheckOut = encodeURIComponent(checkOut);

              navigate(`/book-room?rooms=${encodedRooms}&checkIn=${encodedCheckIn}&checkOut=${encodedCheckOut}&roomCategory=conference`);
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceBooking;
