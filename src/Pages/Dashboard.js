import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

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

  try {
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
    alert("Budget created successfully!");
  } catch (error) {
    console.error("Error creating budget:", error);
    alert("Failed to create budget: " + error.message);
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
          <h1>Expense <span>Flow</span></h1>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      
      <h2 className='welcomeText'>Welcome, <span>{username || "Guest"}!</span></h2>
    </>
  );
}