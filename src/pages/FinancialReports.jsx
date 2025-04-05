import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "../assets/styles/FinancialReports.css";

const FinancialReports = () => {
  const [incomeData, setIncomeData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('income');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Check authentication and authorization
  // Check authentication and authorization
useEffect(() => {
  const auth = getAuth();
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }
    
    // Check user role
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
        
        // Set the role but don't redirect - we'll show the unauthorized message in the render
        // Removed the navigation to "/admin-dashboard"
        
        // Only fetch data if superadmin
        if (userData.role === "superadmin") {
          fetchFinancialData();
        } else {
          setLoading(false); // Make sure to stop loading
        }
      } else {
        // No user role found
        navigate("/services");
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      navigate("/services");
    }
  });
  
  return () => unsubscribe();
}, [navigate]);
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "transactions"));
      const transactions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate ? data.date.toDate() : new Date(data.date),
        };
      });

      // Sort transactions by date (newest first)
      transactions.sort((a, b) => b.date - a.date);

      const income = transactions.filter((t) => t.type === "income");
      const expenses = transactions.filter((t) => t.type === "expense");

      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpenses;

      setIncomeData(income);
      setExpenseData(expenses);
      setTotalIncome(totalIncome);
      setTotalExpenses(totalExpenses);
      setBalance(balance);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      setLoading(false);
    }
  };

  // Generate PDF Report
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("times", "bold");
    doc.setFontSize(16);

    doc.text("FINANCIAL STATEMENT", 75, 15);
    doc.setFontSize(12);
    doc.text("For the period ending April 4, 2025", 70, 22);

    autoTable(doc, {
      startY: 30,
      head: [["ITEM", "AMOUNT (GHS)"]],
      body: [
        ["Total Income", `${totalIncome.toFixed(2)}`],
        ["Total Expenses", `${totalExpenses.toFixed(2)}`],
        ["Net Balance", `${balance.toFixed(2)}`],
      ],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "right" },
      },
    });

    // Add transaction details
    let y = doc.lastAutoTable.finalY + 10;
    doc.text("Transaction Details", 14, y);
    y += 10;

    const tableData = activeTab === 'income' ? 
      incomeData.map(t => [
        t.date.toLocaleDateString(),
        t.category,
        t.description,
        `${t.amount.toFixed(2)}`
      ]) : 
      expenseData.map(t => [
        t.date.toLocaleDateString(),
        t.category,
        t.description,
        `${t.amount.toFixed(2)}`
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Date", "Category", "Description", "Amount (GHS)"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: "right" },
      },
    });

    doc.save(`Financial_Report_${activeTab}.pdf`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Show unauthorized message if not superadmin
  if (userRole !== "superadmin") {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="unauthorized-container">
            <h1>Access Restricted</h1>
            <p>You need superadmin privileges to view financial reports.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        {loading ? (
          <div className="loading-container">
            <p>Loading financial data...</p>
          </div>
        ) : (
          <div className="financial-container">
            <h1 className="financial-title">Financial Overview</h1>
            
            <div className="financial-cards">
              <div className="financial-card revenue-card">
                <div className="card-label">Total Revenue</div>
                <div className="card-amount">GHS {formatCurrency(totalIncome)}</div>
              </div>
              
              <div className="financial-card expenses-card">
                <div className="card-label">Total Expenses</div>
                <div className="card-amount">GHS {formatCurrency(totalExpenses)}</div>
              </div>
              
              <div className="financial-card balance-card">
                <div className="card-label">Net Balance</div>
                <div className="card-amount">GHS {formatCurrency(balance)}</div>
              </div>
            </div>
            
            <div className="transaction-section">
              <div className="tab-selector">
                <div 
                  className={`tab ${activeTab === 'income' ? 'active' : ''}`}
                  onClick={() => setActiveTab('income')}
                >
                  Income Transactions
                </div>
                <div 
                  className={`tab ${activeTab === 'expense' ? 'active' : ''}`}
                  onClick={() => setActiveTab('expense')}
                >
                  Expense Transactions
                </div>
              </div>
              
              <div className="export-actions">
                <button onClick={generatePDF} className="export-button">
                  Export Report
                </button>
              </div>
              
              <div className="section-header">
                <h2>{activeTab === 'income' ? 'Income Transactions' : 'Expense Transactions'}</h2>
              </div>
              
              <div className="transaction-table-container">
                <table className={`transaction-table ${activeTab === 'expense' ? 'expenses-table' : ''}`}>
                  <thead>
                    <tr>
                      <th className="amount-column">Amount</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'income' ? (
                      incomeData.length > 0 ? (
                        incomeData.map((transaction, index) => (
                          <tr key={transaction.id || index}>
                            <td className="amount-cell">GHS {formatCurrency(transaction.amount)}</td>
                            <td>{transaction.category}</td>
                            <td>{transaction.description}</td>
                            <td>{transaction.date.toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">No income transactions found</td>
                        </tr>
                      )
                    ) : (
                      expenseData.length > 0 ? (
                        expenseData.map((transaction, index) => (
                          <tr key={transaction.id || index}>
                            <td className="amount-cell">GHS {formatCurrency(transaction.amount)}</td>
                            <td>{transaction.category}</td>
                            <td>{transaction.description}</td>
                            <td>{transaction.date.toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">No expense transactions found</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReports;