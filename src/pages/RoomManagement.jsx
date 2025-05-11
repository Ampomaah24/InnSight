import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Dashboard.css";
import "../assets/styles/RoomManagement.css";

// Icon imports
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
    type: "Single bed",
    price: 600,
    amenities: ["WiFi", "Breakfast"],
    bookings: []
  });
  
  // State for room types management
  const [roomTypes, setRoomTypes] = useState({
    hotel: ["Single bed", "Double bed", "Twin bed"],
    conference: [ "Small", "Big", "Long"]
  });
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [newRoomType, setNewRoomType] = useState("");
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editedRoomType, setEditedRoomType] = useState("");
  const [roomCategory, setRoomCategory] = useState("hotel");
  
  // New state for bulk amenity editing
  const [showBulkAmenityModal, setShowBulkAmenityModal] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [bulkAmenityInput, setBulkAmenityInput] = useState("");
  const [bulkAmenities, setBulkAmenities] = useState([]);
  const [bulkAction, setBulkAction] = useState("add"); // "add" or "replace"

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        
        // Determine which collection to fetch based on category
        const collectionName = roomCategory === "conference" ? "conference_rooms" : "rooms";
        const roomsCollection = collection(db, collectionName);
        const roomSnapshot = await getDocs(roomsCollection);
        
        if (roomSnapshot.empty) {
          console.log(`No ${roomCategory} rooms found in database`);
          setRooms([]);
          setFilteredRooms([]);
          setLoading(false);
          return;
        }
        
        const roomsList = roomSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Map t_room to type for consistency in the component
            type: data.t_room || data.type
          };
        });
        
        // Sort rooms by name
        roomsList.sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB);
        });
        
        setRooms(roomsList);
        setFilteredRooms(roomsList);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [roomCategory]); // Refetch when category changes

  // Update newRoom default when category changes
  useEffect(() => {
    setNewRoom(prev => ({
      ...prev,
      type: roomTypes[roomCategory][0],
      amenities: roomCategory === "conference" ? ["WiFi", "Coffee break"] : ["WiFi", "Breakfast"],
      price: roomCategory === "conference" ? 3000 : 600
    }));
  }, [roomCategory, roomTypes]);

  useEffect(() => {
    // Filter rooms based on search term and room type
    const filtered = rooms.filter(room => {
      const matchesSearch = 
        (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.type && room.type.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = 
        filterType === "all" || 
        (room.type && room.type.toLowerCase() === filterType.toLowerCase());
      
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
      
      // Ensure we save the room type correctly based on the field name used in the database
      if (roomToUpdate.type) {
        roomToUpdate.t_room = roomToUpdate.type;
        delete roomToUpdate.type;
      }
      
      // Add timestamp for last update
      roomToUpdate.lastUpdated = serverTimestamp();
      
      // Update the room in Firestore
      const collectionName = roomCategory === "conference" ? "conference_rooms" : "rooms";
      const roomRef = doc(db, collectionName, id);
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
        availability: true, // Default to available
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      // Use t_room field name for consistency with database
      if (roomToAdd.type) {
        roomToAdd.t_room = roomToAdd.type;
        delete roomToAdd.type;
      }
      
      // Save to Firestore
      const collectionName = roomCategory === "conference" ? "conference_rooms" : "rooms";
      const roomsCollection = collection(db, collectionName);
      const docRef = await addDoc(roomsCollection, roomToAdd);
      
      // Add to local state with type properly set
      const newRoomWithId = {
        ...newRoom,
        id: docRef.id
      };
      
      setRooms([...rooms, newRoomWithId]);
      
      // Reset form and close it
      setNewRoom({
        name: "",
        type: roomTypes[roomCategory][0],
        price: roomCategory === "conference" ? 3000 : 600,
        amenities: roomCategory === "conference" ? ["WiFi", "Coffee break"] : ["WiFi", "Breakfast"],
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
      const collectionName = roomCategory === "conference" ? "conference_rooms" : "rooms";
      const roomRef = doc(db, collectionName, roomId);
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
      const currentTypes = roomTypes[roomCategory];
      if (currentTypes.includes(newRoomType.trim())) {
        setSaveMessage({
          type: "error",
          text: `Room type "${newRoomType}" already exists!`
        });
        return;
      }
      
      setRoomTypes({
        ...roomTypes,
        [roomCategory]: [...currentTypes, newRoomType.trim()]
      });
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
    setEditedRoomType(roomTypes[roomCategory][index]);
  };
  
  const handleSaveRoomType = (index) => {
    if (editedRoomType.trim() === "") {
      setSaveMessage({
        type: "error",
        text: "Room type cannot be empty!"
      });
      return;
    }
    
    const currentTypes = roomTypes[roomCategory];
    if (currentTypes.includes(editedRoomType.trim()) && currentTypes[index] !== editedRoomType.trim()) {
      setSaveMessage({
        type: "error",
        text: `Room type "${editedRoomType}" already exists!`
      });
      return;
    }
    
    const updatedTypes = [...currentTypes];
    updatedTypes[index] = editedRoomType.trim();
    
    setRoomTypes({
      ...roomTypes,
      [roomCategory]: updatedTypes
    });
    
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
    const typeToDelete = roomTypes[roomCategory][index];
    
    // Check if any rooms use this type
    const roomsWithType = rooms.filter(room => room.type === typeToDelete);
    
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
    
    const updatedTypes = [...roomTypes[roomCategory]];
    updatedTypes.splice(index, 1);
    
    setRoomTypes({
      ...roomTypes,
      [roomCategory]: updatedTypes
    });
    
    setSaveMessage({
      type: "success",
      text: `Room type "${typeToDelete}" deleted successfully!`
    });
    
    setTimeout(() => {
      setSaveMessage({ type: "", text: "" });
    }, 3000);
  };

  // Bulk amenity functions
  const handleOpenBulkAmenityModal = () => {
    setShowBulkAmenityModal(true);
    setSelectedRoomType("");
    setBulkAmenities([]);
    setBulkAmenityInput("");
    setBulkAction("add");
  };

  const handleAddBulkAmenity = () => {
    if (bulkAmenityInput.trim() !== "") {
      if (!bulkAmenities.includes(bulkAmenityInput.trim())) {
        setBulkAmenities([...bulkAmenities, bulkAmenityInput.trim()]);
      }
      setBulkAmenityInput("");
    }
  };

  const handleRemoveBulkAmenity = (index) => {
    const updatedAmenities = [...bulkAmenities];
    updatedAmenities.splice(index, 1);
    setBulkAmenities(updatedAmenities);
  };

  const handleBulkAmenityUpdate = async () => {
    if (!selectedRoomType || bulkAmenities.length === 0) {
      setSaveMessage({
        type: "error",
        text: "Please select a room type and add amenities!"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Get all rooms of the selected type
      const roomsToUpdate = rooms.filter(room => room.type === selectedRoomType);
      
      if (roomsToUpdate.length === 0) {
        setSaveMessage({
          type: "error",
          text: `No rooms found with type "${selectedRoomType}"`
        });
        setSaving(false);
        return;
      }

      // Create a batch update
      const batch = writeBatch(db);
      const collectionName = roomCategory === "conference" ? "conference_rooms" : "rooms";
      
      roomsToUpdate.forEach(room => {
        const roomRef = doc(db, collectionName, room.id);
        let updatedAmenities;
        
        if (bulkAction === "replace") {
          // Replace existing amenities
          updatedAmenities = [...bulkAmenities];
        } else {
          // Add to existing amenities
          const existingAmenities = room.amenities || [];
          updatedAmenities = [...new Set([...existingAmenities, ...bulkAmenities])];
        }
        
        batch.update(roomRef, {
          amenities: updatedAmenities,
          lastUpdated: serverTimestamp()
        });
      });
      
      // Commit the batch
      await batch.commit();
      
      // Update local state
      const updatedRooms = rooms.map(room => {
        if (room.type === selectedRoomType) {
          let updatedAmenities;
          
          if (bulkAction === "replace") {
            updatedAmenities = [...bulkAmenities];
          } else {
            const existingAmenities = room.amenities || [];
            updatedAmenities = [...new Set([...existingAmenities, ...bulkAmenities])];
          }
          
          return { ...room, amenities: updatedAmenities };
        }
        return room;
      });
      
      setRooms(updatedRooms);
      
      // Close modal and reset
      setShowBulkAmenityModal(false);
      setSelectedRoomType("");
      setBulkAmenities([]);
      setBulkAmenityInput("");
      setBulkAction("add");
      
      // Show success message
      setSaveMessage({
        type: "success",
        text: `${roomsToUpdate.length} rooms of type "${selectedRoomType}" updated successfully!`
      });
      
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error updating rooms:", error);
      setSaveMessage({
        type: "error",
        text: `Error updating rooms: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
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
          <div className="room-category-toggle">
            <button
              className={`category-btn ${roomCategory === "hotel" ? "active" : ""}`}
              onClick={() => setRoomCategory("hotel")}
            >
              Hotel Rooms
            </button>
            <button
              className={`category-btn ${roomCategory === "conference" ? "active" : ""}`}
              onClick={() => setRoomCategory("conference")}
            >
              Conference Rooms
            </button>
          </div>
          
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
              {roomTypes[roomCategory].map((type, index) => (
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
              className="bulk-amenity-btn"
              onClick={handleOpenBulkAmenityModal}
              title="Bulk Edit Amenities"
            >
              <FaEdit /> Bulk Amenities
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
        
        {/* Bulk Amenity Modal */}
        {showBulkAmenityModal && (
          <div className="modal-overlay">
            <div className="bulk-amenity-modal">
              <h3>Bulk Edit Amenities</h3>
              
              <div className="bulk-amenity-form">
                <div className="form-group">
                  <label>Select Room Type</label>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="room-type-select"
                  >
                    <option value="">Choose Room Type</option>
                    {/* Only show room types for current category */}
                    {roomTypes[roomCategory].map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Update Action</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        value="add"
                        checked={bulkAction === "add"}
                        onChange={(e) => setBulkAction(e.target.value)}
                      />
                      Add to existing amenities
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="replace"
                        checked={bulkAction === "replace"}
                        onChange={(e) => setBulkAction(e.target.value)}
                      />
                      Replace all amenities
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Amenities</label>
                  <div className="amenities-container">
                    <div className="amenities-list">
                      {bulkAmenities.map((amenity, index) => (
                        <div key={index} className="amenity-item">
                          <span>{amenity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkAmenity(index)}
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
                        value={bulkAmenityInput}
                        onChange={(e) => setBulkAmenityInput(e.target.value)}
                        placeholder="Add amenity"
                        className="amenity-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBulkAmenity();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddBulkAmenity}
                        className="add-amenity-btn"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
                
                {selectedRoomType && (
                  <div className="affected-rooms">
                    <p>This will affect <strong>{rooms.filter(room => room.type === selectedRoomType).length}</strong> rooms.</p>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button
                  className="cancel-modal-btn"
                  onClick={() => setShowBulkAmenityModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-modal-btn"
                  onClick={handleBulkAmenityUpdate}
                  disabled={saving || !selectedRoomType || bulkAmenities.length === 0}
                >
                  {saving ? "Updating..." : "Apply Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Room Types Modal */}
        {showRoomTypeModal && (
          <div className="room-types-modal">
            <h3>Manage {roomCategory === "hotel" ? "Room" : "Conference"} Types</h3>
            <div className="room-types-list">
              {roomTypes[roomCategory].map((type, index) => (
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
            <h3>Add New {roomCategory === "hotel" ? "Room" : "Conference Room"}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Room Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newRoom.name}
                  onChange={handleNewRoomChange}
                  placeholder={roomCategory === "hotel" ? "e.g. R001" : "e.g. Mini Hall"}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Room Type</label>
                <select
                  name="type"
                  value={newRoom.type}
                  onChange={handleNewRoomChange}
                >
                  {roomTypes[roomCategory].map((type, index) => (
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
                    placeholder={roomCategory === "hotel" ? "Add amenity" : "Add facility"}
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
                {saving ? "Saving..." : <><FaSave /> Add {roomCategory === "hotel" ? "Room" : "Conference Room"}</>}
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="loading-indicator">Loading {roomCategory} rooms...</div>
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
                    <td colSpan="5" className="no-data">No {roomCategory} rooms found</td>
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
                              name="type"
                              value={editedRoom.type || ""}
                              onChange={handleChange}
                              className="edit-select"
                            >
                              {roomTypes[roomCategory].map((type, index) => (
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
                          <td>{room.type}</td>
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