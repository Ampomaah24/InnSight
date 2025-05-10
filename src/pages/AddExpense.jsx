import React, { useState } from "react";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Finance.css";

const AddExpense = () => {
  const [expense, setExpense] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    // Clear success message when form is being edited
    if (success) setSuccess(false);
  };

  const submitExpense = async (e) => {
    e.preventDefault();

    // Validation: Ensure all fields are filled
    if (!expense.amount || !expense.category || !expense.description) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

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
      
      // Show success message
      setSuccess(true);

      // Reset form after successful submission
      setExpense({
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().slice(0, 10)
      });
      
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
        <div className="expense-page">
          <div className="expense-header">
            <h1 className="page-title">Add Expense</h1>
            <p className="expense-subheading">Record a new expense transaction</p>
          </div>
          
          <div className="expense-form-container">
            {success && (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <p>Expense added successfully!</p>
              </div>
            )}
            
            <form onSubmit={submitExpense}>
            <div className="form-group">
  <label htmlFor="amount">Amount (GHS)</label>
  <div className="amount-input-container">
    <div className="currency-prefix">₵</div>
    <input
      id="amount"
      type="number"
      name="amount"
      required
      value={expense.amount}
      onChange={handleChange}
      placeholder="0.00"
      step="0.01"
      min="0"
    />
  </div>
</div>


              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
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
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  type="text"
                  name="description"
                  required
                  value={expense.description}
                  onChange={handleChange}
                  placeholder="Brief description of the expense"
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  required
                  value={expense.date}
                  onChange={handleChange}
                />
              </div>

              <button 
                type="submit" 
                className="expense-save-btn" 
                disabled={loading}
              >
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  "Save Expense"
                )}
              </button>
            </form>
            
         
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;

