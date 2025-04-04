import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import NavMenu from "../../components/NavMenu";
import { FaReceipt, FaArrowLeft, FaCalendarAlt, FaShoppingBag, FaClock } from 'react-icons/fa';
import "./Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  // Set up auth listener to get the current user ID
  useEffect(() => {
    const auth = getAuth();
    
    // Get initial user ID
    const initialUserId = auth.currentUser?.uid || localStorage.getItem("guestId");
    setUserId(initialUserId);
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        const guestId = localStorage.getItem("guestId");
        setUserId(guestId);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch orders when userId changes
  useEffect(() => {
    if (userId) {
      fetchOrders(userId);
    }
  }, [userId]);

  const fetchOrders = async (uid) => {
    try {
      if (!uid) {
        console.log("No user ID available for fetching orders");
        setOrders([]);
        setLoading(false);
        return;
      }
      
      console.log("Fetching orders for user ID:", uid);
      
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("userId", "==", uid)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} orders for user ${uid}`);
      
      if (snapshot.empty) {
        console.log("No orders found for this user");
        setOrders([]);
        setLoading(false);
        return;
      }
      
      const orderList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          formattedDate: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate().toLocaleString()
            : "Pending"
        };
      });
      
      // Sort by timestamp (newest first)
      orderList.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp - a.timestamp;
      });
      
      setOrders(orderList);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goToMenu = () => {
    window.location.href = "/restaurant/menu";
  };

  return (
    <div className="main-container">
      {/* NavMenu in top left */}
      <div className="nav-container">
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="orders-page">
        <div className="orders-header">
          <FaReceipt className="orders-icon" />
          <h1 className="orders-title">My Orders</h1>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders-container">
            <div className="empty-orders-icon">
              <FaShoppingBag size={80} />
            </div>
            <p className="empty-orders">You haven't placed any orders yet.</p>
            <button className="back-to-menu-btn" onClick={goToMenu}>
              <FaArrowLeft /> Browse Menu
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-id">
                    <span className="order-label">Order ID:</span> 
                    <span className="order-value">{order.id.substring(0, 8)}</span>
                  </div>
                  <div className="order-status">
                    <span className="order-label">Status:</span>
                    <span className={`status-badge status-${(order.status || "pending").toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.status || "Pending"}
                    </span>
                  </div>
                </div>
                
                <div className="order-content">
                  {order.cartItems?.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-details">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">× {item.quantity}</span>
                      </div>
                      <span className="item-price">
                        GHS {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  
                  <div className="order-summary">
                    <div className="order-total">
                      <span className="total-label">Total:</span>
                      <span className="total-value">GHS {order.total?.toFixed(2)}</span>
                    </div>
                    
                    <div className="order-date">
                      <FaCalendarAlt className="date-icon" />
                      <span>{order.formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;