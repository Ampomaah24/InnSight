import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext.jsx";
import { BookingProvider } from "./components/BookingContext.jsx";
import SessionTimeoutService from "./services/SessionTimeoutService"; 
import SessionTimeoutWarning from "./components/SessionTimeoutWarning";

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
import RoomManagement from "./pages/RoomManagement";
import UserRegistration from './pages/UserRegistration';
import BookingHistory from './pages/BookingHistory';

const App = () => {
  useEffect(() => {
    // Initialize the SessionTimeoutService with custom values (20 minutes timeout, 1 minute warning)
    const sessionTimeoutService = new SessionTimeoutService(20, 1);
    
    // Store a reference to the service instance for cleanup
    const serviceInstance = sessionTimeoutService;
    
    // Clean up on component unmount
    return () => {
      // Call the clearTimeouts method directly from the instance
      if (serviceInstance) {
        serviceInstance.clearTimeouts();
        
        // If you have a destroy method from our updated service, call it
        if (typeof serviceInstance.destroy === 'function') {
          serviceInstance.destroy();
        }
      }
    };
  }, []);

  return (
    <UserProvider>
      <BookingProvider>
        <Router>
          {/* The SessionTimeoutWarning component should be rendered here */}
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
            <Route path="/room-management" element={<RoomManagement />} />
            <Route path="/user-registration" element={<UserRegistration />} />
            <Route path="/booking-history" element={<BookingHistory />} />
          </Routes>
        </Router>
      </BookingProvider>
    </UserProvider>
  );
};

export default App;