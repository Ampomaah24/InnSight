// src/components/HotelBills.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, updateDoc, addDoc, writeBatch, orderBy, limit, getDoc } from 'firebase/firestore';
import "../assets/styles/Bills.css";
import PaymentModal from './PaymentModal';

const HotelBills = () => {
  const [guests, setGuests] = useState([]);
  const [processedPayments, setProcessedPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [mainView, setMainView] = useState('active'); // 'active' or 'processed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  
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

  // Format time helper function
  const formatTime = (dateObj) => {
    try {
      if (dateObj instanceof Date) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return "Not available";
    } catch (e) {
      console.error("Time formatting error:", e);
      return "Not available";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        // Fetch both active guests and processed payments in parallel
        await Promise.all([
          fetchGuests(db),
          fetchProcessedPayments(db)
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchGuests = async (db) => {
    try {
      // Query for guests with "checked in" status
      const q = query(
        collection(db, "bookings"),
        where("status", "==", "Checked in")
      );
      
      const querySnapshot = await getDocs(q);
      const guestData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Format the guest data - ensure guest name is properly set
        guestData.push({
          id: doc.id,
          name: data.lastName || (data.firstName ? `${data.firstName} ${data.lastName || ''}` : "Guest"),
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
          phone: data.phone || "",
          userId: data.userId || "",
          numberOfGuests: data.numberOfGuests || 1,
          specialRequests: data.specialRequests || "",
          extensionCharges: data.extensionCharges || [],
          foodOrders: []
        });
      });
      
      // Fetch food orders and extension charges for each guest
      for (let guest of guestData) {
        await fetchGuestOrders(db, guest);
      }
      
      setGuests(guestData);
    } catch (err) {
      console.error("Error fetching guests:", err);
      throw err;
    }
  };

  const fetchGuestOrders = async (db, guest) => {
    try {
      // First query for orders put on room tab - EXPLICITLY CHECK FOR UNPAID ORDERS
      const tabOrdersQuery = query(
        collection(db, "orders"),
        where("roomNumber", "==", guest.room),
        where("paymentMethod", "==", "Tab"),
        where("paid", "==", false) // EXPLICIT CHECK for unpaid orders only
      );
      
      const tabOrdersSnapshot = await getDocs(tabOrdersQuery);
      
      // Then query for room service orders - EXPLICITLY CHECK FOR UNPAID ORDERS
      const roomServiceQuery = query(
        collection(db, "orders"),
        where("roomNumber", "==", guest.room),
        where("deliveryMethod", "==", "roomService"),
        where("paid", "==", false) // EXPLICIT CHECK for unpaid orders only
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
        
        // Skip if this order was already added
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
      
      // Filter to only include unpaid extension charges
      const unpaidExtensionCharges = (guest.extensionCharges || []).filter(charge => charge.paid !== true);
      
      // Add extension charges from booking if they exist and aren't already in food orders
      if (unpaidExtensionCharges.length > 0) {
        console.log("Processing unpaid extension charges:", unpaidExtensionCharges);
        unpaidExtensionCharges.forEach(charge => {
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
      
      guest.foodOrders = foodOrders;
    } catch (err) {
      console.error(`Error fetching orders for guest in room ${guest.room}:`, err);
      guest.foodOrders = []; // Set to empty if error occurs
    }
  };

  const fetchProcessedPayments = async (db) => {
    try {
      // Query for recent processed payments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const paymentsQuery = query(
        collection(db, "payments"),
        where("timestamp", ">=", thirtyDaysAgo),
        orderBy("timestamp", "desc"),
        limit(100) // Limit to 100 most recent payments
      );
      
      const querySnapshot = await getDocs(paymentsQuery);
      const processedPaymentsData = [];
      
      // Process payments data
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        processedPaymentsData.push({
          id: doc.id,
          guestId: data.guestId || "",
          guestName: data.guestName || "Guest",
          roomNumber: data.roomNumber || "",
          amount: data.amount || 0,
          type: data.type || "",
          method: data.method || "",
          reference: data.reference || "",
          timestamp: data.timestamp?.toDate() || new Date(),
          status: data.status || "Completed",
          collectedBy: data.collectedBy || "",
          emailSent: data.emailSent || false,
          guestEmail: data.guestEmail || ""
        });
      });
      
      setProcessedPayments(processedPaymentsData);
    } catch (err) {
      console.error("Error fetching processed payments:", err);
      setProcessedPayments([]);
    }
  };

  // Refresh data function to be called after payments are processed
  const refreshData = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      
      // Fetch both active guests and processed payments in parallel
      await Promise.all([
        fetchGuests(db),
        fetchProcessedPayments(db)
      ]);
      
      setLoading(false);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data. Please try again.");
      setLoading(false);
    }
  };

  // Filter guests based on search term
  const filteredGuests = guests.filter(guest => 
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    guest.room.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter processed payments based on search term
  const filteredPayments = processedPayments.filter(payment => 
    (payment.guestName?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) || 
    (payment.roomNumber?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) ||
    (payment.type?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) ||
    (payment.method?.toLowerCase().includes(paymentSearchTerm.toLowerCase()))
  );

  // Calculate total food orders (excluding extensions)
  const calculateFoodTotal = (orders) => {
    return orders.filter(order => 
      order.type === "food" && 
      !(order.description && order.description.toLowerCase().includes("extension"))
    ).reduce((total, order) => total + order.amount, 0);
  };
  
  // Calculate total extension charges
  const calculateExtensionTotal = (orders) => {
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    const total = extensionOrders.reduce((total, order) => total + order.amount, 0);
    return total;
  };

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
    return extensionOrders;
  };

  // Handle guest selection
  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
  };

  // Format payment type for display
  const formatPaymentType = (type) => {
    switch(type) {
      case 'accommodation':
        return 'Accommodation Balance';
      case 'food':
        return 'Food & Beverage';
      case 'extension':
        return 'Stay Extension';
      default:
        return type;
    }
  };

  // Handle payment
  const handlePayment = (type) => {
    if (!selectedGuest) return;
    
    let amount = 0;
    
    switch(type) {
      case 'accommodation':
        amount = selectedGuest.accommodationBalance;
        break;
      case 'food':
        amount = calculateFoodTotal(selectedGuest.foodOrders);
        break;
      case 'extension':
        amount = calculateExtensionTotal(selectedGuest.foodOrders);
        break;
      default:
        amount = 0;
    }
    
    if (amount <= 0) {
      alert("No outstanding balance to pay");
      return;
    }
    
    setPaymentType(type);
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePaymentComplete = async (type, paymentDetails) => {
    const db = getFirestore();
    const batch = writeBatch(db);
    
    try {
      // Create payment record data
      const paymentData = {
        guestId: selectedGuest.id,
        guestName: selectedGuest.name,
        userId: selectedGuest.userId,
        roomNumber: selectedGuest.room,
        amount: paymentAmount,
        type: type,
        method: paymentDetails.method,
        reference: paymentDetails.reference,
        collectedBy: "Front Desk", // Ideally use current user ID
        timestamp: new Date(),
        status: "Completed",
        emailSent: paymentDetails.email ? true : false,
        guestEmail: paymentDetails.email || null
      };
      
      // Add payment to Firestore
      const paymentRef = await addDoc(collection(db, "payments"), paymentData);
      
      if (type === 'accommodation') {
        // Update booking document
        const bookingRef = doc(db, "bookings", selectedGuest.id);
        batch.update(bookingRef, {
          remainderDue: 0,
          paymentStatus: "Paid",
          lastPaymentDate: new Date(),
          lastPaymentAmount: paymentAmount,
          lastPaymentMethod: paymentDetails.method,
          lastPaymentId: paymentRef.id
        });
        
        // Update local state
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, accommodationBalance: 0, paymentStatus: "Paid"} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, accommodationBalance: 0, paymentStatus: "Paid"});
      } else if (type === 'food') {
        // Mark all food orders as paid
        const foodOrders = getFoodOnlyOrders(selectedGuest.foodOrders);
        
        // Update each food order document
        foodOrders.forEach(order => {
          const orderRef = doc(db, "orders", order.id);
          batch.update(orderRef, {
            paid: true, // Explicitly mark as paid
            paidDate: new Date(),
            paymentId: paymentRef.id,
            paymentMethod: paymentDetails.method
          });
        });
        
        // Update local state - remove paid food orders
        const updatedFoodOrders = selectedGuest.foodOrders.filter(order => 
          !(order.type === "food" && 
            !(order.description && order.description.toLowerCase().includes("extension")))
        );
        
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, foodOrders: updatedFoodOrders} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, foodOrders: updatedFoodOrders});
      } else if (type === 'extension') {
        // Mark all extension orders as paid
        const extensionOrders = getExtensionOrders(selectedGuest.foodOrders);
        
        // Update each extension order document
        extensionOrders.forEach(order => {
          const orderRef = doc(db, "orders", order.id);
          batch.update(orderRef, {
            paid: true, // Explicitly mark as paid
            paidDate: new Date(),
            paymentId: paymentRef.id,
            paymentMethod: paymentDetails.method
          });
        });
        
        // Get current extension charges from booking
        const bookingRef = doc(db, "bookings", selectedGuest.id);
        const bookingDoc = await getDoc(bookingRef);
        const bookingData = bookingDoc.data();
        const currentExtensionCharges = bookingData.extensionCharges || [];
        
        // Mark all as paid
        const updatedExtensionCharges = currentExtensionCharges.map(charge => ({
          ...charge,
          paid: true,
          paidDate: new Date(),
          paymentId: paymentRef.id
        }));
        
        // Update with paid extensions
        batch.update(bookingRef, {
          extensionCharges: updatedExtensionCharges // Keep the array but mark each as paid
        });
        
        // Update local state - remove paid extension orders
        const updatedFoodOrders = selectedGuest.foodOrders.filter(order => 
          !(order.type === "extension" || 
            (order.description && order.description.toLowerCase().includes("extension")))
        );
        
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, foodOrders: updatedFoodOrders, extensionCharges: updatedExtensionCharges} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, foodOrders: updatedFoodOrders, extensionCharges: updatedExtensionCharges});
      }
      
      // Commit batch
      await batch.commit();
      
      // Add the new payment to processed payments list
      setProcessedPayments(prevPayments => [
        {
          id: paymentRef.id,
          ...paymentData
        },
        ...prevPayments
      ]);
      
      // Show success alert
      alert(`✅ Payment for ${selectedGuest.name}'s ${formatPaymentType(type)} was successful.`);
      
      // Refresh data to ensure UI is synchronized with database
      await refreshData();
    } catch(error) {
      console.error("Error processing payment:", error);
      alert(`❌ Payment processing failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading data...</p>
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

  return (
    <div className="bills-container">
      <div className="view-selector">
        <button 
          className={`view-button ${mainView === 'active' ? 'active' : ''}`}
          onClick={() => setMainView('active')}
        >
          Active Bills
        </button>
        <button 
          className={`view-button ${mainView === 'processed' ? 'active' : ''}`}
          onClick={() => setMainView('processed')}
        >
          Processed Payments
        </button>
      </div>

      {/* Active Bills View */}
      {mainView === 'active' && (
        <div className="bills-card">
          <div className="bills-header">
            <h2 className="bills-title">Hotel Guest Outstanding Bills</h2>
            <p className="bills-subtitle">View and manage bills for checked-in guests</p>
          </div>
          <div className="bills-content">
            <div className="layout-grid">
              {/* Guest List Section */}
              <div>
                <input
                  type="text"
                  placeholder="Search by name or room number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                
                <div className="guest-list">
                  {filteredGuests.length > 0 ? (
                    filteredGuests.map(guest => (
                      <div 
                        key={guest.id}
                        className={`guest-card ${selectedGuest?.id === guest.id ? 'selected' : ''}`}
                        onClick={() => handleGuestSelect(guest)}
                      >
                        <div className="guest-info">
                          <div>
                            <h3 className="guest-name">{guest.name}</h3>
                            <p className="room-info">Room {guest.room} {guest.roomName && `(${guest.roomName})`}</p>
                          </div>
                          <span className="status-badge checked-in">{guest.status}</span>
                        </div>
                        <div className="guest-billing">
                          <div>
                            <p className="billing-item-label">Accommodation</p>
                            <p className="billing-item-value">
                              ${(Number(guest.accommodationBalance) + calculateExtensionTotal(guest.foodOrders)).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="billing-item-label">Food & Beverage</p>
                            <p className="billing-item-value">${calculateFoodTotal(guest.foodOrders).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No guests found</p>
                  )}
                </div>
              </div>

              {/* Bill Details Section */}
              <div>
                {selectedGuest ? (
                  <div className="bill-details">
                    <div className="guest-header">
                      <div className="guest-header-info">
                        <div>
                          <h2 className="bills-title">{selectedGuest.name}</h2>
                          <p className="bills-subtitle">
                            Room {selectedGuest.room} {selectedGuest.roomName && `(${selectedGuest.roomName})`} | 
                            {selectedGuest.checkInDate && ` Check-in: ${formatDate(selectedGuest.checkInDate)}`}
                            {selectedGuest.checkOutDate && ` | Check-out: ${formatDate(selectedGuest.checkOutDate)}`}
                          </p>
                        </div>
                        <span className="status-badge checked-in">{selectedGuest.status}</span>
                      </div>
                    </div>
                    <div className="bills-content">
                      <div>
                        <div className="tab-nav">
                          <button 
                            onClick={() => setActiveTab('accommodation')} 
                            className={`tab-button ${activeTab === 'accommodation' ? 'active' : ''}`}
                          >
                            Accommodation Balance
                          </button>
                          <button 
                            onClick={() => setActiveTab('foodOrders')} 
                            className={`tab-button ${activeTab === 'foodOrders' ? 'active' : ''}`}
                          >
                            Food & Beverage
                          </button>
                          {getExtensionOrders(selectedGuest.foodOrders).length > 0 && (
                            <button 
                              onClick={() => setActiveTab('extensions')} 
                              className={`tab-button ${activeTab === 'extensions' ? 'active' : ''}`}
                            >
                              Stay Extensions
                            </button>
                          )}
                        </div>
                        
                        {activeTab === 'accommodation' && (
                          <div className="tab-content">
                            <div className="bill-details">
                              <div className="bills-content">
                                <div className="charges-header">
                                  <h3 className="charges-title">Accommodation Charges</h3>
                                  <span className={`status-badge ${selectedGuest.accommodationBalance > 0 ? 'outstanding' : 'paid'}`}>
                                    {selectedGuest.paymentStatus || (selectedGuest.accommodationBalance > 0 ? "Outstanding" : "Paid")}
                                  </span>
                                </div>
                                
                                <div className="charges-details">
                                  <div className="charge-item">
                                    <span>Room Type</span>
                                    <span>{selectedGuest.roomType}</span>
                                  </div>
                                  <div className="charge-item">
                                    <span>Room Category</span>
                                    <span>{selectedGuest.roomCategory}</span>
                                  </div>
                                  <div className="charge-item">
                                    <span>Number of Guests</span>
                                    <span>{selectedGuest.numberOfGuests}</span>
                                  </div>
                                  <div className="charge-item">
                                    <span>Payment Method</span>
                                    <span>{selectedGuest.paymentOption || "Not specified"}</span>
                                  </div>
                                  <div className="charge-item">
                                    <span>Original Price</span>
                                    <span>${Number(selectedGuest.originalPrice).toFixed(2)}</span>
                                  </div>
                                  <div className="charge-total">
                                    <span>Remainder Due</span>
                                    <span>${Number(selectedGuest.accommodationBalance).toFixed(2)}</span>
                                  </div>
                                </div>
                                
                                <div className="actions">
                                  <button 
                                    className="btn btn-primary"
                                    onClick={() => handlePayment('accommodation')}
                                    disabled={selectedGuest.accommodationBalance <= 0}
                                  >
                                    Process Payment
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {activeTab === 'foodOrders' && (
                          <div className="tab-content">
                            <div className="bill-details">
                              <div className="bills-content">
                                <div className="charges-header">
                                  <h3 className="charges-title">Food & Beverage Charges</h3>
                                  <span className={`status-badge ${getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? 'outstanding' : 'paid'}`}>
                                    {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? "Outstanding" : "No Charges"}
                                  </span>
                                </div>
                                
                                {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? (
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
                                        {getFoodOnlyOrders(selectedGuest.foodOrders).map(order => (
                                          <tr key={order.id}>
                                            <td>{formatDate(order.date)}</td>
                                            <td>{order.description}</td>
                                            <td>${order.amount.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                        <tr className="total-row">
                                          <td colSpan={2}>Total</td>
                                          <td>${calculateFoodTotal(selectedGuest.foodOrders).toFixed(2)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="empty-state">No food or beverage charges</p>
                                )}
                                
                                {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 && (
                                  <div className="actions">
                                    <button 
                                      className="btn btn-primary"
                                      onClick={() => handlePayment('food')}
                                    >
                                      Process Payment
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {activeTab === 'extensions' && (
                          <div className="tab-content">
                            <div className="bill-details">
                              <div className="bills-content">
                                <div className="charges-header">
                                  <h3 className="charges-title">Stay Extension Charges</h3>
                                  <span className={`status-badge outstanding`}>
                                    Outstanding
                                  </span>
                                </div>
                                
                                // Continuation of HotelBills.js

// Extension tab content
{getExtensionOrders(selectedGuest.foodOrders).length > 0 ? (
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
        {getExtensionOrders(selectedGuest.foodOrders).map(order => (
          <tr key={order.id} className="extension-row">
            <td>{formatDate(order.date)}</td>
            <td>
              {order.description}
              {order.notes && <div className="order-notes">{order.notes}</div>}
            </td>
            <td>${order.amount.toFixed(2)}</td>
          </tr>
        ))}
        <tr className="total-row">
          <td colSpan={2}>Total</td>
          <td>${calculateExtensionTotal(selectedGuest.foodOrders).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>
) : (
  <p className="empty-state">No stay extension charges</p>
)}

{getExtensionOrders(selectedGuest.foodOrders).length > 0 && (
  <div className="actions">
    <button 
      className="btn btn-primary"
      onClick={() => handlePayment('extension')}
    >
      Process Payment
    </button>
  </div>
)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="select-guest-placeholder">
                    <div className="placeholder-content">
                      <h3 className="placeholder-title">Select a Guest</h3>
                      <p className="placeholder-description">Choose a guest from the list to view their outstanding bills</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processed Payments View */}
      {mainView === 'processed' && (
        <div className="bills-card">
          <div className="bills-header">
            <h2 className="bills-title">Processed Payments</h2>
            <p className="bills-subtitle">View recent payment transactions</p>
          </div>
          <div className="bills-content">
            <input
              type="text"
              placeholder="Search by guest name, room, payment type, or method"
              value={paymentSearchTerm}
              onChange={(e) => setPaymentSearchTerm(e.target.value)}
              className="search-input wide"
            />
            
            {filteredPayments.length > 0 ? (
              <div className="table-container payments-table-container">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                      {/* Removed print button column */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.timestamp)}</td>
                        <td>{formatTime(payment.timestamp)}</td>
                        <td>{payment.guestName}</td>
                        <td>{payment.roomNumber}</td>
                        <td>{formatPaymentType(payment.type)}</td>
                        <td>{payment.method}</td>
                        <td className="amount">${payment.amount.toFixed(2)}</td>
                        <td>
                          <span className={`payment-status-pill ${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No processed payments found for the selected criteria.</p>
              </div>
            )}
            
            {/* Removed export controls section */}
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        guest={selectedGuest}
        paymentType={paymentType}
        amount={paymentAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default HotelBills;