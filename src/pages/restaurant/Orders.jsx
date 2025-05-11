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
      const orderList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      console.log(`Found ${orderList.length} orders`);
      setOrders(orderList);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to determine status badge class
  const getStatusClass = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower.includes("room service")) {
      return statusLower.includes("paid") ? "status-room-service-paid" : "status-room-service-pending";
    }
    if (statusLower.includes("hotel tab")) {
      return "status-on-hotel-tab";
    }
    return "status-" + statusLower.replace(/\s+/g, '-');
  };

  // Format date more elegantly
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "Pending";
    const date = timestamp.toDate();
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
                <span className={getStatusClass(order.status)}>
                  {order.status || "Processing"}
                </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;