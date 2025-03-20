import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Chart from "react-apexcharts";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../assets/styles/FinancialReports.css";

const FinancialReports = () => {
  const [incomeData, setIncomeData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState({});
  const [categoryBreakdown, setCategoryBreakdown] = useState({});

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "transactions"));
        const transactions = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            date: data.date.toDate ? data.date.toDate() : new Date(data.date),
          };
        });

        const income = transactions.filter((t) => t.type === "income");
        const expenses = transactions.filter((t) => t.type === "expense");

        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Group data by month
        const monthlySummary = transactions.reduce((summary, transaction) => {
          const monthYear = transaction.date.toLocaleString("default", { month: "short", year: "numeric" });

          if (!summary[monthYear]) {
            summary[monthYear] = { income: 0, expenses: 0 };
          }

          if (transaction.type === "income") {
            summary[monthYear].income += transaction.amount;
          } else {
            summary[monthYear].expenses += transaction.amount;
          }

          return summary;
        }, {});

        // Group data by category
        const categoryBreakdown = transactions.reduce((summary, t) => {
          if (!summary[t.category]) {
            summary[t.category] = { income: 0, expenses: 0 };
          }
          if (t.type === "income") {
            summary[t.category].income += t.amount;
          } else {
            summary[t.category].expenses += t.amount;
          }
          return summary;
        }, {});

        setIncomeData(income);
        setExpenseData(expenses);
        setTotalIncome(totalIncome);
        setTotalExpenses(totalExpenses);
        setBalance(balance);
        setMonthlySummary(monthlySummary);
        setCategoryBreakdown(categoryBreakdown);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      }
    };

    fetchFinancialData();
  }, []);

  // Generate PDF Report
  const generatePDF = (reportType) => {
    const doc = new jsPDF();
    doc.setFont("times", "bold");
    doc.setFontSize(16);

    if (reportType === "IncomeExpenditure") {
      doc.text("INCOME AND EXPENDITURE ACCOUNT", 50, 15);
    } else {
      doc.text("PROFIT & LOSS STATEMENT", 60, 15);
    }

    doc.setFontSize(12);
    doc.text("For the year ended December 31, 2025", 65, 22);

    autoTable(doc, {
      startY: 30,
      head: [["EXPENDITURE", "AMOUNT (GHS)", "INCOME", "AMOUNT (GHS)"]],
      body: [
        ...expenseData.map((t) => [t.category, `GHS ${t.amount.toFixed(2)}`, "", ""]),
        ...incomeData.map((t) => ["", "", t.category, `GHS ${t.amount.toFixed(2)}`]),
        ["", "", "Total Income", `GHS ${totalIncome.toFixed(2)}`],
        ["Total Expenses", `GHS ${totalExpenses.toFixed(2)}`, "Net Profit/Loss", `GHS ${balance.toFixed(2)}`],
      ],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "left", fontStyle: "bold" },
        3: { halign: "right" },
      },
    });

    if (reportType === "IncomeExpenditure") {
      doc.save("Income_and_Expenditure_Report.pdf");
    } else {
      doc.save("Profit_and_Loss_Report.pdf");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="reports-header">
          <h1>Financial Report Summary</h1>
          <div className="export-buttons">
            <button className="pdf-btn" onClick={() => generatePDF("IncomeExpenditure")}>
              Export Income & Expenditure Report
            </button>
            <button className="pdf-btn" onClick={() => generatePDF("ProfitLoss")}>
              Export Profit & Loss Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="card card-income">
            <p className="card-title">Total Income</p>
            <h2>GHS {totalIncome.toFixed(2)}</h2>
          </div>
          <div className="card card-expense">
            <p className="card-title">Total Expenses</p>
            <h2>GHS {totalExpenses.toFixed(2)}</h2>
          </div>
          <div className="card card-balance">
            <p className="card-title">Net Profit/Loss</p>
            <h2 style={{ color: balance >= 0 ? "#2ecc71" : "#e74c3c" }}>
              GHS {balance.toFixed(2)}
            </h2>
          </div>
        </div>

        {/* Monthly Financial Summary */}
        <div className="financial-summary">
          <h3>Monthly Financial Summary</h3>
          <ul>
            {Object.entries(monthlySummary).map(([month, data], index) => (
              <li key={index}>
                <strong>{month}:</strong> Income: GHS {data.income.toFixed(2)}, Expenses: GHS {data.expenses.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        {/* Financial Trend Chart */}
        <div className="chart-container">
          <h3>Financial Trends</h3>
          <Chart
            options={{
              chart: { type: "line", height: 350 },
              xaxis: { categories: Object.keys(monthlySummary) },
            }}
            series={[
              { name: "Income", data: Object.values(monthlySummary).map((item) => item.income) },
              { name: "Expenses", data: Object.values(monthlySummary).map((item) => item.expenses) },
            ]}
            type="line"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
