import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, getDoc, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import "../assets/styles/GuestBills.css";

const GuestBills = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Format date helper function
  const formatDate = (dateString) => {
    try {
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString();
      }
      
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
    
    // Use onAuthStateChanged instead of directly checking currentUser
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed. User:", currentUser ? currentUser.email : "No user");
      setAuthChecked(true);
      
      if (currentUser) {
        setUser(currentUser);
        fetchUserBookings(currentUser.uid);
      } else {
        // Handle not logged in state
        setError("Please log in to view your bills");
        setLoading(false);
      }
    });
    
    // Check if user is available in session storage as fallback
    const checkSessionUser = () => {
      const sessionUser = sessionStorage.getItem('currentUser');
      if (sessionUser && !user) {
        try {
          const parsedUser = JSON.parse(sessionUser);
          console.log("Using session storage user:", parsedUser.email);
          if (parsedUser && parsedUser.id) {
            setUser(parsedUser);
            fetchUserBookings(parsedUser.id);
            return true;
          }
        } catch (e) {
          console.error("Failed to parse session user:", e);
        }
      }
      return false;
    };
    
    // Try session user if auth isn't resolved quickly
    const timeoutId = setTimeout(() => {
      if (!authChecked) {
        const foundSessionUser = checkSessionUser();
        if (!foundSessionUser) {
          console.log("Auth state taking too long, checking session storage...");
        }
      }
    }, 1000);
    
    // Clean up
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchUserBookings = async (userId) => {
    try {
      console.log("Fetching bookings for user:", userId);
      setLoading(true);
      const db = getFirestore();
      
      // Query for user's bookings
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(q);
      const bookingData = [];
      
      console.log(`Found ${querySnapshot.size} bookings for user`);
      
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
          extensionCharges: data.extensionCharges || [], // Get extension charges
          foodOrders: [] // We'll fetch these separately
        });
      });
      
      // Fetch restaurant orders for each booking
      for (let booking of bookingData) {
        try {
          // First query for orders put on room tab
          const tabOrdersQuery = query(
            collection(db, "orders"),
            where("roomNumber", "==", booking.room),
            where("paymentMethod", "==", "Tab")
          );
          
          const tabOrdersSnapshot = await getDocs(tabOrdersQuery);
          
          // Then query for room service orders
          const roomServiceQuery = query(
            collection(db, "orders"),
            where("roomNumber", "==", booking.room),
            where("deliveryMethod", "==", "roomService")
          );
          
          const roomServiceSnapshot = await getDocs(roomServiceQuery);
          
          const foodOrders = [];
          
          // Process tab orders
          tabOrdersSnapshot.forEach((doc) => {
            const orderData = doc.data();
            
            // Format cart items for description
            let itemsDescription = "";
            if (orderData.cartItems && orderData.cartItems.length > 0) {
              itemsDescription = orderData.cartItems
                .map(item => `${item.quantity}x ${item.name}`)
                .join(", ");
            }
            
            // Check if this is actually an extension charge disguised as a tab order
            const isExtension = itemsDescription.toLowerCase().includes("extension") || 
                              (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
                              (orderData.notes && orderData.notes.toLowerCase().includes("extension"));
            
            foodOrders.push({
              id: doc.id,
              date: orderData.timestamp?.toDate() || new Date(),
              description: `Restaurant Order - Tab (${itemsDescription})`,
              amount: orderData.total || 0,
              type: isExtension ? "extension" : "food", // Set type based on our determination
              notes: orderData.notes || ""
            });
          });
          
          // Process room service orders
          roomServiceSnapshot.forEach((doc) => {
            const orderData = doc.data();
            
            // Skip if this order was already added (could be both room service and on tab)
            if (foodOrders.some(order => order.id === doc.id)) {
              return;
            }
            
            // Format cart items for description
            let itemsDescription = "";
            if (orderData.cartItems && orderData.cartItems.length > 0) {
              itemsDescription = orderData.cartItems
                .map(item => `${item.quantity}x ${item.name}`)
                .join(", ");
            }
            
            // Check if this is actually an extension charge
            const isExtension = itemsDescription.toLowerCase().includes("extension") || 
                              (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
                              (orderData.notes && orderData.notes.toLowerCase().includes("extension"));
            
            foodOrders.push({
              id: doc.id,
              date: orderData.timestamp?.toDate() || new Date(),
              description: `Room Service (${itemsDescription})`,
              amount: orderData.total || 0,
              type: isExtension ? "extension" : "food", // Mark as extension if detected
              notes: orderData.notes || ""
            });
          });
          
          // Add extension charges from booking if they exist and aren't already in food orders
          if (booking.extensionCharges && booking.extensionCharges.length > 0) {
            console.log("Processing extension charges:", booking.extensionCharges);
            booking.extensionCharges.forEach(charge => {
              // Check if this extension charge is already in food orders
              if (!foodOrders.some(order => order.id === charge.id)) {
                foodOrders.push({
                  id: charge.id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  date: charge.date?.toDate() || new Date(),
                  description: charge.description || "Stay Extension",
                  amount: charge.finalPrice || charge.amount || 0, // Use finalPrice first, then amount
                  type: "extension",
                  notes: charge.notes || ""
                });
              }
            });
          }
          
          // Sort orders by date (newest first)
          foodOrders.sort((a, b) => b.date - a.date);
          
          booking.foodOrders = foodOrders;
        } catch (err) {
          console.error("Error fetching orders for room", booking.room, err);
        }
      }
      
      setBookings(bookingData);
      
      // Set the selected booking to the current checked-in booking if available
      const currentBooking = bookingData.find(b => b.status === "Checked in");
      if (currentBooking) {
        setSelectedBooking(currentBooking);
      } else if (bookingData.length > 0) {
        setSelectedBooking(bookingData[0]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load booking data. Please try again.");
      setLoading(false);
    }
  };

  // Calculate total food orders
  const calculateFoodTotal = (orders) => {
    return orders.filter(order => 
      order.type === "food" && 
      !(order.description && order.description.toLowerCase().includes("extension"))
    ).reduce((total, order) => total + order.amount, 0);
  };
  
  // Get total extension charges
  const calculateExtensionTotal = (orders) => {
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    const total = extensionOrders.reduce((total, order) => total + order.amount, 0);
    console.log("Extension total calculated:", total, "from orders:", extensionOrders);
    return total;
  };

  // Handle booking selection
  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
  };

  // Get current/active booking
  const getCurrentBooking = () => {
    return bookings.find(booking => booking.status === "Checked in") || null;
  };

  // Handle retry if authentication failed
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    
    // Try to get user from session storage
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      try {
        const parsedUser = JSON.parse(sessionUser);
        if (parsedUser && parsedUser.id) {
          setUser(parsedUser);
          fetchUserBookings(parsedUser.id);
          return;
        }
      } catch (e) {
        console.error("Failed to parse session user during retry:", e);
      }
    }
    
    // If no session user, check auth again
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      setUser(currentUser);
      fetchUserBookings(currentUser.uid);
    } else {
      setError("Please log in to view your bills");
      setLoading(false);
    }
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
        <button className="retry-button" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  const currentBooking = getCurrentBooking();
  const activeBooking = selectedBooking || currentBooking || bookings[0];

  // Get food orders vs extension charges
  const getFoodOnlyOrders = (orders) => {
    return orders.filter(order => 
      order.type === "food" && 
      !(order.description && order.description.toLowerCase().includes("extension"))
    );
  };
  
  const getExtensionOrders = (orders) => {
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    console.log("Extension orders:", extensionOrders);
    return extensionOrders;
  };

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
              
              {/* Display active booking */}
              {activeBooking && (
                <div className="booking-details">
                  {/* Booking header with room info */}
                  <div className="booking-header">
                    <div className="booking-header-info">
                      <div>
                        <h3 className="booking-room-title">
                          Room {activeBooking.room}
                          {activeBooking.roomName && ` (${activeBooking.roomName})`}
                        </h3>
                        <p className="booking-dates">
                          Check-in: {formatDate(activeBooking.checkInDate)}
                          {activeBooking.checkOutDate && ` | Check-out: ${formatDate(activeBooking.checkOutDate)}`}
                        </p>
                      </div>
                      <span className={`booking-status ${activeBooking.status.toLowerCase().replace(' ', '-')}`}>
                        {activeBooking.status}
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
                    {getExtensionOrders(activeBooking.foodOrders).length > 0 && (
                      <button 
                        onClick={() => setActiveTab('extensions')} 
                        className={`tab-button ${activeTab === 'extensions' ? 'active' : ''}`}
                      >
                        Stay Extensions
                      </button>
                    )}
                  </div>
                  
                  {/* Accommodation charges */}
                  {activeTab === 'accommodation' && (
                    <div className="tab-content">
                      <div className="charges-header">
                        <h3 className="charges-title">Room Charges</h3>
                        <span className={`payment-status ${(activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 ? 'outstanding' : 'paid'}`}>
                          {activeBooking.paymentStatus || 
                            ((activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 ? "PARTIAL PAYMENT" : "Paid")}
                        </span>
                      </div>
                      
                      <div className="charges-details">
                        <div className="charge-item">
                          <span>Room Type</span>
                          <span>{activeBooking.roomType}</span>
                        </div>
                        <div className="charge-item">
                          <span>Room Category</span>
                          <span>{activeBooking.roomCategory}</span>
                        </div>
                        <div className="charge-item">
                          <span>Number of Guests</span>
                          <span>{activeBooking.numberOfGuests}</span>
                        </div>
                        <div className="charge-item">
                          <span>Payment Method</span>
                          <span>{activeBooking.paymentOption || "Not specified"}</span>
                        </div>
                        <div className="charge-item">
                          <span>Original Price</span>
                          <span>${Number(activeBooking.originalPrice).toFixed(2)}</span>
                        </div>
                        {getExtensionOrders(activeBooking.foodOrders).length > 0 && (
                          <div className="charge-item extension-charge">
                            <span>Extension Charges</span>
                            <span>${calculateExtensionTotal(activeBooking.foodOrders).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="charge-item">
                          <span>Total Room Charges</span>
                          <span>${(Number(activeBooking.originalPrice) + calculateExtensionTotal(activeBooking.foodOrders)).toFixed(2)}</span>
                        </div>
                        {(activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 && (
                          <div className="charge-total">
                            <span>Balance Due</span>
                            <span>${(Number(activeBooking.accommodationBalance) + calculateExtensionTotal(activeBooking.foodOrders)).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Display payment instructions if balance due */}
                      {(activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 && (
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
                        <span className={`payment-status ${getFoodOnlyOrders(activeBooking.foodOrders).length > 0 ? 'outstanding' : 'paid'}`}>
                          {getFoodOnlyOrders(activeBooking.foodOrders).length > 0 ? "Outstanding" : "No Charges"}
                        </span>
                      </div>
                      
                      {getFoodOnlyOrders(activeBooking.foodOrders).length > 0 ? (
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
                              {getFoodOnlyOrders(activeBooking.foodOrders).map(order => (
                                <tr key={order.id}>
                                  <td>{formatDate(order.date)}</td>
                                  <td>{order.description}</td>
                                  <td>$ {order.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td colSpan={2}>Total</td>
                                <td>$ {calculateFoodTotal(activeBooking.foodOrders).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-food-orders">
                          <p>You currently have no food or beverage charges.</p>
                          {activeBooking.status === "Checked in" && (
                            <p>Any room service or restaurant charges during your stay will appear here.</p>
                          )}
                        </div>
                      )}
                      
                      {/* Show download receipt button if there are charges */}
                      {getFoodOnlyOrders(activeBooking.foodOrders).length > 0 && (
                        <div className="user-actions">
                          <button className="btn btn-outline">Download Receipt</button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Stay Extension charges */}
                  {activeTab === 'extensions' && (
                    <div className="tab-content">
                      <div className="charges-header">
                        <h3 className="charges-title">Stay Extension Charges</h3>
                        <span className={`payment-status outstanding`}>
                          Outstanding
                        </span>
                      </div>
                      
                      {getExtensionOrders(activeBooking.foodOrders).length > 0 ? (
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
                              {getExtensionOrders(activeBooking.foodOrders).map(order => (
                                <tr key={order.id} className="extension-row">
                                  <td>{formatDate(order.date)}</td>
                                  <td>
                                    {order.description}
                                    {order.notes && <div className="order-notes">{order.notes}</div>}
                                  </td>
                                  <td>$ {order.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td colSpan={2}>Total Extensions</td>
                                <td>$ {calculateExtensionTotal(activeBooking.foodOrders).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-food-orders">
                          <p>You have no stay extension charges.</p>
                        </div>
                      )}
                      
                      {/* Show download receipt button if there are charges */}
                      {getExtensionOrders(activeBooking.foodOrders).length > 0 && (
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