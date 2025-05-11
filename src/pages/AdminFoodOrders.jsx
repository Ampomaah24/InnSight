import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import Sidebar from "../components/Sidebar";
import "../assets/styles/AdminFoodOrders.css";

const AdminFoodOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [sortBy, setSortBy] = useState('newest');

  const STATUS_MAPPING = {
    // Basic status mapping
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready',
    'picked-up': 'picked-up',
    'completed': 'completed',
    'cancelled': 'cancelled',
    
    // Payment status mapping
    'paid': 'confirmed',
    'on-hotel-tab': 'confirmed',
    
    // Pickup status mapping - Update these to avoid skipping to ready
    'awaiting-pickup': 'pending',      // Changed from 'ready' to 'pending'
    'awaiting pickup': 'pending',      // Changed from 'ready' to 'pending'
    'awaiting_pickup': 'pending',      // Changed from 'ready' to 'pending'
    'awaitingpickup': 'pending',       // Changed from 'ready' to 'pending'
    'Awaiting-Pickup': 'pending',      // Changed from 'ready' to 'pending'
    'Awaiting Pickup': 'pending',      // Changed from 'ready' to 'pending'
    'AWAITING PICKUP': 'pending',      // Changed from 'ready' to 'pending'
    'AWAITING-PICKUP': 'pending',      // Changed from 'ready' to 'pending'
    'Awaiting pickup': 'pending',      // Changed from 'ready' to 'pending'
    
    // Fix Cash on Pickup mapping
    'Cash on Pickup': 'pending',       // Changed from 'ready' to 'pending'
    
    // Delivery status mapping
    'awaiting-delivery': 'pending',    // Changed from 'ready' to 'pending'
    'out-for-delivery': 'delivering',
    'delivering': 'delivering',
    'delivered': 'delivered',
    
    // Room service status mapping
    'room-service-pending': 'pending',
    'room-service-on-hotel-tab': 'confirmed',
    'room-service-paid': 'confirmed',
    'room-service-ready': 'ready',
    'room-service-delivering': 'delivering',
    'room-service-delivered': 'delivered',
    
    // Handle raw statuses that might appear from Checkout.js
    'Room Service Pending': 'pending',
    'Room Service - Paid': 'confirmed',
    'On Hotel Tab': 'confirmed'
    // Removed 'Cash on Pickup': 'ready' (duplicate with the fixed version above)
  };

  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    
    // First, convert to lowercase and replace spaces with hyphens
    const normalizedStatus = status.toString().toLowerCase().replace(/\s+/g, '-');
    
    // Check if this status is in our mapping
    return STATUS_MAPPING[normalizedStatus] || normalizedStatus;
  };

  // Helper function to get user-friendly display status
  const getDisplayStatus = (status) => {
    const normalized = normalizeStatus(status);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, ' ');
  };

  const getNextStatus = (currentStatus, orderType) => {
    const normalized = normalizeStatus(currentStatus);
    
    // Different flow based on order type
    if (orderType === 'roomService') {
      const roomServiceFlow = {
        'pending': 'confirmed',
        'confirmed': 'preparing',
        'preparing': 'ready',
        'ready': 'delivering',
        'delivering': 'delivered',
        'delivered': 'completed'
      };
      // Return the next status or keep current if not found (instead of jumping to completed)
      return roomServiceFlow[normalized] || normalized;
    } else {
      // For pickup/delivery
      const pickupFlow = {
        'pending': 'confirmed',
        'confirmed': 'preparing',
        'preparing': 'ready',
        'ready': 'picked-up',
        'picked-up': 'completed'
      };
      // Return the next status or keep current if not found (instead of jumping to completed)
      return pickupFlow[normalized] || normalized;
    }
  };

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const orderList = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        let customerName = 'Guest';

        if (data.userId) {
          try {
            const userRef = doc(db, 'users', data.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              customerName = userData.fullName || userData.name || userData.email || 'Guest';
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }

        // Extract and normalize the status from Firebase
        const rawStatus = (data.status || '').toString();
        const normalizedStatus = normalizeStatus(rawStatus);

        orderList.push({
          id: docSnapshot.id,
          ...data,
          customerName: data.customerName || data.guestName || customerName,
          timestamp: data.timestamp?.toDate() || new Date(),
          orderStatus: normalizedStatus
        });
      }

      setOrders(orderList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (filter !== 'all') {
      filtered = filtered.filter(order => normalizeStatus(order.orderStatus) === filter);
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= today && orderDate < tomorrow;
        });
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= yesterday && orderDate < today;
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.timestamp);
          return orderDate >= monthAgo;
        });
        break;
      default:
        break;
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'amount-low':
        filtered.sort((a, b) => (a.total || 0) - (b.total || 0));
        break;
      case 'amount-high':
        filtered.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
      default:
        break;
    }

    setFilteredOrders(filtered);
  }, [orders, filter, searchTerm, dateFilter, sortBy]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Get the current order to check if this is a valid transition
      const orderSnap = await getDoc(orderRef);
      const currentOrder = orderSnap.data();
      const currentStatus = normalizeStatus(currentOrder.status);
      
      // Check if this is a valid status transition
      const validNextStatus = getNextStatus(currentStatus, currentOrder.deliveryMethod || currentOrder.orderType);
      
      // Only allow: next step, cancellation, or manual override by admins
      if (newStatus !== validNextStatus && newStatus !== 'cancelled') {
        console.warn(`Warning: Attempting to update from ${currentStatus} to ${newStatus}, but expected next status is ${validNextStatus}`);
        // Optionally, you can add a confirmation step here instead of automatically proceeding
        // return alert(`Invalid status transition from ${currentStatus} to ${newStatus}. Expected next status: ${validNextStatus}`);
      }
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
  
      // Add appropriate timestamps for tracking
      if (newStatus === 'confirmed') updateData.confirmedAt = serverTimestamp();
      if (newStatus === 'preparing') updateData.preparingAt = serverTimestamp();
      if (newStatus === 'ready') updateData.readyAt = serverTimestamp();
      if (newStatus === 'delivering') updateData.deliveringAt = serverTimestamp();
      if (newStatus === 'delivered') updateData.deliveredAt = serverTimestamp();
      if (newStatus === 'picked-up') updateData.pickedUpAt = serverTimestamp();
      if (newStatus === 'completed') updateData.completedAt = serverTimestamp();
      if (newStatus === 'cancelled') updateData.cancelledAt = serverTimestamp();
  
      await updateDoc(orderRef, updateData);
      console.log(`Order ${orderId} updated to status: ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Failed to update order status: ${error.message}`);
    }
  };

  const calculateOrderTotal = (cartItems) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'pending': return '#f59e0b';   // Amber
      case 'confirmed': return '#3b82f6'; // Blue
      case 'preparing': return '#8b5cf6'; // Purple
      case 'ready': return '#10b981';     // Green
      case 'delivering': return '#0ea5e9'; // Sky Blue
      case 'delivered': return '#14b8a6';  // Teal
      case 'picked-up': return '#6b7280'; // Gray
      case 'completed': return '#22c55e'; // Green
      case 'cancelled': return '#ef4444'; // Red
      default: return '#6b7280';          // Gray
    }
  };

  const getOrderTypeLabel = (order) => {
    if (order.deliveryMethod === 'roomService') return 'Room Service';
    if (order.deliveryMethod === 'pickup') return 'Pickup';
    if (order.orderType === 'pickup') return 'Pickup';
    if (order.orderType === 'delivery') return 'Delivery';
    return 'Unknown';
  };

  const getCustomerInfo = (order) => {
    if (order.deliveryMethod === 'roomService' && order.roomNumber) {
      const guestName = order.customerName || order.guestName || '';
      return guestName ? `Room ${order.roomNumber} (${guestName})` : `Room ${order.roomNumber}`;
    }
    return order.customerName || 'Guest';
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <Sidebar />
        <div className="admin-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Sidebar />
      <div className="admin-content">
        <div className="admin-header">
          <h1>Food Orders Management</h1>
          <div className="header-stats">
            <div className="stat-card">
              <h3>Today's Orders</h3>
              <p>{filteredOrders.filter(order => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const orderDate = new Date(order.timestamp);
                return orderDate >= today;
              }).length}</p>
            </div>
            <div className="stat-card">
              <h3>Pending Orders</h3>
              <p>{orders.filter(order => normalizeStatus(order.orderStatus) === 'pending').length}</p>
            </div>
            <div className="stat-card">
              <h3>Ready for Pickup</h3>
              <p>{orders.filter(order => normalizeStatus(order.orderStatus) === 'ready').length}</p>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by order ID, customer name, room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="picked-up">Picked Up</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="filter-select">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Highest Amount</option>
              <option value="amount-low">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="orders-grid">
          {filteredOrders.length === 0 ? (
            <div className="no-orders">
              <p>No orders found matching your criteria.</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="order-card" data-status={normalizeStatus(order.orderStatus)}>
                <div className="order-header">
                  <div className="order-basic-info">
                    <h3>Order #{order.id.slice(-8)}</h3>
                    <span className="order-status" style={{ backgroundColor: getStatusColor(order.orderStatus) }}>
                      {getDisplayStatus(order.orderStatus)}
                    </span>
                  </div>
                  <div className="order-type-badge">
                    {getOrderTypeLabel(order)}
                  </div>
                </div>

                <div className="order-details">
                  <div className="customer-info">
                    <p><strong>Customer:</strong> {getCustomerInfo(order)}</p>
                    {order.phone && <p><strong>Phone:</strong> {order.phone}</p>}
                    {order.paymentMethod && <p><strong>Payment:</strong> {order.paymentMethod}</p>}
                  </div>

                  <div className="order-time">
                    <p><strong>Ordered:</strong> {formatDate(order.timestamp)}</p>
                  </div>

                  <div className="order-items">
                    <h4>Items:</h4>
                    <ul>
                      {order.cartItems?.map((item, idx) => (
                        <li key={idx}>{item.quantity}x {item.name} - GHS {item.price}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-total">
                    <h4>Total: GHS {(order.total || calculateOrderTotal(order.cartItems)).toFixed(2)}</h4>
                  </div>
                </div>

                <div className="order-actions">
                  {/* PENDING STATUS - All order types */}
                  {normalizeStatus(order.orderStatus) === 'pending' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'confirmed')} className="action-button confirm">Confirm Order</button>
                      <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="action-button cancel">Cancel Order</button>
                    </>
                  )}
                  
                  {/* CONFIRMED STATUS - All order types */}
                  {normalizeStatus(order.orderStatus) === 'confirmed' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="action-button preparing">Start Preparing</button>
                      <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="action-button cancel">Cancel Order</button>
                    </>
                  )}
                  
                  {/* PREPARING STATUS - All order types */}
                  {normalizeStatus(order.orderStatus) === 'preparing' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="action-button ready">Mark as Ready</button>
                  )}
                  
                  {/* READY STATUS - Based on delivery method */}
                  {normalizeStatus(order.orderStatus) === 'ready' && (order.deliveryMethod === 'pickup' || order.orderType === 'pickup') && (
                    <button onClick={() => updateOrderStatus(order.id, 'picked-up')} className="action-button picked-up">Mark as Picked Up</button>
                  )}
                  
                  {/* READY STATUS - Room Service */}
                  {normalizeStatus(order.orderStatus) === 'ready' && order.deliveryMethod === 'roomService' && (
                    <button onClick={() => updateOrderStatus(order.id, 'delivering')} className="action-button delivering">Send for Delivery</button>
                  )}
                  
                  {/* DELIVERING STATUS - Room Service */}
                  {normalizeStatus(order.orderStatus) === 'delivering' && order.deliveryMethod === 'roomService' && (
                    <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="action-button delivered">Mark as Delivered</button>
                  )}
                  
                  {/* DELIVERED STATUS - Room Service */}
                  {normalizeStatus(order.orderStatus) === 'delivered' && (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="action-button completed">Mark as Completed</button>
                  )}
                  
                  {/* PICKED-UP STATUS - Pickup orders */}
                  {normalizeStatus(order.orderStatus) === 'picked-up' && (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="action-button completed">Mark as Completed</button>
                  )}
                  
                  {/* Add a general "Next Step" button for unknown status values */}
                  {!['completed', 'cancelled', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'delivering', 'delivered'].includes(normalizeStatus(order.orderStatus)) && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.orderStatus, order.deliveryMethod || order.orderType))} 
                      className="action-button next-step">
                      Move to Next Step
                    </button>
                  )}
                  
                  {/* Terminal states */}
                  {['completed', 'cancelled'].includes(normalizeStatus(order.orderStatus)) && (
                    <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
                      Order {normalizeStatus(order.orderStatus)} - No further actions needed.
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFoodOrders;