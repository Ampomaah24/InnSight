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
import Reports from "./pages/Reports";
import BookingPage from "./pages/BookingPage";
import UserHistory from "./pages/UserHistory"; 
import AddExpense from "./pages/AddExpense";
import FinancialReports from "./pages/FinancialReports"; 
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BookingConfirmation from "./pages/BookingConfirmation";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} /> {/* Homepage as default route */}
        <Route path="/services" element={<ServicesPage />} /> {/* Services Page */}
        <Route path="/signup" element={<SignUp />} /> {/* Sign Up Page */}
        <Route path="/login" element={<LoginPage />} /> {/* Login Page */}
        <Route path="/conference-listings" element={<CListings />} /> {/* Conference Listings Page */}
        <Route path="/room-listings" element={<RoomListings />} /> {/* Room Listings Page */}
        <Route path="/room-booking" element={<RoomBooking />} /> {/* Room Booking Page */}
        <Route path="/conference-booking" element={<CBooking />} /> {/* Conference Booking Page */}
        <Route path="/admin-dashboard" element={<Dashboard />} /> {/* Conference Booking Page */}
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/book-room" element={<BookingPage />} /> {/* Add this */}
        <Route path="/user-history" element={<UserHistory />} />
        <Route path="/freports" element={<FinancialReports />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />


      </Routes>
    </Router>
  );
};

export default App;
