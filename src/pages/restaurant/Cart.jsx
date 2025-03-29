import { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // ✅ NEW
import "./Cart.css";

// ✅ Guest/user ID initialized ONCE and reused
let persistentUserId;
const getOrCreateUserId = () => {
  if (persistentUserId) return persistentUserId;

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (currentUser) {
    persistentUserId = currentUser.uid;
  } else {
    let guestId = localStorage.getItem("guestId");
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestId", guestId);
    }
    persistentUserId = guestId;
  }

  return persistentUserId;
};

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  const VAT_RATE = 0.125;
  const NHIL_RATE = 0.025;

  const userId = getOrCreateUserId();
  const navigate = useNavigate(); // ✅ NEW

  const fetchCart = async () => {
    try {
      const snapshot = await getDocs(collection(db, "carts", userId, "items"));
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCartItems(items);
      calculateSubtotal(items);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const calculateSubtotal = (items) => {
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    setSubtotal(total);
  };

  const updateQuantity = async (itemId, delta) => {
    const item = cartItems.find((item) => item.id === itemId);
    const newQuantity = item.quantity + delta;
    const itemRef = doc(db, "carts", userId, "items", itemId);

    if (newQuantity < 1) {
      await deleteDoc(itemRef);
    } else {
      await updateDoc(itemRef, { quantity: newQuantity });
    }

    fetchCart();
  };

  const removeFromCart = async (itemId) => {
    await deleteDoc(doc(db, "carts", userId, "items", itemId));
    fetchCart();
  };

  const vat = subtotal * VAT_RATE;
  const nhil = subtotal * NHIL_RATE;
  const taxTotal = vat + nhil;
  const grandTotal = subtotal + taxTotal;

  const handlePlaceOrder = () => {
    navigate("/restaurant/checkout", {
      state: {
        cartItems,
        subtotal,
        vat,
        nhil,
        total: grandTotal,
      },
    });
  };

  return (
    <div className="cart-page">
      <div className="cart-wrapper">
        <h1 className="cart-title">🧾 Order Cart</h1>

        {cartItems.length === 0 ? (
          <p className="empty-cart">Your cart is empty.</p>
        ) : (
          <div className="cart-container">
            <div className="cart-left">
              {cartItems.map((item) => (
                <div className="cart-row" key={item.id}>
                  <div className="cart-row-info">
                    <h3>{item.name}</h3>
                    <p>GHS {item.price}</p>
                  </div>
                  <div className="cart-quantity">
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <div className="cart-row-price">
                    GHS {(item.quantity * item.price).toFixed(2)}
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-right">
              <div className="cart-summary-block">
                <div className="cart-summary-line">
                  <span>Subtotal</span>
                  <span>GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="cart-summary-line">
                  <span>VAT (12.5%)</span>
                  <span>GHS {vat.toFixed(2)}</span>
                </div>
                <div className="cart-summary-line">
                  <span>NHIL (2.5%)</span>
                  <span>GHS {nhil.toFixed(2)}</span>
                </div>
                <div className="cart-summary-line">
                  <span>Service Fee</span>
                  <span>GHS 0.00</span>
                </div>
                <hr />
                <div className="cart-summary-total">
                  <strong>Total</strong>
                  <strong>GHS {grandTotal.toFixed(2)}</strong>
                </div>
              </div>
              <button className="place-order-btn" onClick={handlePlaceOrder}>
                Place Order ({cartItems.length} item
                {cartItems.length > 1 ? "s" : ""})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
