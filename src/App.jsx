import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Use direct Firebase imports instead
import { auth } from "./config/firebase"; // Make sure this path is correct

// Import all your pages
import Homepage from "./pages/Homepage";
import ServicesPage from "./pages/ServicesPage";
import SignUp from "./pages/SignUp";
import LoginPage from "./pages/LoginPage";
import CListings from "./pages/CListings";
import RoomListings from "./pages/RoomListings";
import RoomBooking from "./pages/RoomBooking";
import CBooking from "./pages/CBooking";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import CheckIn from "./pages/CheckIn";
import Rooms from "./pages/Rooms";
import BookingPage from "./pages/BookingPage";
import UserHistory from "./pages/UserHistory";
import AddExpense from "./pages/AddExpense";
import FinancialReports from "./pages/FinancialReports";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BookingConfirmation from "./pages/BookingConfirmation";
import Menu from './pages/restaurant/Menu';
import Cart from './pages/restaurant/Cart';
import Checkout from './pages/restaurant/Checkout';
import Orders from './pages/restaurant/Orders';
import Profile from './pages/Profilepage';
import AdminSettings from './pages/AdminSettings';
import Bills from './pages/Bills';
import Pickup from './pages/Pickup';
import ContactUs from "./pages/ContactUs";
import GuestBills from "./pages/GuestBills";
import SessionTimeoutWarning from "./components/SessionTimeoutWarning";

const App = () => {
  useEffect(() => {
    // Session timeout configuration
    const TIMEOUT_IN_MS = 2 * 60 * 1000; // 30 minutes
    const WARNING_IN_MS = 1 * 60 * 1000; // 1 minute warning
    
    let inactivityTimer;
    let warningTimer;
    let isAuthenticated = false;
    
    // Track user authentication status
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      isAuthenticated = !!user;
      if (user) {
        resetTimers();
      }
    });
    
    // Set up event listeners for user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // Listen for "stay logged in" action from the warning component
    document.addEventListener('sessionTimeout:stayLoggedIn', handleStayLoggedIn);
    
    // Listen for manual logout request
    document.addEventListener('sessionTimeout:logoutNow', handleLogoutNow);
    
    function handleUserActivity() {
      if (isAuthenticated) {
        resetTimers();
      }
    }
    
    function resetTimers() {
      // Clear existing timers
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
      
      // Set new timers
      warningTimer = setTimeout(showWarning, TIMEOUT_IN_MS - WARNING_IN_MS);
      inactivityTimer = setTimeout(handleSessionTimeout, TIMEOUT_IN_MS);
    }
    
    function showWarning() {
      if (isAuthenticated) {
        const warningEvent = new CustomEvent('sessionTimeout:warning', {
          detail: { timeRemaining: WARNING_IN_MS / 1000 }
        });
        document.dispatchEvent(warningEvent);
      }
    }
    
    function handleStayLoggedIn() {
      resetTimers();
    }
    
    function handleLogoutNow() {
      if (isAuthenticated) {
        logoutUser();
      }
    }
    
    async function handleSessionTimeout() {
      if (isAuthenticated) {
        logoutUser();
      }
    }
    
    async function logoutUser() {
      try {
        // Save current URL to localStorage before logout
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
          localStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        await signOut(auth);
        window.location.href = "/login?timeout=true";
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
    
    // Clean up on component unmount
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('sessionTimeout:stayLoggedIn', handleStayLoggedIn);
      document.removeEventListener('sessionTimeout:logoutNow', handleLogoutNow);
      
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
      unsubscribe();
    };
  }, []);

  return (
    <Router>
      <SessionTimeoutWarning />
      
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/conference-listings" element={<CListings />} />
        <Route path="/room-listings" element={<RoomListings />} />
        <Route path="/room-booking" element={<RoomBooking />} />
        <Route path="/conference-booking" element={<CBooking />} />
        <Route path="/admin-dashboard" element={<Dashboard />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/book-room" element={<BookingPage />} />
        <Route path="/user-history" element={<UserHistory />} />
        <Route path="/freports" element={<FinancialReports />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
        <Route path="/restaurant" element={<Menu />} />
        <Route path="/restaurant/cart" element={<Cart />} />
        <Route path="/restaurant/checkout" element={<Checkout />} />
        <Route path="/restaurant/orders" element={<Orders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/ad_settings" element={<AdminSettings />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/pickup" element={<Pickup />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/guest-bills" element={<GuestBills />} />
      </Routes>
    </Router>
  );
};

export default App;