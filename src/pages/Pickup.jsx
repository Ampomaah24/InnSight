import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, limit, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import NotificationsComponent from "../components/Notification";
import "../assets/styles/Dashboard.css";
import "../assets/styles/Pickup.css";

// Date utility functions
const dateUtils = {
  /**
   * Parse a date string and time string into a Date object
   */
  parseDateTime: (dateStr, timeStr) => {
    try {
      // Handle different time formats
      let hours = 0;
      let minutes = 0;
      
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        // Parse "12:30 PM" format
        const timeParts = timeStr.replace(/ /g, '').match(/(\d+):(\d+)(AM|PM)/i);
        if (timeParts) {
          hours = parseInt(timeParts[1]);
          minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
        }
      } else {
        // Parse "14:30" format (24-hour)
        const [hoursStr, minutesStr] = timeStr.split(':');
        hours = parseInt(hoursStr);
        minutes = parseInt(minutesStr);
      }
      
      // Handle different date formats
      let year, month, day;
      
      if (dateStr.includes('-')) {
        // Parse YYYY-MM-DD format
        [year, month, day] = dateStr.split('-').map(num => parseInt(num));
        month = month - 1; // JavaScript months are 0-indexed
      } else if (dateStr.includes(',')) {
        // Parse "Thu, May 1" format
        const dateParts = dateStr.split(',')[1].trim().split(' ');
        const monthName = dateParts[0];
        day = parseInt(dateParts[1]);
        
        // Convert month name to number
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        month = months[monthName] || 0;
        
        // Use current year if year is not specified
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        
        year = currentDate.getFullYear();
        // If the month is earlier than current month and day is earlier than current day,
        // it's probably for next year
        if ((month < currentMonth) || 
            (month === currentMonth && day < currentDate.getDate())) {
          year++;
        }
      } else {
        // Default to today if unparseable
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
        day = now.getDate();
      }
      
      return new Date(year, month, day, hours, minutes);
    } catch (error) {
      console.error('Error parsing date/time:', error, { dateStr, timeStr });
      return new Date(); // Fallback to current date
    }
  },
  
  /**
   * Format a date for display
   */
  formatDate: (dateStr) => {
    try {
      const date = new Date(dateStr);
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      console.error('Invalid date format:', e);
      return "Invalid date";
    }
  },
  
  /**
   * Format a time for display
   */
  formatTime: (timeStr) => {
    try {
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        return timeStr; // Already properly formatted
      }
      
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    } catch (e) {
      console.error('Invalid time format:', e);
      return "Invalid time";
    }
  },
  
  /**
   * Get pickup status based on date/time
   */
  getPickupStatus: (pickupDate, pickupTime) => {
    try {
      const now = new Date();
      const pickup = dateUtils.parseDateTime(pickupDate, pickupTime);
      
      if (pickup < now) {
        return "completed";
      } else {
        return "upcoming";
      }
    } catch (e) {
      console.error('Error in getPickupStatus:', e);
      return "unknown";
    }
  },
  
  /**
   * Get reminder status with timing details
   */
  getReminderStatus: (pickupDate, pickupTime) => {
    try {
      const now = new Date();
      const pickup = dateUtils.parseDateTime(pickupDate, pickupTime);
      
      const diffMs = pickup - now;
      const diffHrs = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (diffHrs < 0) return "past";
      if (diffHrs <= 1) return "1hr";
      if (diffDays <= 1) return "1day";
      if (diffDays <= 3) return "3days";
      return "upcoming";
    } catch (e) {
      console.error('Error in getReminderStatus:', e);
      return "unknown";
    }
  }
};

// Reminder service functions
const reminderService = {
  /**
   * Check for upcoming pickups and create reminders
   */
  checkForUpcomingPickups: async () => {
    try {
      // Get current time
      const now = new Date();
      
      // Get all pickups from both collections
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
          
          // Calculate time difference in minutes
          const diffMs = pickupTime - now;
          const diffMinutes = diffMs / (1000 * 60);
          
          // Check if pickup is between 55-65 minutes away (to avoid duplicate reminders)
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
      
      // Process transactions
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
          
          // Check if pickup is between 55-65 minutes away
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
      
      // Add reminders to the reminders collection
      const remindersRef = collection(db, "reminders");
      
      // Check for existing reminders to avoid duplicates
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
          
          // Browser notification if supported
          if (Notification.permission === "granted") {
            new Notification("Upcoming Airport Pickup", {
              body: `Pickup for ${reminder.firstName} ${reminder.lastName} in 1 hour`,
              icon: "/favicon.ico"
            });
          }
        }
      }
      
      return remindersToCreate.length;
    } catch (error) {
      console.error("Error checking for upcoming pickups:", error);
      throw error;
    }
  },
  
  /**
   * Get pending reminders
   */
  getPendingReminders: async () => {
    try {
      const remindersRef = collection(db, "reminders");
      const remindersQuery = query(
        remindersRef,
        where("status", "==", "pending"),
        where("created", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
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
  },
  
  /**
   * Mark a reminder as read
   */
  markReminderAsRead: async (reminderId) => {
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
  },
  
  /**
   * Mark all reminders as read
   */
  markAllRemindersAsRead: async () => {
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
      return pendingSnapshot.size; // Number of reminders updated
    } catch (error) {
      console.error("Error marking all reminders as read:", error);
      throw error;
    }
  }
};

// Component for the header section
const PickupHeader = ({ upcomingCount, urgentCount }) => (
  <div className="dashboard-header">
    <h1 className="dashboard-title">Airport Pickup Schedule</h1>
    <div className="summary-stats">
      <div className="stat-item">
        <span className="stat-number">{upcomingCount}</span>
        <span className="stat-label">Upcoming</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">{urgentCount}</span>
        <span className="stat-label">Urgent</span>
      </div>
    </div>
  </div>
);

// Component for search and filter controls
const PickupControls = ({ searchTerm, setSearchTerm, filter, setFilter }) => (
  <div className="pickup-controls">
    <div className="search-container">
      <input
        type="text"
        placeholder="Search by name, flight number..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
        aria-label="Search pickups"
      />
    </div>
    <div className="filter-container" role="tablist">
      <button 
        className={`filter-btn ${filter === "all" ? "active" : ""}`}
        onClick={() => setFilter("all")}
        role="tab"
        aria-selected={filter === "all"}
      >
        All
      </button>
      <button 
        className={`filter-btn ${filter === "upcoming" ? "active" : ""}`}
        onClick={() => setFilter("upcoming")}
        role="tab"
        aria-selected={filter === "upcoming"}
      >
        Upcoming
      </button>
      <button 
        className={`filter-btn ${filter === "past" ? "active" : ""}`}
        onClick={() => setFilter("past")}
        role="tab"
        aria-selected={filter === "past"}
      >
        Past
      </button>
    </div>
  </div>
);

// Loading state component
const LoadingState = () => (
  <div className="loading-state" role="status" aria-live="polite">
    <div className="loading-spinner" aria-hidden="true"></div>
    <p>Loading pickup schedule...</p>
  </div>
);

// Empty state component
const EmptyState = ({ filter, searchTerm }) => (
  <div className="empty-state">
    <div className="empty-icon" aria-hidden="true">🚗</div>
    <p>No pickups {filter === "upcoming" ? "scheduled" : filter === "past" ? "completed" : "found"}.</p>
    {searchTerm && <p className="empty-sub">Try adjusting your search term.</p>}
  </div>
);

// Error state component
const ErrorState = ({ error, retry }) => (
  <div className="error-state" role="alert">
    <div className="error-icon">⚠️</div>
    <p>There was an error loading the pickup schedule.</p>
    <button className="retry-btn" onClick={retry}>Retry</button>
  </div>
);

// Pickup table component
const PickupTable = ({ pickups }) => (
  <div className="table-container">
    <table className="pickup-table" aria-label="Airport pickup schedule">
      <thead>
        <tr>
          <th scope="col">Guest</th>
          <th scope="col">Pickup Date</th>
          <th scope="col">Pickup Time</th>
          <th scope="col">Flight Number</th>
          <th scope="col">Location</th>
          <th scope="col">Source</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {pickups.map((pickup, idx) => {
          const { firstName, lastName, pickupDetails, source } = pickup;
          const reminder = dateUtils.getReminderStatus(pickupDetails.pickupDate, pickupDetails.pickupTime);
          return (
            <tr key={pickup.id || idx} className={reminder === "past" ? "past-pickup" : ""}>
              <td className="guest-cell">
                <div className="guest-name">{firstName} {lastName}</div>
                {pickup.email && <div className="guest-email">{pickup.email}</div>}
              </td>
              <td>{dateUtils.formatDate(pickupDetails.pickupDate)}</td>
              <td>{dateUtils.formatTime(pickupDetails.pickupTime)}</td>
              <td className="flight-cell">
                <span className="flight-number">{pickupDetails.flightNumber || "N/A"}</span>
              </td>
              <td>{pickupDetails.airportLocation || "N/A"}</td>
              <td><span className={`source-badge ${source}`}>{source === "booking" ? "Booking" : "Transaction"}</span></td>
              <td>
                {reminder === "past" && <span className="reminder-badge gray">Completed</span>}
                {reminder === "1hr" && <span className="reminder-badge red">Within 1 Hour</span>}
                {reminder === "1day" && <span className="reminder-badge orange">Within 24 Hours</span>}
                {reminder === "3days" && <span className="reminder-badge yellow">Within 3 Days</span>}
                {reminder === "upcoming" && <span className="reminder-badge blue">Upcoming</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// Custom hook for fetching pickup data
const usePickupData = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchPickupBookings = useCallback(async (recordLimit = 100) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from bookings collection with limit
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(
        bookingsRef, 
        where("airportPickup", "==", "Yes"),
        orderBy("pickupDetails.pickupDate", "asc"),
        limit(recordLimit)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const bookingPickups = [];
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.pickupDetails) {
          // Add status calculation
          const status = dateUtils.getPickupStatus(
            data.pickupDetails.pickupDate, 
            data.pickupDetails.pickupTime
          );
          bookingPickups.push({ 
            id: doc.id, 
            source: "booking",
            ...data, 
            status 
          });
        }
      });
      
      // Fetch from transactions collection with limit
      const transactionsRef = collection(db, "transactions");
      const transactionsQuery = query(
        transactionsRef, 
        where("airportPickup", "==", "Yes"),
        orderBy("pickupDetails.pickupDate", "asc"),
        limit(recordLimit)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      const transactionPickups = [];
      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.pickupDetails) {
          // Add status calculation
          const status = dateUtils.getPickupStatus(
            data.pickupDetails.pickupDate, 
            data.pickupDetails.pickupTime
          );
          transactionPickups.push({ 
            id: doc.id, 
            source: "transaction",
            ...data, 
            status 
          });
        }
      });
      
      // Combine both collections
      const allPickups = [...bookingPickups, ...transactionPickups];
      
      // Sort by pickup date and time
      allPickups.sort((a, b) => {
        try {
          const dateA = dateUtils.parseDateTime(
            a.pickupDetails.pickupDate, 
            a.pickupDetails.pickupTime
          );
          const dateB = dateUtils.parseDateTime(
            b.pickupDetails.pickupDate, 
            b.pickupDetails.pickupTime
          );
          return dateA - dateB;
        } catch (error) {
          console.error("Error sorting dates:", error);
          return 0;
        }
      });
      
      setPickups(allPickups);
    } catch (error) {
      console.error("Error fetching airport pickups:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pickups,
    loading,
    error,
    fetchPickupBookings
  };
};

// Main component
const AdminPickupTracker = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // For triggering refreshes
  
  const { pickups, loading, error, fetchPickupBookings } = usePickupData();
  
  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    fetchPickupBookings();
    
    // Set up refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      setRefreshKey(prevKey => prevKey + 1);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchPickupBookings, refreshKey]);
  
  // Set up the reminder checker (runs every minute)
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const newRemindersCount = await reminderService.checkForUpcomingPickups();
        if (newRemindersCount > 0) {
          console.log(`Created ${newRemindersCount} new pickup reminders`);
        }
      } catch (error) {
        console.error("Error checking for reminders:", error);
      }
    };
    
    // Run immediately and then set interval
    checkReminders();
    const intervalId = setInterval(checkReminders, 60 * 1000); // Every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Prepare filtered data
  const filteredPickups = pickups.filter(pickup => {
    const reminder = dateUtils.getReminderStatus(
      pickup.pickupDetails.pickupDate, 
      pickup.pickupDetails.pickupTime
    );
    
    // Apply filter
    if (filter === "upcoming" && reminder === "past") return false;
    if (filter === "past" && reminder !== "past") return false;
    
    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        pickup.firstName?.toLowerCase().includes(searchLower) ||
        pickup.lastName?.toLowerCase().includes(searchLower) ||
        pickup.pickupDetails.flightNumber?.toLowerCase().includes(searchLower) ||
        pickup.pickupDetails.airportLocation?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  // Calculate stats
  const upcomingCount = pickups.filter(p => {
    const status = dateUtils.getReminderStatus(
      p.pickupDetails.pickupDate, 
      p.pickupDetails.pickupTime
    );
    return status !== "past";
  }).length;
  
  const urgentCount = pickups.filter(p => {
    const status = dateUtils.getReminderStatus(
      p.pickupDetails.pickupDate, 
      p.pickupDetails.pickupTime
    );
    return status === "1hr" || status === "1day";
  }).length;

  // Render
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">

        
        <PickupHeader upcomingCount={upcomingCount} urgentCount={urgentCount} />
        
        <PickupControls 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm}
          filter={filter}
          setFilter={setFilter}
        />
        
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState 
            error={error} 
            retry={() => setRefreshKey(prevKey => prevKey + 1)} 
          />
        ) : filteredPickups.length === 0 ? (
          <EmptyState filter={filter} searchTerm={searchTerm} />
        ) : (
          <PickupTable pickups={filteredPickups} />
        )}
      </div>
    </div>
  );
};

export default AdminPickupTracker;