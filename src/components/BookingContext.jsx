import React, { createContext, useState, useContext, useEffect } from 'react';


const BookingContext = createContext();

// Provider component that wraps the app 
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

// Custom hook to access the booking context
export function useBooking() {
  const context = useContext(BookingContext);
  
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  
  return context;
}

export default BookingContext;