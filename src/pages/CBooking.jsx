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

  // ✅ Extract URL parameters for filtering
  const params = new URLSearchParams(location.search);
  const startDate = params.get("startDate") ? new Date(decodeURIComponent(params.get("startDate"))) : null;
  const endDate = params.get("endDate") ? new Date(decodeURIComponent(params.get("endDate"))) : null;
  const roomType = params.get("roomType") ? decodeURIComponent(params.get("roomType")).trim() : null;

  
  console.log("🔍 Extracted Query Params:", { startDate, endDate, roomType });

  useEffect(() => {
    if (!startDate || !endDate || !roomType) {
      console.error("❌ Missing query parameters for fetching conference rooms");
      setLoading(false);
      return;
    }

    const fetchAvailableConferenceRooms = async () => {
      try {
        console.log("📡 Fetching available conference rooms for:", { startDate, endDate, roomType });

        const roomsCollection = collection(db, "conference_rooms");

        // ✅ Query to filter rooms based on type and availability
        const q = query(
          roomsCollection,
          where("type", "==", roomType.trim()),  // ✅ Ensure only rooms of the selected type are fetched
          where("availability", "==", true)
        );

        const querySnapshot = await getDocs(q);
        let availableRooms = [];

        if (querySnapshot.empty) {
          console.warn("⚠️ No available conference rooms found!");
          setConferenceRooms([]);
          setLoading(false);
          return;
        }

        querySnapshot.forEach((doc) => {
          let room = { id: doc.id, ...doc.data() };
          console.log("🏨 Checking Room:", room);

          // ✅ If there are no existing bookings, the room is available
          if (!room.bookings || room.bookings.length === 0) {
            console.log("✅ Room is available:", room);
            availableRooms.push(room);
            return;
          }

          // ✅ Convert selected startDate and endDate to YYYY-MM-DD format
          const selectedStartDate = new Date(startDate);
          const selectedEndDate = new Date(endDate);

          // ✅ Check if room is booked for any date within the selected range
          const isBooked = room.bookings.some((booking) => {
            if (!booking.startDate || !booking.endDate) {
              console.warn("⚠️ Invalid booking entry:", booking);
              return false; // Skip invalid entries
            }

            // Convert booked startDate and endDate to YYYY-MM-DD
            const bookedStart = new Date(booking.startDate);
            const bookedEnd = new Date(booking.endDate);

            console.log("📅 Comparing with booking:", { bookedStart, bookedEnd });

            // ✅ Booking conflict occurs if the selected range overlaps with any existing booking
            return (
              selectedStartDate <= bookedEnd && selectedEndDate >= bookedStart
            );
          });

          if (!isBooked) {
            console.log("✅ Room is available:", room);
            availableRooms.push(room);
          } else {
            console.log("❌ Room is booked:", room);
          }
        });

        console.log("🏠 Final Available Conference Rooms:", availableRooms);
        setConferenceRooms(availableRooms);
        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching available conference rooms:", error);
        setConferenceRooms([]);
        setLoading(false);
      }
    };

    fetchAvailableConferenceRooms();
  }, [startDate, endDate, roomType]);

  if (loading) return <p>Loading available conference rooms...</p>;
  if (conference_rooms.length === 0) return <p>No available conference rooms at the moment.</p>;

  const prevRoom = () => setCurrentIndex((prevIndex) => (prevIndex === 0 ? conference_rooms.length - 1 : prevIndex - 1));
  const nextRoom = () => setCurrentIndex((prevIndex) => (prevIndex === conference_rooms.length - 1 ? 0 : prevIndex + 1));

  const currentRoom = conference_rooms[currentIndex];

  return (
    <div className="croom-booking-container">
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      </div>

      <h2 className="title">Conference Rooms Available</h2>

      <div className="croom-content">
        <button className="nav-button left" onClick={prevRoom}>
          &lt;
        </button>
        <div className="croom-image">
          <img src={currentRoom.image} alt="Room" />
          <div className="croom-pagination">
            {currentIndex + 1} of {conference_rooms.length}
          </div>
        </div>
        <button className="nav-button right" onClick={nextRoom}>
          &gt;
        </button>

        <div className="croom-details">
          <h3 className="price">Price: {currentRoom.price}</h3>
          <h4>Includes:</h4>
          <ul>
            {currentRoom.amenities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <button className="book-now" onClick={() => navigate(`/book-conference?roomId=${currentRoom.id}`)}>Book Now</button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceBooking;
