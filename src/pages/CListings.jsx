import React from "react";
import "../assets/styles/CListings.css"; // Updated CSS import

const CListings = () => {
  // Room Data
  const conferenceRooms = [
    {
      title: "Big Conference Room",
      description:
        "A spacious and fully equipped room ideal for large corporate meetings, seminars, and events. Includes a projector, high-speed internet, and modern seating.",
      image: "/images/big-conference.jpg",
    },
    {
      title: "Long Conference Room",
      description:
        "Perfect for board meetings and executive discussions. This long conference room features a sleek table, premium chairs, and video conferencing facilities.",
      image: "/images/long-conference.jpg",
    },
    {
      title: "Small Conference Room",
      description:
        "A cozy and professional space for small team meetings or private discussions. Features soundproofing, a smart TV, and comfortable seating.",
      image: "/images/small-conference.jpg",
    },
  ];

  return (
    <div className="clistings-page">
      <h2 className="page-title">Conference Room Listings</h2>
      <div className="clistings-list">
        {conferenceRooms.map((room, index) => (
          <div key={index} className="clistings-card">
            <div className="clistings-info">
              <h3 className="clistings-title">{room.title}</h3>
              <p className="clistings-description">{room.description}</p>
              <button className="learn-more">Learn More →</button>
            </div>
            <div className="clistings-image">
              <img src={room.image} alt={room.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CListings;
