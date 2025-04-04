import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaSignOutAlt } from "react-icons/fa";

const TopRightProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user profile data - with sessionStorage check
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // First check sessionStorage for cached user data
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        }

        // If not in sessionStorage, get from Firestore
        const currentUser = auth.currentUser;

        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Create user object
            const userObj = {
              id: currentUser.uid,
              fname: userData.firstName || userData.fname || "User",
              lname: userData.lastName || userData.lname || "",
              photoURL: userData.photoURL || currentUser.photoURL || "/images/profile-placeholder.png",
              email: userData.email || currentUser.email
            };

            // Save to state
            setUser(userObj);

            // Cache in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          } else {
            // Fallback to auth data
            const userObj = {
              id: currentUser.uid,
              fname: currentUser.displayName?.split(' ')[0] || "User",
              lname: currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              photoURL: currentUser.photoURL || "/images/profile-placeholder.png",
              email: currentUser.email
            };
            setUser(userObj);
            sessionStorage.setItem('currentUser', JSON.stringify(userObj));
          }
        } else {
          // Default user for demo purposes if not logged in
          setUser({
            fname: "Guest",
            lname: "User",
            photoURL: "/images/profile-placeholder.png"
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to default profile
        setUser({
          fname: "Guest",
          lname: "User",
          photoURL: "/images/profile-placeholder.png"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    // Add listener for storage events to catch updates from other tabs/pages
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser') {
        try {
          const newUserData = JSON.parse(e.newValue);
          if (newUserData) {
            setUser(newUserData);
          }
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

  // Check for profile photo updates every 5 seconds
  useEffect(() => {
    const checkProfileUpdates = () => {
      const sessionUser = sessionStorage.getItem('currentUser');
      if (sessionUser) {
        const parsedUser = JSON.parse(sessionUser);
        // Only update if there's a difference (prevents unnecessary re-renders)
        if (parsedUser.photoURL !== user?.photoURL ||
          parsedUser.fname !== user?.fname ||
          parsedUser.lname !== user?.lname) {
          setUser(parsedUser);
        }
      }
    };

    const intervalId = setInterval(checkProfileUpdates, 5000);

    return () => clearInterval(intervalId);
  }, [user]);

  // Function to handle profile click
  const handleProfileClick = () => {
    navigate("/profile");
  };

  // Function to handle logout
  const handleLogout = () => {
    auth.signOut()
      .then(() => {
        // Clear session storage
        sessionStorage.removeItem('currentUser');
        // Redirect to login page
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="top-profile-container">
      <div className="profile-bar" onClick={handleProfileClick}>
        <div className="profile-info">
          <img
            src={user.photoURL || "/images/profile-placeholder.png"}
            alt="Profile"
            className="profile-pic"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/images/profile-placeholder.png";
            }}
          />
          <span className="profile-name">
            {user.fname} {user.lname}
          </span>
        </div>
      </div>
      <div className="logout-button" onClick={handleLogout}>
        <FaSignOutAlt />
      </div>
    </div>
  );
};

export default TopRightProfile;