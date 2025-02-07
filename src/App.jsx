import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage"; // Import Homepage
import ServicesPage from "./pages/ServicesPage"; // Import Services Page
import SignUp from "./pages/SignUp"; // Import Sign Up Page

import CListings from "./pages/CListings"; // Import Conference Listings Page

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} /> {/* Homepage as default route */}
        <Route path="/services" element={<ServicesPage />} /> {/* Services Page */}
        <Route path="/signup" element={<SignUp />} /> {/* Sign Up Page */}
     
        <Route path="/conference-listings" element={<CListings />} /> {/* Conference Listings Page */}
      </Routes>
    </Router>
  );
};

export default App;
