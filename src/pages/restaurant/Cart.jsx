import { useEffect, useState } from "react";
import { db } from "../../config/firebase";
import {collection,getDocs,doc,updateDoc,deleteDoc,} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import NavMenu from "../../components/NavMenu";
import { FaShoppingCart, FaArrowLeft, FaPlus, FaMinus, FaTimes, FaReceipt, FaTrashAlt } from 'react-icons/fa';
import "./Cart.css";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearingCart, setClearingCart] = useState(false);
  const [userId, setUserId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const VAT_RATE = 0.125;
  const NHIL_RATE = 0.025;

  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  // Handle authentication state and set userId
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setUserId(user.uid);
      } else {
        // No user is signed in, use guest ID
        let guestId = localStorage.getItem("guestId");
        if (!guestId) {
          guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem("guestId", guestId);
        }
        setUserId(guestId);
      }
      setAuthChecked(true);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  const fetchCart = async (currentUserId) => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "carts", currentUserId, "items"));
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCartItems(items);
      calculateSubtotal(items);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart only after auth state is checked and userId is set
  useEffect(() => {
    if (authChecked && userId) {
      window.scrollTo(0, 0);
      
      // Check if we're returning from a completed order
      const orderCompleted = localStorage.getItem("orderCompleted");
      if (orderCompleted === "true") {
        localStorage.removeItem("orderCompleted");
      }
      
      fetchCart(userId);
    }
  }, [authChecked, userId]);

  const calculateSubtotal = (items) => {
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    setSubtotal(total);
  };

  const updateQuantity = async (itemId, delta) => {
    if (!userId) return;
    
    const item = cartItems.find((item) => item.id === itemId);
    const newQuantity = item.quantity + delta;
    const itemRef = doc(db, "carts", userId, "items", itemId);

    if (newQuantity < 1) {
      await deleteDoc(itemRef);
    } else {
      await updateDoc(itemRef, { quantity: newQuantity });
    }

    fetchCart(userId);
  };

  const removeFromCart = async (itemId) => {
    if (!userId) return;
    
    await deleteDoc(doc(db, "carts", userId, "items", itemId));
    fetchCart(userId);
  };

  const clearCart = async () => {
    if (!userId) return;
    
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setClearingCart(true);
      try {
        const snapshot = await getDocs(collection(db, "carts", userId, "items"));
        const deletePromises = snapshot.docs.map(item => 
          deleteDoc(doc(db, "carts", userId, "items", item.id))
        );
        await Promise.all(deletePromises);
        fetchCart(userId);
      } catch (error) {
        console.error("Error clearing cart:", error);
      } finally {
        setClearingCart(false);
      }
    }
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
        userId, // Pass userId to checkout
      },
    });
  };

  const continueShopping = () => {
    navigate("/restaurant");
  };

  if (!authChecked || loading) {
    return (
      <div className="main-container loading-screen">
        <div className="loading-box">
          <div className="custom-spinner"></div>
          <p className="loading-message">
            { !authChecked ? "Authenticating user..." : "Loading your cart, please wait..." }
          </p>
        </div>
      </div>
    );
  }
  

  return (
    <div className="main-container">
      <div className="nav-container" >
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="cart-page">
        <div className="cart-wrapper">
          <div className="cart-header">
            <FaReceipt className="cart-icon" />
            <h1 className="cart-title">Order Cart</h1>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading your cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="empty-cart-container">
              <FaShoppingCart className="empty-cart-icon" />
              <p className="empty-cart">Your cart is empty.</p>
              <button className="continue-shopping-btn" onClick={continueShopping}>
                <FaArrowLeft /> Continue Shopping
              </button>
            </div>
          ) : (
            <div className="cart-container">
              <div className="cart-left">
                <div className="cart-actions">
                  <button className="clear-cart-btn" onClick={clearCart} disabled={clearingCart}>
                    <FaTrashAlt /> {clearingCart ? 'Clearing...' : 'Clear Cart'}
                  </button>
                </div>
                {cartItems.map((item) => (
                  <div className="cart-row" key={item.id}>
                    <div className="cart-row-info">
                      <h3>{item.name}</h3>
                      <p>GHS {item.price.toFixed(2)}</p>
                    </div>
                    <div className="cart-quantity">
                      <button onClick={() => updateQuantity(item.id, -1)}>
                        <FaMinus />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>
                        <FaPlus />
                      </button>
                    </div>
                    <div className="cart-row-price">
                      GHS {(item.quantity * item.price).toFixed(2)}
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                      title="Remove item"
                    >
                      <FaTimes />
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
                  <hr />
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <span>GHS {grandTotal.toFixed(2)}</span>
                  </div>
                  <button className="place-order-btn" onClick={handlePlaceOrder}>
                    <FaShoppingCart /> Place Order ({cartItems.length} {cartItems.length > 1 ? "items" : "item"})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;