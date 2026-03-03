import React from 'react';
import './App.css';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ExpenseTrackerAuth from './components/Auth';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/Landing';

function App() {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<ExpenseTrackerAuth onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
