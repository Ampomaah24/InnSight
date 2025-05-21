
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const ProfileSection = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [localUser, setLocalUser] = useState(user);
 
  const styles = {
    profileSection: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      cursor: "pointer",
    },
    profilePicContainer: {
      width: "1.8rem",
      height: "1.8rem",
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    avatarInitials: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #2c3e50 0%, #4a6491 100%)",
      color: "white",
      fontSize: "0.7rem",
      fontWeight: 500,
    },
    profileText: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
    },
    profileName: {
      fontSize: "1.45rem",
      fontWeight: 400,
      color: "#555",
    },
    dropdownIcon: {
      color: "#777",
      fontSize: "0.5rem",
      marginTop: "0.125rem",
    },
    dropdownContainer: {
      position: "relative",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 0.5rem)",
      right: 0,
      width: "12rem",
      background: "white",
      borderRadius: "0.35rem",
      boxShadow: "0 0.125rem 0.625rem rgba(0, 0, 0, 0.1)",
      zIndex: 100,
      overflow: "hidden",
      border: "0.0625rem solid rgba(0, 0, 0, 0.08)",
    },
    dropdownHeader: {
      padding: "0.75rem 1rem",
      borderBottom: "0.0625rem solid rgba(0, 0, 0, 0.06)",
      backgroundColor: "#f8f8f8",
    },
    headerName: {
      fontWeight: 500,
      fontSize: "0.9rem",
      color: "#333",
      marginBottom: "0.25rem",
    },
    headerSubtitle: {
      fontSize: "0.75rem",
      color: "#666",
    },
    dropdownItems: {
      padding: "0.5rem 0",
    },
    dropdownItem: {
      padding: "0.6rem 1rem",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      fontSize: "0.85rem",
      color: "#444",
      transition: "background-color 0.2s ease",
    },
    logoutItem: {
      borderTop: "0.0625rem solid rgba(0, 0, 0, 0.06)",
      marginTop: "0.25rem",
      paddingTop: "0.75rem",
    },
    icon: {
      color: "#e05206",
      marginRight: "0.75rem",
      width: "1rem",
      height: "1rem",
    },
    logoutIcon: {
      color: "#e74c3c",
      marginRight: "0.75rem",
      width: "1rem",
      height: "1rem",
    },
    logoutText: {
      color: "#e74c3c",
    }
  };
  

  useEffect(() => {
  
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("Using user from sessionStorage:", userData);
        setLocalUser(userData);
      } catch (error) {
        console.error("Error parsing user data from sessionStorage:", error);
      }
    } else if (auth.currentUser) {
    
      const authUser = {
        id: auth.currentUser.uid,
        fname: auth.currentUser.displayName?.split(' ')[0] || "User",
        lname: auth.currentUser.displayName?.split(' ').slice(1).join(' ') || "",
        fullName: auth.currentUser.displayName || "User",
        photoURL: auth.currentUser.photoURL,
        email: auth.currentUser.email
      };
      console.log("Created user from auth:", authUser);
      setLocalUser(authUser);
    }
  }, [user, auth.currentUser]);
  
  // Listen for changes to sessionStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser' && e.newValue) {
        try {
          const newUserData = JSON.parse(e.newValue);
          console.log("Storage event detected - new user data:", newUserData);
          setLocalUser(newUserData);
        } catch (error) {
          console.error("Error parsing updated user data:", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const getAvatarSource = () => {
    if (localUser?.avatar) return localUser.avatar;
    if (localUser?.photoURL) return localUser.photoURL;
    return null;
  };
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const getInitials = () => {
 
    if (localUser?.fullName) {
      const nameParts = localUser.fullName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
      }
      return localUser.fullName.charAt(0);
    }
    
   
    return `${localUser?.fname?.charAt(0) || ''}${localUser?.lname?.charAt(0) || ''}`;
  };
  
  // Get first name for display
  const getDisplayName = () => {
   
    if (localUser?.fname && localUser.fname !== "Guest") {
      return localUser.fname;
    }
    
   
    if (localUser?.fullName) {
      return localUser.fullName.split(' ')[0];
    }

    if (auth.currentUser?.displayName) {
      return auth.currentUser.displayName.split(' ')[0];
    }
    
    return 'Guest';
  };
  
  
  const getFullName = () => {
    if (localUser?.fullName) {
      return localUser.fullName;
    }
    
    if (localUser?.fname || localUser?.lname) {
      return `${localUser.fname || ''} ${localUser.lname || ''}`.trim();
    }
    
    if (auth.currentUser?.displayName) {
      return auth.currentUser.displayName;
    }
    
    return 'Guest';
  };
  
 
  const handleLogout = async () => {
    try {
      
      if (onLogout) {
        onLogout();
      } else {
        await signOut(auth);
        
        sessionStorage.removeItem('currentUser');
        setShowDropdown(false);
        setLocalUser(null);
        navigate("/");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  return (
    <div style={styles.dropdownContainer} ref={dropdownRef}>
      <div style={styles.profileSection} onClick={toggleDropdown}>
        <div style={styles.profilePicContainer}>
          {getAvatarSource() ? (
            <img
              src={getAvatarSource()}
              alt="Profile"
              style={styles.avatarImage}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/profile-placeholder.png";
              }}
            />
          ) : (
            <div style={styles.avatarInitials}>{getInitials()}</div>
          )}
        </div>
        <div style={styles.profileText}>
          <span style={styles.profileName}>{getDisplayName()}</span>
          <span style={styles.dropdownIcon}>▼</span>
        </div>
      </div>
      
      {showDropdown && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <div style={styles.headerName}>{getFullName()}</div>
            <div style={styles.headerSubtitle}>{localUser?.email || auth.currentUser?.email || ''}</div>
          </div>
          <div style={styles.dropdownItems}>
            <div 
              style={styles.dropdownItem} 
              onClick={() => {
                navigate('/profile');
                setShowDropdown(false);
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <svg style={styles.icon} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </div>
            <div 
              style={{...styles.dropdownItem, ...styles.logoutItem}} 
              onClick={handleLogout}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(231, 76, 60, 0.05)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <svg style={styles.logoutIcon} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span style={styles.logoutText}>Logout</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;