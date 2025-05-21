import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import '../assets/styles/Notifications.css';

const NotificationsComponent = () => {
  const [reminders, setReminders] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const pendingReminders = await getPendingReminders();
        setReminders(pendingReminders);
      } catch (error) {
        console.error("Error fetching reminders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();

    const intervalId = setInterval(fetchReminders, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Function to get pending reminders
  const getPendingReminders = async () => {
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

  
  const handleReminderClick = async (reminderId) => {
    try {
      await markReminderAsRead(reminderId);
      setReminders(prevReminders => 
        prevReminders.filter(reminder => reminder.id !== reminderId)
      );
    } catch (error) {
      console.error("Error marking reminder as read:", error);
    }
  };


  const markReminderAsRead = async (reminderId) => {
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

 
  const handleMarkAllAsRead = async () => {
    try {
      await markAllRemindersAsRead();
      setReminders([]);
    } catch (error) {
      console.error("Error marking all reminders as read:", error);
    }
  };

  // Function to mark all reminders as read
  const markAllRemindersAsRead = async () => {
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

  // Format time until pickup
  const formatTimeUntil = (reminderData) => {
    try {
      const now = new Date();
      const pickupTime = new Date(`${reminderData.pickupDate}T${reminderData.pickupTime}`);
      const diffMs = pickupTime - now;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 0) {
        return "Overdue";
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutes`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
      }
    } catch (error) {
      return "Unknown";
    }
  };

  return (
    <div className="notifications-wrapper">
      <button 
        className={`notification-bell ${reminders.length > 0 ? 'has-notifications' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${reminders.length > 0 ? `(${reminders.length} unread)` : ''}`}
      >
        <i className="notification-icon">🔔</i>
        {reminders.length > 0 && (
          <span className="notification-badge">{reminders.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Pickup Reminders</h3>
            {reminders.length > 0 && (
              <button 
                className="mark-all-read" 
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notifications-content">
            {loading ? (
              <div className="loading-spinner-small"></div>
            ) : reminders.length === 0 ? (
              <div className="empty-notifications">
                <p>No pending pickup reminders</p>
              </div>
            ) : (
              <ul className="reminders-list">
                {reminders.map(reminder => (
                  <li 
                    key={reminder.id} 
                    className="reminder-item"
                    onClick={() => handleReminderClick(reminder.id)}
                  >
                    <div className="reminder-time-badge">
                      {formatTimeUntil(reminder)}
                    </div>
                    <div className="reminder-content">
                      <h4>Airport Pickup Reminder</h4>
                      <p><strong>{reminder.firstName} {reminder.lastName}</strong></p>
                      <p>Flight: {reminder.flightNumber || "N/A"}</p>
                      <p>Time: {reminder.pickupTime}</p>
                      <p>Location: {reminder.airportLocation}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsComponent;