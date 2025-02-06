
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage"; // Import Homepage

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} /> {/* Homepage as default route */}
      </Routes>
    </Router>
  );
};

export default App;