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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animation, setAnimation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth, formData.email, formData.password
        );
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
          username: formData.name,
          email: formData.email,
          createdAt: serverTimestamp(),
        });
      }
      onAuthSuccess();
    } catch (err) {
      // Friendlier error messages
      const msg = err.code === 'auth/user-not-found' ? 'No account found with this email.' :
        err.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' :
          err.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
            err.code === 'auth/weak-password' ? 'Password should be at least 6 characters.' :
              err.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
                err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setAnimation(false);
    requestAnimationFrame(() => setAnimation(true));
    setIsLogin(prev => !prev);
    setError('');
    setFormData(prev => ({ ...prev, confirmPassword: '' }));
    setShowPassword(false);
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-container ${animation ? 'fade-in' : ''}`}>

        {/* Brand */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📊</div>
          <h1>Expense Flow</h1>
        </div>

        {/* Tagline */}
        <div className="tagline">
          <h2>{isLogin ? 'Welcome back!' : 'Create Account'}</h2>
          <h4>
            {isLogin
              ? 'Sign in to continue to your dashboard'
              : 'Sign up and start tracking your finances'}
          </h4>
        </div>

        {/* Login / Sign Up toggle */}
        <div className="toggle-bar">
          <button className={isLogin ? 'active' : ''} onClick={toggleMode}>
            Login
          </button>
          <button className={!isLogin ? 'active' : ''} onClick={toggleMode}>
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="error">{error}</div>}

          {/* Name — only on Sign Up */}
          {!isLogin && (
            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  placeholder="Full Name"
                  onChange={handleChange}
                  autoComplete="name"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                placeholder="Email address"
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                placeholder="Password"
                onChange={handleChange}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                className="show-pass-btn"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password — only on Sign Up */}
          {!isLogin && (
            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  placeholder="Confirm Password"
                  onChange={handleChange}
                  autoComplete="new-password"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}