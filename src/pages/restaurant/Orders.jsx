import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "./Orders.css";
import NavMenu from "../../components/NavMenu"; 
import { FaShoppingBag, FaUtensils } from 'react-icons/fa';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Status normalization mapping (copied from AdminFoodOrders)
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
    
    // Pickup status mapping
    'awaiting-pickup': 'pending',
    'awaiting pickup': 'pending',
    'awaiting_pickup': 'pending',
    'awaitingpickup': 'pending',
    'Awaiting-Pickup': 'pending',
    'Awaiting Pickup': 'pending',
    'AWAITING PICKUP': 'pending',
    'AWAITING-PICKUP': 'pending',
    'Awaiting pickup': 'pending',
    
    // Cash on Pickup mapping
    'Cash on Pickup': 'pending',
    
    // Delivery status mapping
    'awaiting-delivery': 'pending',
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
  };

  // Normalize status (copied from AdminFoodOrders)
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

  // Get color for status badge (copied from AdminFoodOrders)
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

  // Handle authentication state changes and persist user ID
  useEffect(() => {
    const auth = getAuth();
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setUserId(user.uid);
        localStorage.setItem("currentUserId", user.uid);
      } else {
        // User is signed out, try to get guest ID
        const guestId = localStorage.getItem("guestId");
        if (guestId) {
          setUserId(guestId);
        } else {
          // Neither logged in nor guest ID available
          setUserId(null);
        }
      }
    });

    // Check if we already have a userId in localStorage (for faster loading)
    const savedUserId = localStorage.getItem("currentUserId") || localStorage.getItem("guestId");
    if (savedUserId) {
      setUserId(savedUserId);
    }

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  // Fetch orders when userId changes
  useEffect(() => {
    if (userId) {
      fetchOrders(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchOrders = async (uid) => {
    try {
      console.log("Fetching orders for user ID:", uid);
      
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("userId", "==", uid),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(q);
      const orderList = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Ensure timestamp is handled properly
        let timestamp = new Date();
        if (data.timestamp) {
          timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        }

        // Normalize order status to match AdminFoodOrders
        const rawStatus = (data.status || '').toString();
        const normalizedStatus = normalizeStatus(rawStatus);

        return {
          id: doc.id,
          ...data,
          timestamp: timestamp,
          orderStatus: normalizedStatus
        };
      });
      
      console.log(`Found ${orderList.length} orders`);
      setOrders(orderList);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format date more elegantly
  const formatDate = (timestamp) => {
    if (!timestamp) return "Pending";
    if (typeof timestamp === 'object' && timestamp.toDate) {
      timestamp = timestamp.toDate();
    }
    
    // Ensure timestamp is a Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="orders-loading">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <h1>
        <FaUtensils />
        My Orders
      </h1>
      
      {!userId ? (
        <div className="orders-empty">
          <FaShoppingBag style={{ fontSize: '3rem', color: '#f97316', marginBottom: '1rem' }} />
          <p>Please log in to view your orders.</p>
          <button onClick={() => window.location.href = '/login'} className="back-to-menu-btn">
            Go to Login
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <FaUtensils style={{ fontSize: '3rem', color: '#f97316', marginBottom: '1rem' }} />
          <p>You haven't placed any orders yet.</p>
          <button onClick={() => window.location.href = '/restaurant'} className="back-to-menu-btn">
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card fade-in">
              <div className="order-id-section">
                <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                <div className="status-badge" style={{ 
                  backgroundColor: getStatusColor(order.orderStatus || order.status),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  {getDisplayStatus(order.orderStatus || order.status)}
                </div>
              </div>

              <div className="order-items">
                {order.cartItems && order.cartItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>GHS {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="order-total-section">
                <div className="total-container">
                  <span className="total-label">Total:</span>
                  <span className="total-value">GHS {order.total ? order.total.toFixed(2) : "0.00"}</span>
                </div>
                <div className="placed-container">
                  <span className="placed-label">Placed on</span>
                  <span className="placed-value">{formatDate(order.timestamp)}</span>
                </div>
              </div>
              
              {/* Show additional status information based on order status */}
              {['confirmed', 'preparing', 'ready', 'delivering', 'picked-up'].includes(normalizeStatus(order.orderStatus || order.status)) && (
                <div className="order-status-info" style={{ marginTop: '12px', fontSize: '0.9rem', color: '#4b5563' }}>
                  {normalizeStatus(order.orderStatus || order.status) === 'confirmed' && (
                    <p>Your order has been confirmed and will be prepared soon.</p>
                  )}
                  {normalizeStatus(order.orderStatus || order.status) === 'preparing' && (
                    <p>Your order is now being prepared in the kitchen.</p>
                  )}
                  {normalizeStatus(order.orderStatus || order.status) === 'ready' && (
                    <p>Your order is ready! Please collect from the restaurant.</p>
                  )}
                  {normalizeStatus(order.orderStatus || order.status) === 'delivering' && (
                    <p>Your order is on its way to your room.</p>
                  )}
                  {normalizeStatus(order.orderStatus || order.status) === 'picked-up' && (
                    <p>Order has been picked up. Enjoy your meal!</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;