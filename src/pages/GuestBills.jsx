import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, getDoc, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import NavMenu from "../components/NavMenu";
import "../assets/styles/GuestBills.css";

const GuestBills = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  

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


  const handleMakeReservation = () => {
    navigate('/services');
  };

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed. User:", currentUser ? currentUser.email : "No user");
      setAuthChecked(true);
      
      if (currentUser) {
        setUser(currentUser);
        setError(null); 
        fetchUserBookings(currentUser.uid);
      } else {
        
        const guestId = localStorage.getItem("guestId");
        if (guestId) {
          console.log("Using guest ID from localStorage:", guestId);
          setUser({ uid: guestId, isGuest: true });
          setError(null); 
          fetchUserBookings(guestId);
        } else {
    
          const sessionUser = sessionStorage.getItem('currentUser');
          if (sessionUser) {
            try {
              const parsedUser = JSON.parse(sessionUser);
              console.log("Using session storage user:", parsedUser.email);
              if (parsedUser && parsedUser.id) {
                setUser(parsedUser);
                setError(null); 
                fetchUserBookings(parsedUser.id);
              } else {
                setError("Please log in to view your bills");
                setLoading(false);
              }
            } catch (e) {
              console.error("Failed to parse session user:", e);
              setError("Please log in to view your bills");
              setLoading(false);
            }
          } else {
       
            setError("Please log in to view your bills");
            setLoading(false);
          }
        }
      }
    });
    
   
    return () => {
      unsubscribe();
    };
  }, []);

 
  useEffect(() => {
    
    if (user && selectedBooking?.status === "Checked in") {
      const intervalId = setInterval(() => {
        refreshData();
      }, 30000); 
      
      return () => clearInterval(intervalId);
    }
  }, [user, selectedBooking]);


  const refreshData = () => {
    if (user) {
      fetchUserBookings(user.uid);
    }
  };

  const fetchUserBookings = async (userId) => {
    if (!userId) {
      console.log("No userId provided to fetchUserBookings");
      setError("Unable to identify user. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching bookings for user:", userId);
      setLoading(true);
      setError(null); 
      const db = getFirestore();
      

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
          extensionCharges: data.extensionCharges || [],
          foodOrders: []
        });
      });
      
      // Fetch restaurant orders for each booking
      for (let booking of bookingData) {
        try {

          const tabOrdersQuery = query(
            collection(db, "orders"),
            where("roomNumber", "==", booking.room),
            where("paymentMethod", "==", "Tab"),
            where("paid", "==", false)
          );
          
          const tabOrdersSnapshot = await getDocs(tabOrdersQuery);
          
          const roomServiceQuery = query(
            collection(db, "orders"),
            where("roomNumber", "==", booking.room),
            where("deliveryMethod", "==", "roomService"),
            where("paid", "==", false)
          );
          
          const roomServiceSnapshot = await getDocs(roomServiceQuery);
          
          const foodOrders = [];
          
          tabOrdersSnapshot.forEach((doc) => {
            const orderData = doc.data();
            
            let itemsDescription = "";
            if (orderData.cartItems && orderData.cartItems.length > 0) {
              itemsDescription = orderData.cartItems
                .map(item => `${item.quantity}x ${item.name}`)
                .join(", ");
            }

            const isExtension = itemsDescription.toLowerCase().includes("extension") || 
                              (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
                              (orderData.notes && orderData.notes.toLowerCase().includes("extension"));
            
            foodOrders.push({
              id: doc.id,
              date: orderData.timestamp?.toDate() || new Date(),
              description: `Restaurant Order - Tab (${itemsDescription})`,
              amount: orderData.total || 0,
              type: isExtension ? "extension" : "food",
              notes: orderData.notes || ""
            });
          });
          
          roomServiceSnapshot.forEach((doc) => {
            const orderData = doc.data();
            
            if (foodOrders.some(order => order.id === doc.id)) {
              return;
            }

            let itemsDescription = "";
            if (orderData.cartItems && orderData.cartItems.length > 0) {
              itemsDescription = orderData.cartItems
                .map(item => `${item.quantity}x ${item.name}`)
                .join(", ");
            }
            

            const isExtension = itemsDescription.toLowerCase().includes("extension") || 
                              (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
                              (orderData.notes && orderData.notes.toLowerCase().includes("extension"));
            
            foodOrders.push({
              id: doc.id,
              date: orderData.timestamp?.toDate() || new Date(),
              description: `Room Service (${itemsDescription})`,
              amount: orderData.total || 0,
              type: isExtension ? "extension" : "food",
              notes: orderData.notes || ""
            });
          });
          
  
          const unpaidExtensionCharges = (booking.extensionCharges || []).filter(charge => charge.paid !== true);
          
      
          if (unpaidExtensionCharges.length > 0) {
            console.log("Processing extension charges:", unpaidExtensionCharges);
            unpaidExtensionCharges.forEach(charge => {
         
              if (!foodOrders.some(order => order.id === charge.id)) {
                foodOrders.push({
                  id: charge.id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  date: charge.date?.toDate() || new Date(),
                  description: charge.description || "Stay Extension",
                  amount: charge.finalPrice || charge.amount || 0,
                  type: "extension",
                  notes: charge.notes || ""
                });
              }
            });
          }
          
      
          foodOrders.sort((a, b) => b.date - a.date);
          
          booking.foodOrders = foodOrders;
        } catch (err) {
          console.error("Error fetching orders for room", booking.room, err);
        }
      }
      
      setBookings(bookingData);

      const currentBooking = bookingData.find(b => b.status === "Checked in");
      if (currentBooking) {
        setSelectedBooking(currentBooking);
      } else if (bookingData.length > 0) {
        setSelectedBooking(bookingData[0]);
      }
      
      setError(null); 
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
  
 
  const calculateExtensionTotal = (orders) => {
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    const total = extensionOrders.reduce((total, order) => total + order.amount, 0);
    console.log("Extension total calculated:", total, "from orders:", extensionOrders);
    return total;
  };


  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
  };


  const getCurrentBooking = () => {
    return bookings.find(booking => booking.status === "Checked in") || null;
  };


  const handleRetry = () => {
    setLoading(true);
    setError(null);
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      setUser(currentUser);
      fetchUserBookings(currentUser.uid);
    } else {
 
      const guestId = localStorage.getItem("guestId");
      if (guestId) {
        console.log("Retrying with guest ID:", guestId);
        setUser({ uid: guestId, isGuest: true });
        fetchUserBookings(guestId);
      } else {
        
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
        
        setError("Please log in to view your bills");
        setLoading(false);
      }
    }
  };


  const formatCurrency = (amount) => {
    return `GHS ${Number(amount).toFixed(2)}`;
  };

  if (loading || !authChecked) {
    return (
      <div className="guest-bills-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="loading-container">
          <div>
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading your booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !user && authChecked) {
    return (
      <div className="guest-bills-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentBooking = getCurrentBooking();
  const activeBooking = selectedBooking || currentBooking || bookings[0];


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
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <div className="guest-bills-card">
        <div className="guest-bills-header">
          <h2 className="guest-bills-title">Your Hotel Bill</h2>
          <p className="guest-bills-subtitle">View your current and past booking charges</p>
        </div>
        
        <div className="guest-bills-content">
          {bookings.length > 0 ? (
            <div>
     
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
                          <span>{formatCurrency(activeBooking.originalPrice)}</span>
                        </div>
                        {getExtensionOrders(activeBooking.foodOrders).length > 0 && (
                          <div className="charge-item extension-charge">
                            <span>Extension Charges</span>
                            <span>{formatCurrency(calculateExtensionTotal(activeBooking.foodOrders))}</span>
                          </div>
                        )}
                        <div className="charge-item">
                          <span>Total Room Charges</span>
                          <span>{formatCurrency(Number(activeBooking.originalPrice) + calculateExtensionTotal(activeBooking.foodOrders))}</span>
                        </div>
                        {(activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 && (
                          <div className="charge-total">
                            <span>Balance Due</span>
                            <span>{formatCurrency(Number(activeBooking.accommodationBalance) + calculateExtensionTotal(activeBooking.foodOrders))}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Display payment instructions if balance due */}
                      {(activeBooking.accommodationBalance + calculateExtensionTotal(activeBooking.foodOrders)) > 0 && (
                        <div className="payment-instructions">
                          <h4>Payment Instructions</h4>
                          <p>Please visit the front desk to settle your room balance.</p>
                          <p>We accept credit cards, debit cards, mobile money, and cash payments.</p>
                        </div>
                      )}
                      
         
                    </div>
                  )}
                  
                  {/* Food & drinks charges */}
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
                                  <td>{formatCurrency(order.amount)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td colSpan={2}>Total</td>
                                <td>{formatCurrency(calculateFoodTotal(activeBooking.foodOrders))}</td>
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
                      
                     
                      {getFoodOnlyOrders(activeBooking.foodOrders).length > 0 && (
                        <div className="user-actions">
                          <button className="btn btn-outline">Download Receipt</button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/*  Extension charges */}
                  {activeTab === 'extensions' && (
                    <div className="tab-content">
                      <div className="charges-header">
                        <h3 className="charges-title">Stay Extension Charges</h3>
                        <span className={`payment-status ${getExtensionOrders(activeBooking.foodOrders).length > 0 ? 'outstanding' : 'paid'}`}>
                          {getExtensionOrders(activeBooking.foodOrders).length > 0 ? "Outstanding" : "No Charges"}
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
                                  <td>{formatCurrency(order.amount)}</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td colSpan={2}>Total</td>
                                <td>{formatCurrency(calculateExtensionTotal(activeBooking.foodOrders))}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-food-orders">
                          <p>You currently have no stay extension charges.</p>
                        </div>
                      )}
                      
                    
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
              <h3>You Don't Have Any Reservations</h3>
              <p>You don't have any current or past bookings.</p>
              <p>Would you like to make a new reservation?</p>
              <button className="btn btn-primary" onClick={handleMakeReservation}>
                Make a Reservation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestBills;