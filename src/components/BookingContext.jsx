import React, { createContext, useState, useEffect, useContext } from "react";

// Create the context
export const BookingContext = createContext();

// Create a provider component
export const BookingProvider = ({ children }) => {
  // Initialize state, potentially from sessionStorage
  const [bookingData, setBookingData] = useState(() => {
    const savedData = sessionStorage.getItem('bookingData');
    return savedData ? JSON.parse(savedData) : null;
  });

  // Update sessionStorage whenever bookingData changes
  useEffect(() => {
    if (bookingData) {
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    } else {
      sessionStorage.removeItem('bookingData');
    }
  }, [bookingData]);

  // Clear booking data function
  const clearBookingData = () => {
    sessionStorage.removeItem('bookingData');
    setBookingData(null);
  };

  return (
    <BookingContext.Provider value={{ bookingData, setBookingData, clearBookingData }}>
      {children}
    </BookingContext.Provider>
  );
};

// Custom hook for easier usage
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};