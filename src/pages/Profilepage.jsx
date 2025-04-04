import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera, FaUser, FaPhone, FaCalendarAlt, FaMapMarkerAlt, FaEdit, FaEnvelope } from "react-icons/fa";
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
  const [localImage, setLocalImage] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        
        // Check sessionStorage first for cached user data
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUserData(parsedUser);
          setFormData({
            phone: parsedUser.phone || "",
            address: parsedUser.address || "",
            dateOfBirth: parsedUser.dateOfBirth || "",
            bio: parsedUser.bio || ""
          });
          setLoading(false);
          return;
        }

        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Create a normalized user object
            const normalizedUserData = {
              id: currentUser.uid,
              fname: data.fname || data.firstName || currentUser.displayName?.split(' ')[0] || "",
              lname: data.lname || data.lastName || currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              phone: data.phone || "",
              address: data.address || "",
              dateOfBirth: data.dateOfBirth || "",
              bio: data.bio || "",
              email: data.email || currentUser.email,
              photoURL: data.photoURL || currentUser.photoURL || null
            };
            
            setUserData(normalizedUserData);
            setFormData({
              phone: normalizedUserData.phone,
              address: normalizedUserData.address,
              dateOfBirth: normalizedUserData.dateOfBirth,
              bio: normalizedUserData.bio
            });
            
            // Cache user data in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(normalizedUserData));
          } else {
            // Default values if no data exists
            const defaultUserObj = {
              id: currentUser.uid,
              fname: currentUser.displayName?.split(' ')[0] || "",
              lname: currentUser.displayName?.split(' ').slice(1).join(' ') || "",
              phone: "",
              address: "",
              dateOfBirth: "",
              bio: "",
              email: currentUser.email,
              photoURL: currentUser.photoURL || null
            };
            setUserData(defaultUserObj);
            setFormData({
              phone: "",
              address: "",
              dateOfBirth: "",
              bio: ""
            });
            
            // Cache default user data
            sessionStorage.setItem('currentUser', JSON.stringify(defaultUserObj));
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({
      ...prev,
      phone: value || ""
    }));
    setPhoneError(value ? !isValidPhoneNumber(value) : false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      
      // Create a local preview of the image
      const reader = new FileReader();
      reader.onload = (event) => {
        setLocalImage(event.target.result);
      };
      reader.readAsDataURL(file);
      
      // In a real implementation, you would upload to Firebase Storage
      // For now, we'll simulate it and update sessionStorage as well
      setTimeout(async () => {
        try {
          // Update local state
          const updatedUserData = {
            ...userData,
            photoURL: "local-image" // This is a flag to use the local image
          };
          setUserData(updatedUserData);
          
          // Update Firestore - make sure this field exists
          const currentUser = auth.currentUser;
          if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, {
              photoURL: "local-image"
            });
          }
          
          // Update sessionStorage to reflect changes across the app
          const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
          const updatedSessionUser = {
            ...sessionUser,
            photoURL: "local-image",
            localImageData: localImage // Store the base64 image data
          };
          sessionStorage.setItem('currentUser', JSON.stringify(updatedSessionUser));
          
          // Show success message
          setUpdateSuccess(true);
          setTimeout(() => setUpdateSuccess(false), 3000);
          
          // Trigger storage event for other tabs
          window.dispatchEvent(new Event('storage'));
        } catch (error) {
          console.error("Error updating photo in database:", error);
          alert("Failed to save photo to database. Local preview only.");
        } finally {
          setUploading(false);
        }
      }, 1000); // Shorter network delay
      
    } catch (error) {
      console.error("Error handling image:", error);
      alert("Failed to process image. Please try again.");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number if provided
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      setPhoneError(true);
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setLoading(true);
        
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
        
        // Update sessionStorage to reflect changes across the app
        const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const updatedSessionUser = {
          ...sessionUser,
          ...updateData
        };
        sessionStorage.setItem('currentUser', JSON.stringify(updatedSessionUser));
        
        // Exit edit mode
        setEditing(false);
        
        // Show success message
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
        
        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1); // This will navigate to the previous page
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-spinner"></div>
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
        <FaArrowLeft />
      </div>
      
      {updateSuccess && (
        <div className="success-message">Profile updated successfully!</div>
      )}

      <div className="profile-header">
        <div className="profile-avatar-container">
          <div 
            className={`profile-avatar ${uploading ? 'uploading' : ''}`} 
            onClick={handlePhotoClick}
          >
            {userData?.photoURL === "local-image" && localImage ? (
              <img src={localImage} alt="Profile" />
            ) : userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt="Profile" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/150?text=User";
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
        >
          {editing ? "Cancel" : <><FaEdit /> Edit Profile</>}
        </button>
      </div>

      <div className="profile-content">
        {editing ? (
          <form className="edit-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>Personal Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name (from registration)</label>
                  <input
                    type="text"
                    value={getDisplayName()}
                    disabled
                    className="disabled-input"
                  />
                  <small>Name is set during registration</small>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={auth.currentUser?.email || ""}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email cannot be changed</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group phone-input-group">
                  <label>Phone Number</label>
                  <PhoneInput
                    international
                    defaultCountry="GH"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={phoneError ? "phone-input error" : "phone-input"}
                  />
                  {phoneError && <small className="error-message">Please enter a valid phone number</small>}
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Contact Information</h2>
              <div className="form-group">
                <label>Address</label>
                <textarea
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
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us a bit about yourself"
                  rows="4"
                ></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={phoneError && formData.phone !== ""}
              >
                Save Changes
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