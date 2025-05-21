import React, { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to normalize user data
  const normalizeUserData = (user, data) => {
 
    let firstName = "";
    let lastName = "";
    
    if (data.fullName) {
      const nameParts = data.fullName.split(' ');
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(' ') || "";
    } else if (data.fname && data.lname) {
      firstName = data.fname;
      lastName = data.lname;
    } else if (user.displayName) {
      const nameParts = user.displayName.split(' ');
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(' ') || "";
    }
    
    return {
      id: user.uid,
      fname: firstName,
      lname: lastName,
      fullName: data.fullName || `${firstName} ${lastName}`.trim(),
      email: user.email,
      photoURL: data.photoURL || user.photoURL || null,
      avatar: data.avatar || null,
      role: data.role || 'user',
  
      phone: data.phone || "",
      address: data.address || "",
      dateOfBirth: data.dateOfBirth || "",
      bio: data.bio || "",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  };

  // Fetch user data from db
  const fetchUserData = async (user) => {
    if (!user) return null;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log("Fetched user data:", userDoc.data());
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  useEffect(() => {
  
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from db
          const firestoreData = await fetchUserData(user);
          
          if (firestoreData) {
            // Normalize user data
            const normalizedUser = normalizeUserData(user, firestoreData);
            
            setCurrentUser(normalizedUser);
            
            // Update sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(normalizedUser));
          } else {
            console.error("User document not found in Firestore");
            setCurrentUser({
              id: user.uid,
              email: user.email,
              displayName: user.displayName || "User"
            });
          }
        } catch (err) {
          console.error("Error in auth state change:", err);
    
          setCurrentUser({
            id: user.uid,
            email: user.email,
            displayName: user.displayName || "User"
          });
        } finally {
          setLoading(false);
        }
      } else {

        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
        setLoading(false);
      }
    });
    
   
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        sessionStorage.removeItem('currentUser');
      }
    }
    

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, loading, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};


export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};