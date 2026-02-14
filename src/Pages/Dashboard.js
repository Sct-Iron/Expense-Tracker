import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  // State for form inputs
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const handleLogout = () => {
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

    await addDoc(
      collection(db, "users", user.uid, "budgets"),
      {
        name: budgetName,
        limit: Number(budgetAmount),
        createdAt: serverTimestamp(),
      }
    );

    setBudgetName("");
    setBudgetAmount("");
  };
  console.log(user);
  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <h1>Expense <span>Flow</span></h1>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <form onSubmit={createBudget}>
        <input
          placeholder="Budget name"
          value={budgetName}
          onChange={(e) => setBudgetName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Amount"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
        />

        <button type="submit">Create Budget</button>
      </form>
    </>
  );

}
