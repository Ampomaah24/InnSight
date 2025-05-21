import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore, doc, updateDoc, addDoc, writeBatch, orderBy, limit, getDoc } from 'firebase/firestore';
import Sidebar from '../components/Sidebar'; // Added Sidebar import
import PaymentModal from './PaymentModal';
import "../assets/styles/Bills.css";

const HotelBills = () => {
  const [guests, setGuests] = useState([]);
  const [processedPayments, setProcessedPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [activeTab, setActiveTab] = useState('accommodation');
  const [mainView, setMainView] = useState('active'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  
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

  // Format time helper function
  const formatTime = (dateObj) => {
    try {
      if (dateObj instanceof Date) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return "Not available";
    } catch (e) {
      console.error("Time formatting error:", e);
      return "Not available";
    }
  };

  // Parse Firestore timestamp to JavaScript Date
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    if (timestamp instanceof Date) return timestamp;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    return new Date(timestamp);
  };

  const getExtendedCheckoutDate = async (db, extensionBookingId) => {
    try {
      const extRef = doc(db, "bookings", extensionBookingId);
      const extSnap = await getDoc(extRef);
  
      if (extSnap.exists()) {
        const extData = extSnap.data();
        return parseTimestamp(extData.checkOut || extData.checkOutDate || extData.timestamp);
      }
    } catch (err) {
      console.warn("Could not get extended checkout date:", err);
    }
  
    return null;
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        await Promise.all([
          fetchGuests(db),
          fetchProcessedPayments(db)
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchGuests = async (db) => {
    try {
      // Query for guests with "checked in" status
      const q = query(
        collection(db, "bookings"),
        where("status", "==", "Checked in")
      );
      
      const querySnapshot = await getDocs(q);
      const guestData = [];
      
      // Helper function to extract guest name properly
      const extractGuestName = (data) => {
        if (data.primaryGuestFirstName || data.primaryGuestLastName) {
          return `${data.primaryGuestFirstName || ''} ${data.primaryGuestLastName || ''}`.trim();
        }
        
        if (data.guests && Array.isArray(data.guests) && data.guests.length > 0) {
          const firstGuest = data.guests[0];
          if (firstGuest && (firstGuest.firstName || firstGuest.lastName)) {
            return `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`.trim();
          }
        }
        
        return `${data.firstName || ''} ${data.lastName || ''}`.trim() || "Guest";
      };
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        
        const guestName = extractGuestName(data);
        
        guestData.push({
          id: docSnapshot.id,
          name: guestName,
          room: data.roomNumber || "Unknown",
          roomName: data.roomName || "",
          checkInDate: parseTimestamp(data.checkIn || data.lastUpdated),
          checkOutDate: data.extensionBookingId
          ? await getExtendedCheckoutDate(db, data.extensionBookingId) 
          : parseTimestamp(data.checkOut),
        
          status: data.status || "",
          accommodationBalance: data.remainderDue || 0,
          originalPrice: data.originalPrice || 0,
          paymentStatus: data.paymentStatus || "",
          paymentOption: data.paymentOption || "",
          roomType: data.roomType || "",
          roomCategory: data.roomCategory || "",
          phone: data.phone || "",
          userId: data.userId || "",
          numberOfGuests: data.numberOfGuests || 1,
          specialRequests: data.specialRequests || "",
          extensionCharges: data.extensionCharges || [],
          extensionHistory: data.extensionHistory || [],
          extensionBookingId: data.extensionBookingId || null,
          hasBeenExtended: data.hasBeenExtended || false,
          email: data.email || "",
          foodOrders: []
        });
      }
      
      // Now fetch additional data for each guest
      for (let guest of guestData) {
        await fetchGuestOrders(db, guest);
        await fetchExtensionBookings(db, guest);
        await processExtensionHistory(db, guest);
      }
      
      setGuests(guestData);
    } catch (err) {
      console.error("Error fetching guests:", err);
      throw err;
    }
  };

  const processExtensionHistory = async (db, guest) => {
    const seenExtensions = new Set();

    try {
      if (!guest.extensionHistory || guest.extensionHistory.length === 0) return;
  
      console.log(`Processing extension history for guest in room ${guest.room}`, guest.extensionHistory);
  
      guest.extensionHistory.forEach(extension => {
        const cost = Number(extension.cost);
        if (extension.paid === true || !cost || isNaN(cost) || cost <= 0) {
          return;
        }
  
        // Parse date safely
        let extensionDate = null;
        if (extension.date) {
          extensionDate = parseTimestamp(extension.date);
        } else if (extension.timestamp) {
          extensionDate = parseTimestamp(extension.timestamp);
        } else if (extension.createdAt) {
          extensionDate = parseTimestamp(extension.createdAt);
        }
  
        if (!extensionDate || isNaN(extensionDate.getTime())) {
          console.warn("Invalid extension date; skipping", extension);
          return;
        }
  
        const extensionId = extension.id || `ext-hist-${extensionDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
          const alreadyAdded = guest.foodOrders.some(order =>
          order.type === "extension" &&
          Math.abs(parseTimestamp(order.date) - extensionDate) < 86400000 && 
          Number(order.amount) === cost
        );
  
        if (alreadyAdded) {
          console.log("Extension already exists; skipping duplicate");
          return;
        }
  
        // Construct charge
        const extensionCharge = {
          id: extensionId,
          date: extensionDate,
          description: `Stay Extension (${extension.days || extension.hours / 8 || 1} ${extension.days ? 'days' : 'hours'})`,
          amount: cost,
          type: "extension",
          notes: extension.notes || "",
          originalExtensionId: extensionId,
          approvedBy: extension.approvedBy || "",
          approvedByName: extension.approvedByName || "",
          roomChanged: extension.roomChanged || false,
          oldRoomNumber: extension.oldRoomNumber || "",
          newRoomNumber: extension.newRoomNumber || ""
        };
  
        const key = `${extensionCharge.description}_${extensionCharge.amount}_${formatDate(extensionCharge.date)}`;

        if (!seenExtensions.has(key)) {
          const key = `${extensionCharge.description}_${extensionCharge.amount}_${formatDate(extensionCharge.date)}`;
          if (!seenExtensions.has(key)) {
            guest.foodOrders.push(extensionCharge);
            seenExtensions.add(key);
            console.log("✅ Added:", extensionCharge);
          }
  
else {
  console.log("⛔ Skipped duplicate:", key);
}

          seenExtensions.add(key);
          console.log("✅ Added extension charge:", extensionCharge);
        } else {
          console.log("⛔ Skipped duplicate extension charge:", key);
        }
        
        
        console.log("✅ Added extension charge:", extensionCharge);
      });
  
      guest.foodOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
      console.error(`Error processing extension history for guest in room ${guest.room}:`, err);
    }
  };

  const seenExtensions = new Set();

  // Function to fetch extension bookings
  const fetchExtensionBookings = async (db, guest) => {
    try {

      if (guest.extensionBookingId) {
        console.log(`Found extension booking ID for guest in room ${guest.room}:`, guest.extensionBookingId);
        
        try {
          const extensionBookingRef = doc(db, "bookings", guest.extensionBookingId);
          const extensionBookingSnap = await getDoc(extensionBookingRef);
          
          if (extensionBookingSnap.exists()) {
            const extensionData = extensionBookingSnap.data();
            
            // If the extension booking has an unpaid balance, add it as a charge
            if (extensionData.remainderDue > 0) {
              const extensionDays = extensionData.extensionDays || 1;
              
              // Create a properly formatted extension charge
              const extensionCharge = {
                id: `ext-booking-${guest.extensionBookingId}`,
                date: parseTimestamp(extensionData.createdAt || extensionData.timestamp || new Date()),
                description: `Stay Extended (${extensionDays} days)`,
                amount: extensionData.remainderDue || 0,
                type: "extension",
                notes: extensionData.notes || "Extension booking",
                linkedBookingId: guest.extensionBookingId
              };
              
              // Check if this charge is already in the food orders
              const alreadyExists = guest.foodOrders.some(order => 
                order.id === extensionCharge.id || 
                (order.linkedBookingId && order.linkedBookingId === guest.extensionBookingId)
              );
              
              // Add to guest's food orders if not already there
              if (!alreadyExists) {
                const key = `${extensionCharge.description}_${extensionCharge.amount}_${formatDate(extensionCharge.date)}`;
                if (!seenExtensions.has(key)) {
                  guest.foodOrders.push(extensionCharge);
                  seenExtensions.add(key);
                  console.log("✅ Added:", extensionCharge);
                }
                else {
                  console.log("⛔ Skipped duplicate:", key);
                }

                console.log("Added extension charge from linked booking", extensionCharge);
              }
            }
            
            // Check if the extension booking has its own extension history
            if (extensionData.extensionHistory && extensionData.extensionHistory.length > 0) {
              console.log("Processing nested extension history from linked booking", extensionData.extensionHistory);
              
              extensionData.extensionHistory.forEach(extension => {
                if (extension.paid === true) {
                  return;
                }
                
                // Generate a unique ID for this extension
                const extensionId = extension.id || `ext-nested-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                const alreadyAdded = guest.foodOrders.some(order => 
                  order.id === extensionId || 
                  (order.originalExtensionId && order.originalExtensionId === extensionId)
                );
                
                if (alreadyAdded || !extension.cost || extension.cost <= 0) {
                  return;
                }
                
                let extensionDate = new Date();
                try {
                  extensionDate = parseTimestamp(extension.date);
                } catch (e) {
                  console.warn("Could not parse nested extension date", e);
                }
                
                const nestedExtensionCharge = {
                  id: extensionId,
                  date: extensionDate,
                  description: `Stay Extension (${extension.days || extension.hours/8 || 1} ${extension.days ? 'days' : 'hours'})`,
                  amount: extension.cost,
                  type: "extension",
                  notes: extension.notes || "From linked extension booking",
                  originalExtensionId: extensionId,
                  fromLinkedBooking: true,
                  linkedBookingId: guest.extensionBookingId
                };
                
                guest.foodOrders.push(nestedExtensionCharge);
                console.log("Added nested extension charge", nestedExtensionCharge);
              });
            }
            
            // Check if this extension booking has its own extension booking
            if (extensionData.extensionBookingId && extensionData.extensionBookingId !== guest.extensionBookingId) {
              console.log("Found nested extension booking ID:", extensionData.extensionBookingId);
              
              try {
                const nestedExtBookingRef = doc(db, "bookings", extensionData.extensionBookingId);
                const nestedExtBookingSnap = await getDoc(nestedExtBookingRef);
                
                if (nestedExtBookingSnap.exists()) {
                  const nestedExtData = nestedExtBookingSnap.data();
                  
                  if (nestedExtData.remainderDue > 0) {
                    const nestedExtDays = nestedExtData.extensionDays || 1;
                    
                    const nestedExtCharge = {
                      id: `ext-nested-booking-${extensionData.extensionBookingId}`,
                      date: parseTimestamp(nestedExtData.createdAt || nestedExtData.timestamp || new Date()),
                      description: `Stay Extension (${nestedExtDays} days)`,
                      amount: nestedExtData.remainderDue || 0,
                      type: "extension",
                      notes: nestedExtData.notes || "Nested extension booking",
                      linkedBookingId: extensionData.extensionBookingId,
                      isNested: true
                    };
                    
                    // Check if already exists
                    const alreadyExists = guest.foodOrders.some(order => 
                      order.id === nestedExtCharge.id || 
                      (order.linkedBookingId && order.linkedBookingId === extensionData.extensionBookingId)
                    );
                    
                    if (!alreadyExists) {
                      guest.foodOrders.push(nestedExtCharge);
                      console.log("Added nested extension booking charge", nestedExtCharge);
                    }
                  }
                }
              } catch (nestedErr) {
                console.error("Error fetching nested extension booking:", nestedErr);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching extension booking ${guest.extensionBookingId}:`, err);
        }
      }
      
      // Query for additional extension bookings that reference this booking
      const extensionsQuery = query(
        collection(db, "bookings"),
        where("originalBookingId", "==", guest.id),
        where("isExtension", "==", true)
      );
      
      try {
        const extensionsSnapshot = await getDocs(extensionsQuery);
        
        console.log(`Found ${extensionsSnapshot.docs.length} additional extension bookings for guest in room ${guest.room}`);
        
        extensionsSnapshot.docs.forEach(extDoc => {
          const extData = extDoc.data();
          
          // Skip if this is the same as the known extension booking
          if (guest.extensionBookingId && extDoc.id === guest.extensionBookingId) {
            return;
          }
          
          // Skip if no remainder due
          if (!extData.remainderDue || extData.remainderDue <= 0) {
            return;
          }
          
          // Check if already in food orders
          const alreadyExists = guest.foodOrders.some(order => 
            order.id === `ext-additional-${extDoc.id}` || 
            (order.linkedBookingId && order.linkedBookingId === extDoc.id)
          );
          
          if (alreadyExists) {
            return;
          }
          
          // Create charge for this additional extension booking
          const additionalExtCharge = {
            id: `ext-additional-${extDoc.id}`,
            date: parseTimestamp(extData.createdAt || extData.timestamp || new Date()),
            description: `Stay Extension (${extData.extensionDays || 1} days)`,
            amount: extData.remainderDue,
            type: "extension",
            notes: extData.notes || "Additional extension booking",
            linkedBookingId: extDoc.id
          };
          
          guest.foodOrders.push(additionalExtCharge);
          console.log("Added additional extension booking charge", additionalExtCharge);
        });
      } catch (queryErr) {
        console.error("Error querying for additional extension bookings:", queryErr);
      }
      
      // Query the transactions collection for extension transactions
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("originalBookingId", "==", guest.id),
        where("type", "==", "Extension"),
        where("paymentStatus", "==", "Outstanding")
      );
      
      try {
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        console.log(`Found ${transactionsSnapshot.docs.length} extension transactions for guest in room ${guest.room}`);
        
        transactionsSnapshot.docs.forEach(transDoc => {
          const transData = transDoc.data();
          
          // Skip if already paid
          if (transData.paymentStatus === "Paid") {
            return;
          }
          
          // Check if already in food orders
          const alreadyExists = guest.foodOrders.some(order => 
            order.id === `ext-trans-${transDoc.id}` || 
            (order.transactionId && order.transactionId === transDoc.id)
          );
          
          if (alreadyExists) {
            return;
          }
          
          // Create charge for this transaction
          const transactionCharge = {
            id: `ext-trans-${transDoc.id}`,
            date: parseTimestamp(transData.date || new Date()),
            description: transData.description || `Stay Extension (${transData.regularDays || 0 + transData.highSeasonDays || 0} days)`,
            amount: transData.amount,
            type: "extension",
            notes: `Transaction ID: ${transDoc.id}`,
            transactionId: transDoc.id
          };
          
          guest.foodOrders.push(transactionCharge);
          console.log("Added extension transaction charge", transactionCharge);
        });
      } catch (transErr) {
        console.error("Error querying for extension transactions:", transErr);
      }
      
      // Sort food orders by date (newest first)
      guest.foodOrders.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date();
        const dateB = b.date instanceof Date ? b.date : new Date();
        return dateB - dateA;
      });
      
    } catch (err) {
      console.error(`Error fetching extension bookings for guest in room ${guest.room}:`, err);
    }
  };

  const fetchGuestOrders = async (db, guest) => {
    try {
      // First query for orders put on room tab
      const tabOrdersQuery = query(
        collection(db, "orders"),
        where("roomNumber", "==", guest.room),
        where("paymentMethod", "==", "Tab"),
        where("paid", "==", false) 
      );
      
      const tabOrdersSnapshot = await getDocs(tabOrdersQuery);
      
      // Then query for room service orders
      const roomServiceQuery = query(
        collection(db, "orders"),
        where("roomNumber", "==", guest.room),
        where("deliveryMethod", "==", "roomService"),
        where("paid", "==", false) 
      );
      
      const roomServiceSnapshot = await getDocs(roomServiceQuery);
      
      const foodOrders = [];
      
      // Process tab orders
      tabOrdersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Format cart items for description
        let itemsDescription = "";
        if (orderData.cartItems && orderData.cartItems.length > 0) {
          itemsDescription = orderData.cartItems
            .map(item => `${item.quantity}x ${item.name}`)
            .join(", ");
        }
        
        // Determine if this is an extension charge
        const isExtension = 
          (itemsDescription && itemsDescription.toLowerCase().includes("extension")) || 
          (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
          (orderData.notes && orderData.notes.toLowerCase().includes("extension")) ||
          (orderData.type && orderData.type.toLowerCase() === "extension");
        
        const orderDate = parseTimestamp(orderData.timestamp);
        
        foodOrders.push({
          id: doc.id,
          date: orderDate,
          description: isExtension 
            ? `Stay Extension (${orderData.extensionDays || orderData.days || 1} days)` 
            : `Restaurant Order - Tab (${itemsDescription})`,
          amount: orderData.total || 0,
          type: isExtension ? "extension" : "food",
          notes: orderData.notes || ""
        });
      });
      
      // Process room service orders
      roomServiceSnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Skip if this order was already added
        if (foodOrders.some(order => order.id === doc.id)) {
          return;
        }
        
        // Format cart items for description
        let itemsDescription = "";
        if (orderData.cartItems && orderData.cartItems.length > 0) {
          itemsDescription = orderData.cartItems
            .map(item => `${item.quantity}x ${item.name}`)
            .join(", ");
        }
        
        // Determine if this is an extension charge
        const isExtension = 
          (itemsDescription && itemsDescription.toLowerCase().includes("extension")) || 
          (orderData.description && orderData.description.toLowerCase().includes("extension")) ||
          (orderData.notes && orderData.notes.toLowerCase().includes("extension")) ||
          (orderData.type && orderData.type.toLowerCase() === "extension");
        
        const orderDate = parseTimestamp(orderData.timestamp);
        
        foodOrders.push({
          id: doc.id,
          date: orderDate,
          description: isExtension 
            ? `Stay Extension (${orderData.extensionDays || orderData.days || 1} days)` 
            : `Room Service (${itemsDescription})`,
          amount: orderData.total || 0,
          type: isExtension ? "extension" : "food",
          notes: orderData.notes || ""
        });
      });
      
      // Add to guest's existing food orders
      guest.foodOrders = [...guest.foodOrders, ...foodOrders];
      
      const uniqueOrders = [];
      const orderIds = new Set();
      
      guest.foodOrders.forEach(order => {
        if (!orderIds.has(order.id)) {
          orderIds.add(order.id);
          uniqueOrders.push(order);
        }
      });
      
      guest.foodOrders = uniqueOrders;
      
      // Sort orders by date (newest first)
      guest.foodOrders.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date();
        const dateB = b.date instanceof Date ? b.date : new Date();
        return dateB - dateA;
      });
    } catch (err) {
      console.error(`Error fetching orders for guest in room ${guest.room}:`, err);
      guest.foodOrders = [];
    }
  };

  const fetchProcessedPayments = async (db) => {
    try {
      // Query for recent processed payments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const paymentsQuery = query(
        collection(db, "payments"),
        where("timestamp", ">=", thirtyDaysAgo),
        orderBy("timestamp", "desc"),
        limit(100)
      );
      
      const querySnapshot = await getDocs(paymentsQuery);
      const processedPaymentsData = [];
      
      // Process payments data
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        processedPaymentsData.push({
          id: doc.id,
          guestId: data.guestId || "",
          guestName: data.guestName || "Guest",
          roomNumber: data.roomNumber || "",
          amount: data.amount || 0,
          type: data.type || "",
          method: data.method || "",
          reference: data.reference || "",
          timestamp: parseTimestamp(data.timestamp),
          status: data.status || "Completed",
          collectedBy: data.collectedBy || "",
          emailSent: data.emailSent || false,
          guestEmail: data.guestEmail || ""
        });
      });
      
      setProcessedPayments(processedPaymentsData);
    } catch (err) {
      console.error("Error fetching processed payments:", err);
      setProcessedPayments([]);
    }
  };

  // Refresh data function to be called after payments are processed
  const refreshData = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      
      // Fetch both active guests and processed payments in parallel
      await Promise.all([
        fetchGuests(db),
        fetchProcessedPayments(db)
      ]);
      
      setLoading(false);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data. Please try again.");
      setLoading(false);
    }
  };

  // Calculate total food orders (excluding extensions)
  const calculateFoodTotal = (orders) => {
    if (!orders || !Array.isArray(orders)) return 0;
    
    return orders.filter(order => 
      order.type === "food" && 
      !(order.description && order.description.toLowerCase().includes("extension"))
    ).reduce((total, order) => total + (Number(order.amount) || 0), 0);
  };

  const calculateTotalBalance = (guest) => {
    if (!guest) return 0;
    
    const accommodationBalance = Number(guest.accommodationBalance) || 0;
    const extensionBalance = calculateExtensionTotal(guest.foodOrders);
    const foodBalance = calculateFoodTotal(guest.foodOrders);
    
    return accommodationBalance + extensionBalance + foodBalance;
  };

  // Calculate total extension charges
  const calculateExtensionTotal = (orders) => {
    if (!orders || !Array.isArray(orders)) return 0;
    
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    
    const total = extensionOrders.reduce((total, order) => total + (Number(order.amount) || 0), 0);
    return total;
  };

  // Filter guests based on search 
  const filteredGuests = guests.filter(guest => {
    const nameMatch = guest.name.toLowerCase().includes(searchTerm.toLowerCase());
    const roomMatch = guest.room.toLowerCase().includes(searchTerm.toLowerCase());
    const hasOutstandingBalance = calculateTotalBalance(guest) > 0;
  
    return (nameMatch || roomMatch) && hasOutstandingBalance;
  });

  // Filter processed payments based on search term
  const filteredPayments = processedPayments.filter(payment => 
    (payment.guestName?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) || 
    (payment.roomNumber?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) ||
    (payment.type?.toLowerCase().includes(paymentSearchTerm.toLowerCase())) ||
    (payment.method?.toLowerCase().includes(paymentSearchTerm.toLowerCase()))
  );

  // Get food orders vs extension charges
  const getFoodOnlyOrders = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    return orders.filter(order => 
      order.type === "food" && 
      !(order.description && order.description.toLowerCase().includes("extension"))
    );
  };
  
  const getExtensionOrders = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const extensionOrders = orders.filter(order => 
      order.type === "extension" || 
      (order.description && order.description.toLowerCase().includes("extension"))
    );
    
    return extensionOrders;
  };

  // Handle guest selection
  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
  };

  // Format payment type for display
  const formatPaymentType = (type) => {
    switch(type) {
      case 'accommodation':
        return 'Accommodation Balance';
      case 'food':
        return 'Food & Beverage';
      case 'extension':
        return 'Stay Extension';
      default:
        return type;
    }
  };

  // Handle payment
  const handlePayment = (type) => {
    if (!selectedGuest) return;
    
    let amount = 0;
    
    switch(type) {
      case 'accommodation':
        amount = selectedGuest.accommodationBalance;
        break;
      case 'food':
        amount = calculateFoodTotal(selectedGuest.foodOrders);
        break;
      case 'extension':
        amount = calculateExtensionTotal(selectedGuest.foodOrders);
        break;
      default:
        amount = 0;
    }
    
    if (amount <= 0) {
      alert("No outstanding balance to pay");
      return;
    }
    
    setPaymentType(type);
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePaymentComplete = async (type, paymentDetails) => {
    const db = getFirestore();
    const batch = writeBatch(db);
    
    try {
      const paymentData = {
        guestId: selectedGuest.id,
        guestName: selectedGuest.name,
        userId: selectedGuest.userId,
        roomNumber: selectedGuest.room,
        amount: paymentAmount,
        type: type,
        method: paymentDetails.method,
        reference: paymentDetails.reference,
        collectedBy: "Front Desk", 
        timestamp: new Date(),
        status: "Completed",
        emailSent: paymentDetails.email ? true : false,
        guestEmail: paymentDetails.email || null
      };
      
      // Add payment to Firestore
      const paymentRef = await addDoc(collection(db, "payments"), paymentData);
      console.log(`Payment recorded with ID: ${paymentRef.id}`);
      
      if (type === 'accommodation') {
        // Update booking document
        const bookingRef = doc(db, "bookings", selectedGuest.id);
        batch.update(bookingRef, {
          remainderDue: 0,
          paymentStatus: "Paid",
          lastPaymentDate: new Date(),
          lastPaymentAmount: paymentAmount,
          lastPaymentMethod: paymentDetails.method,
          lastPaymentId: paymentRef.id
        });
        
        // Update local state
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, accommodationBalance: 0, paymentStatus: "Paid"} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, accommodationBalance: 0, paymentStatus: "Paid"});
      } 
      else if (type === 'food') {
        // Mark all food orders as paid
        const foodOrders = getFoodOnlyOrders(selectedGuest.foodOrders);
        
        // Update each food order document
        for (const order of foodOrders) {
          const orderRef = doc(db, "orders", order.id);
          
          try {
            const orderDoc = await getDoc(orderRef);
            
            if (orderDoc.exists()) {
              batch.update(orderRef, {
                paid: true,
                paidDate: new Date(),
                paymentId: paymentRef.id,
                paymentMethod: paymentDetails.method
              });
              console.log(`Marked food order ${order.id} as paid`);
            } else {
              console.warn(`Order document ${order.id} does not exist, skipping update`);
            }
          } catch (err) {
            console.error(`Error checking order document ${order.id}:`, err);
          }
        }
        
        // Update local state (remove paid food orders)
        const updatedFoodOrders = selectedGuest.foodOrders.filter(order => 
          !(order.type === "food" && 
            !(order.description && order.description.toLowerCase().includes("extension")))
        );
        
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, foodOrders: updatedFoodOrders} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, foodOrders: updatedFoodOrders});
      } 
      else if (type === 'extension') {
        const extensionOrders = getExtensionOrders(selectedGuest.foodOrders);
        console.log("Processing extension payment for orders:", extensionOrders);
        
        // Get extension booking IDs to update
        const extensionBookingIds = new Set();
        const transactionIds = new Set();
        const orderIds = new Set();
        
        // Collect all the different references we need to update
        extensionOrders.forEach(order => {
          if (!order.linkedBookingId && !order.transactionId && !order.originalExtensionId) {
            orderIds.add(order.id);
          }
          
          if (order.linkedBookingId) {
            extensionBookingIds.add(order.linkedBookingId);
          }
          
          if (order.transactionId) {
            transactionIds.add(order.transactionId);
          }
        });
        
        // Update each standard order document if it exists
        for (const orderId of orderIds) {
          try {
            const orderRef = doc(db, "orders", orderId);
            const orderDoc = await getDoc(orderRef);
            
            if (orderDoc.exists()) {
              batch.update(orderRef, {
                paid: true,
                paidDate: new Date(),
                paymentId: paymentRef.id,
                paymentMethod: paymentDetails.method
              });
              console.log(`Marked order ${orderId} as paid`);
            } else {
              console.warn(`Order document ${orderId} does not exist, skipping update`);
            }
          } catch (err) {
            console.error(`Error updating order ${orderId}:`, err);
          }
        }
        
        // Update each extension booking
        for (const bookingId of extensionBookingIds) {
          try {
            const bookingRef = doc(db, "bookings", bookingId);
            const bookingDoc = await getDoc(bookingRef);
            
            if (bookingDoc.exists()) {
              batch.update(bookingRef, {
                remainderDue: 0,
                paymentStatus: "Paid",
                lastPaymentDate: new Date(),
                lastPaymentAmount: paymentAmount,
                lastPaymentMethod: paymentDetails.method,
                lastPaymentId: paymentRef.id
              });
              console.log(`Marked extension booking ${bookingId} as paid`);
            } else {
              console.warn(`Extension booking ${bookingId} does not exist, skipping update`);
            }
          } catch (err) {
            console.error(`Error updating extension booking ${bookingId}:`, err);
          }
        }
        
        // Update each transaction
        for (const transactionId of transactionIds) {
          try {
            const transactionRef = doc(db, "transactions", transactionId);
            const transactionDoc = await getDoc(transactionRef);
            
            if (transactionDoc.exists()) {
              batch.update(transactionRef, {
                paymentStatus: "Paid",
                paidDate: new Date(),
                paymentId: paymentRef.id,
                paymentMethod: paymentDetails.method
              });
              console.log(`Marked transaction ${transactionId} as paid`);
            } else {
              console.warn(`Transaction ${transactionId} does not exist, skipping update`);
            }
          } catch (err) {
            console.error(`Error updating transaction ${transactionId}:`, err);
          }
        }
        
        // Get current extension charges from booking
        const bookingRef = doc(db, "bookings", selectedGuest.id);
        const bookingDoc = await getDoc(bookingRef);
        
        if (bookingDoc.exists()) {
          const bookingData = bookingDoc.data();
          
          // Handle extension history
          if (bookingData.extensionHistory && bookingData.extensionHistory.length > 0) {
            const updatedExtensionHistory = bookingData.extensionHistory.map(extension => ({
              ...extension,
              paid: true,
              paidDate: new Date(),
              paymentId: paymentRef.id
            }));
            
            batch.update(bookingRef, {
              extensionHistory: updatedExtensionHistory
            });
            console.log("Updated extension history as paid");
          }
          
          // Handle extension charges field (if it exists)
          if (bookingData.extensionCharges && bookingData.extensionCharges.length > 0) {
            const updatedExtensionCharges = bookingData.extensionCharges.map(charge => ({
              ...charge,
              paid: true,
              paidDate: new Date(),
              paymentId: paymentRef.id
            }));
            
            batch.update(bookingRef, {
              extensionCharges: updatedExtensionCharges
            });
            console.log("Updated extension charges as paid");
          }
        }
        
        // Update local state (remove paid extension orders)
        const updatedFoodOrders = selectedGuest.foodOrders.filter(order => 
          !(order.type === "extension" || 
            (order.description && order.description.toLowerCase().includes("extension")))
        );
        
        setGuests(prevGuests => 
          prevGuests.map(guest => 
            guest.id === selectedGuest.id 
              ? {...guest, foodOrders: updatedFoodOrders} 
              : guest
          )
        );
        setSelectedGuest({...selectedGuest, foodOrders: updatedFoodOrders});
      }
      
      await batch.commit();
      
      // Add the new payment to processed payments list
      setProcessedPayments(prevPayments => [
        {
          id: paymentRef.id,
          ...paymentData,
          timestamp: new Date()
        },
        ...prevPayments
      ]);
      
      // Show success alert
      alert(`✅ Payment for ${selectedGuest.name}'s ${formatPaymentType(type)} was successful.`);
      setShowPaymentModal(false);
      
      await refreshData();
    } catch(error) {
      console.error("Error processing payment:", error);
      alert(`❌ Payment processing failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div>
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="error-container">
            <p>{error}</p>
            <button className="retry-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="bills-container">
          <div className="view-selector">
            <button 
              className={`view-button ${mainView === 'active' ? 'active' : ''}`}
              onClick={() => setMainView('active')}
            >
              Active Bills
            </button>
            <button 
              className={`view-button ${mainView === 'processed' ? 'active' : ''}`}
              onClick={() => setMainView('processed')}
            >
              Processed Payments
            </button>
          </div>

          {/* Active Bills View */}
          {mainView === 'active' && (
            <div className="bills-card">
              <div className="bills-header">
                <h2 className="bills-title">Hotel Guest Outstanding Bills</h2>
                <p className="bills-subtitle">View and manage bills for checked-in guests</p>
              </div>
              <div className="bills-content">
                <div className="layout-grid">
                  {/* Guest List Section */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search by name or room number"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    
                    <div className="guest-list">
                      {filteredGuests.length > 0 ? (
                        filteredGuests.map(guest => (
                          <div 
                            key={guest.id}
                            className={`guest-card ${selectedGuest?.id === guest.id ? 'selected' : ''}`}
                            onClick={() => handleGuestSelect(guest)}
                          >
                            <div className="guest-info">
                              <div>
                                <h3 className="guest-name">{guest.name}</h3>
                                <p className="room-info">Room {guest.room} {guest.roomName && `(${guest.roomName})`}</p>
                              </div>
                              <span className="status-badge checked-in">{guest.status}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="empty-state">No guests found</p>
                      )}
                    </div>
                  </div>

                  {/* Bill Details Section */}
                  <div>
                    {selectedGuest ? (
                      <div className="bill-details">
                        <div className="guest-header">
                          <div className="guest-header-info">
                            <div>
                              <h2 className="bills-title">{selectedGuest.name}</h2>
                              <p className="bills-subtitle">
                                Room {selectedGuest.room} {selectedGuest.roomName && `(${selectedGuest.roomName})`} | 
                                {selectedGuest.checkInDate && ` Check-in: ${formatDate(selectedGuest.checkInDate)}`}
                                {selectedGuest.checkOutDate && ` | Check-out: ${formatDate(selectedGuest.checkOutDate)}`}
                              </p>
                            </div>
                            <span className="status-badge checked-in">{selectedGuest.status}</span>
                          </div>
                        </div>
                        <div className="bills-content">
                          <div>
                            <div className="tab-nav">
                              <button 
                                onClick={() => setActiveTab('accommodation')} 
                                className={`tab-button ${activeTab === 'accommodation' ? 'active' : ''}`}
                              >
                                Accommodation Balance
                              </button>
                              <button 
                                onClick={() => setActiveTab('foodOrders')} 
                                className={`tab-button ${activeTab === 'foodOrders' ? 'active' : ''}`}
                              >
                                Food & Beverage
                              </button>
                              {getExtensionOrders(selectedGuest.foodOrders).length > 0 && (
                                <button 
                                  onClick={() => setActiveTab('extensions')} 
                                  className={`tab-button ${activeTab === 'extensions' ? 'active' : ''}`}
                                >
                                  Stay Extensions
                                </button>
                              )}
                            </div>
                            
                            {activeTab === 'accommodation' && (
                              <div className="tab-content">
                                <div className="bill-details">
                                  <div className="bills-content">
                                    <div className="charges-header">
                                      <h3 className="charges-title">Accommodation Charges</h3>
                                      <span className={`status-badge ${selectedGuest.accommodationBalance > 0 ? 'outstanding' : 'paid'}`}>
                                        {selectedGuest.paymentStatus || (selectedGuest.accommodationBalance > 0 ? "Outstanding" : "Paid")}
                                      </span>
                                    </div>
                                    
                                    <div className="charges-details">
                                      <div className="charge-item">
                                        <span>Room Type</span>
                                        <span>{selectedGuest.roomType}</span>
                                      </div>
                                      <div className="charge-item">
                                        <span>Room Category</span>
                                        <span>{selectedGuest.roomCategory}</span>
                                      </div>
                                      <div className="charge-item">
                                        <span>Number of Guests</span>
                                        <span>{selectedGuest.numberOfGuests}</span>
                                      </div>
                                      <div className="charge-item">
                                        <span>Payment Method</span>
                                        <span>{selectedGuest.paymentOption || "Not specified"}</span>
                                      </div>
                                      <div className="charge-item">
                                        <span>Original Price</span>
                                        <span>GHS{Number(selectedGuest.originalPrice).toFixed(2)}</span>
                                      </div>
                                      <div className="charge-total">
                                        <span>Remainder Due</span>
                                        <span>GHS{Number(selectedGuest.accommodationBalance).toFixed(2)}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="actions">
                                      <button 
                                        className="btn btn-primary"
                                        onClick={() => handlePayment('accommodation')}
                                        disabled={selectedGuest.accommodationBalance <= 0}
                                      >
                                        Process Payment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {activeTab === 'foodOrders' && (
                              <div className="tab-content">
                                <div className="bill-details">
                                  <div className="bills-content">
                                    <div className="charges-header">
                                      <h3 className="charges-title">Food & Beverage Charges</h3>
                                      <span className={`status-badge ${getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? 'outstanding' : 'paid'}`}>
                                        {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? "Outstanding" : "No Charges"}
                                      </span>
                                    </div>
                                    
                                    {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 ? (
                                      <div className="table-container">
                                        <table className="food-orders-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Description</th>
                                              <th>Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {getFoodOnlyOrders(selectedGuest.foodOrders).map(order => (
                                              <tr key={order.id}>
                                                <td>{formatDate(order.date)}</td>
                                                <td>{order.description}</td>
                                                <td>GHS{order.amount.toFixed(2)}</td>
                                              </tr>
                                            ))}
                                            <tr className="total-row">
                                              <td colSpan={2}>Total</td>
                                              <td>GHS{calculateFoodTotal(selectedGuest.foodOrders).toFixed(2)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="empty-state">No food or beverage charges</p>
                                    )}
                                    
                                    {getFoodOnlyOrders(selectedGuest.foodOrders).length > 0 && (
                                      <div className="actions">
                                        <button 
                                          className="btn btn-primary"
                                          onClick={() => handlePayment('food')}
                                        >
                                          Process Payment
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {activeTab === 'extensions' && (
                              <div className="tab-content">
                                <div className="bill-details">
                                  <div className="bills-content">
                                    <div className="charges-header">
                                      <h3 className="charges-title">Stay Extension Charges</h3>
                                      <span className={`status-badge outstanding`}>
                                        Outstanding
                                      </span>
                                    </div>
                                    
                                    {getExtensionOrders(selectedGuest.foodOrders).length > 0 ? (
                                      <div className="table-container">
                                        <table className="food-orders-table">
                                          <thead>
                                            <tr>
                                              <th>Date</th>
                                              <th>Description</th>
                                              <th>Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {getExtensionOrders(selectedGuest.foodOrders).map(order => (
                                              <tr key={order.id} className="extension-row">
                                                <td>{formatDate(order.date)}</td>
                                                <td>
                                                  {order.description}
                                                  {order.notes && !order.notes.toLowerCase().startsWith("transaction id") && (
                                                    <div className="order-notes">{order.notes}</div>
                                                  )}
                                                </td>
                                                <td>GHS{order.amount.toFixed(2)}</td>
                                              </tr>
                                            ))}
                                            <tr className="total-row">
                                              <td colSpan={2}>Total</td>
                                              <td>GHS{calculateExtensionTotal(selectedGuest.foodOrders).toFixed(2)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="empty-state">No stay extension charges</p>
                                    )}

                                    {getExtensionOrders(selectedGuest.foodOrders).length > 0 && (
                                      <div className="actions">
                                        <button 
                                          className="btn btn-primary"
                                          onClick={() => handlePayment('extension')}
                                        >
                                          Process Payment
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="select-guest-placeholder">
                        <div className="placeholder-content">
                          <h3 className="placeholder-title">Select a Guest</h3>
                          <p className="placeholder-description">Choose a guest from the list to view their outstanding bills</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processed Payments View */}
          {mainView === 'processed' && (
            <div className="bills-card">
              <div className="bills-header">
                <h2 className="bills-title">Processed Payments</h2>
                <p className="bills-subtitle">View recent payment transactions</p>
              </div>
              <div className="bills-content">
                <input
                  type="text"
                  placeholder="Search by guest name, room, payment type, or method"
                  value={paymentSearchTerm}
                  onChange={(e) => setPaymentSearchTerm(e.target.value)}
                  className="search-input wide"
                />
                
                {filteredPayments.length > 0 ? (
                  <div className="table-container payments-table-container">
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Guest</th>
                          <th>Room</th>
                          <th>Type</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map(payment => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.timestamp)}</td>
                            <td>{formatTime(payment.timestamp)}</td>
                            <td>{payment.guestName}</td>
                            <td>{payment.roomNumber}</td>
                            <td>{formatPaymentType(payment.type)}</td>
                            <td>{payment.method}</td>
                            <td className="amount">GHS{payment.amount.toFixed(2)}</td>
                            <td>
                              <span className={`payment-status-pill ${payment.status.toLowerCase()}`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No processed payments found for the selected criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Payment Modal */}
          <PaymentModal
            show={showPaymentModal}
            onHide={() => setShowPaymentModal(false)}
            guest={selectedGuest}
            paymentType={paymentType}
            amount={paymentAmount}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default HotelBills;