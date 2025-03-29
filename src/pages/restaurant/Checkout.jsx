import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../config/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "orders"), {
        userId: getOrCreateUserId(),
        ...formData,
        cartItems,
        subtotal,
        vat,
        nhil,
        total,
        status: "Pending",
        isGuest: true,
        timestamp: serverTimestamp(),
      });

      alert("Order confirmed! We’ll prepare your pickup.");
      navigate("/my-orders");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-wrapper">
        <h1 className="checkout-title">🧾 Confirm Your Order</h1>

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
                />
              </label>
              <label>
                Pickup Notes (Optional)
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. I’ll be there by 2 PM"
                  rows="3"
                ></textarea>
              </label>
              <label>
                Payment Method
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

              <button type="submit" className="confirm-btn">
                Confirm Pickup Order
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
