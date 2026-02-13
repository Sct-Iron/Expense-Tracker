import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";


export default function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="landing">
      <div className="landing-content">
        <h1>
            Welcolme To <span>Expense Flow</span>
        </h1>
        <h2>
          Take Control <br /> of Your Finances
        </h2>

        <p>
          Track your expenses, manage your budget, and achieve your financial
          goals with ease.
        </p>

        <div className="button">
          <button className="primary-btn" onClick={handleGetStarted}>Get Started</button>
        </div>
      </div>

      <div className="landing-visual">
        {/* <img src={heroMockup} alt="Expense tracker preview" /> */}
        <div className="mockup-placeholder">App Mockup</div>
      </div>
    </div>
  );
}
