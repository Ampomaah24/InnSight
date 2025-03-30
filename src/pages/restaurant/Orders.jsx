import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "./Orders.css";

const getUserId = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) return user.uid;

  const guestId = localStorage.getItem("guestId");
  return guestId || null;
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const userId = getUserId();
      if (!userId) return;

      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(q);
      const orderList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(orderList);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="orders-loading">Loading orders...</div>;
  }

  return (
    <div className="orders-page">
      <h1 className="orders-title">🧾 My Orders</h1>
      {orders.length === 0 ? (
        <p className="orders-empty">You haven’t placed any orders yet.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span>Order ID: {order.id.slice(0, 6)}...</span>
                <span>Status: <strong>{order.status}</strong></span>
              </div>

              <ul className="order-items">
                {order.cartItems.map((item, index) => (
                  <li key={index}>
                    {item.name} × {item.quantity} — GHS{" "}
                    {(item.price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>

              <div className="order-footer">
                <p><strong>Total:</strong> GHS {order.total.toFixed(2)}</p>
                <p>
                  <strong>Placed:</strong>{" "}
                  {order.timestamp?.toDate().toLocaleString() || "Pending"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
