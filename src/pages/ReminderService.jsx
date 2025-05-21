import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { dateUtils } from "./dateUtils"; 

// Function to check for upcoming pickups and create reminders
export const checkForUpcomingPickups = async () => {
  try {

    const now = new Date();

    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(
      bookingsRef, 
      where("airportPickup", "==", "Yes")
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const transactionsRef = collection(db, "transactions");
    const transactionsQuery = query(
      transactionsRef, 
      where("airportPickup", "==", "Yes")
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    // Process bookings
    const remindersToCreate = [];
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      if (booking.pickupDetails) {
        const pickupTime = dateUtils.parseDateTime(
          booking.pickupDetails.pickupDate, 
          booking.pickupDetails.pickupTime
        );
        

        const diffMs = pickupTime - now;
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 55 && diffMinutes <= 65) {
          remindersToCreate.push({
            sourceId: doc.id,
            sourceType: "booking",
            firstName: booking.firstName,
            lastName: booking.lastName,
            pickupDate: booking.pickupDetails.pickupDate,
            pickupTime: booking.pickupDetails.pickupTime,
            flightNumber: booking.pickupDetails.flightNumber,
            airportLocation: booking.pickupDetails.airportLocation,
            reminderType: "1hour",
            created: new Date(),
            status: "pending"
          });
        }
      }
    });
    
    transactionsSnapshot.forEach(doc => {
      const transaction = doc.data();
      if (transaction.pickupDetails) {
        const pickupTime = dateUtils.parseDateTime(
          transaction.pickupDetails.pickupDate, 
          transaction.pickupDetails.pickupTime
        );
        
        // Calculate time difference in minutes
        const diffMs = pickupTime - now;
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes >= 55 && diffMinutes <= 65) {
          remindersToCreate.push({
            sourceId: doc.id,
            sourceType: "transaction",
            firstName: transaction.firstName,
            lastName: transaction.lastName,
            pickupDate: transaction.pickupDetails.pickupDate,
            pickupTime: transaction.pickupDetails.pickupTime,
            flightNumber: transaction.pickupDetails.flightNumber,
            airportLocation: transaction.pickupDetails.airportLocation,
            reminderType: "1hour",
            created: new Date(),
            status: "pending"
          });
        }
      }
    });
    
    // Add reminders to the reminders collection in db
    const remindersRef = collection(db, "reminders");
    
    for (const reminder of remindersToCreate) {
      const existingQuery = query(
        remindersRef,
        where("sourceId", "==", reminder.sourceId),
        where("reminderType", "==", reminder.reminderType),
        where("status", "==", "pending")
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        await addDoc(remindersRef, reminder);
        console.log(`Created 1-hour reminder for ${reminder.firstName} ${reminder.lastName}'s pickup`);
        await sendReminderEmail(reminder);
      }
    }
    
    return remindersToCreate.length;
  } catch (error) {
    console.error("Error checking for upcoming pickups:", error);
    throw error;
  }
};

// Function to send reminder email 
const sendReminderEmail = async (reminderData) => {
  try {
    console.log(`Would send email reminder for pickup: ${reminderData.firstName} ${reminderData.lastName}`);
  
    return true;
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return false;
  }
};


export const getPendingReminders = async () => {
  try {
    const remindersRef = collection(db, "reminders");
    const remindersQuery = query(
      remindersRef,
      where("status", "==", "pending"),
      where("created", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)) 
    );
    
    const remindersSnapshot = await getDocs(remindersQuery);
    const reminders = [];
    
    remindersSnapshot.forEach(doc => {
      reminders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return reminders;
  } catch (error) {
    console.error("Error getting pending reminders:", error);
    throw error;
  }
};


export const markReminderAsRead = async (reminderId) => {
  try {
    const reminderRef = doc(db, "reminders", reminderId);
    await updateDoc(reminderRef, {
      status: "read",
      readAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Error marking reminder as read:", error);
    throw error;
  }
};


export const markAllRemindersAsRead = async () => {
  try {
    const remindersRef = collection(db, "reminders");
    const pendingQuery = query(
      remindersRef,
      where("status", "==", "pending")
    );
    
    const pendingSnapshot = await getDocs(pendingQuery);
    const updatePromises = [];
    
    pendingSnapshot.forEach(document => {
      const reminderRef = doc(db, "reminders", document.id);
      updatePromises.push(
        updateDoc(reminderRef, {
          status: "read",
          readAt: new Date()
        })
      );
    });
    
    await Promise.all(updatePromises);
    return pendingSnapshot.size; 
  } catch (error) {
    console.error("Error marking all reminders as read:", error);
    throw error;
  }
};