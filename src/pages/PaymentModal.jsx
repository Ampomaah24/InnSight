// src/components/PaymentModal.js
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, writeBatch, getDocs, query, where, getFirestore } from 'firebase/firestore';
import "../assets/styles/PaymentModal.css"; // Create this CSS file for styling

const PaymentModal = ({ show, onHide, guest, paymentType, amount, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);
  
  if (!show || !guest) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);
    
    try {
      const db = getFirestore();
      
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
        status: "Completed"
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
      } else if (paymentType === 'food order') {
        // Update food orders
        const foodOrdersRef = collection(db, "foodOrders");
        const q = query(
          foodOrdersRef,
          where("guestId", "==", guest.id),
          where("paid", "==", false)
        );
        
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        querySnapshot.forEach((doc) => {
          batch.update(doc.ref, { 
            paid: true, 
            paymentId: paymentRef.id,
            paidAt: new Date()
          });
        });
        
        await batch.commit();
      }
      
      // Handle receipt printing if selected
      if (printReceipt) {
        generateReceipt(guest, paymentType, amount, paymentMethod, reference);
      }
      
      // Notify parent component that payment is complete
      onPaymentComplete(paymentType);
      
      // Close the modal
      onHide();
      
      // Show success message
      alert(`Payment of $${amount.toFixed(2)} for ${guest.name}'s ${paymentType} has been processed successfully.`);
      
    } catch (error) {
      console.error("Payment processing error:", error);
      alert(`Error processing payment: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  const generateReceipt = (guest, type, amount, method, reference) => {
    const printWindow = window.open('', '_blank');
    const hotelName = "YourHotelName"; // Replace with your hotel name
    
    const content = `
      <html>
      <head>
        <title>Payment Receipt - ${guest.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .hotel-name { font-size: 24px; font-weight: bold; }
          .document-title { font-size: 18px; text-transform: uppercase; margin-top: 5px; }
          .details { margin-bottom: 20px; }
          .details-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .details-label { font-weight: bold; }
          .payment-info { border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .payment-title { font-weight: bold; margin-bottom: 10px; }
          .footer { margin-top: 40px; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">${hotelName}</div>
          <div class="document-title">Payment Receipt</div>
        </div>
        
        <div class="details">
          <div class="details-row">
            <span class="details-label">Guest Name:</span>
            <span>${guest.name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Room:</span>
            <span>${guest.room} ${guest.roomName ? `(${guest.roomName})` : ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Receipt Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Receipt #:</span>
            <span>REC-${Math.floor(Math.random() * 10000)}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="payment-title">Payment Information</div>
          <div class="details-row">
            <span class="details-label">Payment Type:</span>
            <span>${type === 'accommodation' ? 'Accommodation' : 'Food & Beverage'}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Payment Method:</span>
            <span>${method}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Amount Paid:</span>
            <span>$${amount.toFixed(2)}</span>
          </div>
          ${reference ? `
          <div class="details-row">
            <span class="details-label">Reference:</span>
            <span>${reference}</span>
          </div>
          ` : ''}
          <div class="details-row">
            <span class="details-label">Status:</span>
            <span>Paid</span>
          </div>
        </div>
        
        <div class="footer">
          Thank you for your payment!<br>
          ${hotelName} - Your comfort is our priority.
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
      printWindow.print();
    };
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
          <button className="close-button" onClick={onHide}>&times;</button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Guest:</label>
              <input type="text" value={guest.name} disabled />
            </div>
            
            <div className="form-group">
              <label>Payment Type:</label>
              <input type="text" value={paymentType === 'accommodation' ? 'Accommodation' : 'Food & Beverage'} disabled />
            </div>
            
            <div className="form-group">
              <label>Amount:</label>
              <input type="text" value={`$${amount.toFixed(2)}`} disabled />
            </div>
            
            <div className="form-group">
              <label>Payment Method:</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Reference/Notes:</label>
              <input 
                type="text" 
                value={reference} 
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional reference number or notes"
              />
            </div>
            
            <div className="form-group checkbox">
              <input 
                type="checkbox" 
                id="printReceipt"
                checked={printReceipt}
                onChange={(e) => setPrintReceipt(e.target.checked)}
              />
              <label htmlFor="printReceipt">Print receipt after payment</label>
            </div>
            
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