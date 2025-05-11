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

  useEffect(() => {
    // Set up real-time listener for orders
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const orderList = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        let customerName = 'Guest';
        
        // Try to fetch user information based on userId
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
        
        orderList.push({
          id: docSnapshot.id,
          ...data,
          customerName: data.customerName || data.guestName || customerName,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      }
      
      setOrders(orderList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = orders;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
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

    // Sort orders
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
      const updateData = {
        orderStatus: newStatus,
        updatedAt: serverTimestamp()
      };

      // Add timestamp for specific statuses
      if (newStatus === 'preparing') {
        updateData.preparingAt = serverTimestamp();
      } else if (newStatus === 'ready') {
        updateData.readyAt = serverTimestamp();
      } else if (newStatus === 'picked-up') {
        updateData.pickedUpAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const calculateOrderTotal = (cartItems) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#10b981';
      case 'picked-up': return '#6b7280';
      case 'completed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
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
    // For room service orders, show room number
    if (order.deliveryMethod === 'roomService' && order.roomNumber) {
      const guestName = order.customerName || order.guestName || '';
      return guestName ? `Room ${order.roomNumber} (${guestName})` : `Room ${order.roomNumber}`;
    }
    
    // Return the customer name if available
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
              <p>{orders.filter(order => order.orderStatus === 'pending').length}</p>
            </div>
            <div className="stat-card">
              <h3>Ready for Pickup</h3>
              <p>{orders.filter(order => order.orderStatus === 'ready').length}</p>
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
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready for Pickup</option>
              <option value="picked-up">Picked Up</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
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
              <div key={order.id} className="order-card" data-status={order.orderStatus || "pending"}>
                <div className="order-header">
                  <div className="order-basic-info">
                    <h3>Order #{order.id.slice(-8)}</h3>
                    <span 
                      className="order-status"
                      style={{ backgroundColor: getStatusColor(order.orderStatus || 'pending') }}
                    >
                      {order.orderStatus || 'pending'}
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
                    {order.paymentMethod && (
                      <p><strong>Payment:</strong> {order.paymentMethod}</p>
                    )}
                  </div>

                  <div className="order-time">
                    <p><strong>Ordered:</strong> {formatDate(order.timestamp)}</p>
                    {order.preparingAt && (
                      <p><strong>Preparing Started:</strong> {formatDate(order.preparingAt.toDate())}</p>
                    )}
                    {order.readyAt && (
                      <p><strong>Ready:</strong> {formatDate(order.readyAt.toDate())}</p>
                    )}
                    {order.pickedUpAt && (
                      <p><strong>Picked Up:</strong> {formatDate(order.pickedUpAt.toDate())}</p>
                    )}
                    {order.completedAt && (
                      <p><strong>Completed:</strong> {formatDate(order.completedAt.toDate())}</p>
                    )}
                  </div>

                  <div className="order-items">
                    <h4>Items:</h4>
                    <ul>
                      {order.cartItems?.map((item, index) => (
                        <li key={index}>
                          {item.quantity}x {item.name} - GHS {item.price}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-total">
                    <h4>Total: GHS {(order.total || calculateOrderTotal(order.cartItems)).toFixed(2)}</h4>
                  </div>

                  {order.notes && (
                    <div className="order-notes">
                      <h4>Notes:</h4>
                      <p>{order.notes}</p>
                    </div>
                  )}
                </div>
                <div className="order-actions">
  {/* Pending -> Confirmed / Cancelled */}
  {String(order.orderStatus || '').toLowerCase() === 'pending' && (
    <>
      <button
        onClick={() => updateOrderStatus(order.id, 'confirmed')}
        className="action-button confirm"
      >
        Confirm Order
      </button>
      <button
        onClick={() => updateOrderStatus(order.id, 'cancelled')}
        className="action-button cancel"
      >
        Cancel Order
      </button>
    </>
  )}

  {/* Confirmed -> Preparing */}
  {String(order.orderStatus || '').toLowerCase() === 'confirmed' && (
    <button
      onClick={() => updateOrderStatus(order.id, 'preparing')}
      className="action-button preparing"
    >
      Start Preparing
    </button>
  )}

  {/* Preparing -> Ready */}
  {String(order.orderStatus || '').toLowerCase() === 'preparing' && (
    <button
      onClick={() => updateOrderStatus(order.id, 'ready')}
      className="action-button ready"
    >
      Mark as Ready
    </button>
  )}

  {/* Ready -> Picked Up (for pickup) */}
  {String(order.orderStatus || '').toLowerCase() === 'ready' &&
    (order.deliveryMethod === 'pickup' || order.orderType === 'pickup') && (
      <button
        onClick={() => updateOrderStatus(order.id, 'picked-up')}
        className="action-button picked-up"
      >
        Mark as Picked Up
      </button>
    )}

  {/* Ready -> Completed (for room service) */}
  {String(order.orderStatus || '').toLowerCase() === 'ready' &&
    order.deliveryMethod === 'roomService' && (
      <button
        onClick={() => updateOrderStatus(order.id, 'completed')}
        className="action-button completed"
      >
        Mark as Delivered
      </button>
    )}

  {/* Picked-up -> Completed */}
  {String(order.orderStatus || '').toLowerCase() === 'picked-up' && (
    <button
      onClick={() => updateOrderStatus(order.id, 'completed')}
      className="action-button completed"
    >
      Mark as Completed
    </button>
  )}

  {/* Completed or Cancelled */}
  {['completed', 'cancelled'].includes(String(order.orderStatus || '').toLowerCase()) && (
    <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>
      No further actions needed.
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