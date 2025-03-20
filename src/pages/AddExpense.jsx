import React, { useState } from "react";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Finance.css";

const AddExpense = () => {
  const [expense, setExpense] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false); // Tracks submission state

  const categories = [
    "Utilities",
    "Maintenance & Repairs",
    "Cleaning & Laundry",
    "Security Services",
    "Salaries & Wages",
    "Employee Benefits",
    "Training & Development",
    "Guest Amenities",
    "Food & Beverages",
    "Entertainment & Recreation",
    "Online Marketing",
    "Website & SEO",
    "Loyalty Programs",
    "Office Supplies",
    "Insurance & Legal",
    "Property Taxes & Permits",
  ];

  const handleChange = (e) => {
    setExpense({ ...expense, [e.target.name]: e.target.value });
  };

  const submitExpense = async (e) => {
    e.preventDefault();

    // Validation: Ensure all fields are filled
    if (!expense.amount || !expense.category || !expense.description) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true); // Show loading state

      // Convert amount to number and date to Firestore timestamp
      const docRef = await addDoc(collection(db, "transactions"), {
        type: "expense",
        amount: Number(expense.amount),
        category: expense.category,
        description: expense.description,
        date: new Date(expense.date),
        createdAt: serverTimestamp(),
      });

      console.log("Expense added with ID:", docRef.id);
      alert("Expense added successfully!");

      // Reset form after successful submission
      setExpense({ amount: "", category: "", description: "", date: new Date().toISOString().slice(0, 10) });
      setLoading(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to save expense. Check console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="form-container">
          <h2>Add Expense</h2>
          <form onSubmit={submitExpense}>
            <div className="form-group">
              <label>Amount (GHS)</label>
              <input
                type="number"
                name="amount"
                required
                value={expense.amount}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                required
                value={expense.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                name="description"
                required
                value={expense.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                required
                value={expense.date}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Expense"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;
