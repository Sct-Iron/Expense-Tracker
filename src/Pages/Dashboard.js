import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const auth = getAuth();
    await auth.signOut();
    navigate('/');
  };

const createBudget = async (e) => {
  e.preventDefault();

  if (!user) {
    alert("User not logged in");
    return;
  }

  if (!budgetName || !budgetAmount) {
    alert("Please fill all fields");
    return;
  }

  const amount = Number(budgetAmount);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive number for amount");
    return;
  }

  setCreating(true);
  try {
    await addDoc(
      collection(db, "users", user.uid, "budgets"),
      {
        name: budgetName,
        limit: amount,
        createdAt: serverTimestamp(),
      }
    );

    setBudgetName("");
    setBudgetAmount("");
    alert("Budget created successfully!");
  } catch (error) {
    console.error("Error creating budget:", error);
    alert("Failed to create budget: " + error.message);
  } finally {
    setCreating(false);
  }
};

const fetchUserData = async () => {
  try {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      setUsername(data.username);
      console.log("Username:", data.username);
    } else {
      console.log("No user document found.");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};


  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
  <>
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <div className="nav-icon">📊</div>
          <h1>Expense <span>Flow</span></h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>

    <div className="dashboard-container">

      {/* Page header */}
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back, <strong>{username || "Guest"}</strong>. Here's your financial overview.</p>
      </div>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="card card--primary">
          <div className="card-top">
            <span className="card-label">Total Balance</span>
            <div className="card-icon">💳</div>
          </div>
          <div className="card-value">$0.00</div>
          <div className="card-badge">No activity yet</div>
        </div>

        <div className="card">
          <div className="card-icon-circle card-icon-circle--green">↑</div>
          <span className="card-label">Total Income</span>
          <div className="card-value">$0.00</div>
          <div className="card-sub card-sub--green">No income recorded</div>
        </div>

        <div className="card">
          <div className="card-icon-circle card-icon-circle--red">↓</div>
          <span className="card-label">Total Expenses</span>
          <div className="card-value">$0.00</div>
          <div className="card-sub card-sub--red">No expenses recorded</div>
        </div>

        <div className="card">
          <div className="card-icon-circle card-icon-circle--purple">🐷</div>
          <span className="card-label">Savings</span>
          <div className="card-value">$0.00</div>
          <div className="card-sub card-sub--purple">No savings yet</div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Transactions panel */}
        <div className="transactions-panel">
          <div className="panel-header">
            <div>
              <h3>Recent Transactions</h3>
              <p className="panel-sub">No transactions yet</p>
            </div>
          </div>
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <p>Your transactions will appear here once you add income or expenses.</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="quick-actions-panel">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="qa-btn qa-btn--red">
              <span className="qa-icon">−</span>
              <span>Add<br/>Expense</span>
            </button>
            <button className="qa-btn qa-btn--green">
              <span className="qa-icon">+</span>
              <span>Add<br/>Income</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </>
);
}