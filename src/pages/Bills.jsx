import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc,
  orderBy
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import NavMenu from "../components/NavMenu";
import { 
  FaFileInvoiceDollar, 
  FaHistory, 
  FaCreditCard, 
  FaExclamationCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaMoneyBillWave
} from 'react-icons/fa';
import "../assets/styles/Bills.css";

const Bills = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bills, setBills] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalRemainder, setTotalRemainder] = useState(0);
  const [userProfile, setUserProfile] = useState({
    isHotelGuest: false,
    roomNumber: "",
    checkoutDate: null
  });
  
  useEffect(() => {
    const fetchUserBills = async () => {
      setIsLoading(true);
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        // Redirect to login if not authenticated
        navigate("/login", { state: { returnUrl: "/restaurant/bills" } });
        return;
      }
      
      try {
        // First check if user is a hotel guest
        const userProfileRef = doc(db, "userProfiles", currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let isGuest = false;
        let roomNum = "";
        let checkoutDate = null;
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          isGuest = profileData.isHotelGuest || false;
          roomNum = profileData.roomNumber || "";
          checkoutDate = profileData.checkoutDate ? profileData.checkoutDate.toDate() : null;
          
          setUserProfile({
            isHotelGuest: isGuest,
            roomNumber: roomNum,
            checkoutDate: checkoutDate
          });
        }
        
        // Get all orders charged to tab or with partial payments for this user
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid),
          where("status", "in", ["On Hotel Tab", "Pending Payment", "Partial Payment"]),
          orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        const billsData = [];
        let outstandingTotal = 0;
        let remainderTotal = 0;
        
        querySnapshot.forEach((doc) => {
          const billData = {
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          };
          
          // Calculate remainder amount for partial payments
          if (billData.status === "Partial Payment") {
            billData.depositAmount = billData.depositAmount || 0;
            billData.remainderAmount = billData.total - billData.depositAmount;
            remainderTotal += billData.remainderAmount;
          } else {
            billData.remainderAmount = billData.total;
            remainderTotal += billData.total;
          }
          
          billsData.push(billData);
          outstandingTotal += billData.total || 0;
        });
        
        setBills(billsData);
        setTotalOutstanding(outstandingTotal);
        setTotalRemainder(remainderTotal);
      } catch (error) {
        console.error("Error fetching bills:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserBills();
  }, [navigate]);
  
  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  const getDaysUntilCheckout = () => {
    if (!userProfile.checkoutDate) return null;
    
    const today = new Date();
    const checkoutDate = new Date(userProfile.checkoutDate);
    
    // Reset time part for accurate day calculation
    today.setHours(0, 0, 0, 0);
    checkoutDate.setHours(0, 0, 0, 0);
    
    const differenceInTime = checkoutDate.getTime() - today.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    
    return differenceInDays;
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  if (isLoading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
          <p>Loading your bills...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="main-container">
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <div className="bills-page">
        <div className="bills-wrapper">
          <div className="bills-header">
            <FaFileInvoiceDollar className="bills-icon" />
            <h1 className="bills-title">My Outstanding Bills</h1>
          </div>
          
          <button className="back-button" onClick={handleBack}>
            <FaArrowLeft /> Back
          </button>
          
          {userProfile.isHotelGuest ? (
            <div className="guest-info">
              <div className="info-card">
                <h3><FaInfoCircle /> Hotel Guest Information</h3>
                <p><strong>Room Number:</strong> {userProfile.roomNumber}</p>
                {userProfile.checkoutDate && (
                  <>
                    <p><strong>Checkout Date:</strong> {formatDate(userProfile.checkoutDate)}</p>
                    {getDaysUntilCheckout() !== null && (
                      <p>
                        <strong>Days Until Checkout:</strong> 
                        <span className={getDaysUntilCheckout() <= 1 ? "urgent" : ""}>
                          {" "}{getDaysUntilCheckout()} day(s)
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="not-guest-info">
              <div className="info-card warning">
                <h3><FaExclamationCircle /> Not a Hotel Guest</h3>
                <p>You are not registered as a hotel guest. If you are staying at the hotel, please contact the front desk to update your profile.</p>
              </div>
            </div>
          )}
          
          <div className="bills-summary">
            <div className="summary-card">
              <div className="summary-header">
                <h2>Total Outstanding Balance</h2>
                <div className="summary-amount">GHS {totalOutstanding.toFixed(2)}</div>
              </div>
              
              {/* New section for remainder balance after deposits */}
              <div className="summary-header remainder-section">
                <h2>Remainder Due</h2>
                <div className="summary-amount remainder-amount">GHS {totalRemainder.toFixed(2)}</div>
              </div>
              
              {bills.length > 0 ? (
                <p className="summary-info">
                  You have {bills.length} outstanding {bills.length === 1 ? "bill" : "bills"}.
                  {bills.some(bill => bill.status === "Partial Payment") && (
                    <span className="deposit-info">
                      Some bills have partial payments (deposits).
                    </span>
                  )}
                  {userProfile.isHotelGuest && userProfile.checkoutDate && getDaysUntilCheckout() <= 1 && (
                    <span className="checkout-warning">
                      <FaExclamationCircle /> Your checkout is approaching. Please settle all bills before departure.
                    </span>
                  )}
                </p>
              ) : (
                <p className="summary-info">You have no outstanding bills charged to your tab.</p>
              )}
            </div>
          </div>
          
          {bills.length > 0 ? (
            <div className="bills-list">
              <h2 className="section-heading">Bill Details</h2>
              {bills.map((bill) => (
                <div className="bill-card" key={bill.id}>
                  <div className="bill-header">
                    <div className="bill-date">
                      <FaHistory /> {formatDate(bill.timestamp)}
                    </div>
                    <div className="bill-ref">
                      Ref: {bill.id.substring(0, 8)}
                    </div>
                  </div>
                  
                  <div className="bill-items">
                    {bill.cartItems && bill.cartItems.map((item, index) => (
                      <div className="bill-item" key={index}>
                        <div className="item-details">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">x{item.quantity}</span>
                        </div>
                        <span className="item-price">GHS {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bill-summary">
                    <div className="bill-summary-line">
                      <span>Subtotal</span>
                      <span>GHS {bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="bill-summary-line">
                      <span>VAT ({bill.taxRates?.vatRate || 0}%)</span>
                      <span>GHS {bill.vat.toFixed(2)}</span>
                    </div>
                    <div className="bill-summary-line">
                      <span>NHIL ({bill.taxRates?.nhilRate || 0}%)</span>
                      <span>GHS {bill.nhil.toFixed(2)}</span>
                    </div>
                    {bill.taxRates?.serviceTaxRate > 0 && (
                      <div className="bill-summary-line">
                        <span>Service ({bill.taxRates.serviceTaxRate}%)</span>
                        <span>GHS {bill.serviceTax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bill-total">
                      <strong>Total</strong>
                      <strong>GHS {bill.total.toFixed(2)}</strong>
                    </div>
                    
                    {/* Payment status for partial payments */}
                    {bill.status === "Partial Payment" && (
                      <>
                        <div className="bill-payment-status">
                          <div className="payment-status-line">
                            <span><FaMoneyBillWave /> Deposit Paid</span>
                            <span className="deposit-amount">GHS {bill.depositAmount.toFixed(2)}</span>
                          </div>
                          <div className="payment-status-line remainder">
                            <span>Remainder Due</span>
                            <span className="remainder-amount">GHS {bill.remainderAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="bill-status">
                    <span className={`status-badge ${bill.status === "Partial Payment" ? "partial" : bill.status === "Pending Payment" ? "pending" : "charged"}`}>
                      {bill.status}
                    </span>
                    
                    {bill.notes && (
                      <div className="bill-notes">
                        <strong>Notes:</strong> {bill.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-bills">
              <p>You have no outstanding bills at this time.</p>
              <button className="menu-btn" onClick={() => navigate("/restaurant/menu")}>
                View Restaurant Menu
              </button>
            </div>
          )}
          
          {bills.length > 0 && (
            <div className="payment-info">
              <h3>Payment Information</h3>
              {userProfile.isHotelGuest ? (
                <p>
                  All outstanding bills will be charged to your room ({userProfile.roomNumber}) and 
                  must be settled before checkout. For any questions regarding your bill, 
                  please contact the front desk.
                </p>
              ) : (
                <p>
                  All outstanding bills must be paid in full. If you have made a partial payment (deposit),
                  please settle the remainder amount before your next visit. For any questions regarding your bill,
                  please contact our staff.
                </p>
              )}
              <div className="payment-actions">
                <button className="payment-btn" onClick={() => navigate("/restaurant/menu")}>
                  <FaArrowLeft /> Return to Menu
                </button>
                <button className="payment-btn pay-now" onClick={() => navigate("/payment")}>
                  <FaCreditCard /> Pay Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bills;