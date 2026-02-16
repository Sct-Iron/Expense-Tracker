import React, { useState } from "react";
import './Auth.css';
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; 
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../firebase";

export default function ExpenseTrackerAuth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const[error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
    } else {
     const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
  username: formData.name, 
  email: formData.email,
  createdAt: serverTimestamp(),
    });   
    }
    onAuthSuccess();
  } catch (err) {
    setError(err.message);
  }
};

const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const toggleMode = () => {
  triggerAnimation();
  setIsLogin(prev => !prev);
  setError('');
  };
  // Animation logic 
  const[animation, setAnimation] = useState(false);

  function triggerAnimation() {
    setAnimation(false);
   requestAnimationFrame(() => {
      setAnimation(true);
    });
  }
  return (
    <div className={`auth-container ${animation ? 'fade-in' : ''}`}>

      <h1>Expense Flow</h1>
      <div className="tagline">
        <h2>{isLogin ? "Welcome!" : "Create Account"}</h2>
        <h4>{isLogin ? "Sign in to continue to your account!" : 
          "Sign up to get started with ExpenseFlow"}
        </h4>
      </div>

      <div className="toggle-bar">
        <button className={`login ${isLogin ? 'active' : ''}`} onClick={toggleMode}>Login</button>
        <button className={`sign-up ${!isLogin ? 'active' : ''}`} onClick={toggleMode}>Sign Up</button>
      </div>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        {!isLogin && (
          <div className="form-group">
            <input
              type="text"
              name="name"
              value={formData.name}
              placeholder="User Name"
              onChange={handleChange}
            />
          </div>
        )}
        <div className="form-group">
          <input
            type="email"
            name="email"
            value={formData.email}
            placeholder="Email"
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            placeholder="Password"
            onChange={handleChange}
          />
        </div>
        <button className="switch-btn" type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>
    </div>
  );
}


  

   
 