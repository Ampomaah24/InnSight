import React, { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); 


  const normalizeUserData = (user, data) => {
    // Extract first name and last name from fullName if available
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
  
    const role = data.role || 'staff';
    
    return {
      id: user.uid,
      fname: firstName,
      lname: lastName,
      fullName: data.fullName || `${firstName} ${lastName}`.trim(),
      email: user.email,
      photoURL: data.photoURL || user.photoURL || null,
      avatar: data.avatar || null,
      role: role, 
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
          
          const firestoreData = await fetchUserData(user);
          
          if (firestoreData) {
            const normalizedUser = normalizeUserData(user, firestoreData);
          
            setCurrentUser(normalizedUser);
        
            setUserRole(normalizedUser.role);
            
            
            sessionStorage.setItem('currentUser', JSON.stringify(normalizedUser));
          } else {
            console.error("User document not found in Firestore");
            
            
            const defaultUser = {
              id: user.uid,
              email: user.email,
              displayName: user.displayName || "User",
              role: 'staff' 
            };
            
            setCurrentUser(defaultUser);
            setUserRole('staff');
          }
        } catch (err) {
          console.error("Error in auth state change:", err);
   
          const basicUser = {
            id: user.uid,
            email: user.email,
            displayName: user.displayName || "User",
            role: 'staff'
          };
          
          setCurrentUser(basicUser);
          setUserRole('staff');
        } finally {
          setLoading(false);
        }
      } else {
      
        setCurrentUser(null);
        setUserRole(null);
        sessionStorage.removeItem('currentUser');
        setLoading(false);
      }
    });
    
   
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setUserRole(parsedUser.role || 'staff');
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        sessionStorage.removeItem('currentUser');
      }
    }
    
    
    return () => unsubscribe();
  }, []);

  // Creating role-based properties
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isSuperAdmin = userRole === 'superadmin';

  return (
    <UserContext.Provider 
      value={{ 
        currentUser, 
        loading, 
        setCurrentUser,
        userRole,
        isAdmin,
        isSuperAdmin
      }}
    >
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