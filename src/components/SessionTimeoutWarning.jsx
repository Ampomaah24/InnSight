import React, { useEffect, useState, useCallback } from "react";
import "./SessionTimeoutWarning.css";

const SessionTimeoutWarning = () => {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  
  const handleWarning = useCallback((event) => {
    setCountdown(event.detail.timeRemaining);
    setVisible(true);
  }, []);
  
  // Set up event listeners
  useEffect(() => {
    document.addEventListener('sessionTimeout:warning', handleWarning);
    
    return () => {
      document.removeEventListener('sessionTimeout:warning', handleWarning);
    };
  }, [handleWarning]);

  useEffect(() => {
    let interval;
    
    if (visible && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setVisible(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, countdown]);
  

  const handleStayLoggedIn = () => {
    const stayLoggedInEvent = new CustomEvent('sessionTimeout:stayLoggedIn');
    document.dispatchEvent(stayLoggedInEvent);
    setVisible(false);
  };

  const handleLogoutNow = () => {
    const logoutNowEvent = new CustomEvent('sessionTimeout:logoutNow');
    document.dispatchEvent(logoutNowEvent);
    setVisible(false);
  };
  
  if (!visible) return null;
  
  return (
    <div className="session-timeout-warning">
      <div className="warning-box">
        <h3>Session Timeout Warning</h3>
        <p>
          You have been inactive for a while. For security reasons, your session will expire in{' '}
          <span className="countdown">
            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </span>
        </p>
        <p>Would you like to stay logged in?</p>
        <div className="button-group">
          <button 
            className="primary-button" 
            onClick={handleStayLoggedIn}
          >
            Stay Logged In
          </button>
          <button 
            className="secondary-button" 
            onClick={handleLogoutNow}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;