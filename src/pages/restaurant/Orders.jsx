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

 
  const STATUS_MAPPING = {
    //  status mapping
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready',
    'picked-up': 'picked-up',
    'completed': 'completed',
    'cancelled': 'cancelled',
    
    // Payment  mapping
    'paid': 'confirmed',
    'on-hotel-tab': 'confirmed',
    
    // Pickup  mapping
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
    
    // Delivery  mapping
    'awaiting-delivery': 'pending',
    'out-for-delivery': 'delivering',
    'delivering': 'delivering',
    'delivered': 'delivered',
    
    // Room service  mapping
    'room-service-pending': 'pending',
    'room-service-on-hotel-tab': 'confirmed',
    'room-service-paid': 'confirmed',
    'room-service-ready': 'ready',
    'room-service-delivering': 'delivering',
    'room-service-delivered': 'delivered',
    
 
    'Room Service Pending': 'pending',
    'Room Service - Paid': 'confirmed',
    'On Hotel Tab': 'confirmed'
  };

 
  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    
 
    const normalizedStatus = status.toString().toLowerCase().replace(/\s+/g, '-');
    

    return STATUS_MAPPING[normalizedStatus] || normalizedStatus;
  };

  //  function to get  status
  const getDisplayStatus = (status) => {
    const normalized = normalizeStatus(status);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, ' ');
  };

  
  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'pending': return '#f59e0b';   
      case 'confirmed': return '#3b82f6'; 
      case 'preparing': return '#8b5cf6'; 
      case 'ready': return '#10b981';     
      case 'delivering': return '#0ea5e9'; 
      case 'delivered': return '#14b8a6';  
      case 'picked-up': return '#6b7280'; 
      case 'completed': return '#22c55e'; 
      case 'cancelled': return '#ef4444'; 
      default: return '#6b7280';         
    }
  };

  // Handle authentication 
  useEffect(() => {
    const auth = getAuth();
    
   
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
       
        setUserId(user.uid);
        localStorage.setItem("currentUserId", user.uid);
      } else {
 
        const guestId = localStorage.getItem("guestId");
        if (guestId) {
          setUserId(guestId);
        } else {

          setUserId(null);
        }
      }
    });


    const savedUserId = localStorage.getItem("currentUserId") || localStorage.getItem("guestId");
    if (savedUserId) {
      setUserId(savedUserId);
    }

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


        let timestamp = new Date();
        if (data.timestamp) {
          timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        }

    
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

  const formatDate = (timestamp) => {
    if (!timestamp) return "Pending";
    if (typeof timestamp === 'object' && timestamp.toDate) {
      timestamp = timestamp.toDate();
    }

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
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
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
              
 
              {['confirmed', 'preparing', 'ready', 'delivering', 'picked-up'].includes(normalizeStatus(order.orderStatus || order.status)) && (
                <div className="order-status-info" style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#4b5563' }}>
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