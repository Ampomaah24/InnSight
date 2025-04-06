import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import "../assets/styles/GuestBills.css";

const GuestBills = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  // Format date helper function
  const formatDate = (dateString) => {
    try {
      if (dateString && typeof dateString === 'string') {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) 
          ? date.toLocaleDateString() 
          : "Not available";
      } else {
        return "Not available";
      }
    } catch (e) {
      console.error("Date parsing error:", e);
      return "Not available";
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      setUser(currentUser);
      fetchUserBookings(currentUser.uid);
    } else {
      // Handle not logged in state
      setError("Please log in to view your bills");
      setLoading(false);
    }
  }, []);

  const fetchUserBookings = async (userId) => {
    try {
      setLoading(true);
      const db = getFirestore();
      
      // Query for user's bookings
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(q);
      const bookingData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookingData.push({
          id: doc.id,
          name: data.lastName || "Unknown",
          room: data.roomNumber || "Unknown",
          roomName: data.roomName || "",
          checkInDate: data.checkIn || data.lastUpdated || "",
          checkOutDate: data.checkOut || "",
          status: data.status || "",
          accommodationBalance: data.remainderDue || 0,
          originalPrice: data.originalPrice || 0,
          paymentStatus: data.paymentStatus || "",
          paymentOption: data.paymentOption || "",
          roomType: data.roomType || "",
          roomCategory: data.roomCategory || "",
          numberOfGuests: data.numberOfGuests || 1,
          specialRequests: data.specialRequests || "",
          foodOrders: [] // We'll fetch these separately if needed
        });
      });
      
      // TODO: Fetch user's food orders
      // For now, this is just an example of how to fetch food orders
      if (bookingData.length > 0) {
        // This would be replaced by actual food order fetching logic
        for (let i = 0; i < bookingData.length; i++) {
          if (bookingData[i].status === "Checked in") {
            // Example food order data - in a real app, you'd fetch this from Firestore
            bookingData[i].foodOrders = [
              /* In a real application, these would be fetched from a separate collection */
              /* {
                id: "food1",
                date: "2025-04-05",
                description: "Room Service - Breakfast",
                amount: 24.99
              } */
            ];
          }
        }
      }
      
      setBookings(bookingData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load booking data. Please try again.");
      setLoading(false);
    }
  };

  // Calculate total food orders
  const calculateFoodTotal = (orders) => {
    return orders.reduce((total, order) => total + order.amount, 0);
  };

  // Handle booking selection
  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
  };

  // Get current/active booking
  const getCurrentBooking = () => {
    return bookings.find(booking => booking.status === "Checked in") || null;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button className="retry-button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const currentBooking = getCurrentBooking();

  return (
    <div className="guest-bills-container">
      <div className="guest-bills-card">
        <div className="guest-bills-header">
          <h2 className="guest-bills-title">Your Hotel Bill</h2>
          <p className="guest-bills-subtitle">View your current and past booking charges</p>
        </div>
        
        <div className="guest-bills-content">
          {bookings.length > 0 ? (
            <div>
              {/* Booking tabs if user has multiple bookings */}
              {bookings.length > 1 && (
                <div className="booking-tabs">
                  {bookings.map(booking => (
                    <button
                      key={booking.id}
                      className={`booking-tab ${selectedBooking?.id === booking.id ? 'active' : ''}`}
                      onClick={() => handleBookingSelect(booking)}
                    >
                      {booking.status === "Checked in" ? "Current Stay" : `${formatDate(booking.checkInDate)}`}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Display active booking or first booking if none selected */}
              {(selectedBooking || currentBooking || bookings[0]) && (
                <div className="booking-details">
                  {/* Booking header with room info */}
                  <div className="booking-header">
                    <div className="booking-header-info">
                      <div>
                        <h3 className="booking-room-title">
                          Room {(selectedBooking || currentBooking || bookings[0]).room}
                          {(selectedBooking || currentBooking || bookings[0]).roomName && ` (${(selectedBooking || currentBooking || bookings[0]).roomName})`}
                        </h3>
                        <p className="booking-dates">
                          Check-in: {formatDate((selectedBooking || currentBooking || bookings[0]).checkInDate)}
                          {(selectedBooking || currentBooking || bookings[0]).checkOutDate && ` | Check-out: ${formatDate((selectedBooking || currentBooking || bookings[0]).checkOutDate)}`}
                        </p>
                      </div>
                      <span className={`booking-status ${(selectedBooking || currentBooking || bookings[0]).status.toLowerCase().replace(' ', '-')}`}>
                        {(selectedBooking || currentBooking || bookings[0]).status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Billing tabs */}
                  <div className="tab-nav">
                    <button 
                      onClick={() => setActiveTab('accommodation')} 
                      className={`tab-button ${activeTab === 'accommodation' ? 'active' : ''}`}
                    >
                      Accommodation Charges
                    </button>
                    <button 
                      onClick={() => setActiveTab('foodOrders')} 
                      className={`tab-button ${activeTab === 'foodOrders' ? 'active' : ''}`}
                    >
                      Food & Beverage
                    </button>
                  </div>
                  
                  {/* Accommodation charges */}
                  {activeTab === 'accommodation' && (
                    <div className="tab-content">
                      <div className="charges-header">
                        <h3 className="charges-title">Room Charges</h3>
                        <span className={`payment-status ${(selectedBooking || currentBooking || bookings[0]).accommodationBalance > 0 ? 'outstanding' : 'paid'}`}>
                          {(selectedBooking || currentBooking || bookings[0]).paymentStatus || 
                            ((selectedBooking || currentBooking || bookings[0]).accommodationBalance > 0 ? "Outstanding" : "Paid")}
                        </span>
                      </div>
                      
                      <div className="charges-details">
                        <div className="charge-item">
                          <span>Room Type</span>
                          <span>{(selectedBooking || currentBooking || bookings[0]).roomType}</span>
                        </div>
                        <div className="charge-item">
                          <span>Room Category</span>
                          <span>{(selectedBooking || currentBooking || bookings[0]).roomCategory}</span>
                        </div>
                        <div className="charge-item">
                          <span>Number of Guests</span>
                          <span>{(selectedBooking || currentBooking || bookings[0]).numberOfGuests}</span>
                        </div>
                        <div className="charge-item">
                          <span>Payment Method</span>
                          <span>{(selectedBooking || currentBooking || bookings[0]).paymentOption || "Not specified"}</span>
                        </div>
                        <div className="charge-item">
                          <span>Original Price</span>
                          <span>${Number((selectedBooking || currentBooking || bookings[0]).originalPrice).toFixed(2)}</span>
                        </div>
                        {(selectedBooking || currentBooking || bookings[0]).accommodationBalance > 0 && (
                          <div className="charge-total">
                            <span>Balance Due</span>
                            <span>${Number((selectedBooking || currentBooking || bookings[0]).accommodationBalance).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Display payment instructions if balance due */}
                      {(selectedBooking || currentBooking || bookings[0]).accommodationBalance > 0 && (
                        <div className="payment-instructions">
                          <h4>Payment Instructions</h4>
                          <p>Please visit the front desk to settle your room balance.</p>
                          <p>We accept credit cards, debit cards, and cash payments.</p>
                        </div>
                      )}
                      
                      {/* Show download invoice button */}
                      <div className="user-actions">
                        <button className="btn btn-outline">
                          Download Invoice
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Food & Beverage charges */}
                  {activeTab === 'foodOrders' && (
                    <div className="tab-content">
                      <div className="charges-header">
                        <h3 className="charges-title">Food & Beverage Charges</h3>
                        <span className={`payment-status ${(selectedBooking || currentBooking || bookings[0]).foodOrders.length > 0 ? 'outstanding' : 'paid'}`}>
                          {(selectedBooking || currentBooking || bookings[0]).foodOrders.length > 0 ? "Outstanding" : "No Charges"}
                        </span>
                      </div>
                      
                      {(selectedBooking || currentBooking || bookings[0]).foodOrders.length > 0 ? (
                        <div className="table-container">
                          <table className="food-orders-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedBooking || currentBooking || bookings[0]).foodOrders.map(order => (
                                <tr key={order.id}>
                                  <td>{formatDate(order.date)}</td>
                                  <td>{order.description}</td>
                                  <td>${order.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td colSpan={2}>Total</td>
                                <td>${calculateFoodTotal((selectedBooking || currentBooking || bookings[0]).foodOrders).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-food-orders">
                          <p>You currently have no food or beverage charges.</p>
                          {(selectedBooking || currentBooking || bookings[0]).status === "Checked in" && (
                            <p>Any room service or restaurant charges during your stay will appear here.</p>
                          )}
                        </div>
                      )}
                      
                      {/* Show download receipt button if there are charges */}
                      {(selectedBooking || currentBooking || bookings[0]).foodOrders.length > 0 && (
                        <div className="user-actions">
                          <button className="btn btn-outline">Download Receipt</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="no-bookings">
              <h3>No Bookings Found</h3>
              <p>You don't have any current or past bookings.</p>
              <button className="btn btn-primary">Make a Reservation</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestBills;