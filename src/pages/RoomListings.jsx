import React from "react";
import "../assets/styles/RoomListings.css"; // Updated CSS import

const RoomListings = () => {
  // Room Data
  const conferenceRooms = [
    {
      title: "Single Room",
      description:
        "A cozy and well-appointed space designed for solo travelers. Features a plush single bed, a sleek work desk, and a private en-suite bathroom. Enjoy high-speed Wi-Fi, a flat-screen TV, and complimentary refreshments.",
      image: "/images/big-conference.jpg",
    },
    {
      title: "Double Room",
      description:
        "Elegantly designed for couples or solo guests seeking extra comfort. Features a luxurious queen-sized bed, a stylish seating area, and premium amenities like air conditioning, minibar, and a smart TV.",
      image: "/images/long-conference.jpg",
    },
    {
      title: "Twin-Bed Room",
      description:
        "Designed for shared accommodation, this room offers two separate beds, making it ideal for friends or family. Equipped with a work desk, storage space, free Wi-Fi, and a relaxing ambiance.",
      image: "/images/small-conference.jpg",
    },
  ];

  return (
    <div className="rlistings-page">
      <h2 className="page-title">Room Listings</h2>
      <div className="rlistings-list">
        {conferenceRooms.map((room, index) => (
          <div key={index} className="rlistings-card">
            <div className="rlistings-info">
              <h3 className="rlistings-title">{room.title}</h3>
              <p className="rlistings-description">{room.description}</p>
              <button className="learn-more">Learn More →</button>
            </div>
            <div className="rlistings-image">
              <img src={room.image} alt={room.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomListings;
