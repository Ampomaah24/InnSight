import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import TopRightProfile from "../components/TopRightProfile";
import "../assets/styles/Dashboard.css";
import "../assets/styles/RoomManagement.css";

// Icon imports (assuming Font Awesome or similar is used)
// You'll need to install and import the actual icon library you're using
// For example: npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
import { FaEdit, FaSave, FaTimes, FaTrash, FaPlus } from 'react-icons/fa';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editRoom, setEditRoom] = useState(null);
  const [editedRoom, setEditedRoom] = useState({});
  const [amenityInput, setAmenityInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    t_room: "Single bed",
    price: 600,
    amenities: ["WiFi", "Breakfast"],
    bookings: []
  });
  
  // New state for room types management
  const [roomTypes, setRoomTypes] = useState(["Single bed", "Double bed", "Twin bed"]);
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [newRoomType, setNewRoomType] = useState("");
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editedRoomType, setEditedRoomType] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const roomsCollection = collection(db, "rooms");
        const roomSnapshot = await getDocs(roomsCollection);
        
        if (roomSnapshot.empty) {
          console.log("No rooms found in database");
          setLoading(false);
          return;
        }
        
        const roomsList = roomSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort rooms by name
        roomsList.sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB);
        });
        
        setRooms(roomsList);
        setFilteredRooms(roomsList);
        
        // Extract unique room types for the dropdown
        const uniqueRoomTypes = [...new Set(roomsList.map(room => room.t_room))];
        if (uniqueRoomTypes.length > 0) {
          setRoomTypes(prevTypes => {
            // Merge existing types with ones from database
            const allTypes = [...new Set([...prevTypes, ...uniqueRoomTypes])];
            return allTypes;
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, []);

  useEffect(() => {
    // Filter rooms based on search term and room type
    const filtered = rooms.filter(room => {
      const matchesSearch = 
        (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.t_room && room.t_room.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = 
        filterType === "all" || 
        (room.t_room && room.t_room.toLowerCase() === filterType.toLowerCase());
      
      return matchesSearch && matchesType;
    });
    
    setFilteredRooms(filtered);
  }, [searchTerm, filterType, rooms]);

  const handleEdit = (room) => {
    setEditRoom(room.id);
    setEditedRoom({...room});
  };

  const handleCancelEdit = () => {
    setEditRoom(null);
    setEditedRoom({});
    setAmenityInput("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "price") {
      // Ensure price is always a number
      setEditedRoom({...editedRoom, [name]: parseFloat(value) || 0});
    } else {
      setEditedRoom({...editedRoom, [name]: value});
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() !== "") {
      const updatedAmenities = editedRoom.amenities ? [...editedRoom.amenities] : [];
      
      // Check if amenity already exists
      if (!updatedAmenities.includes(amenityInput.trim())) {
        updatedAmenities.push(amenityInput.trim());
        setEditedRoom({...editedRoom, amenities: updatedAmenities});
      }
      
      setAmenityInput("");
    }
  };

  const handleRemoveAmenity = (index) => {
    const updatedAmenities = [...editedRoom.amenities];
    updatedAmenities.splice(index, 1);
    setEditedRoom({...editedRoom, amenities: updatedAmenities});
  };

  const handleSave = async (id) => {
    try {
      setSaving(true);
      
      // Create a copy of the edited room without the id field
      const roomToUpdate = {...editedRoom};
      delete roomToUpdate.id;
      
      // Add timestamp for last update
      roomToUpdate.lastUpdated = serverTimestamp();
      
      // Update the room in Firestore
      const roomRef = doc(db, "rooms", id);
      await updateDoc(roomRef, roomToUpdate);
      
      // Update local state
      setRooms(rooms.map(room => room.id === id ? editedRoom : room));
      
      // Reset edit state
      setEditRoom(null);
      setEditedRoom({});
      
      // Show success message
      setSaveMessage({ 
        type: "success", 
        text: `Room ${editedRoom.name} updated successfully!` 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error updating room:", error);
      
      // Show error message
      setSaveMessage({ 
        type: "error", 
        text: `Error updating room: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle changes to new room form
  const handleNewRoomChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "price") {
      // Ensure price is always a number
      setNewRoom({...newRoom, [name]: parseFloat(value) || 0});
    } else {
      setNewRoom({...newRoom, [name]: value});
    }
  };
  
  // Add amenity to new room
  const handleAddNewRoomAmenity = () => {
    if (amenityInput.trim() !== "") {
      const updatedAmenities = newRoom.amenities ? [...newRoom.amenities] : [];
      
      // Check if amenity already exists
      if (!updatedAmenities.includes(amenityInput.trim())) {
        updatedAmenities.push(amenityInput.trim());
        setNewRoom({...newRoom, amenities: updatedAmenities});
      }
      
      setAmenityInput("");
    }
  };
  
  // Remove amenity from new room
  const handleRemoveNewRoomAmenity = (index) => {
    const updatedAmenities = [...newRoom.amenities];
    updatedAmenities.splice(index, 1);
    setNewRoom({...newRoom, amenities: updatedAmenities});
  };
  
  // Save new room to Firestore
  const handleAddNewRoom = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!newRoom.name || newRoom.name.trim() === "") {
        setSaveMessage({ 
          type: "error", 
          text: "Room name is required!" 
        });
        setSaving(false);
        return;
      }
      
      // Check if a room with the same name already exists
      const roomExists = rooms.some(room => 
        room.name.toLowerCase() === newRoom.name.toLowerCase()
      );
      
      if (roomExists) {
        setSaveMessage({ 
          type: "error", 
          text: `A room with name "${newRoom.name}" already exists!` 
        });
        setSaving(false);
        return;
      }
      
      // Create room object to save
      const roomToAdd = {
        ...newRoom,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      // Save to Firestore
      const roomsCollection = collection(db, "rooms");
      const docRef = await addDoc(roomsCollection, roomToAdd);
      
      // Add to local state
      const newRoomWithId = {
        ...newRoom,
        id: docRef.id
      };
      
      setRooms([...rooms, newRoomWithId]);
      
      // Reset form and close it
      setNewRoom({
        name: "",
        t_room: "Single bed",
        price: 600,
        amenities: ["WiFi", "Breakfast"],
        bookings: []
      });
      setShowAddForm(false);
      
      // Show success message
      setSaveMessage({ 
        type: "success", 
        text: `Room ${newRoom.name} added successfully!` 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error adding room:", error);
      
      // Show error message
      setSaveMessage({ 
        type: "error", 
        text: `Error adding room: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete room ${roomName}?`)) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Delete from Firestore
      const roomRef = doc(db, "rooms", roomId);
      await deleteDoc(roomRef);
      
      // Update local state
      setRooms(rooms.filter(room => room.id !== roomId));
      
      // Show success message
      setSaveMessage({ 
        type: "success", 
        text: `Room ${roomName} deleted successfully!` 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error deleting room:", error);
      
      // Show error message
      setSaveMessage({ 
        type: "error", 
        text: `Error deleting room: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  // Room Type Management
  const handleAddRoomType = () => {
    if (newRoomType.trim() !== "") {
      if (roomTypes.includes(newRoomType.trim())) {
        setSaveMessage({
          type: "error",
          text: `Room type "${newRoomType}" already exists!`
        });
        return;
      }
      
      setRoomTypes([...roomTypes, newRoomType.trim()]);
      setNewRoomType("");
      
      setSaveMessage({
        type: "success",
        text: `Room type "${newRoomType}" added successfully!`
      });
      
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    }
  };
  
  const handleEditRoomType = (index) => {
    setEditingRoomType(index);
    setEditedRoomType(roomTypes[index]);
  };
  
  const handleSaveRoomType = (index) => {
    if (editedRoomType.trim() === "") {
      setSaveMessage({
        type: "error",
        text: "Room type cannot be empty!"
      });
      return;
    }
    
    if (roomTypes.includes(editedRoomType.trim()) && roomTypes[index] !== editedRoomType.trim()) {
      setSaveMessage({
        type: "error",
        text: `Room type "${editedRoomType}" already exists!`
      });
      return;
    }
    
    const updatedRoomTypes = [...roomTypes];
    updatedRoomTypes[index] = editedRoomType.trim();
    setRoomTypes(updatedRoomTypes);
    
    // Update any rooms that use this room type
    const oldRoomType = roomTypes[index];
    const updatedRooms = rooms.map(room => {
      if (room.t_room === oldRoomType) {
        return { ...room, t_room: editedRoomType.trim() };
      }
      return room;
    });
    
    // Update rooms in state and optionally in Firestore (would need to batch update)
    setRooms(updatedRooms);
    
    setEditingRoomType(null);
    setEditedRoomType("");
    
    setSaveMessage({
      type: "success",
      text: `Room type updated successfully!`
    });
    
    setTimeout(() => {
      setSaveMessage({ type: "", text: "" });
    }, 3000);
  };
  
  const handleDeleteRoomType = (index) => {
    const typeToDelete = roomTypes[index];
    
    // Check if any rooms use this type
    const roomsWithType = rooms.filter(room => room.t_room === typeToDelete);
    
    if (roomsWithType.length > 0) {
      setSaveMessage({
        type: "error",
        text: `Cannot delete room type "${typeToDelete}" because it is being used by ${roomsWithType.length} room(s)`
      });
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete room type "${typeToDelete}"?`)) {
      return;
    }
    
    const updatedRoomTypes = [...roomTypes];
    updatedRoomTypes.splice(index, 1);
    setRoomTypes(updatedRoomTypes);
    
    setSaveMessage({
      type: "success",
      text: `Room type "${typeToDelete}" deleted successfully!`
    });
    
    setTimeout(() => {
      setSaveMessage({ type: "", text: "" });
    }, 3000);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <TopRightProfile />
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Room Management</h1>
          <p className="dashboard-subtitle">Edit room details and amenities</p>
        </div>

        {saveMessage.text && (
          <div className={`save-message ${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}
        
        <div className="room-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="room-type-filter">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Room Types</option>
              {roomTypes.map((type, index) => (
                <option key={index} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          <div className="action-buttons">
            <button 
              className="add-room-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              title={showAddForm ? "Cancel" : "Add New Room"}
            >
              {showAddForm ? <FaTimes /> : <FaPlus />}
              {showAddForm ? " Cancel" : " Add Room"}
            </button>
            
            <button
              className="manage-types-btn"
              onClick={() => setShowRoomTypeModal(!showRoomTypeModal)}
              title="Manage Room Types"
            >
              <FaEdit /> Room Types
            </button>
          </div>
        </div>
        
        {/* Room Types Modal */}
        {showRoomTypeModal && (
          <div className="room-types-modal">
            <h3>Manage Room Types</h3>
            <div className="room-types-list">
              {roomTypes.map((type, index) => (
                <div key={index} className="room-type-item">
                  {editingRoomType === index ? (
                    <>
                      <input
                        type="text"
                        value={editedRoomType}
                        onChange={(e) => setEditedRoomType(e.target.value)}
                        className="room-type-edit-input"
                      />
                      <div className="room-type-actions">
                        <button
                          onClick={() => handleSaveRoomType(index)}
                          className="save-btn"
                          title="Save"
                        >
                          <FaSave />
                        </button>
                        <button
                          onClick={() => setEditingRoomType(null)}
                          className="cancel-btn"
                          title="Cancel"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>{type}</span>
                      <div className="room-type-actions">
                        <button
                          onClick={() => handleEditRoomType(index)}
                          className="edit-btn"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteRoomType(index)}
                          className="delete-btn"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="add-room-type">
              <input
                type="text"
                value={newRoomType}
                onChange={(e) => setNewRoomType(e.target.value)}
                placeholder="New room type..."
                className="room-type-input"
              />
              <button
                onClick={handleAddRoomType}
                className="add-room-type-btn"
                disabled={newRoomType.trim() === ""}
              >
                <FaPlus /> Add
              </button>
            </div>
            <button
              className="close-modal-btn"
              onClick={() => setShowRoomTypeModal(false)}
            >
              Close
            </button>
          </div>
        )}
        
        {/* Add New Room Form */}
        {showAddForm && (
          <div className="add-room-form">
            <h3>Add New Room</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Room Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newRoom.name}
                  onChange={handleNewRoomChange}
                  placeholder="e.g. R054"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Room Type</label>
                <select
                  name="t_room"
                  value={newRoom.t_room}
                  onChange={handleNewRoomChange}
                >
                  {roomTypes.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Price (GHS)</label>
                <input
                  type="number"
                  name="price"
                  value={newRoom.price}
                  onChange={handleNewRoomChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group amenities-section">
              <label>Amenities</label>
              <div className="amenities-container">
                <div className="amenities-list">
                  {newRoom.amenities && newRoom.amenities.map((amenity, index) => (
                    <div key={index} className="amenity-item">
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewRoomAmenity(index)}
                        className="remove-amenity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="add-amenity">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    placeholder="Add amenity"
                    className="amenity-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewRoomAmenity();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewRoomAmenity}
                    className="add-amenity-btn"
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="cancel-add-btn"
                onClick={() => setShowAddForm(false)}
              >
                <FaTimes /> Cancel
              </button>
              <button
                type="button"
                className="save-add-btn"
                onClick={handleAddNewRoom}
                disabled={saving}
              >
                {saving ? "Saving..." : <><FaSave /> Add Room</>}
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="loading-indicator">Loading rooms...</div>
        ) : (
          <div className="rooms-table-container">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Type</th>
                  <th>Price (GHS)</th>
                  <th>Amenities</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">No rooms found</td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id}>
                      {editRoom === room.id ? (
                        // Edit mode
                        <>
                          <td>
                            <input
                              type="text"
                              name="name"
                              value={editedRoom.name || ""}
                              onChange={handleChange}
                              className="edit-input"
                            />
                          </td>
                          <td>
                            <select
                              name="t_room"
                              value={editedRoom.t_room || ""}
                              onChange={handleChange}
                              className="edit-select"
                            >
                              {roomTypes.map((type, index) => (
                                <option key={index} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              name="price"
                              value={editedRoom.price || 0}
                              onChange={handleChange}
                              className="edit-input"
                              min="0"
                            />
                          </td>
                          <td>
                            <div className="amenities-editor">
                              <div className="amenities-list">
                                {editedRoom.amenities && editedRoom.amenities.map((amenity, index) => (
                                  <div key={index} className="amenity-item">
                                    <span>{amenity}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAmenity(index)}
                                      className="remove-amenity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="add-amenity">
                                <input
                                  type="text"
                                  value={amenityInput}
                                  onChange={(e) => setAmenityInput(e.target.value)}
                                  placeholder="Add amenity"
                                  className="amenity-input"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddAmenity();
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddAmenity}
                                  className="add-amenity-btn"
                                >
                                  <FaPlus />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="actions-cell">
                            <button
                              onClick={() => handleSave(room.id)}
                              className="save-btn"
                              disabled={saving}
                              title="Save"
                            >
                              <FaSave />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="cancel-btn"
                              disabled={saving}
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>
                          </td>
                        </>
                      ) : (
                        // View mode
                        <>
                          <td>{room.name}</td>
                          <td>{room.t_room}</td>
                          <td>{room.price} GHS</td>
                          <td>
                            <div className="amenities-display">
                              {room.amenities && room.amenities.map((amenity, index) => (
                                <span key={index} className="amenity-tag">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="actions-cell">
                            <button
                              onClick={() => handleEdit(room)}
                              className="edit-btn"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.name)}
                              className="delete-btn"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManagement;