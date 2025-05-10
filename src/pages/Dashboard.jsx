// Updated Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import ProfileSection from "../components/ProfileSection"; 
import "../assets/styles/Dashboard.css";


// Total rooms in the hotel
const TOTAL_ROOMS = 53;

const Dashboard = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [stats, setStats] = useState({
    checkInsToday: 0,
    todaysReservations: 0,
    roomsOccupied: 0,
    totalRooms: TOTAL_ROOMS
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // Add user state for ProfileSection

  // Fetch user data for ProfileSection
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Check sessionStorage first
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          console.log("Using user from sessionStorage:", parsedUser);
          setUser(parsedUser);
          return;
        }
        
        // Otherwise use current auth user
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userObj = {
              id: currentUser.uid,
              fname: userData.firstName || userData.fname || currentUser.displayName?.split(' ')[0] || "User",
              lname: userData.lastName || userData.lname || currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              fullName: userData.fullName || `${userData.firstName || userData.fname || ""} ${userData.lastName || userData.lname || ""}`.trim(),
              photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
              avatar: userData.avatar || null,
              email: userData.email || currentUser.email
            };
            
            console.log("Created user object from Firestore:", userObj);
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          } else {
            // No user document, create from auth
            const userObj = {
              id: currentUser.uid,
              fname: currentUser.displayName?.split(' ')[0] || "User",
              lname: currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              fullName: currentUser.displayName || "User",
              photoURL: currentUser.photoURL || "/images/profile-placeholder.png",
              email: currentUser.email
            };
            
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          }
        } else {
          // No auth user
          setUser({
            fname: "Guest",
            lname: "User",
            fullName: "Guest User",
            photoURL: "/images/profile-placeholder.png"
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        console.log("Fetching reservations data...");
        
        // Get reference to bookings collection
        const bookingsRef = collection(db, "bookings");
        const querySnapshot = await getDocs(bookingsRef);
        
        console.log(`Found ${querySnapshot.docs.length} booking documents`);
        
        if (querySnapshot.empty) {
          console.log("No bookings found in database");
          setLoading(false);
          return;
        }
        
        // Process each booking document
        const fetchedReservations = [];
        const fetchedUpcomingReservations = [];
        let checkInsCount = 0;
        let todaysReservationsCount = 0;
        
        // Track occupied rooms by their room numbers to avoid duplicates
        const occupiedRooms = new Set();
        
        // Get today's date at midnight for accurate comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        console.log("Today's date for comparison:", todayStr);
        
        // Process each document
        querySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`Processing booking ${doc.id}:`, data);
          
          // Handle different date formats
          let checkInDate, checkOutDate, createdAtDate;
          
          // Convert checkIn date based on its type
          if (data.checkIn instanceof Timestamp) {
            checkInDate = data.checkIn.toDate();
          } else if (data.checkIn && data.checkIn.seconds) {
            // Handle Firestore timestamp objects
            checkInDate = new Date(data.checkIn.seconds * 1000);
          } else if (typeof data.checkIn === 'string') {
            checkInDate = new Date(data.checkIn);
          } else {
            console.log(`Invalid checkIn date format for ${doc.id}:`, data.checkIn);
            checkInDate = new Date(); // Fallback
          }
          
          // Convert checkOut date based on its type
          if (data.checkOut instanceof Timestamp) {
            checkOutDate = data.checkOut.toDate();
          } else if (data.checkOut && data.checkOut.seconds) {
            checkOutDate = new Date(data.checkOut.seconds * 1000);
          } else if (typeof data.checkOut === 'string') {
            checkOutDate = new Date(data.checkOut);
          } else {
            console.log(`Invalid checkOut date format for ${doc.id}:`, data.checkOut);
            checkOutDate = new Date(); // Fallback
          }
          
          // Convert createdAt date if available (when the reservation was made)
          if (data.createdAt instanceof Timestamp) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt && data.createdAt.seconds) {
            createdAtDate = new Date(data.createdAt.seconds * 1000);
          } else if (typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
          } else if (data.timestamp instanceof Timestamp) { // Alternative field name
            createdAtDate = data.timestamp.toDate();
          } else if (data.timestamp && data.timestamp.seconds) {
            createdAtDate = new Date(data.timestamp.seconds * 1000);
          } else if (typeof data.timestamp === 'string') {
            createdAtDate = new Date(data.timestamp);
          } else {
            console.log(`No creation date found for ${doc.id}, using document ID timestamp as fallback`);
            // As a fallback, try to extract timestamp from document ID if it's a Firestore auto-ID
            try {
              // If it's a Firestore auto-ID, the first 8 chars are a timestamp
              const timestampHex = doc.id.substring(0, 8);
              const timestampSeconds = parseInt(timestampHex, 16);
              createdAtDate = new Date(timestampSeconds * 1000);
            } catch (e) {
              console.log("Couldn't extract timestamp from ID, using current date");
              createdAtDate = new Date(); // Last resort fallback
            }
          }
          
          // Format dates for display
          const checkInFormatted = formatDate(checkInDate);
          const checkOutFormatted = formatDate(checkOutDate);
          
          // Compare dates for statistics
          const checkInDay = new Date(checkInDate);
          checkInDay.setHours(0, 0, 0, 0);
          
          const createdAtDay = new Date(createdAtDate);
          createdAtDay.setHours(0, 0, 0, 0);
          
          const isCheckInToday = checkInDay.getTime() === today.getTime();
          const isCreatedToday = createdAtDay.getTime() === today.getTime();
          const isCurrentlyStaying = checkInDate <= today && checkOutDate > today;
          const isFutureReservation = checkInDate > today;
          
          // Get the lowercase status for consistent comparison
          const lowerCaseStatus = (data.status || "").toLowerCase();
          
          // Get the guest name for this specific room (primary guest)
          // First try primary guest fields, then guests array, then fall back to booker fields, then legacy fields
          let guestName = "";
          if (data.primaryGuestFirstName || data.primaryGuestLastName) {
            // Use primary guest fields (first person assigned to the room)
            guestName = `${data.primaryGuestFirstName || ''} ${data.primaryGuestLastName || ''}`.trim();
          } else if (data.guests && Array.isArray(data.guests) && data.guests.length > 0) {
            // If no primary guest fields but guests array exists, use the first guest's information
            const firstGuest = data.guests[0];
            if (firstGuest && (firstGuest.firstName || firstGuest.lastName)) {
              guestName = `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`.trim();
            }
          } else if (data.bookerFirstName || data.bookerLastName) {
            // Fall back to booker fields
            guestName = `${data.bookerFirstName || ''} ${data.bookerLastName || ''}`.trim();
          } else {
            // Last resort - legacy fields
            guestName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
          }
          
          // Create a reservation object
          const reservation = {
            id: doc.id,
            guestName: guestName, // Use the room-specific guest name
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            createdAt: createdAtDate,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            room: data.roomNumber || "N/A",
            status: data.status || "Confirmed",
            isMainBookerRoom: !!data.isMainBookerRoom,
          };
          
          // Log the comparison results for debugging
          console.log(`Booking ${doc.id}: Check-in today: ${isCheckInToday}, Created today: ${isCreatedToday}, Currently staying: ${isCurrentlyStaying}, Status: ${lowerCaseStatus}`);
          
          // Increment counters based on conditions
          if (isCheckInToday) {
            checkInsCount++;
          }
          
          // Use creation date for today's reservations count
          if (isCreatedToday) {
            todaysReservationsCount++;
          }
          
          // Check if room is currently occupied (checked in but not checked out)
          if ((lowerCaseStatus === "checked in" || lowerCaseStatus === "checked-in") && 
              data.roomNumber && 
              isCurrentlyStaying) {
            occupiedRooms.add(data.roomNumber);
            console.log(`Room ${data.roomNumber} is marked as occupied`);
          }
          
          // Add to all reservations array
          fetchedReservations.push(reservation);
          
          // Check if this is an upcoming reservation:
          // 1. Check-in date is in the future OR
          // 2. Check-in date is today but not yet checked in
          if ((isFutureReservation || (isCheckInToday && lowerCaseStatus !== "checked in" && 
              lowerCaseStatus !== "checked-in")) && 
              lowerCaseStatus !== "checked out" && 
              lowerCaseStatus !== "checked-out" && 
              lowerCaseStatus !== "cancelled" && 
              lowerCaseStatus !== "canceled") {
            fetchedUpcomingReservations.push(reservation);
          }
        });
        
        // Get the number of occupied rooms
        const occupiedRoomsCount = occupiedRooms.size;
        console.log(`Occupied rooms: ${occupiedRoomsCount} out of ${TOTAL_ROOMS}`);
        console.log("Occupied room numbers:", [...occupiedRooms]);
        
        // Sort all reservations by check-in date
        const sortedReservations = fetchedReservations.sort((a, b) => {
          return a.checkInDate - b.checkInDate;
        });
        
        // Sort upcoming reservations by check-in date (closest first)
        const sortedUpcomingReservations = fetchedUpcomingReservations.sort((a, b) => {
          return a.checkInDate - b.checkInDate;
        });
        
        console.log("Statistics calculated:", {
          checkInsToday: checkInsCount,
          todaysReservations: todaysReservationsCount,
          roomsOccupied: occupiedRoomsCount,
          totalRooms: TOTAL_ROOMS,
          upcomingReservationsCount: fetchedUpcomingReservations.length
        });
        
        // Update state with the calculated values
        setReservations(sortedReservations);
        setUpcomingReservations(sortedUpcomingReservations);
        setStats({
          checkInsToday: checkInsCount,
          todaysReservations: todaysReservationsCount,
          roomsOccupied: occupiedRoomsCount,
          totalRooms: TOTAL_ROOMS
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reservations:", error);
        setLoading(false);
      }
    };
    
    fetchReservations();
  }, []);
  
  // Helper function to format dates consistently
  const formatDate = (date) => {
    if (!date) return "N/A";
    
    try {
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Invalid Date";
    }
  };

  // Get reservation status class
  const getStatusClass = (status) => {
    if (!status) return 'reserved';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'confirmed';
      case 'checked in':
      case 'checked-in':
        return 'checked-in';
      case 'checked out':
      case 'checked-out':
        return 'checked-out';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      default:
        return 'reserved';
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      
      {/* Add Profile Section at the top right */}
      <div className="top-right-profile">
        {user && (
          <ProfileSection
            user={user}
            onLogout={() => {
              auth.signOut()
                .then(() => {
                  sessionStorage.removeItem('currentUser');
                  navigate('/login');
                })
                .catch(error => console.error("Error signing out:", error));
            }}
          />
        )}
      </div>
      
      <div className="main-content">
        <div className="dashboard-header">
          
          <p className="dashboard-subtitle">Overview of Activities</p>
        </div>
        
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="card" onClick={() => navigate("/check-in")}>
            <p className="card-title">Today's Check-ins</p>
            <h2 className="card-value">{loading ? "..." : stats.checkInsToday}</h2>
          </div>
          <div className="card" onClick={() => navigate("/reservations")}>
            <p className="card-title">Today's Reservations</p>
            <h2 className="card-value">{loading ? "..." : stats.todaysReservations}</h2>
          </div>
          <div className="card" onClick={() => navigate("/rooms")}>
            <p className="card-title">Rooms Occupied</p>
            <h2 className="card-value">
              {loading ? "..." : `${stats.roomsOccupied}/${stats.totalRooms}`}
            </h2>
            {!loading && (
              <div className="occupancy-bar">
                <div 
                  className="occupancy-fill" 
                  style={{ width: `${(stats.roomsOccupied / stats.totalRooms) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Upcoming Reservations */}
        <div className="table-container">
          <h2 className="table-title">Upcoming Reservations</h2>
          {loading ? (
            <div className="loading-indicator">Loading reservations...</div>
          ) : upcomingReservations.length === 0 ? (
            <div className="no-data">No upcoming reservations found</div>
          ) : (
            <div className="table-responsive">
              <table className="reservations-table">
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Room</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingReservations.slice(0, 10).map((res) => (
                    <tr key={res.id} onClick={() => navigate(`/reservation/${res.id}`)}>
                      <td>{res.guestName || "Guest"}</td>
                      <td>{res.checkIn}</td>
                      <td>{res.checkOut}</td>
                      <td>{res.room}</td>
                      <td>
                        <span className={`status ${getStatusClass(res.status)}`}>
                          {res.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {upcomingReservations.length > 10 && (
                <div className="view-more">
                  <button 
                    className="view-more-btn" 
                    onClick={() => navigate("/reservations")}
                  >
                    View All Reservations
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;