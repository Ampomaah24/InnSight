import React, { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, 
  FaCamera, 
  FaUser, 
  FaPhone, 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaEdit, 
  FaEnvelope,
  FaExclamationTriangle
} from "react-icons/fa";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../assets/styles/ProfilePage.css";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    dateOfBirth: "",
    bio: ""
  });
  const [phoneError, setPhoneError] = useState(false);
  const [error, setError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Normalize user data from different sources
  const normalizeUserData = useCallback((user, data) => {
    return {
      id: user.uid,
      fname: data.fname || data.firstName || user.displayName?.split(' ')[0] || "",
      lname: data.lname || data.lastName || user.displayName?.split(' ').slice(1).join(' ') || "",
      phone: data.phone || "",
      address: data.address || "",
      dateOfBirth: data.dateOfBirth || "",
      bio: data.bio || "",
      email: user.email, // Always use auth email
      photoURL: data.photoURL || user.photoURL || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }, []);

  // Fetch user data from Firestore
  const fetchUserData = useCallback(async (user) => {
    if (!user) return null;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load profile data. Please refresh the page.");
      return null;
    }
  }, []);

  // Set up auth state listener and fetch user data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const data = await fetchUserData(user);
          
          if (data) {
            const normalizedData = normalizeUserData(user, data);
            setUserData(normalizedData);
            setFormData({
              phone: normalizedData.phone,
              address: normalizedData.address,
              dateOfBirth: normalizedData.dateOfBirth,
              bio: normalizedData.bio
            });
            
            // Update sessionStorage with current user data
            sessionStorage.setItem('currentUser', JSON.stringify(normalizedData));
          } else {
            setError("User profile not found. Please contact support.");
          }
        } catch (err) {
          console.error("Error in auth state change:", err);
          setError("Failed to load profile. Please try again later.");
        } finally {
          setLoading(false);
        }
      } else {
        // User is logged out
        setUserData(null);
        sessionStorage.removeItem('currentUser');
        navigate('/login');
      }
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, [navigate, fetchUserData, normalizeUserData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle phone input changes with validation
  const handlePhoneChange = (value) => {
    setFormData(prev => ({
      ...prev,
      phone: value || ""
    }));
    setPhoneError(value ? !isValidPhoneNumber(value) : false);
  };

  // Handle profile photo click to open file dialog
  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  // Handle file upload for profile photo
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
  
    try {
      setUploading(true);
      setError(null);
  
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("You must be logged in to upload a photo");
        return;
      }
  
      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);
  
      // Upload image to Firebase Storage
      await uploadBytes(storageRef, file);
  
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
  
      // Update Firestore with the photoURL
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });
  
      // Update local state
      setUserData(prev => ({
        ...prev,
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      }));
      
      // Update sessionStorage
      const updatedUser = {
        ...userData,
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
  
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  
  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number if provided
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      setPhoneError(true);
      return;
    }

    // Validate date of birth if provided
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        setError("Date of birth cannot be in the future");
        return;
      }
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("You must be logged in to update your profile");
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Create a data object for updating
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      const userDocRef = doc(db, "users", currentUser.uid);
      
      // Update Firestore
      await updateDoc(userDocRef, updateData);
      
      // Update local state
      const updatedUserData = {
        ...userData,
        ...updateData
      };
      setUserData(updatedUserData);
      
      // Update sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUserData));
      
      // Exit edit mode
      setEditing(false);
      
      // Show success message
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Navigate back handler
  const handleGoBack = () => {
    navigate(-1);
  };

  // Dismiss error handler
  const dismissError = () => {
    setError(null);
  };

  // Loading state
  if (loading && !userData) {
    return (
      <div className="profile-page">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your profile...</p>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = () => {
    return `${userData?.fname?.charAt(0) || ''}${userData?.lname?.charAt(0) || ''}`;
  };

  // Get display name
  const getDisplayName = () => {
    return `${userData?.fname || ''} ${userData?.lname || ''}`.trim() || 'User Profile';
  };

  return (
    <div className="profile-page profile-fullwidth">
      <div className="back-button" onClick={handleGoBack}>
        <FaArrowLeft size={16} /> Back
      </div>
      
      {/* Success Message */}
      {updateSuccess && (
        <div className="status-message success-message">
          <span>Profile updated successfully!</span>
          <button onClick={() => setUpdateSuccess(false)} className="dismiss-button">×</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="status-message error-message">
          <FaExclamationTriangle /> <span>{error}</span>
          <button onClick={dismissError} className="dismiss-button">×</button>
        </div>
      )}

      <div className="profile-header">
        <div className="profile-avatar-container">
          <div 
            className={`profile-avatar ${uploading ? 'uploading' : ''}`} 
            onClick={handlePhotoClick}
            title="Click to change profile photo"
          >
            {userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt="Profile" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.png";
                }}
              />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}
            
            {uploading ? (
              <div className="avatar-uploading">
                <div className="spinner"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="avatar-edit">
                <FaCamera />
                <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Change Photo</div>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
            aria-label="Upload profile picture"
          />
        </div>
        
        <div className="profile-title">
          <h1>My Profile</h1>
          <p className="profile-name">{getDisplayName()}</p>
          <p className="profile-email">{auth.currentUser?.email || ""}</p>
        </div>
        
        <button 
          className={`edit-profile-button ${editing ? 'active' : ''}`}
          onClick={() => setEditing(prev => !prev)}
          aria-label={editing ? "Cancel editing" : "Edit profile"}
        >
          {editing ? "Cancel" : <><FaEdit /> Edit Profile</>}
        </button>
      </div>

      <div className="profile-content">
        {editing ? (
          <form className="edit-form" onSubmit={handleSubmit} noValidate>
            <div className="form-section">
              <h2>Personal Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name (from registration)</label>
                  <input
                    type="text"
                    id="fullName"
                    value={getDisplayName()}
                    disabled
                    className="disabled-input"
                  />
                  <small>Name is set during registration</small>
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={auth.currentUser?.email || ""}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email cannot be changed</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group phone-input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <PhoneInput
                    international
                    defaultCountry="GH"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    id="phone"
                    className={phoneError ? "phone-input error" : "phone-input"}
                  />
                  {phoneError && <small className="error-message">Please enter a valid phone number</small>}
                </div>
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Contact Information</h2>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            <div className="form-section">
              <h2>About Me</h2>
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us a bit about yourself"
                  rows="4"
                  maxLength={500}
                ></textarea>
                <small className="character-count">{formData.bio?.length || 0}/500 characters</small>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={(phoneError && formData.phone !== "") || loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="info-sections">
            <div className="info-section">
              <h2>Personal Information</h2>
              
              <div className="info-row">
                <div className="info-icon"><FaUser /></div>
                <div className="info-details">
                  <span className="info-label">Name</span>
                  <span className="info-value">{getDisplayName()}</span>
                </div>
              </div>
              
              <div className="info-row">
                <div className="info-icon"><FaEnvelope /></div>
                <div className="info-details">
                  <span className="info-label">Email</span>
                  <span className="info-value">{auth.currentUser?.email || ""}</span>
                </div>
              </div>
              
              {userData?.phone && (
                <div className="info-row">
                  <div className="info-icon"><FaPhone /></div>
                  <div className="info-details">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{userData.phone}</span>
                  </div>
                </div>
              )}
              
              {userData?.dateOfBirth && (
                <div className="info-row">
                  <div className="info-icon"><FaCalendarAlt /></div>
                  <div className="info-details">
                    <span className="info-label">Date of Birth</span>
                    <span className="info-value">{userData.dateOfBirth}</span>
                  </div>
                </div>
              )}
            </div>
            
            {userData?.address && (
              <div className="info-section">
                <h2>Contact Information</h2>
                <div className="info-row">
                  <div className="info-icon"><FaMapMarkerAlt /></div>
                  <div className="info-details">
                    <span className="info-label">Address</span>
                    <span className="info-value">{userData.address}</span>
                  </div>
                </div>
              </div>
            )}
            
            {userData?.bio && (
              <div className="info-section">
                <h2>About Me</h2>
                <div className="bio-content">{userData.bio}</div>
              </div>
            )}
            
            {!userData?.phone && !userData?.dateOfBirth && !userData?.address && !userData?.bio && (
              <div className="empty-profile">
                <p>Your profile is empty. Click "Edit Profile" to add your information.</p>
                <button 
                  className="edit-button"
                  onClick={() => setEditing(true)}
                >
                  <FaEdit /> Edit Profile
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;