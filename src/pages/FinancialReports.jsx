import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

import LoadingState from "../components/LoadingState";
import "../assets/styles/FinancialReports.css";

const FinancialReports = () => {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('income');
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('current-month'); // Default to current month
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, loading: userLoading } = useUser();

  // Define simplified hotel categories
  const hotelCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'booking', label: 'Room Booking' },
    { value: 'food', label: 'Food Ordering' },
    { value: 'expenses', label: 'Expenses' }
  ];

  // Handle category change with tab synchronization
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    
    // Sync the tab with the category
    if (newCategory === 'expenses') {
      // When "Expenses" category is selected, show the expense tab
      setActiveTab('expense');
    } else if (newCategory === 'booking' || newCategory === 'food') {
      // When "Room Booking" or "Food Ordering" is selected, show the income tab
      setActiveTab('income');
    }
    // For "All Categories", don't change the tab to allow viewing all data
  };

  // Handle tab change with category synchronization
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Sync category with tab
    if (tab === 'expense') {
      // When switching to expense tab, select "Expenses" category
      // but only if the current category is not already "Expenses"
      if (selectedCategory !== 'expenses') {
        setSelectedCategory('expenses');
      }
    } else if (tab === 'income') {
      // When switching to income tab, reset to "All Categories" 
      // but only if the current category is "Expenses"
      if (selectedCategory === 'expenses') {
        setSelectedCategory('all');
      }
    }
  };

  // Function to get date range based on timeFrame
  const getDateRange = () => {
    const now = new Date();
    
    // For predefined ranges
    if (timeFrame === 'current-month') {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate, endDate, label: `${startDate.toLocaleString('default', { month: 'long' })} ${startDate.getFullYear()}` };
    }
    
    if (timeFrame === 'current-year') {
      const startDate = new Date(now.getFullYear(), 0, 1);
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate, endDate, label: `Year ${startDate.getFullYear()}` };
    }
    
    if (timeFrame === 'all-time') {
      return { startDate: null, endDate: null, label: 'All Time' };
    }
    
    // For specific month selection (format: 'month-YYYY-MM')
    if (timeFrame.startsWith('month-')) {
      const [, year, month] = timeFrame.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      return { 
        startDate, 
        endDate, 
        label: `${startDate.toLocaleString('default', { month: 'long' })} ${startDate.getFullYear()}` 
      };
    }
    
    // For specific year selection (format: 'year-YYYY')
    if (timeFrame.startsWith('year-')) {
      const [, year] = timeFrame.split('-');
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      return { startDate, endDate, label: `Year ${startDate.getFullYear()}` };
    }
    
    // Default fallback
    return { startDate: null, endDate: null, label: 'Custom Period' };
  };
  
  // Get date range for current filter
  const { startDate, endDate, label: periodLabel } = useMemo(() => getDateRange(), [timeFrame]);

  // Helper to get the selected category label
  const getCategoryLabel = () => {
    const category = hotelCategories.find(cat => cat.value === selectedCategory);
    return category ? category.label : 'All Categories';
  };

  // Derived state using useMemo to improve performance
  const {
    filteredTransactions,
    incomeData,
    expenseData,
    totalIncome,
    totalExpenses,
    balance
  } = useMemo(() => {
    // Filter transactions based on date range and categories
    let filtered = [...transactions];
    
    // Apply date filter if we have a date range
    if (startDate && endDate) {
      filtered = filtered.filter(t => 
        t.date >= startDate && t.date <= endDate
      );
    }

    // Apply category filters
    if (selectedCategory !== 'all') {
      // Main category filtering
      switch (selectedCategory) {
        case 'booking':
          filtered = filtered.filter(t => 
            t.transactionType === 'booking' || 
            t.category?.toLowerCase().includes('room') || 
            t.category?.toLowerCase().includes('booking') ||
            t.description?.toLowerCase().includes('room') ||
            t.description?.toLowerCase().includes('booking')
          );
          break;
        case 'food':
          filtered = filtered.filter(t => 
            t.transactionType === 'food' || 
            t.category?.toLowerCase().includes('food') || 
            t.category?.toLowerCase().includes('restaurant') || 
            t.category?.toLowerCase().includes('catering') ||
            t.description?.toLowerCase().includes('food') ||
            t.description?.toLowerCase().includes('meal') ||
            t.description?.toLowerCase().includes('restaurant')
          );
          break;
        case 'expenses':
          filtered = filtered.filter(t => t.type === 'expense');
          break;
        default:
          // No filtering
          break;
      }
    }
    
    // Split into income and expense
    const income = filtered.filter(t => t.type === "income");
    const expenses = filtered.filter(t => t.type === "expense");
    
    // Calculate totals
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      filteredTransactions: filtered,
      incomeData: income,
      expenseData: expenses,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    };
  }, [transactions, startDate, endDate, selectedCategory]);

  // Extract available months and years from transaction data
  useEffect(() => {
    if (!transactions.length) return;
    
    const months = new Set();
    const years = new Set();
    
    transactions.forEach(transaction => {
      const date = transaction.date;
      if (!date) return;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Store in format 'YYYY-MM'
      months.add(`${year}-${month.toString().padStart(2, '0')}`);
      years.add(year.toString());
    });
    
    // Sort months in descending order (newest first)
    setAvailableMonths(Array.from(months).sort().reverse());
    setAvailableYears(Array.from(years).sort().reverse());
  }, [transactions]);

  useEffect(() => {
    // Only fetch data if user is superadmin
    if (userLoading) return;
    
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    if (isSuperAdmin) {
      fetchFinancialData();
    } else {
      setLoading(false);
    }
  }, [currentUser, isSuperAdmin, userLoading, navigate]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Create a query with ordering
      const transactionsQuery = query(
        collection(db, "transactions"),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(transactionsQuery);
      const transactionsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        };
      });

      setTransactions(transactionsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      setLoading(false);
    }
  };

  // Generate PDF Report
  const generatePDF = async () => {
    try {
      setIsPdfGenerating(true);
      
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);

      // Report header
      doc.text("AMPOMAAH TOURIST HOTEL", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      doc.setFontSize(14);
      doc.text("INFLOW AND OUTFLOW REPORT", doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
      
      // Date and category information
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Report Period: ${periodLabel}`, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });
      doc.text(`Category: ${getCategoryLabel()}`, doc.internal.pageSize.getWidth() / 2, 33, { align: "center" });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.getWidth() / 2, 38, { align: "center" });

      // Summary section
      autoTable(doc, {
        startY: 45,
        head: [["SUMMARY", "AMOUNT (GHS)"]],
        body: [
          ["Total Income", `${totalIncome.toFixed(2)}`],
          ["Total Expenses", `${totalExpenses.toFixed(2)}`],
          ["Net Balance", `${balance.toFixed(2)}`],
        ],
        theme: "grid",
        headStyles: { 
          fillColor: [219, 108, 36],
          textColor: [255, 255, 255],
          fontStyle: "bold"
        },
        styles: { fontSize: 10, halign: "center" },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          1: { halign: "right" },
        },
      });

      // Add income transactions
      let y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Income Transactions", 14, y);
      y += 5;

      if (incomeData.length > 0) {
        const incomeTableData = incomeData.map(t => [
          t.date.toLocaleDateString(),
          t.category || "Uncategorized",
          t.description,
          `${t.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Date", "Category", "Description", "Amount (GHS)"]],
          body: incomeTableData,
          theme: "grid",
          headStyles: { 
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
            fontStyle: "bold"
          },
          styles: { fontSize: 9 },
          columnStyles: {
            3: { halign: "right" },
          },
        });
        
        y = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No income transactions found for this period and category", 14, y + 5);
        y += 15;
      }

      // Add expense transactions
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Expense Transactions", 14, y);
      y += 5;

      if (expenseData.length > 0) {
        const expenseTableData = expenseData.map(t => [
          t.date.toLocaleDateString(),
          t.category || "Uncategorized",
          t.description,
          `${t.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Date", "Category", "Description", "Amount (GHS)"]],
          body: expenseTableData,
          theme: "grid",
          headStyles: { 
            fillColor: [244, 67, 54],
            textColor: [255, 255, 255],
            fontStyle: "bold"
          },
          styles: { fontSize: 9 },
          columnStyles: {
            3: { halign: "right" },
          },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No expense transactions found for this period and category", 14, y + 5);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${i} of ${pageCount} - Ampomaah Tourist Hotel Financial Report`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Create file name with period and category information
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const periodForFilename = periodLabel.replace(/\s+/g, '_');
      const categoryForFilename = getCategoryLabel().replace(/\s+/g, '_');
      doc.save(`Ampomaah_Financial_Report_${periodForFilename}_${categoryForFilename}_${timestamp}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Show unauthorized message if not superadmin
  if (!userLoading && !isSuperAdmin) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <AccessRestricted 
            message="You don't have permission to access financial reports."
            contactInfo="the hotel administrator"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        {loading || userLoading ? (
          <LoadingState message="Loading financial data..." />
        ) : (
          <div className="financial-container">
            <div className="financial-header">
              <h1 className="financial-title">Financial Overview</h1>
              <div className="filter-pills">
                <div className="filter-pill period-pill">{periodLabel}</div>
                <div className="filter-pill category-pill">{getCategoryLabel()}</div>
              </div>
            </div>
            
            {/* Time period and filter controls */}
            <div className="filters-container">
              <div className="filter-group time-filter">
                <label htmlFor="time-frame">Time Period:</label>
                <select
                  id="time-frame"
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value)}
                  className="filter-select"
                >
                  <optgroup label="Preset Periods">
                    <option value="current-month">Current Month</option>
                    <option value="current-year">Current Year</option>
                    <option value="all-time">All Time</option>
                  </optgroup>
                  
                  {availableMonths.length > 0 && (
                    <optgroup label="Monthly Reports">
                      {availableMonths.map(month => {
                        const [year, monthNum] = month.split('-');
                        const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                        const monthName = monthDate.toLocaleString('default', { month: 'long' });
                        return (
                          <option key={month} value={`month-${year}-${monthNum}`}>
                            {monthName} {year}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  
                  {availableYears.length > 0 && (
                    <optgroup label="Annual Reports">
                      {availableYears.map(year => (
                        <option key={year} value={`year-${year}`}>
                          Year {year}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              
              <div className="filter-group category-filter">
                <label htmlFor="category-filter">Category:</label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="filter-select"
                >
                  {hotelCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={generatePDF} 
                className="export-button"
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? "Generating..." : "Export Report"}
              </button>
            </div>
            
            <div className="financial-cards">
              <div className="financial-card revenue-card">
                <div className="card-label">Total Revenue</div>
                <div className="card-amount">₵ {formatCurrency(totalIncome)}</div>
              </div>
              
              <div className="financial-card expenses-card">
                <div className="card-label">Total Expenses</div>
                <div className="card-amount">₵ {formatCurrency(totalExpenses)}</div>
              </div>
              
              <div className="financial-card balance-card">
                <div className="card-label">Net Balance</div>
                <div className={`card-amount ${balance < 0 ? 'negative' : ''}`}>
                  ₵ {formatCurrency(balance)}
                </div>
              </div>
            </div>
            
            <div className="transaction-section">
              <div className="tab-selector">
                <div 
                  className={`tab ${activeTab === 'income' ? 'active' : ''}`}
                  onClick={() => handleTabChange('income')}
                >
                  Income Transactions
                </div>
                <div 
                  className={`tab ${activeTab === 'expense' ? 'active' : ''}`}
                  onClick={() => handleTabChange('expense')}
                >
                  Expense Transactions
                </div>
              </div>
              
              <div className="transaction-table-container">
                <table className={`transaction-table ${activeTab === 'expense' ? 'expenses-table' : ''}`}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="amount-column">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'income' ? (
                      incomeData.length > 0 ? (
                        incomeData.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{transaction.date.toLocaleDateString()}</td>
                            <td>{transaction.category || "Uncategorized"}</td>
                            <td>{transaction.description}</td>
                            <td className="amount-cell">₵ {formatCurrency(transaction.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">No income transactions found for this period and category</td>
                        </tr>
                      )
                    ) : (
                      expenseData.length > 0 ? (
                        expenseData.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{transaction.date.toLocaleDateString()}</td>
                            <td>{transaction.category || "Uncategorized"}</td>
                            <td>{transaction.description}</td>
                            <td className="amount-cell">₵ {formatCurrency(transaction.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">No expense transactions found for this period and category</td>
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