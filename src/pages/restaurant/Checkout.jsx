import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../config/firebase";
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { PaystackButton } from "react-paystack";
import NavMenu from "../../components/NavMenu";
import { 
  FaReceipt, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaHotel, 
  FaMobileAlt, 
  FaCheckCircle, 
  FaListAlt, 
  FaArrowLeft,
  FaQuestionCircle
} from 'react-icons/fa';
import "./Checkout.css";

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

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    cartItems = [],
    subtotal = 0,
    vat = 0,
    nhil = 0,
    total = 0,
  } = location.state || {};

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: "",
    paymentMethod: "",
    roomNumber: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderReference, setOrderReference] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Prefill name and phone if user is authenticated
    const auth = getAuth();
    if (auth.currentUser?.displayName) {
      setFormData(prev => ({
        ...prev,
        name: auth.currentUser.displayName
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Clear cart items after order is placed
  const clearCart = async () => {
    const userId = getOrCreateUserId();
    try {
      console.log("Clearing cart for user:", userId);
      const snapshot = await getDocs(collection(db, "carts", userId, "items"));
      console.log(`Found ${snapshot.docs.length} items to clear`);
      
      const deletePromises = snapshot.docs.map(item => 
        deleteDoc(doc(db, "carts", userId, "items", item.id))
      );
      await Promise.all(deletePromises);
      
      // Set a flag in localStorage to indicate the order was completed
      localStorage.setItem("orderCompleted", "true");
      
      console.log("Cart cleared successfully");
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const saveOrder = async (status = "Pending", paymentReference = "") => {
    const userId = getOrCreateUserId();
    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        userId,
        ...formData,
        cartItems,
        subtotal,
        vat,
        nhil,
        total,
        status,
        isGuest: !getAuth().currentUser,
        paymentReference,
        timestamp: serverTimestamp(),
      });
      
      setOrderReference(orderRef.id);
      return orderRef.id;
    } catch (error) {
      console.error("Error saving order:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.paymentMethod === "MoMo") {
      // Payment handled by PaystackButton
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Set different status based on payment method
      let status = "Pending";
      if (formData.paymentMethod === "Tab") {
        status = "On Hotel Tab";
      } else if (formData.paymentMethod === "Cash") {
        status = "Awaiting Pickup";
      }
      
      await saveOrder(status);
      await clearCart();
      setOrderComplete(true);
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (reference) => {
    try {
      setIsSubmitting(true);
      await saveOrder("Paid", reference.reference);
      await clearCart();
      setOrderComplete(true);
    } catch (error) {
      console.error("Error saving paid order:", error);
      alert("Something went wrong after payment. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: formData.phone
      ? `${formData.phone}@pickup.com`
      : "guest@pickup.com",
    amount: Math.round(Number(total) * 100), // Paystack uses kobo
    currency: "GHS",
    publicKey: "pk_test_8b02dfc94aa31f78f2f3214086e81616365346c5",
    metadata: {
      name: formData.name,
      phone: formData.phone,
    },
  };

  const goToOrders = () => {
    navigate("/restaurant/orders");
  };

  const goToMenu = () => {
    navigate("/restaurant/menu");
  };

  if (orderComplete) {
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
        
        <div className="checkout-page">
          <div className="checkout-wrapper">
            <div className="success-container">
              <FaCheckCircle className="success-icon" />
              <h2 className="success-title">Order Confirmed!</h2>
              <p className="success-message">
                Thank you for your order! Your order reference is <strong>{orderReference}</strong>. 
                {formData.paymentMethod === "Cash" 
                  ? " Please present this reference when you come to pick up your order." 
                  : " Your payment has been successfully processed."}
              </p>
              <div className="success-buttons">
                <button className="success-btn primary-btn" onClick={goToOrders}>
                  <FaListAlt /> View My Orders
                </button>
                <button className="success-btn secondary-btn" onClick={goToMenu}>
                  <FaArrowLeft /> Back to Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <div className="checkout-page">
        <div className="checkout-wrapper">
          <div className="checkout-header">
            <FaReceipt className="checkout-icon" />
            <h1 className="checkout-title">Confirm Your Order</h1>
          </div>
          <p className="checkout-subtitle">Complete your order details below to confirm your purchase</p>

          <div className="checkout-container">
            {/* Order Summary */}
            <div className="checkout-left">
              <h2 className="section-heading">Order Summary</h2>
              <div className="checkout-summary">
                {cartItems.map((item) => (
                  <div className="checkout-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>Qty: {item.quantity}</p>
                    </div>
                    <span>GHS {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <hr />
                <div className="checkout-line">
                  <span>Subtotal</span>
                  <span>GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="checkout-line">
                  <span>VAT (12.5%)</span>
                  <span>GHS {vat.toFixed(2)}</span>
                </div>
                <div className="checkout-line">
                  <span>NHIL (2.5%)</span>
                  <span>GHS {nhil.toFixed(2)}</span>
                </div>
                <hr />
                <div className="checkout-total">
                  <strong>Total</strong>
                  <strong>GHS {total.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="checkout-right">
              <h2 className="section-heading">Pickup Details</h2>
              <form onSubmit={handleSubmit} className="checkout-form">
                <label>
                  Full Name
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </label>
                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter your phone number"
                  />
                </label>
                <label>
                  Pickup Notes (Optional)
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="e.g. I'll be there by 2 PM"
                    rows="3"
                  ></textarea>
                </label>
                <label>
                  <div className="field-tooltip">
                    Payment Method
                    <span className="tooltip-icon">
                      <FaQuestionCircle />
                      <span className="tooltip-text">
                        Hotel guests can charge to their room, or you can pay with Mobile Money or cash at pickup.
                      </span>
                    </span>
                  </div>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Payment Method --</option>
                    <option value="Tab">Put on Hotel Tab (Guests Only)</option>
                    <option value="MoMo">Mobile Money</option>
                    <option value="Cash">Cash on Pickup</option>
                  </select>
                </label>
                
                {/* Room Number field (only if Hotel Tab is selected) */}
                {formData.paymentMethod === "Tab" && (
                  <div className="room-number-field">
                    <label>
                      <div className="field-tooltip">
                        Room Number
                        <span className="tooltip-icon">
                          <FaQuestionCircle />
                          <span className="tooltip-text">
                            Enter your hotel room number for verification. The charge will be added to your room bill.
                          </span>
                        </span>
                      </div>
                      <input
                        type="text"
                        name="roomNumber"
                        value={formData.roomNumber}
                        onChange={handleChange}
                        required
                        placeholder="Enter your room number"
                      />
                    </label>
                  </div>
                )}
                
                {formData.paymentMethod === "MoMo" &&
                formData.phone &&
                formData.name &&
                total > 0 ? (
                  <>
                    <PaystackButton
                      className="confirm-btn"
                      {...paystackConfig}
                      text={
                        <>
                          <FaMobileAlt style={{ fontSize: '1.25rem' }} /> Pay with Mobile Money
                        </>
                      }
                      onSuccess={handlePaymentSuccess}
                      onClose={() => console.log("Payment window closed")}
                    />
                  </>
                ) : (
                  <button
                    type="submit"
                    className="confirm-btn"
                    disabled={isSubmitting || !formData.name || !formData.phone || !formData.paymentMethod || (formData.paymentMethod === "Tab" && !formData.roomNumber)}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} /> Processing...
                      </>
                    ) : formData.paymentMethod === "Tab" ? (
                      <>
                        <FaHotel /> Charge to Room
                      </>
                    ) : formData.paymentMethod === "Cash" ? (
                      <>
                        <FaMoneyBillWave /> Confirm Cash Payment
                      </>
                    ) : (
                      <>
                        <FaCreditCard /> Complete Order
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;