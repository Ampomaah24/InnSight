import React, { useEffect, useState, useRef, useCallback } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  // Add auth prompt styles dynamically
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .auth-prompt-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        padding: 2rem;
      }
      
      .auth-prompt {
        background-color: white;
        border-radius: 1rem;
        padding: 2.5rem;
        text-align: center;
        box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.15);
        max-width: 32rem;
        width: 100%;
      }
      
      .auth-icon {
        font-size: 3rem;
        color: var(--primary);
        margin-bottom: 1.5rem;
        background-color: rgba(224, 82, 6, 0.1);
        padding: 1rem;
        border-radius: 50%;
      }
      
      .auth-prompt h2 {
        font-size: 1.75rem;
        margin-bottom: 1rem;
        color: var(--dark);
      }
      
      .auth-prompt p {
        font-size: 1rem;
        margin-bottom: 2rem;
        color: var(--gray);
        line-height: 1.6;
      }
      
      .auth-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }
      
      .login-button, .register-button {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      
      .login-button {
        background-color: var(--primary);
        color: white;
        border: none;
      }
      
      .login-button:hover {
        background-color: var(--primary-dark);
        transform: translateY(-3px);
        box-shadow: 0 4px 10px rgba(224, 82, 6, 0.3);
      }
      
      .register-button {
        background-color: white;
        color: var(--primary);
        border: 2px solid var(--primary);
      }
      
      .register-button:hover {
        background-color: rgba(224, 82, 6, 0.05);
        transform: translateY(-3px);
        box-shadow: 0 4px 10px rgba(224, 82, 6, 0.2);
      }
      
      @media (max-width: 40rem) {
        .auth-buttons {
          flex-direction: column;
        }
        .auth-prompt {
          padding: 2rem 1.5rem;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up function
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  
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
    // Extract first name and last name from fullName if available
    let firstName = "";
    let lastName = "";
    
    if (data.fullName) {
      const nameParts = data.fullName.split(' ');
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(' ') || "";
    } else if (data.fname && data.lname) {
      // Handle old format if it exists
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
      phone: data.phone || "",
      address: data.address || "",
      dateOfBirth: data.dateOfBirth || "",
      bio: data.bio || "",
      email: user.email, // Always use auth email
      photoURL: data.photoURL || user.photoURL || null,
      avatar: data.avatar || null, // For base64 image
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
        console.log("Fetched user data:", userDoc.data()); // Debug log
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
            console.log("Normalized user data:", normalizedData); // Debug log
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
        setLoading(false); // Set loading to false to show the auth prompt
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

  // Handle profile photo click
  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  // Convert image to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file upload for profile photo using base64
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
  
    // Check file size (limit to 500KB for Firestore storage)
    if (file.size > 500 * 1024) {
      setError("Image size is too large. Please select an image under 500KB.");
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
  
      // Convert image to base64
      const base64Image = await convertToBase64(file);
  
      // Update Firestore with the base64 string
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        avatar: base64Image,
        updatedAt: new Date().toISOString()
      });
  
      // Update local state
      setUserData(prev => ({
        ...prev,
        avatar: base64Image,
        updatedAt: new Date().toISOString()
      }));
      
      // Update sessionStorage
      const updatedUser = {
        ...userData,
        avatar: base64Image,
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
  
  // Not logged in state - Show auth prompt
  if (!loading && !userData) {
    return (
      <div className="profile-page">
        <div className="back-button" onClick={handleGoBack}>
          <FaArrowLeft size={16} /> Back
        </div>
        
        <div className="auth-prompt-container">
          <div className="auth-prompt">
            <FaUser className="auth-icon" />
            <h2>Sign in Required</h2>
            <p>You need to sign in or create an account to view your profile.</p>
            <div className="auth-buttons">
              <button 
                className="login-button"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
              <button 
                className="register-button"
                onClick={() => navigate('/register')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = () => {
    return `${userData?.fname?.charAt(0) || ''}${userData?.lname?.charAt(0) || ''}`;
  };

  // Get display name - Updated to prioritize fullName from database
  const getDisplayName = () => {
    if (userData?.fullName) {
      return userData.fullName;
    }
    return `${userData?.fname || ''} ${userData?.lname || ''}`.trim() || 'User Profile';
  };

  // Get avatar source - prioritize base64 avatar over photoURL
  const getAvatarSource = () => {
    if (userData?.avatar) {
      return userData.avatar; // Use base64 image if available
    }
    if (userData?.photoURL) {
      return userData.photoURL; // Fallback to photoURL if available
    }
    return null;
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
            {getAvatarSource() ? (
              <img 
                src={getAvatarSource()} 
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;