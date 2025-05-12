import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import "../assets/styles/ChatWidget.css";
import { useBooking } from "../components/BookingContext"; // Import the BookingContext hook

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

const ChatWidget = () => {
  const navigate = useNavigate();
  const { setBookingData } = useBooking(); // Use the context for setting booking data
  
  // State variables
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chatbot with welcome message
  useEffect(() => {
    setMessages([
      {
        text: "Hello! I'm the Hotel assistant. How can I help you today? You can ask about room availability, make bookings, inquire about our services, or ask about check-in times, WiFi, breakfast, and more.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
    
    // Hide bubble after 10 seconds if chat hasn't been opened
    const bubbleTimer = setTimeout(() => {
      if (!chatOpen) {
        setShowBubble(false);
      }
    }, 10000);
    
    return () => clearTimeout(bubbleTimer);
  }, []);

  // Auto-scroll to bottom of chat messages
  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, chatOpen]);
  
  // Focus input field when chat is opened
  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle toggling the chat window
  const toggleChat = () => {
    if (chatOpen) {
      // When closing the chat, reset the bubble to show again
      setTimeout(() => {
        setShowBubble(true);
      }, 500); // Small delay to prevent the bubble from appearing immediately
    } else {
      // When opening the chat, hide the bubble
      setShowBubble(false);
    }
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

  // Handle pressing Enter to send message
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSendMessage(e);
      }
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
          // Show searching message
          setMessages((prev) => [
            ...prev,
            {
              text: `I'm searching for available ${room_type} rooms for your dates...`,
              sender: "bot",
              timestamp: new Date(),
            },
          ]);
          
          // Query for available rooms
          const roomsRef = collection(db, "rooms");
          const roomQuery = query(roomsRef, where("t_room", "==", mapRoomTypeToDatabase(room_type)));
          const roomSnapshot = await getDocs(roomQuery);
          
          // If no rooms found, inform the user
          if (roomSnapshot.empty) {
            setMessages((prev) => [
              ...prev,
              {
                text: `I'm sorry, but it seems we don't have any ${room_type} rooms available for your requested dates. Would you like to check a different room type or dates?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            return;
          }
          
          // Find available rooms for these dates
          const checkInDate = new Date(check_in);
          const checkOutDate = new Date(check_out);
          const availableRooms = [];
          
          roomSnapshot.forEach((doc) => {
            const room = { id: doc.id, ...doc.data() };
            
            // If room has no bookings, it's available
            if (!room.bookings || room.bookings.length === 0) {
              availableRooms.push(room);
              return;
            }
            
            // Check if room has a booking conflict during this period
            const isBooked = room.bookings.some((booking) => {
              if (!booking.checkIn || !booking.checkOut) return false;
              const bookedCheckIn = new Date(booking.checkIn);
              const bookedCheckOut = new Date(booking.checkOut);
              return checkInDate <= bookedCheckOut && checkOutDate >= bookedCheckIn;
            });
            
            if (!isBooked) {
              availableRooms.push(room);
            }
          });
          
          if (availableRooms.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                text: `I'm sorry, but it seems we don't have any ${room_type} rooms available for your requested dates. Would you like to check a different room type or dates?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            return;
          }
          
          // If multiple rooms available, offer choices
          if (availableRooms.length > 1) {
            setMessages((prev) => [
              ...prev,
              {
                text: `Great news! I found ${availableRooms.length} ${room_type} rooms available for your dates. Would you like to book one of them?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            
            // Add a button for booking the first available room
            setMessages((prev) => [
              ...prev,
              {
                text: `Book ${room_type} Room`,
                sender: "bot",
                isButton: true,
                onClick: () => proceedToBooking(check_in, check_out, [availableRooms[0]]),
                timestamp: new Date(),
              },
            ]);
          } else {
            // Only one room available, proceed with that
            setMessages((prev) => [
              ...prev,
              {
                text: `Great! I found a ${room_type} room available for your dates. Would you like to book it?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            
            // Add a button for booking the room
            setMessages((prev) => [
              ...prev,
              {
                text: `Book ${room_type} Room`,
                sender: "bot",
                isButton: true,
                onClick: () => proceedToBooking(check_in, check_out, [availableRooms[0]]),
                timestamp: new Date(),
              },
            ]);
          }
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
            // Check if rooms are actually available for these dates
            const checkInDate = new Date(availData.check_in);
            const checkOutDate = new Date(availData.check_out);
            const availableRooms = [];
            
            roomSnapshot.forEach((doc) => {
              const room = { id: doc.id, ...doc.data() };
              
              // If room has no bookings, it's available
              if (!room.bookings || room.bookings.length === 0) {
                availableRooms.push(room);
                return;
              }
              
              // Check if room has a booking conflict during this period
              const isBooked = room.bookings.some((booking) => {
                if (!booking.checkIn || !booking.checkOut) return false;
                const bookedCheckIn = new Date(booking.checkIn);
                const bookedCheckOut = new Date(booking.checkOut);
                return checkInDate <= bookedCheckOut && checkOutDate >= bookedCheckIn;
              });
              
              if (!isBooked) {
                availableRooms.push(room);
              }
            });
            
            if (availableRooms.length === 0) {
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
                  text: `Good news! We have ${availableRooms.length} ${availData.room_type} rooms available from ${availData.check_in} to ${availData.check_out}. Would you like to book now?`,
                  sender: "bot",
                  timestamp: new Date(),
                },
                {
                  text: "Book Now",
                  sender: "bot",
                  isButton: true,
                  onClick: () => proceedToBooking(availData.check_in, availData.check_out, availableRooms),
                  timestamp: new Date(),
                }
              ]);
            }
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

  const proceedToBooking = (checkIn, checkOut, availableRooms) => {
    // Calculate nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
    
    // Format available rooms in the way the booking page expects
    const selectedRooms = availableRooms.map(room => ({
      id: room.id,
      t_room: room.t_room,
      price: room.price , // Default price if not specified
      name: `${room.t_room} Room`,
      // Add any other necessary fields to match the booking page expectations
      amenities: room.amenities || [],
      maxOccupancy: room.maxOccupancy || 2
    }));
    
    // Set booking data in context
    setBookingData({
      rooms: selectedRooms,
      checkIn: checkIn,
      checkOut: checkOut,
      nights: nights,
      roomCategory: 'regular',
      fromChatbot: true
    });
    
    // Navigate directly to the booking page
    navigate('/book-room');
    
    // Add confirmation message
    setMessages((prev) => [
      ...prev,
      {
        text: `Great! I've prepared your booking for ${selectedRooms.length} ${selectedRooms[0].t_room} ${selectedRooms.length > 1 ? 'rooms' : 'room'} from ${new Date(checkIn).toLocaleDateString()} to ${new Date(checkOut).toLocaleDateString()}. You'll be redirected to complete your booking.`,
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
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
      {/* Chat Icon Button with Speech Bubble */}
      <div className="chat-button-wrapper">
        {!chatOpen && showBubble && (
          <div className="speech-bubble">Hi there!</div>
        )}
        <button 
          className="chat-toggle-button"
          onClick={toggleChat}
          aria-label="Toggle chat assistant"
        >
          {chatOpen ? (
            <span className="close-icon">×</span> 
          ) : (
            <span className="human-emoji" role="img" aria-label="Chat assistant">👨‍💼</span>
          )}
        </button>
      </div>
      
      {/* Chat Dialog */}
      {chatOpen && (
        <div className="chat-dialog">
          <div className="chat-header">
            <h3>Hotel Assistant</h3>
            <button className="close-chat" onClick={toggleChat}>
              <span className="close-icon">×</span>
            </button>
          </div>
          
          <div className="chat-messages">
            {renderMessages()}
            {renderLoading()}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <div className="arrow-icon"></div>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;