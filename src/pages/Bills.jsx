// src/components/HotelBills.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import "../assets/styles/Bills.css";
import PaymentModal from './PaymentModal'; // Make sure to create this component

const HotelBills = () => {
  const [guests, setGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  // Add the formatDate helper function
  const formatDate = (dateString) => {
    try {
      // Check if it's in ISO format or Firestore timestamp format
      if (dateString && typeof dateString === 'string') {
        // Handle ISO format or other string formats
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
    const fetchGuests = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        // Query for guests with "checked in" status
        const q = query(
          collection(db, "bookings"),
          where("status", "==", "Checked in")
        );
        
        const querySnapshot = await getDocs(q);
        const guestData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Format the guest data
          guestData.push({
            id: doc.id,
            name: data.lastName || "Unknown",
            room: data.roomNumber || "Unknown",
            roomName: data.roomName || "",
            checkInDate: data.checkIn || data.lastUpdated || "", // Use checkIn field if available
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
            // We'll need to fetch food orders separately or include in the query if available
            foodOrders: []
          });
        });
        
        // Fetch food orders for each guest
        // Note: This is just a placeholder. You'll need to implement this based on your data structure
        for (const guest of guestData) {
          try {
            const foodOrdersRef = collection(db, "foodOrders");
            const foodOrdersQuery = query(
              foodOrdersRef,
              where("guestId", "==", guest.id),
              where("paid", "==", false)
            );
            
            const foodOrdersSnapshot = await getDocs(foodOrdersQuery);
            const foodOrders = [];
            
            foodOrdersSnapshot.forEach((doc) => {
              const orderData = doc.data();
              foodOrders.push({
                id: doc.id,
                date: formatDate(orderData.timestamp),
                description: orderData.description || "Food order",
                amount: orderData.amount || 0,
                paid: orderData.paid || false
              });
            });
            
            guest.foodOrders = foodOrders;
          } catch (err) {
            console.error(`Error fetching food orders for guest ${guest.id}:`, err);
            guest.foodOrders = []; // Set to empty if error occurs
          }
        }
        
        setGuests(guestData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching guests:", err);
        setError("Failed to load guest data. Please try again.");
        setLoading(false);
      }
    };

    fetchGuests();
  }, []);

  // Filter guests based on search term
  const filteredGuests = guests.filter(guest => 
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    guest.room.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total food orders for a guest
  const calculateFoodTotal = (orders) => {
    return orders.reduce((total, order) => total + order.amount, 0);
  };

  // Handle guest selection
  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
  };

  // Handle print invoice/receipt
  const handlePrint = (type) => {
    if (!selectedGuest) return;
    
    const printWindow = window.open('', '_blank');
    const hotelName = "YourHotelName"; // Replace with your hotel name
    
    // Determine what content to print based on type
    let content = `
      <html>
      <head>
        <title>${type === 'accommodation invoice' ? 'Invoice' : 'Receipt'} - ${selectedGuest.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .hotel-name { font-size: 24px; font-weight: bold; }
          .document-title { font-size: 18px; text-transform: uppercase; margin-top: 5px; }
          .details { margin-bottom: 20px; }
          .details-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .details-label { font-weight: bold; }
          .charges { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .charges th, .charges td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .charges th { background-color: #f2f2f2; }
          .total-row { font-weight: bold; }
          .footer { margin-top: 40px; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">${hotelName}</div>
          <div class="document-title">${type === 'accommodation invoice' ? 'Accommodation Invoice' : 'Food & Beverage Receipt'}</div>
        </div>
        
        <div class="details">
          <div class="details-row">
            <span class="details-label">Guest Name:</span>
            <span>${selectedGuest.name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Room:</span>
            <span>${selectedGuest.room} ${selectedGuest.roomName ? `(${selectedGuest.roomName})` : ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Check-in Date:</span>
            <span>${formatDate(selectedGuest.checkInDate)}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Invoice/Receipt #:</span>
            <span>${Math.floor(Math.random() * 10000)}</span>
          </div>
        </div>
    `;
    
    if (type === 'accommodation invoice') {
      content += `
        <table class="charges">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room Charge (${selectedGuest.roomType}, ${selectedGuest.roomCategory})</td>
              <td>$${Number(selectedGuest.originalPrice).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>Total Due</td>
              <td>$${Number(selectedGuest.accommodationBalance).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else { // food receipt
      content += `
        <table class="charges">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      selectedGuest.foodOrders.forEach(order => {
        content += `
          <tr>
            <td>${order.date}</td>
            <td>${order.description}</td>
            <td>$${order.amount.toFixed(2)}</td>
          </tr>
        `;
      });
      
      content += `
          <tr class="total-row">
            <td colspan="2">Total</td>
            <td>$${calculateFoodTotal(selectedGuest.foodOrders).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      `;
    }
    
    content += `
        <div class="footer">
          Thank you for your stay at ${hotelName}!
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // Handle payment
  const handlePayment = (type) => {
    if (!selectedGuest) return;
    
    const amount = type === 'accommodation' 
      ? selectedGuest.accommodationBalance 
      : calculateFoodTotal(selectedGuest.foodOrders);
    
    if (amount <= 0) {
      alert("No outstanding balance to pay");
      return;
    }
    
    setPaymentType(type);
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePaymentComplete = (type) => {
    if (type === 'accommodation') {
      setGuests(prevGuests => 
        prevGuests.map(guest => 
          guest.id === selectedGuest.id 
            ? {...guest, accommodationBalance: 0, paymentStatus: "Paid"} 
            : guest
        )
      );
      setSelectedGuest({...selectedGuest, accommodationBalance: 0, paymentStatus: "Paid"});
    } else if (type === 'food order') {
      setGuests(prevGuests => 
        prevGuests.map(guest => 
          guest.id === selectedGuest.id 
            ? {...guest, foodOrders: []} 
            : guest
        )
      );
      setSelectedGuest({...selectedGuest, foodOrders: []});
    }
  
    // ✅ Show success alert
    alert(`✅ Payment for ${selectedGuest.name}'s ${type === 'accommodation' ? 'accommodation' : 'food & beverage'} was successful.`);
  };
  

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading guest data...</p>
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
                          <p className="billing-item-value">${Number(guest.accommodationBalance).toFixed(2)}</p>
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
                          Food & Beverage Tab
                        </button>
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
                                  <span>Payment Option</span>
                                  <span>{selectedGuest.paymentOption}</span>
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
                                  className="btn btn-outline"
                                  onClick={() => handlePrint('accommodation invoice')}
                                >
                                  Print Invoice
                                </button>
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
                                <span className={`status-badge ${selectedGuest.foodOrders.length > 0 ? 'outstanding' : 'paid'}`}>
                                  {selectedGuest.foodOrders.length > 0 ? "Outstanding" : "No Charges"}
                                </span>
                              </div>
                              
                              {selectedGuest.foodOrders.length > 0 ? (
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
                                      {selectedGuest.foodOrders.map(order => (
                                        <tr key={order.id}>
                                          <td>{order.date}</td>
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
                              
                              {selectedGuest.foodOrders.length > 0 && (
                                <div className="actions">
                                  <button 
                                    className="btn btn-outline"
                                    onClick={() => handlePrint('food receipt')}
                                  >
                                    Print Receipt
                                  </button>
                                  <button 
                                    className="btn btn-primary"
                                    onClick={() => handlePayment('food order')}
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