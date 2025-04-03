import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCamera, FaUser, FaPhone, FaCalendarAlt, FaMapMarkerAlt, FaEdit } from "react-icons/fa";
import "../assets/styles/ProfilePage.css";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    bio: ""
  });
  const [localImage, setLocalImage] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setFormData({
              fname: data.fname || "",
              lname: data.lname || "",
              phone: data.phone || "",
              address: data.address || "",
              dateOfBirth: data.dateOfBirth || "",
              bio: data.bio || ""
            });
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
      
      // Simulate updating the database
      setTimeout(() => {
        // In a real implementation, you would upload to Firebase Storage
        // and update the user document with the URL
        setUserData(prev => ({
          ...prev,
          photoURL: "local-image" // This is a flag to use the local image
        }));
        
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
        setUploading(false);
      }, 1500); // Simulate network delay
      
    } catch (error) {
      console.error("Error handling image:", error);
      alert("Failed to process image. Please try again.");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, formData);
        setUserData(prev => ({
          ...prev,
          ...formData
        }));
        setEditing(false);
        setUpdateSuccess(true);
        
        setTimeout(() => {
          setUpdateSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
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
    return `${userData?.fname || ''} ${userData?.lname || ''}`;
  };

  return (
    <div className="profile-page">
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
              <img src={userData.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}
            <div className="avatar-edit">
              {uploading ? (
                <div className="avatar-uploading">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <FaCamera />
              )}
            </div>
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
          onClick={() => setEditing(!editing)}
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
                  <label>First Name</label>
                  <input
                    type="text"
                    name="fname"
                    value={formData.fname}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lname"
                    value={formData.lname}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-row">
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
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="form-row">
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
              <button type="submit" className="save-button">Save Changes</button>
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