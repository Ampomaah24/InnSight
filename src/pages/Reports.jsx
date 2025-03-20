import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/Reports.css"; // Import the new CSS file

const Reports = () => {
  const [incomeTransactions, setIncomeTransactions] = useState([]);
  const [expenseTransactions, setExpenseTransactions] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const transactionData = querySnapshot.docs.map((doc) => doc.data());

        // Separate income and expense transactions
        const income = transactionData.filter((t) => t.type === "income");
        const expenses = transactionData.filter((t) => t.type === "expense");

        // Calculate totals
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        setIncomeTransactions(income);
        setExpenseTransactions(expenses);
        setTotalIncome(totalIncome);
        setTotalExpenses(totalExpenses);
        setBalance(totalIncome - totalExpenses);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="reports-container">
          <h2>Financial Overview</h2>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="card card-income">
              <p className="card-title">Total Revenue</p>
              <h2 className="card-value">GHS {totalIncome.toFixed(2)}</h2>
            </div>
            <div className="card card-expense">
              <p className="card-title">Total Expenses</p>
              <h2 className="card-value">GHS {totalExpenses.toFixed(2)}</h2>
            </div>
            <div className="card card-balance">
              <p className="card-title">Net Balance</p>
              <h2 className="card-value">GHS {balance.toFixed(2)}</h2>
            </div>
          </div>

          {/* Income Transactions Table */}
          <div className="transaction-section">
            <h3>Income Transactions</h3>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {incomeTransactions.map((t, index) => (
                  <tr key={index}>
                    <td className="type-income">GHS {t.amount.toFixed(2)}</td>
                    <td>{t.category}</td>
                    <td>{t.description}</td>
                    <td>
                      {t.date && t.date.toDate
                        ? t.date.toDate().toLocaleDateString() // Firestore Timestamp
                        : new Date(t.date).toLocaleDateString()} {/* ISO String */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense Transactions Table */}
          <div className="transaction-section">
            <h3>Expense Transactions</h3>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenseTransactions.map((t, index) => (
                  <tr key={index}>
                    <td className="type-expense">GHS {t.amount.toFixed(2)}</td>
                    <td>{t.category}</td>
                    <td>{t.description}</td>
                    <td>
                      {t.date && t.date.toDate
                        ? t.date.toDate().toLocaleDateString() // Firestore Timestamp
                        : new Date(t.date).toLocaleDateString()} {/* ISO String */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;
