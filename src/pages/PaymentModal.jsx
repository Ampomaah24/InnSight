// src/components/PaymentModal.js
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, writeBatch, getDocs, query, where, getFirestore } from 'firebase/firestore';
import "../assets/styles/PaymentModal.css"; // Create this CSS file for styling

const PaymentModal = ({ show, onHide, guest, paymentType, amount, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  
  if (!show || !guest) return null;
  
  // Format date helper function
  const formatDate = (dateString) => {
    try {
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString();
      }
      
      if (dateString && typeof dateString === 'string') {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) 
          ? date.toLocaleDateString() 
          : "Not available";
      } else {
        return "Not available";
      }
    } catch (e) {
      console.error("Date parsing error:", e);
      return "Not available";
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email if email receipt is selected
    if (emailReceipt && !guestEmail) {
      alert("Please enter guest email address for email receipt");
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      const db = getFirestore();
      const batch = writeBatch(db);
      
      // Create payment record
      const paymentData = {
        guestId: guest.id,
        userId: guest.userId,
        amount: amount,
        type: paymentType,
        method: paymentMethod,
        reference: reference,
        collectedBy: "Front Desk", // Ideally use current user ID
        timestamp: new Date(),
        status: "Completed",
        emailSent: emailReceipt,
        guestEmail: emailReceipt ? guestEmail : null
      };
      
      // Add payment to Firestore
      const paymentRef = await addDoc(collection(db, "payments"), paymentData);
      
      // Update the appropriate records based on payment type
      if (paymentType === 'accommodation') {
        const bookingRef = doc(db, "bookings", guest.id);
        await updateDoc(bookingRef, {
          remainderDue: 0,
          paymentStatus: "Paid",
          lastPaymentDate: new Date(),
          lastPaymentId: paymentRef.id
        });
      } else if (paymentType === 'food') {
        // Update food orders (not extension charges)
        // First, get all food orders that are not extensions
        const foodOrders = guest.foodOrders.filter(order => 
          order.type === "food" && 
          !(order.description && order.description.toLowerCase().includes("extension"))
        );
        
        // Update each order to mark as paid
        for (const order of foodOrders) {
          if (order.id) {
            const orderRef = doc(db, "orders", order.id);
            batch.update(orderRef, { 
              paid: true, 
              paymentId: paymentRef.id,
              paidAt: new Date(),
              paymentMethod: paymentMethod
            });
          }
        }
        
        // Commit the batch
        await batch.commit();
      } else if (paymentType === 'extension') {
        const extensionOrders = guest.foodOrders.filter(order =>
          order.type === "extension" || 
          (order.description && order.description.toLowerCase().includes("extension"))
        );
      
        const db = getFirestore();
        const bookingRef = doc(db, "bookings", guest.id);
        const transactionIds = new Set();
      
        // Collect all related transaction IDs
        for (const order of extensionOrders) {
          if (order.transactionId) {
            transactionIds.add(order.transactionId);
          }
        }
      
        // ✅ Update each transaction
        for (const transactionId of transactionIds) {
          const transRef = doc(db, "transactions", transactionId);
          batch.update(transRef, {
            paymentStatus: "Paid",
            paidDate: new Date(),
            paymentId: paymentRef.id,
            paymentMethod: paymentMethod
          });
        }
      
        // ✅ Clear inline extensionCharges from booking
        batch.update(bookingRef, {
          extensionCharges: [],
          lastPaymentDate: new Date(),
          lastPaymentId: paymentRef.id
        });
      
        // ✅ Optionally mark extensionHistory as paid
        const bookingDocSnap = await getDocs(query(collection(db, "bookings"), where("id", "==", guest.id)));
        if (!bookingDocSnap.empty) {
          const bookingDoc = bookingDocSnap.docs[0];
          const bookingData = bookingDoc.data();
      
          if (bookingData.extensionHistory?.length > 0) {
            const updatedHistory = bookingData.extensionHistory.map(entry => ({
              ...entry,
              paid: true,
              paidDate: new Date(),
              paymentId: paymentRef.id
            }));
      
            batch.update(bookingRef, {
              extensionHistory: updatedHistory
            });
          }
        }
      
        await batch.commit();
      }
      
      
      
      // Handle email receipt if selected
      if (emailReceipt) {
        // Create a record for the email to be sent
        await addDoc(collection(db, "emailQueue"), {
          to: guestEmail,
          subject: `Receipt from Ampomaah Tourist Hotel - ${formatPaymentType(paymentType)}`,
          templateId: "payment-receipt",
          data: {
            guestName: guest.name,
            roomNumber: guest.room,
            roomName: guest.roomName,
            paymentType: formatPaymentType(paymentType),
            paymentMethod: paymentMethod,
            amount: amount,
            reference: reference,
            receiptDate: new Date().toLocaleDateString(),
            receiptId: `REC-${Math.floor(Math.random() * 10000)}`
          },
          status: "pending",
          createdAt: new Date()
        });
      }
      
      // Notify parent component that payment is complete
      const paymentDetails = {
        method: paymentMethod,
        reference: reference,
        timestamp: new Date(),
        email: emailReceipt ? guestEmail : null
      };
      onPaymentComplete(paymentType, paymentDetails);
      
      // Close the modal
      onHide();
      
      // Show success message
      alert(`✅ Payment of $${amount.toFixed(2)} for ${guest.name}'s ${formatPaymentType(paymentType)} has been processed successfully.`);
      
    } catch (error) {
      console.error("Payment processing error:", error);
      alert(`❌ Error processing payment: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Format the type string for display
  const formatPaymentType = (type) => {
    switch(type) {
      case 'accommodation':
        return 'Accommodation Balance';
      case 'food':
        return 'Food & Beverage Charges';
      case 'extension':
        return 'Stay Extension Charges';
      default:
        return 'Charges';
    }
  };
  

  
  const backdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: show ? 'flex' : 'none',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };
  
  const modalStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto'
  };
  
  return (
    <div style={backdropStyle} onClick={onHide}>
      <div style={modalStyle} onClick={e => e.stopPropagation()} className="payment-modal">
        <div className="modal-header">
          <h2>Process Payment</h2>
          <button className="close-button" onClick={onHide} disabled={processingPayment}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="payment-summary">
            <div className="summary-row">
              <span>Guest:</span>
              <span>{guest.name}</span>
            </div>
            <div className="summary-row">
              <span>Room:</span>
              <span>{guest.room} {guest.roomName && `(${guest.roomName})`}</span>
            </div>
            <div className="summary-row">
              <span>Payment Type:</span>
              <span>{formatPaymentType(paymentType)}</span>
            </div>
            <div className="summary-row total">
              <span>Amount Due:</span>
              <span>GHS{amount.toFixed(2)}</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Payment Method:</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={processingPayment}
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Reference/Notes:</label>
              <input 
                type="text" 
                value={reference} 
                onChange={(e) => setReference(e.target.value)}
                placeholder="Card last 4 digits, transaction ID, etc."
                disabled={processingPayment}
              />
            </div>
            
            <div className="receipt-options">
              
              <div className="form-group checkbox">
                <input 
                  type="checkbox" 
                  id="emailReceipt"
                  checked={emailReceipt}
                  onChange={(e) => setEmailReceipt(e.target.checked)}
                  disabled={processingPayment}
                />
                <label htmlFor="emailReceipt">Email receipt</label>
              </div>
            </div>
            
            {emailReceipt && (
              <div className="form-group">
                <label>Guest Email:</label>
                <input 
                  type="email" 
                  value={guestEmail} 
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter guest email address"
                  required={emailReceipt}
                  disabled={processingPayment}
                />
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={onHide}
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-submit"
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;