import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage"; // Import Homepage
import ServicesPage from "./pages/ServicesPage"; // Import Services Page
import SignUp from "./pages/SignUp"; // Import Sign Up Page
import LoginPage from "./pages/LoginPage"; // Import Login Page
import CListings from "./pages/CListings"; // Import Conference Listings Page
import RoomListings from "./pages/RoomListings"; // Import Conference Listings Page
import RoomBooking from "./pages/RoomBooking"; // Import Room Booking Page
import CBooking from "./pages/CBooking"; // Import Conference Booking Page
import Dashboard from "./pages/Dashboard"; // Import Conference Booking Page
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
import Profile from './pages/ProfilePage';
import AdminSettings from './pages/AdminSettings';
import Bills from './pages/Bills';
import Pickup from './pages/Pickup';
import ContactUs from "./pages/ContactUs";
import GuestBills from "./pages/GuestBills";





const App = () => {
  return (
    <Router>
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
