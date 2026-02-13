import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";


export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  const createBudget = async () => {
  await addDoc(
    collection(db, "users", user.uid, "budgets"),
    {
      name: budgetName,
      limit: Number(budgetAmount),
      createdAt: serverTimestamp(),
    }
  );
};
  return (
    <>
    <nav className="navbar">
      <div className="nav-container">
        <h1>Expense <span>Flow</span></h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>

    <form>
  <input placeholder="Budget name" />
  <input type="number" placeholder="Amount" />
  <button>Create Budget</button>
</form>
</>
  );
}
