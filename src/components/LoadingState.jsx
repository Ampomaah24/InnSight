
import React from "react";
import "../assets/styles/Finance.css";

const LoadingState = ({ message = "Loading financial data..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner-large"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingState;