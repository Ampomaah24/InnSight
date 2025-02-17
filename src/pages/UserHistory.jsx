import React, { useState } from "react";
import "../assets/styles/UserHistory.css";

const UserHistory = () => {
  const hardcodedReservations = [
    {
      roomType: "Deluxe Suite",
      checkInDate: "2024-01-10",
      checkOutDate: "2024-01-15",
      amountPaid: 1200,
      paymentStatus: "Paid",
      bookingDate: "2023-12-20",
    },
    {
      roomType: "Standard Room",
      checkInDate: "2023-11-05",
      checkOutDate: "2023-11-10",
      amountPaid: 600,
      paymentStatus: "Pending",
      bookingDate: "2023-10-25",
    },
    {
      roomType: "Executive Suite",
      checkInDate: "2023-08-20",
      checkOutDate: "2023-08-25",
      amountPaid: 1800,
      paymentStatus: "Paid",
      bookingDate: "2023-08-10",
    },
    {
      roomType: "Single Room",
      checkInDate: "2023-05-12",
      checkOutDate: "2023-05-14",
      amountPaid: 300,
      paymentStatus: "Refunded",
      bookingDate: "2023-04-28",
    },
  ];

  const [filteredReservations, setFilteredReservations] = useState(hardcodedReservations);
  const [sortType, setSortType] = useState("newest");

  // Sorting function
  const handleSort = (type) => {
    let sortedData = [...filteredReservations];
    if (type === "amount") {
      sortedData.sort((a, b) => b.amountPaid - a.amountPaid);
    } else if (type === "newest") {
      sortedData.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    } else if (type === "oldest") {
      sortedData.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
    }
    setFilteredReservations(sortedData);
    setSortType(type);
  };

  return (
    <div className="history-container">
      <h2>User Booking History</h2>

      <div className="filter-section">
        <label>Sort By: </label>
        <select onChange={(e) => handleSort(e.target.value)} value={sortType}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount">Highest Amount Paid</option>
        </select>
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th>Room Type</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Amount Paid (GHS)</th>
            <th>Payment Status</th>
            <th>Booking Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredReservations.length > 0 ? (
            filteredReservations.map((res, index) => (
              <tr key={index}>
                <td>{res.roomType}</td>
                <td>{new Date(res.checkInDate).toLocaleDateString()}</td>
                <td>{new Date(res.checkOutDate).toLocaleDateString()}</td>
                <td>GHS {res.amountPaid}</td>
                <td className={res.paymentStatus.toLowerCase()}>{res.paymentStatus}</td>
                <td>{new Date(res.bookingDate).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">No past reservations found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserHistory;