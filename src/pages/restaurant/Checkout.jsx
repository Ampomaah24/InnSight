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
  getDocs,
  getDoc
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
  FaQuestionCircle,
  FaExclamationCircle
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
  const { cartItems = [] } = location.state || {};

  // Tax rates state - initialize with default values
  const [taxRates, setTaxRates] = useState({
    vatRate: 12.5,
    nhilRate: 3.0,
    serviceTaxRate: 8.0
  });
  
  // Order totals
  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    vat: 0,
    nhil: 0,
    serviceTax: 0,
    total: 0
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: "",
    paymentMethod: "",
    roomNumber: "",
  });

  // User profile and verification states
  const [userProfile, setUserProfile] = useState({
    isHotelGuest: false,
    roomNumber: "",
    checkoutDate: null,
    isVerified: false
  });
  
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderReference, setOrderReference] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Calculate order totals whenever cart items or tax rates change
  useEffect(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    
    const vat = subtotal * (taxRates.vatRate / 100);
    const nhil = subtotal * (taxRates.nhilRate / 100);
    const serviceTax = subtotal * (taxRates.serviceTaxRate / 100);
    
    const total = subtotal + vat + nhil + serviceTax;
    
    setOrderTotals({
      subtotal,
      vat,
      nhil,
      serviceTax,
      total
    });
  }, [cartItems, taxRates]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Prefill name and phone if user is authenticated
        const auth = getAuth();
        if (auth.currentUser) {
          // Prefill name if available
          if (auth.currentUser.displayName) {
            setFormData(prev => ({
              ...prev,
              name: auth.currentUser.displayName
            }));
          }
          
          // Check if user is a hotel guest and get their room number
          await checkHotelGuestStatus(auth.currentUser.uid);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Check hotel guest status
  const checkHotelGuestStatus = async (userId) => {
    try {
      // Get user profile from the database
      const userProfileRef = doc(db, "userProfiles", userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const profileData = userProfileSnap.data();
        
        // Check if user is a hotel guest with an active room
        if (profileData.isHotelGuest && profileData.roomNumber) {
          const checkoutDate = profileData.checkoutDate ? profileData.checkoutDate.toDate() : null;
          const isActive = checkoutDate ? new Date() < checkoutDate : false;
          
          setUserProfile({
            isHotelGuest: true,
            roomNumber: profileData.roomNumber,
            checkoutDate: checkoutDate,
            isVerified: isActive
          });
          
          // If user is an active hotel guest, auto-fill the room number
          if (isActive) {
            setFormData(prev => ({
              ...prev,
              roomNumber: profileData.roomNumber
            }));
            setVerificationSuccess(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking hotel guest status:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Reset verification states when payment method changes
    if (name === "paymentMethod") {
      setVerificationSuccess(false);
      setVerificationError("");
      
      // Auto-verify if changing to Tab and user is already verified as hotel guest
      if (value === "Tab" && userProfile.isVerified) {
        setVerificationSuccess(true);
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const verifyRoomNumber = async () => {
    if (!formData.roomNumber.trim()) {
      setVerificationError("Please enter a room number");
      return;
    }
  
    setIsVerifying(true);
    setVerificationError("");
  
    try {
      // Query for bookings with the given room number and 'Checked in' status
      const guestsQuery = query(
        collection(db, "bookings"),
        where("roomNumber", "==", formData.roomNumber),
        where("status", "==", "Checked in")
      );
  
      const querySnapshot = await getDocs(guestsQuery);
  
      if (!querySnapshot.empty) {
        // At least one checked-in guest found
        setVerificationSuccess(true);
        setVerificationError("");
      } else {
        setVerificationError("No active guest found for this room number");
        setVerificationSuccess(false);
      }
    } catch (error) {
      console.error("Error verifying room:", error);
      setVerificationError("An error occurred while verifying the room");
      setVerificationSuccess(false);
    } finally {
      setIsVerifying(false);
    }
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
        subtotal: orderTotals.subtotal,
        vat: orderTotals.vat,
        nhil: orderTotals.nhil,
        serviceTax: orderTotals.serviceTax,
        total: orderTotals.total,
        taxRates,
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
    
    // Prevent submission if Tab is selected but not verified (unless user is already verified)
    if (formData.paymentMethod === "Tab" && !verificationSuccess) {
      alert("Please verify your room number first");
      return;
    }
    
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
      
      const orderId = await saveOrder(status);
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
    amount: Math.round(Number(orderTotals.total) * 100), // Paystack uses kobo
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

  if (isLoading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

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
                  : formData.paymentMethod === "Tab"
                  ? " Your order has been charged to your room tab."
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
                  <div className="checkout-item" key={item.id || `item-${Math.random()}`}>
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
                  <span>GHS {orderTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="checkout-line">
                  <span>VAT ({taxRates.vatRate}%)</span>
                  <span>GHS {orderTotals.vat.toFixed(2)}</span>
                </div>
                <div className="checkout-line">
                  <span>NHIL ({taxRates.nhilRate}%)</span>
                  <span>GHS {orderTotals.nhil.toFixed(2)}</span>
                </div>
                {taxRates.serviceTaxRate > 0 && (
                  <div className="checkout-line">
                    <span>Service Tax ({taxRates.serviceTaxRate}%)</span>
                    <span>GHS {orderTotals.serviceTax.toFixed(2)}</span>
                  </div>
                )}
                <hr />
                <div className="checkout-total">
                  <strong>Total</strong>
                  <strong>GHS {orderTotals.total.toFixed(2)}</strong>
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

                {/* Payment Method Selection */}
                <label>
                  <div className="field-tooltip">
                    Payment Method
                    <span className="tooltip-icon">
                      <FaQuestionCircle />
                      <span className="tooltip-text">
                        {userProfile.isHotelGuest 
                          ? "As a hotel guest, you can charge to your room, or pay with Mobile Money or cash at pickup."
                          : "Hotel guests can charge to their room, or you can pay with Mobile Money or cash at pickup."}
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
                    <option value="Tab">Put on Hotel Tab</option>
                    <option value="MoMo">Mobile Money</option>
                    <option value="Cash">Cash on Pickup</option>
                  </select>
                </label>
                
                {/* Room Number field and verification (only if Hotel Tab is selected) */}
                {formData.paymentMethod === "Tab" && (
                  <div className="room-number-field">
                    <label>
                      <div className="field-tooltip">
                        Room Number
                        <span className="tooltip-icon">
                          <FaQuestionCircle />
                          <span className="tooltip-text">
                            {userProfile.isHotelGuest 
                              ? "Your room number has been automatically filled in."
                              : "Enter your hotel room number for verification. The charge will be added to your room bill."}
                          </span>
                        </span>
                      </div>
                      <div className="room-verification-container">
                        <input
                          type="text"
                          name="roomNumber"
                          value={formData.roomNumber}
                          onChange={handleChange}
                          required
                          placeholder="Enter your room number"
                          disabled={userProfile.isVerified} // Disable if already verified
                          className={verificationSuccess ? "verified" : verificationError ? "error" : ""}
                        />
                        {!userProfile.isVerified && (
                          <button 
                            type="button" 
                            className="verify-btn"
                            onClick={verifyRoomNumber}
                            disabled={isVerifying || !formData.roomNumber.trim()}
                          >
                            {isVerifying ? "Verifying..." : "Verify"}
                          </button>
                        )}
                      </div>
                      
                      {/* Verification status messages */}
                      {verificationError && (
                        <div className="verification-error">
                          <FaExclamationCircle /> {verificationError}
                        </div>
                      )}
                      
                      {verificationSuccess && (
                        <div className="verification-success">
                          <FaCheckCircle /> Room verified successfully
                        </div>
                      )}
                      
                      {userProfile.isHotelGuest && userProfile.checkoutDate && (
                        <div className="checkout-date-info">
                          <small>Your checkout date: {userProfile.checkoutDate.toLocaleDateString()}</small>
                        </div>
                      )}
                    </label>
                  </div>
                )}
                
                {formData.paymentMethod === "MoMo" &&
                formData.phone &&
                formData.name &&
                orderTotals.total > 0 ? (
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
                    disabled={
                      isSubmitting || 
                      !formData.name || 
                      !formData.phone || 
                      !formData.paymentMethod || 
                      (formData.paymentMethod === "Tab" && !verificationSuccess)
                    }
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