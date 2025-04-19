// src/components/ProfileSection.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

const ProfileSection = ({ user }) => {
  const navigate = useNavigate();

  const getAvatarSource = () => {
    if (user?.avatar) return user.avatar;
    if (user?.photoURL) return user.photoURL;
    return "/images/profile-placeholder.png";
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    return `${user?.fname?.charAt(0) || ''}${user?.lname?.charAt(0) || ''}`;
  };

  const isGuest = !user || user.fname === 'Guest';
  // Get just the first name
  const firstName = user?.fname || 'Guest';

  return (
    <div className="profile-section" onClick={handleProfileClick}>
      <div className="profile-bar">
        <div className="profile-avatar">
          <div className={`status-indicator ${isGuest ? 'guest' : 'logged-in'}`}></div>
          {getAvatarSource() ? (
            <img
              src={getAvatarSource()}
              alt="Profile"
              className="profile-pic"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/profile-placeholder.png";
              }}
            />
          ) : (
            <div className="profile-pic avatar-initials">{getInitials()}</div>
          )}
        </div>
        <div className="profile-info">
          <span className="profile-name">{firstName}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;