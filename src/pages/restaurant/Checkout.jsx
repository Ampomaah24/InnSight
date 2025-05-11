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
  FaExclamationCircle,
  FaBed,
  FaUtensils
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
const isValidGhanaianPhoneNumber = (phone) => {
  const normalized = phone.replace(/[\s\-]/g, '');

  const localPattern = /^(024|025|026|027|028|029|030|050|054|055|056|057|059)[0-9]{7}$/;
  const internationalPattern = /^\+233(24|25|26|27|28|29|30|50|54|55|56|57|59)[0-9]{7}$/;

  return localPattern.test(normalized) || internationalPattern.test(normalized);
};

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems = [] } = location.state || {};

  // Tax rates state - initialize with default values but will fetch from DB
  const [taxRates, setTaxRates] = useState({
    vatRate: 12.5,
    nhilRate: 2.5,
    serviceTaxRate: 5,
    cityTaxRate: 2,
    taxIncluded: false
  });
  
  // Order totals
  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    vat: 0,
    nhil: 0,
    serviceTax: 0,
    cityTax: 0,
    roomServiceFee: 0,
    total: 0
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    notes: "",
    paymentMethod: "",
    roomNumber: "",
    deliveryMethod: "pickup", // Default to pickup
  });

  // Form validation (removed phone validation)
  const [formErrors, setFormErrors] = useState({});

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

  const [showSuccess, setShowSuccess] = useState(false);
  // Add the fetchTaxRates function to get tax rates from Firestore
  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const taxRatesRef = doc(db, "settings", "taxes");
        const taxDoc = await getDoc(taxRatesRef);
        
        if (taxDoc.exists()) {
          const taxData = taxDoc.data();
          
          // Update tax rates with values from the database
          setTaxRates({
            vatRate: taxData.vatRate || 12.5, // Fallback to defaults if value not found
            nhilRate: taxData.nhilRate || 2.5,
            serviceTaxRate: taxData.serviceTaxRate || 5,
            cityTaxRate: taxData.cityTaxRate || 2,
            taxIncluded: taxData.taxIncluded || false
          });
          
          console.log("Fetched tax rates from database:", taxData);
        } else {
          console.warn("Tax rates document doesn't exist in Firestore");
        }
      } catch (error) {
        console.error("Error fetching tax rates:", error);
        // Continue with default values if there's an error
      }
    };
    
    fetchTaxRates();
  }, []); // Run once on component mount

  const checkRoomServiceEligibility = async (roomNumber) => {
    if (!roomNumber || !roomNumber.trim()) {
      return false;
    }
    
    try {
      const userId = getOrCreateUserId();
      const auth = getAuth();
      const isAuthenticated = !!auth.currentUser;
      
      // Query for bookings with the given room number and 'Checked in' status
      const guestsQuery = query(
        collection(db, "bookings"),
        where("roomNumber", "==", roomNumber),
        where("status", "==", "Checked in")
      );
  
      const querySnapshot = await getDocs(guestsQuery);
  
      if (querySnapshot.empty) {
        return false;
      }
  
      // If user is authenticated, verify they are assigned to this room
      if (isAuthenticated) {
        // Check if any booking for this room belongs to the current user
        const userMatch = querySnapshot.docs.some(doc => {
          const bookingData = doc.data();
          return bookingData.userId === auth.currentUser.uid;
        });
  
        if (!userMatch) {
          return false;
        }
      } else {
        // For guest users, we'll require verification through verifyRoomNumber
        // instead of automatically enabling room service
        return false;
      }
  
      // All verifications passed
      setUserProfile(prev => ({
        ...prev,
        isHotelGuest: true,
        roomNumber: roomNumber,
        isVerified: true
      }));
      
      // Also set verification success
      setVerificationSuccess(true);
      return true;
    } catch (error) {
      console.error("Error checking room service eligibility:", error);
      return false;
    }
  };

  // Calculate order totals whenever cart items or tax rates change
  useEffect(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    
    // Calculate taxes based on whether they're included in the price or not
    let calculatedVat, calculatedNhil, calculatedServiceTax, calculatedCityTax;
    
    if (taxRates.taxIncluded) {
      // If taxes are included in the price, extract them
      const taxFactor = 1 + ((taxRates.vatRate + taxRates.nhilRate + 
                            taxRates.serviceTaxRate + taxRates.cityTaxRate) / 100);
      const preTaxSubtotal = subtotal / taxFactor;
      
      calculatedVat = preTaxSubtotal * (taxRates.vatRate / 100);
      calculatedNhil = preTaxSubtotal * (taxRates.nhilRate / 100);
      calculatedServiceTax = preTaxSubtotal * (taxRates.serviceTaxRate / 100);
      calculatedCityTax = preTaxSubtotal * (taxRates.cityTaxRate / 100);
      
      // Total doesn't change as taxes are already included
      let total = subtotal;
      
      // Add room service fee if applicable
      if (formData.deliveryMethod === "roomService") {
        const roomServiceFee = subtotal * 0.1;
        total += roomServiceFee;
      }
      
      setOrderTotals({
        subtotal,
        preTaxSubtotal, // Store the pre-tax amount
        vat: calculatedVat,
        nhil: calculatedNhil,
        serviceTax: calculatedServiceTax,
        cityTax: calculatedCityTax,
        roomServiceFee: formData.deliveryMethod === "roomService" ? subtotal * 0.1 : 0,
        total,
        taxesIncluded: true
      });
    } else {
      // Standard calculation - add taxes on top
      calculatedVat = subtotal * (taxRates.vatRate / 100);
      calculatedNhil = subtotal * (taxRates.nhilRate / 100);
      calculatedServiceTax = subtotal * (taxRates.serviceTaxRate / 100);
      calculatedCityTax = subtotal * (taxRates.cityTaxRate / 100);
      
      // Add all taxes to subtotal
      let total = subtotal + calculatedVat + calculatedNhil + calculatedServiceTax + calculatedCityTax;
      
      // Add room service fee if applicable
      if (formData.deliveryMethod === "roomService") {
        const roomServiceFee = subtotal * 0.1;
        total += roomServiceFee;
      }
      
      setOrderTotals({
        subtotal,
        vat: calculatedVat,
        nhil: calculatedNhil,
        serviceTax: calculatedServiceTax,
        cityTax: calculatedCityTax,
        roomServiceFee: formData.deliveryMethod === "roomService" ? subtotal * 0.1 : 0,
        total,
        taxesIncluded: false
      });
    }
  }, [cartItems, taxRates, formData.deliveryMethod]);

  // Check room service eligibility when room number changes
  useEffect(() => {
    if (formData.roomNumber.trim()) {
      checkRoomServiceEligibility(formData.roomNumber);
    }
  }, [formData.roomNumber]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Prefill name and phone if user is authenticated
        const auth = getAuth();
        if (auth.currentUser) {
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
        
          if (userDoc.exists()) {
            const userData = userDoc.data();
        
            setFormData(prev => ({
              ...prev,
              name: userData.fullName || `${userData.fname || ''} ${userData.lname || ''}`.trim() || auth.currentUser.displayName || '',
              phone: userData.phone || ''
            }));
          }
        
          // Fetch booking with Checked in status for the current user
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("userId", "==", auth.currentUser.uid),
            where("status", "==", "Checked in")
          );
        
          const bookingsSnapshot = await getDocs(bookingsQuery);
        
          if (!bookingsSnapshot.empty) {
            const bookingData = bookingsSnapshot.docs[0].data();
            const roomNumberFromBooking = bookingData.roomNumber || "";
        
            setFormData(prev => ({
              ...prev,
              roomNumber: roomNumberFromBooking,
              deliveryMethod: "pickup" // or keep as default if you prefer
            }));
        
            setUserProfile(prev => ({
              ...prev,
              isHotelGuest: true,
              isVerified: true,
              roomNumber: roomNumberFromBooking
            }));
        
            setVerificationSuccess(true);
          }
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
      const userProfileRef = doc(db, "users", userId);
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
              roomNumber: profileData.roomNumber,
              // Enable room service option
              deliveryMethod: "pickup" // Still default to pickup, let user choose
            }));
            setVerificationSuccess(true);
            
            // Also check room service eligibility
            await checkRoomServiceEligibility(profileData.roomNumber);
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
  
      if (value === "Tab" && userProfile.isVerified) {
        setVerificationSuccess(true);
      }
    }
  
    // Ghanaian phone validation
    if (name === "phone") {
      const isValid = isValidGhanaianPhoneNumber(value);
      setFormErrors((prev) => ({
        ...prev,
        phone: !isValid ? "Enter a valid Ghanaian phone number" : ""
      }));
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
      const userId = getOrCreateUserId();
      const auth = getAuth();
      const isAuthenticated = !!auth.currentUser;
  
      // Query for bookings with the given room number and 'Checked in' status
      const guestsQuery = query(
        collection(db, "bookings"),
        where("roomNumber", "==", formData.roomNumber),
        where("status", "==", "Checked in")
      );
  
      const querySnapshot = await getDocs(guestsQuery);
  
      if (querySnapshot.empty) {
        setVerificationError("No active guest found for this room number");
        setVerificationSuccess(false);
        setUserProfile(prev => ({
          ...prev,
          isHotelGuest: false,
          isVerified: false
        }));
        return;
      }
  
      // If user is authenticated, verify they are assigned to this room
      if (isAuthenticated) {
        // Check if any booking for this room belongs to the current user
        const userMatch = querySnapshot.docs.some(doc => {
          const bookingData = doc.data();
          return bookingData.userId === auth.currentUser.uid;
        });
  
        if (!userMatch) {
          setVerificationError("This room is not assigned to your account");
          setVerificationSuccess(false);
          return;
        }
      } else {
        // For guest users, require additional verification (phone number match)
        // This is a basic example - a more secure approach would be needed in production
        const bookingData = querySnapshot.docs[0].data();
        
        if (!formData.phone || !bookingData.phone || !bookingData.phone.includes(formData.phone.slice(-4))) {
          setVerificationError("Please verify with the front desk to charge to this room");
          setVerificationSuccess(false);
          return;
        }
      }
  
      // All verifications passed
      setVerificationSuccess(true);
      setVerificationError("");
      
      // Update user profile
      setUserProfile(prev => ({
        ...prev,
        isHotelGuest: true,
        roomNumber: formData.roomNumber,
        isVerified: true
      }));
  
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
        ...orderTotals, // Include all calculated totals
        taxRates, // Include the tax rates used for the calculation
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
    
    // If Room Service is selected but room hasn't been verified yet, verify it now
    if (formData.deliveryMethod === "roomService" && !userProfile.isHotelGuest) {
      const isHotelGuest = await checkRoomServiceEligibility(formData.roomNumber);
      if (!isHotelGuest) {
        alert("Room service is only available for hotel guests with active rooms. Please verify your room number.");
        return;
      }
    }
    
    if (formData.paymentMethod === "MoMo") {
      // Payment handled by PaystackButton
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Set different status based on payment method and delivery method
      let status = "Pending";
      if (formData.paymentMethod === "Tab") {
        status = "On Hotel Tab";
      } else if (formData.paymentMethod === "Cash") {
        status = "Awaiting Pickup";
      }
      
      // Adjust status for room service
      if (formData.deliveryMethod === "roomService") {
        status = status === "Awaiting Pickup" ? "Room Service Pending" : `Room Service - ${status}`;
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
  
      // Set status based on delivery method
      const status = formData.deliveryMethod === "roomService" 
        ? "Room Service - Paid" 
        : "Paid";
        
      // Save order to 'orders' collection
      const orderId = await saveOrder(status, reference.reference);
  
      // ✅ Save transaction to 'transactions' collection
      await addDoc(collection(db, "transactions"), {
        type: "income",
        amount: orderTotals.total,
        category: "Restaurant Order",
        reference: reference.reference,
        description: `Payment for Order #${orderId}`,
        date: new Date(),
        createdBy: getOrCreateUserId(),
        method: "MoMo"
      });
  
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
    navigate("/restaurant");
  };
  useEffect(() => {
    if (orderComplete) {
      const timer = setTimeout(() => {
        navigate("/restaurant/orders");
      }, 3000); // Redirect 3s after order is complete
  
      return () => clearTimeout(timer);
    }
  }, [orderComplete]);
  
  if (orderComplete) {

  
    return (
      <div className="main-container">
        <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
          <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
  
        <div className="checkout-page">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="success-message" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#2c8e5a' }}>
              Thank you for your order! <br /><br />
              {formData.deliveryMethod === "roomService"
                ? `Your order will be delivered to Room ${formData.roomNumber} shortly.`
                : formData.paymentMethod === "Cash"
                ? "Please present this reference when picking up your order."
                : formData.paymentMethod === "Tab"
                ? "Your order has been charged to your room tab."
                : "Your payment has been successfully processed."}
            </p>
            <p style={{ fontSize: '1rem', color: '#666' }}>
              Redirecting to orders page...
            </p>
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
                
                {taxRates.taxIncluded && (
                  <div className="tax-included-notice">
                    <span>All prices include taxes</span>
                  </div>
                )}
                
                <div className="checkout-line">
                  <span>Subtotal</span>
                  <span>GHS {orderTotals.subtotal.toFixed(2)}</span>
                </div>
                
                {/* Show tax breakdown regardless of whether taxes are included or not */}
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
                {taxRates.cityTaxRate > 0 && (
                  <div className="checkout-line">
                    <span>City/Tourism Tax ({taxRates.cityTaxRate}%)</span>
                    <span>GHS {orderTotals.cityTax.toFixed(2)}</span>
                  </div>
                )}
                {formData.deliveryMethod === "roomService" && (
                  <div className="checkout-line">
                    <span>Room Service Fee (10%)</span>
                    <span>GHS {orderTotals.roomServiceFee.toFixed(2)}</span>
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
              <h2 className="section-heading">Order Details</h2>
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
  {formErrors.phone && (
    <small className="error-text" style={{ color: "red" }}>{formErrors.phone}</small>
  )}
</label>


                
                {/* Delivery Method Selection */}
                <label>
                  <div className="field-tooltip">
                    Delivery Method
                    <span className="tooltip-icon">
                      <FaQuestionCircle />
                      <span className="tooltip-text">
                        {userProfile.isHotelGuest 
                          ? "As a hotel guest, you can have your order delivered to your room, or pick it up yourself."
                          : "Choose pickup to collect your order from the restaurant."}
                      </span>
                    </span>
                  </div>
                  <div className="delivery-method-options">
                    <div 
                      className={`delivery-option ${formData.deliveryMethod === "pickup" ? "selected" : ""}`}
                      onClick={() => handleChange({ target: { name: "deliveryMethod", value: "pickup" } })}
                    >
                      <FaUtensils className="delivery-icon" />
                      <div className="delivery-option-text">
                        <span className="delivery-option-title">Pickup</span>
                        <span className="delivery-option-desc">Collect from restaurant</span>
                      </div>
                    </div>
                    
                    <div 
                      className={`delivery-option ${formData.deliveryMethod === "roomService" ? "selected" : ""}`}
                      onClick={() => {
                        // Always allow selection, but verify when submitting
                        handleChange({ target: { name: "deliveryMethod", value: "roomService" } });
                        // If room service is selected, automatically set payment method to Tab
                        handleChange({ target: { name: "paymentMethod", value: "Tab" } });
                      }}
                    >
                      <FaBed className="delivery-icon" />
                      <div className="delivery-option-text">
                        <span className="delivery-option-title">Room Service</span>
                        <span className="delivery-option-desc">
                          {userProfile.isHotelGuest 
                            ? "Deliver to your room" 
                            : "Hotel guests only"}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
                
                {formData.deliveryMethod === "pickup" && (
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
                )}
                
                {formData.deliveryMethod === "roomService" && (
                  <label>
                    Special Instructions (Optional)
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="e.g. Please knock loudly, I might be in the shower"
                      rows="3"
                    ></textarea>
                  </label>
                )}

                {/* Payment Method Selection - Only show if delivery method is pickup */}
                {formData.deliveryMethod === "pickup" && (
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
                )}
                
                {/* For room service, payment is always on hotel tab */}
                {formData.deliveryMethod === "roomService" && (
                  <div className="room-service-payment-note">
                    <FaHotel style={{ marginRight: '8px' }} />
                    <span>Room service will be charged to your hotel room tab</span>
                  </div>
                )}
                
                {(formData.paymentMethod === "Tab" || formData.deliveryMethod === "roomService") && (
  <div className="room-number-field">
    <label>
      <strong>Room Number:</strong> {userProfile.roomNumber || "N/A"}

      {userProfile.checkoutDate && (
        <div className="checkout-date-info">
          <small>Your checkout date: {userProfile.checkoutDate.toLocaleDateString()}</small>
        </div>
      )}
    </label>
  </div>
)}

                
<div style={{ display: 'flex', justifyContent: 'center' }}>
                  {formData.paymentMethod === "MoMo" &&
                  formData.phone &&
                  formData.name &&
                  orderTotals.total > 0 &&
                  !formErrors.phone ? (
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
                        formErrors.phone ||
                        (formData.deliveryMethod === "pickup" && !formData.paymentMethod) || 
                        ((formData.paymentMethod === "Tab" || formData.deliveryMethod === "roomService") && !verificationSuccess)
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} /> Processing...
                        </>
                      ) : formData.deliveryMethod === "roomService" ? (
                        <>
                          <FaBed /> Order Room Service
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
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;