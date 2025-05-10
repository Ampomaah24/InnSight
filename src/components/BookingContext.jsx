import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the booking context
const BookingContext = createContext();

// Provider component that wraps your app and makes booking data available to any child component that calls useBooking()
export function BookingProvider({ children }) {
  // Attempt to load any existing booking data from sessionStorage
  const loadInitialState = () => {
    try {
      const savedData = sessionStorage.getItem('bookingContextData');
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error('Error loading booking data from sessionStorage:', error);
      return null;
    }
  };

  // Use the loaded data or null as initial state
  const [bookingData, setBookingData] = useState(loadInitialState);

  // Save booking data to sessionStorage whenever it changes
  useEffect(() => {
    if (bookingData) {
      try {
        sessionStorage.setItem('bookingContextData', JSON.stringify(bookingData));
      } catch (error) {
        console.error('Error saving booking data to sessionStorage:', error);
      }
    }
  }, [bookingData]);

  // Function to clear booking data
  const clearBookingData = () => {
    setBookingData(null);
    try {
      sessionStorage.removeItem('bookingContextData');
    } catch (error) {
      console.error('Error removing booking data from sessionStorage:', error);
    }
  };

  // Pass bookingData and setter functions in context value
  const contextValue = {
    bookingData,
    setBookingData,
    clearBookingData
  };

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
}

// Custom hook that can be used by components to access the booking context
export function useBooking() {
  const context = useContext(BookingContext);
  
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  
  return context;
}

export default BookingContext;