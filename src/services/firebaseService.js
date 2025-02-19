import { db } from "../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
export const getAvailableRooms = async (checkIn, checkOut, roomType) => {
  try {
    const roomsCollection = collection(db, "rooms");

    // Ensure we're only getting rooms of the correct type and that are available
    const q = query(
      roomsCollection,
      where("t_room", "==", roomType),
      where("availability", "==", true) // ✅ Explicitly check availability
    );

    const querySnapshot = await getDocs(q);
    let availableRooms = [];

    querySnapshot.forEach((doc) => {
      let room = { id: doc.id, ...doc.data() };
      console.log("Fetched Room:", room);

      // If there are no bookings, consider the room available
      if (!room.bookings || room.bookings.length === 0) {
        availableRooms.push(room);
        return;
      }

      // Check if room is booked for the given dates
      const isBooked = room.bookings.some((booking) => {
        const bookedCheckIn = new Date(booking.checkIn);
        const bookedCheckOut = new Date(booking.checkOut);
        const selectedCheckIn = new Date(checkIn);
        const selectedCheckOut = new Date(checkOut);

        return (
          (selectedCheckIn <= bookedCheckOut) && (selectedCheckOut >= bookedCheckIn)
        );
      });

      if (!isBooked) {
        availableRooms.push(room);
      }
    });

    console.log("Final Available Rooms:", availableRooms);
    return availableRooms;
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return [];
  }
};
