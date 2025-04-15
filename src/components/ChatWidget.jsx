import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import "../assets/styles/ChatWidget.css";

// Error message mapping
const ERROR_MESSAGES = {
  "ERR_MODEL_UNAVAILABLE": "I'm currently unable to process your request due to a technical issue. Please try again later.",
  "ERR_INTENT_UNKNOWN": "I'm not sure I understand your request. Could you rephrase that?",
  "ERR_MISSING_ENTITY": "I need more information to process your request.",
  "ERR_API_TIMEOUT": "I'm experiencing a delay in processing your request. Please try again.",
  "ERR_SERVER_ERROR": "There seems to be a technical issue. Our team has been notified.",
  "ERR_BOOKING_NOT_FOUND": "I couldn't find a booking with the information provided.",
  "ERR_BOOKING_CONFLICT": "There seems to be a conflict with the booking details.",
  "default": "Something went wrong. Please try again or contact our support team."
};

//
const mapRoomTypeToDatabase = (roomType) => {
  const roomTypeMap = {
    "double bed": "Double bed",
    "twin bed": "Twin bed",
    "single bed": "Single bed",
    // Add any other variations here
  };
  
  // Convert to lowercase for comparison
  const normalizedType = roomType.toLowerCase();
  
  // Return the mapped value or the original if theres no match
  return roomTypeMap[normalizedType] || roomType;
};

// Then use this function in your queries:


const ChatWidget = () => {
  const navigate = useNavigate();
  
  // State variables
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const messagesEndRef = useRef(null);

  // Initialize chatbot with welcome message
  useEffect(() => {
    setMessages([
      {
        text: "Hello! I'm the InnSight Hotel assistant. How can I help you today? You can ask about room availability, make bookings, inquire about our services, or ask about check-in times, WiFi, breakfast, and more.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom of chat messages
  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, chatOpen]);

  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle toggling the chat window
  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  // Handle input change for chat
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return; // Prevent empty messages
    
    // Add user message to chat
    const userMessage = {
      text: input,
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input field
    setIsLoading(true); // Start loading
    
    try {
      // Call NLU API to process message
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }
      
      const data = await response.json();
      console.log("NLU Response:", data); // Log for debugging
      
      // Reset consecutive errors counter on success
      setConsecutiveErrors(0);
      
      // Process the response data
      handleNLUResponse(data);
      
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Increment consecutive errors counter
      setConsecutiveErrors(prev => prev + 1);
      
      // Add error message to chat
      const errorMessage = consecutiveErrors >= 2 
        ? "I'm having trouble understanding. Would you like to speak with a human agent?"
        : "Sorry, I'm having difficulty processing your request right now. Could you try again or rephrase your question?";
      
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      
      // If multiple consecutive errors, add option to contact support
      if (consecutiveErrors >= 2) {
        setMessages((prev) => [
          ...prev,
          {
            text: "Contact Support",
            sender: "bot",
            isButton: true,
            onClick: () => navigate("/contact"),
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false); // End loading
    }
  };

  // Process the NLU API response
  const handleNLUResponse = (data) => {
    // Check for error in response
    if (data.error) {
      const errorCode = data.error.code || "default";
      const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
      
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      return;
    }
    
    // Add the bot's text response from response data
    if (data.response && data.response.text) {
      setMessages((prev) => [
        ...prev,
        {
          text: data.response.text,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      
      // Add any action buttons from the response
      if (data.response.actions && Array.isArray(data.response.actions)) {
        data.response.actions.forEach(action => {
          setMessages((prev) => [
            ...prev,
            {
              text: action.text,
              sender: "bot",
              isButton: true,
              onClick: () => handleResponseAction(action, data.entities),
              timestamp: new Date(),
            },
          ]);
        });
      }
    } else {
      // This is a fallback in case the response format is unexpected
      setMessages((prev) => [
        ...prev,
        {
          text: "I received your message but I'm not sure how to respond. Could you try asking in a different way?",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle button actions from the response
  const handleResponseAction = async (action, entities) => {
    switch (action.action) {
      case "book_room":
        // Get the data from the action
        const { check_in, check_out, room_type } = action.data;
        
        try {
          // Query for available rooms
          const roomsRef = collection(db, "rooms");
          const roomQuery = query(roomsRef, where("t_room", "==", mapRoomTypeToDatabase(room_type)));
          const roomSnapshot = await getDocs(roomQuery);
          
          // Find an available room
          let selectedRoom = null;
          roomSnapshot.forEach((doc) => {
            if (!selectedRoom) {
              selectedRoom = {
                id: doc.id,
                ...doc.data(),
                t_room: room_type,
                name: `${room_type} Room`
              };
            }
          });
          
          // If no room found, create a placeholder
          if (!selectedRoom) {
            selectedRoom = {
              id: "room-" + Math.floor(Math.random() * 1000),
              t_room: room_type,
              price: 150, // placeholder price
              name: `${room_type} Room`,
            };
          }
          
          // Navigate to booking page
          proceedToBooking(check_in, check_out, room_type, selectedRoom);
        } catch (error) {
          console.error("Error finding room:", error);
          
          setMessages((prev) => [
            ...prev,
            {
              text: "I'm having trouble finding available rooms. Let me connect you with our booking team.",
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
        }
        break;
        
      case "check_availability":
        // Show a message about checking availability
        setMessages((prev) => [
          ...prev,
          {
            text: "I'm checking room availability for you...",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        
        // Extract data from action
        const availData = action.data;
        
        try {
          // Query for available rooms
          const roomsRef = collection(db, "rooms");
          const roomQuery = query(roomsRef, where("t_room", "==", availData.room_type.toLowerCase()));
          const roomSnapshot = await getDocs(roomQuery);
          
          if (roomSnapshot.empty) {
            setMessages((prev) => [
              ...prev,
              {
                text: `I'm sorry, but it seems we don't have any ${availData.room_type} rooms available for your requested dates. Would you like to check a different room type or dates?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                text: `Good news! We have ${availData.room_type} rooms available from ${availData.check_in} to ${availData.check_out}. Would you like to book now?`,
                sender: "bot",
                timestamp: new Date(),
              },
              {
                text: "Book Now",
                sender: "bot",
                isButton: true,
                onClick: () => handleResponseAction({
                  action: "book_room",
                  data: availData
                }, {}),
                timestamp: new Date(),
              }
            ]);
          }
        } catch (error) {
          console.error("Error checking availability:", error);
          setMessages((prev) => [
            ...prev,
            {
              text: "I encountered an issue while checking availability. Please try again or contact our reception directly.",
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
        }
        break;
        
      case "modify_booking":
        // Data should include booking_id and possibly changes
        if (action.data && action.data.booking_id) {
          setMessages((prev) => [
            ...prev,
            {
              text: `I'm processing the modifications for booking ${action.data.booking_id}. You'll receive a confirmation shortly.`,
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
          
          // Navigate to modify booking page
          navigate(`/modify-booking/${action.data.booking_id}`);
        } else {
          // Ask for booking ID
          setMessages((prev) => [
            ...prev,
            {
              text: "To modify your booking, I'll need your booking ID and last name. Could you provide these details?",
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
        }
        break;
        
      case "cancel_booking":
        // Data should include booking_id 
        if (action.data && action.data.booking_id) {
          setMessages((prev) => [
            ...prev,
            {
              text: `I'm processing the cancellation for booking ${action.data.booking_id}. You'll receive a confirmation shortly.`,
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
          
          // Navigate to cancel booking page
          navigate(`/cancel-booking/${action.data.booking_id}`);
        } else {
          // Ask for booking ID
          setMessages((prev) => [
            ...prev,
            {
              text: "To cancel your booking, I'll need your booking ID and last name. Could you provide these details?",
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
        }
        break;
        
      case "login":
        navigate("/login");
        break;
        
      case "view_bookings":
        navigate("/user-history");
        break;
        
      default:
        console.log("Unknown action type:", action.action);
        setMessages((prev) => [
          ...prev,
          {
            text: "I'm not sure how to process that action. Let me connect you with our support team.",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
    }
  };

  // Proceed to booking page with extracted information
  const proceedToBooking = (checkIn, checkOut, roomType, room) => {
    // Prepare selected room data
    const selectedRooms = [{
      id: room.id,
      t_room: roomType,
      price: room.price || 150, // Use room price or default
      name: `${roomType} Room`,
    }];
    
    // Create query params
    const queryParams = new URLSearchParams({
      rooms: encodeURIComponent(JSON.stringify(selectedRooms)),
      checkIn: encodeURIComponent(checkIn),
      checkOut: encodeURIComponent(checkOut),
    }).toString();
    
    // Navigate to booking page with parameters
    navigate(`/book-room?${queryParams}`);
  };

  // Render loading indicator for chat
  const renderLoading = () => {
    if (!isLoading) return null;
    
    return (
      <div className="chat-message bot-message loading-message">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  };

  // Render chat messages
  const renderMessages = () => {
    return messages.map((message, index) => {
      if (message.isButton) {
        // Render action button
        return (
          <div key={index} className="chat-message bot-message">
            <button className="action-button" onClick={message.onClick}>
              {message.text}
            </button>
          </div>
        );
      } else {
        // Render regular text message
        return (
          <div
            key={index}
            className={`chat-message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
          >
            <div className="message-content">{message.text}</div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="chatbot-container">
      {/* Chat Icon Button */}
      <button 
        className="chat-toggle-button"
        onClick={toggleChat}
        aria-label="Toggle chat assistant"
      >
        {chatOpen ? (
          <i className="fas fa-times"></i> 
        ) : (
          <i className="fas fa-comments"></i>
        )}
      </button>
      
      {/* Chat Dialog */}
      {chatOpen && (
        <div className="chat-dialog">
          <div className="chat-header">
            <h3>InnSight Hotel Assistant</h3>
            <button className="close-chat" onClick={toggleChat}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="chat-messages">
            {renderMessages()}
            {renderLoading()}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;