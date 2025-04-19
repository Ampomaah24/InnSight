import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Fetches all rooms from Firestore
 * @returns {Promise<Array>} - Array of room objects
 */
export const fetchAllRooms = async () => {
  try {
    const roomsCollection = collection(db, "rooms");
    const roomSnapshot = await getDocs(roomsCollection);
    
    if (roomSnapshot.empty) {
      return [];
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
    
    return roomsList;
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
};

/**
 * Fetch rooms by type
 * @param {string} roomType - The type of room to fetch (Single bed, Double bed, Twin bed)
 * @returns {Promise<Array>} - Array of room objects matching the type
 */
export const fetchRoomsByType = async (roomType) => {
  try {
    const roomsCollection = collection(db, "rooms");
    const q = query(roomsCollection, where("t_room", "==", roomType));
    const roomSnapshot = await getDocs(q);
    
    if (roomSnapshot.empty) {
      return [];
    }
    
    return roomSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching rooms by type:", error);
    throw error;
  }
};

/**
 * Update a room in Firestore
 * @param {string} roomId - The ID of the room to update
 * @param {Object} roomData - The updated room data
 * @returns {Promise<void>}
 */
export const updateRoom = async (roomId, roomData) => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    
    // Add a timestamp for the last update
    const dataToUpdate = {
      ...roomData,
      lastUpdated: serverTimestamp()
    };
    
    await updateDoc(roomRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating room:", error);
    throw error;
  }
};

/**
 * Add a new room to Firestore
 * @param {Object} roomData - The room data to add
 * @returns {Promise<string>} - The ID of the newly created room
 */
export const addRoom = async (roomData) => {
  try {
    const roomsCollection = collection(db, "rooms");
    
    // Add timestamps for creation and last update
    const dataToAdd = {
      ...roomData,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };
    
    const docRef = await addDoc(roomsCollection, dataToAdd);
    return docRef.id;
  } catch (error) {
    console.error("Error adding room:", error);
    throw error;
  }
};

/**
 * Delete a room from Firestore
 * @param {string} roomId - The ID of the room to delete
 * @returns {Promise<void>}
 */
export const deleteRoom = async (roomId) => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await deleteDoc(roomRef);
  } catch (error) {
    console.error("Error deleting room:", error);
    throw error;
  }
};

/**
 * Bulk update rooms of a specific type
 * @param {string} roomType - The type of rooms to update
 * @param {string} fieldToUpdate - The field to update
 * @param {any} newValue - The new value for the field
 * @returns {Promise<number>} - Number of rooms updated
 */
export const bulkUpdateRoomsByType = async (roomType, fieldToUpdate, newValue) => {
  try {
    // Get rooms of the specified type
    const roomsToUpdate = await fetchRoomsByType(roomType);
    
    if (roomsToUpdate.length === 0) {
      return 0;
    }
    
    // Create a batch for multiple updates
    const batch = writeBatch(db);
    
    // Add each room update to the batch
    roomsToUpdate.forEach(room => {
      const roomRef = doc(db, "rooms", room.id);
      const updateData = {
        [fieldToUpdate]: newValue,
        lastUpdated: serverTimestamp()
      };
      
      batch.update(roomRef, updateData);
    });
    
    // Commit the batch
    await batch.commit();
    
    return roomsToUpdate.length;
  } catch (error) {
    console.error(`Error bulk updating rooms of type ${roomType}:`, error);
    throw error;
  }
};

/**
 * Bulk update amenities for rooms of a specific type
 * @param {string} roomType - The type of rooms to update
 * @param {string} action - "add" or "remove"
 * @param {string} amenity - The amenity to add or remove
 * @returns {Promise<number>} - Number of rooms updated
 */
export const bulkUpdateAmenities = async (roomType, action, amenity) => {
  try {
    // Get rooms of the specified type
    const roomsToUpdate = await fetchRoomsByType(roomType);
    
    if (roomsToUpdate.length === 0) {
      return 0;
    }
    
    // Create a batch for multiple updates
    const batch = writeBatch(db);
    
    // Add each room update to the batch
    roomsToUpdate.forEach(room => {
      const roomRef = doc(db, "rooms", room.id);
      let updatedAmenities = [...(room.amenities || [])];
      
      if (action === "add") {
        // Add amenity if it doesn't already exist
        if (!updatedAmenities.includes(amenity)) {
          updatedAmenities.push(amenity);
        }
      } else if (action === "remove") {
        // Remove amenity if it exists
        updatedAmenities = updatedAmenities.filter(a => a !== amenity);
      }
      
      batch.update(roomRef, {
        amenities: updatedAmenities,
        lastUpdated: serverTimestamp()
      });
    });
    
    // Commit the batch
    await batch.commit();
    
    return roomsToUpdate.length;
  } catch (error) {
    console.error(`Error bulk updating amenities for rooms of type ${roomType}:`, error);
    throw error;
  }
};

/**
 * Get room statistics
 * @returns {Promise<Object>} - Room statistics (total, by type, etc.)
 */
export const getRoomStats = async () => {
  try {
    const rooms = await fetchAllRooms();
    
    // Initialize stats object
    const stats = {
      total: rooms.length,
      byType: {
        "Single bed": 0,
        "Double bed": 0,
        "Twin bed": 0,
        "Other": 0
      },
      priceRange: {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        avg: 0
      }
    };
    
    // Calculate statistics
    let totalPrice = 0;
    
    rooms.forEach(room => {
      // Count by type
      if (room.t_room && stats.byType.hasOwnProperty(room.t_room)) {
        stats.byType[room.t_room]++;
      } else {
        stats.byType.Other++;
      }
      
      // Track price stats
      if (room.price) {
        totalPrice += room.price;
        stats.priceRange.min = Math.min(stats.priceRange.min, room.price);
        stats.priceRange.max = Math.max(stats.priceRange.max, room.price);
      }
    });
    
    // Calculate average price
    stats.priceRange.avg = rooms.length > 0 ? Math.round(totalPrice / rooms.length) : 0;
    
    // Handle edge case for min price
    if (stats.priceRange.min === Number.MAX_SAFE_INTEGER) {
      stats.priceRange.min = 0;
    }
    
    return stats;
  } catch (error) {
    console.error("Error getting room statistics:", error);
    throw error;
  }
};

export default {
  fetchAllRooms,
  fetchRoomsByType,
  updateRoom,
  addRoom,
  deleteRoom,
  bulkUpdateRoomsByType,
  bulkUpdateAmenities,
  getRoomStats
};