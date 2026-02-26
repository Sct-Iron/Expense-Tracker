import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {
  doc, getDoc, updateDoc,
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp
} from "firebase/firestore";
import { getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import { getExchangeRate } from "../components/exchange";

// ── Modal ─────────────────────────────────────────────────────────────────────
function AddTransactionModal({ type, onClose, onSave, currency }) {
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const expenseCategories = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Shopping', 'Other'];
  const incomeCategories  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    setLoading(true);
    try {
      await onSave({ type, amount: parseFloat(amount), category, description });
      onClose();
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className={`modal-header modal-header--${type}`}>
          <h3>{type === 'expense' ? '− Add Expense' : '+ Add Income'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <label className="field-label">Amount {CURRENCY_SYMBOLS[currency] ? `(${CURRENCY_SYMBOLS[currency]})` : `(${currency})`}</label>
          <input
            className="field-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />

          <label className="field-label">Category</label>
          <select
            className="field-input"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">— Select —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="field-label">Description (optional)</label>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. Coffee at Starbucks"
            value={description}
            onChange={e => setDesc(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`modal-save modal-save--${type}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Modal ──────────────────────────────────────────────────────────

function SettingsModal({ onClose, currency, setCurrency, user }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light' } catch { return 'light' }
  })

  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState('');

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (user && user.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { theme: next })
      } catch (e) {
        console.warn('Failed to persist theme to user profile', e)
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className={`modal-header modal-header--settings`}>
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Application preferences</p>

          <label className="field-label">Change Currency</label>
          <select
            className="currency-select"
            value={currency}
            onChange={async (e) => {
              const next = e.target.value;
              setChangeError('');
              if (next === currency) return;
              setChanging(true);
              try {
                // Ask parent to perform conversion and persist change
                if (typeof setCurrency === 'function') await setCurrency(next, setChangeError);
              } catch (err) {
                setChangeError(err?.message || 'Failed to change currency');
              } finally {
                setChanging(false);
              }
            }}
          >
            <option value="USD">USD — $</option>
            <option value="NGN">NGN — ₦</option>
            <option value="EUR">EUR — €</option>
            <option value="GBP">GBP — £</option>
            <option value="JPY">JPY — ¥</option>
          </select>
          {changing && <div className="modal-info">Updating currency and converting transactions…</div>}
          {changeError && <div className="modal-error">{changeError}</div>}
          <div style={{ marginTop: '1rem' }}>
            <label className="field-label">Theme</label>
            <button
              type="button"
              className="settings-option-btn"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? 'Disable Dark Mode' : 'Enable Dark Mode'}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n, currencyCode = 'USD') => {
  if (typeof n !== 'number') return n;
  try {
    // Prefer narrow symbol if available (better chance to show ₦)
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol'
    }).format(n);
  } catch (e) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'symbol'
      }).format(n);
    } catch (e2) {
      return n.toLocaleString();
    }
  }
};

const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚗', Housing: '🏠', Entertainment: '🎬',
  Health: '💊', Shopping: '🛍️', Salary: '💼', Freelance: '💻',
  Investment: '📈', Gift: '🎁', Other: '📦'
};

const CURRENCY_SYMBOLS = {
  USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥'
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [username, setUsername]       = useState('');
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal]             = useState(null); // 'expense' | 'income' | null
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');

  // Auth listener
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, currentUser => {
      if (currentUser) setUser(currentUser);
      else navigate('/');
    });
    return () => unsub();
  }, [navigate]);

// Fetch username
useEffect(() => {
  if (!user) return;
  const fetchUser = async () => {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      setUsername(snap.data().username || '');
      setCurrency(snap.data().currency || 'USD');
      const userTheme = snap.data().theme
      try {
        if (userTheme === 'dark') {
          document.documentElement.classList.add('dark')
          localStorage.setItem('theme', 'dark')
        } else {
          document.documentElement.classList.remove('dark')
          localStorage.setItem('theme', 'light')
        }
      } catch {}
    }
  };
  fetchUser();
}, [user]);

  // Real-time transactions listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await getAuth().signOut();
    navigate('/');
  };

const handleSave = useCallback(async ({ type, amount, category, description }) => {
  await addDoc(collection(db, 'users', user.uid, 'transactions'), {
    type, amount, category, description,
    createdAt: serverTimestamp()
  });
}, [user]);

  //Exchange rate and currency change handler
  const handleCurrencyChange = useCallback(async (nextCurrency, setChangeError) => {
    if (!user || !user.uid) {
      const msg = 'Not authenticated';
      if (setChangeError) setChangeError(msg);
      throw new Error(msg);
    }
    const from = currency;
    if (from === nextCurrency) return;

    try {
      const rate = await getExchangeRate(from, nextCurrency);
      if (rate == null) {
        const msg = 'Unable to fetch exchange rate. Please try again later.';
        if (setChangeError) setChangeError(msg);
        throw new Error(msg);
      }

      const txCol = collection(db, 'users', user.uid, 'transactions');
      const snap = await getDocs(txCol);

      const updates = snap.docs.map(d => {
        const data = d.data();
        if (typeof data.amount === 'number') {
          const converted = parseFloat((data.amount * rate).toFixed(2));
          return updateDoc(
            doc(db, 'users', user.uid, 'transactions', d.id),
            { amount: converted }
          );
        }
        return null;
      }).filter(Boolean);

      await Promise.all(updates);

      await updateDoc(doc(db, 'users', user.uid), {
        currency: nextCurrency
      });

      setCurrency(nextCurrency);
    } catch (err) {
      console.error('Currency change failed', err);
      if (setChangeError) setChangeError(err?.message || 'Currency conversion failed');
      throw err;
    }
  }, [user, currency]);

  // Derived totals
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;
  const savings       = Math.max(0, balance);

  if (!user) return <div className="loading-screen">Loading…</div>;

  return (
    <>
      {modal && (
        <AddTransactionModal
          type={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          currency={currency}
        />
      )}

      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="nav-icon">📊</div>
            <h1>Expense <span>Flow</span></h1>
          </div>
          <div className="nav-actions">
            <button
              className="settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              title="Settings"
            >
              <span className="settings-icon">⚙️</span>
            </button>

            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          currency={currency}
          setCurrency={handleCurrencyChange}
          user={user}
        />
      )}

      <div className="dashboard-container">

        {/* Page header */}
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Welcome back, <strong>{username || 'Guest'}</strong>. Here's your financial overview.</p>
        </div>

        {/* Summary cards */}
        <div className="summary-cards">
          <div className={`card card--primary ${balance < 0 ? 'card--negative' : ''}`}>
            <div className="card-top">
              <span className="card-label">Total Balance</span>
              <div className="card-icon">💳</div>
            </div>
            <div className="card-value">{formatCurrency(balance, currency)}</div>
            <div className="card-badge">
              {transactions.length === 0 ? 'No activity yet' : balance >= 0 ? 'Looking good!' : 'Overspending'}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--green">↑</div>
            <span className="card-label">Total Income</span>
            <div className="card-value">{formatCurrency(totalIncome, currency)}</div>
            <div className="card-sub card-sub--green">
              {totalIncome === 0 ? 'No income recorded' : `${transactions.filter(t => t.type === 'income').length} entries`}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--red">↓</div>
            <span className="card-label">Total Expenses</span>
            <div className="card-value">{formatCurrency(totalExpenses, currency)}</div>
            <div className="card-sub card-sub--red">
              {totalExpenses === 0 ? 'No expenses recorded' : `${transactions.filter(t => t.type === 'expense').length} entries`}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--purple">🐷</div>
            <span className="card-label">Savings</span>
            <div className="card-value">{formatCurrency(savings, currency)}</div>
            <div className="card-sub card-sub--purple">
              {savings === 0 ? 'No savings yet' : `${totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0}% of income`}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="bottom-row">

          {/* Transactions panel */}
          <div className="transactions-panel">
            <div className="panel-header">
              <div>
                <h3>Recent Transactions</h3>
                <p className="panel-sub">
                  {transactions.length === 0 ? 'No transactions yet' : `${transactions.length} total`}
                </p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <p>Your transactions will appear here once you add income or expenses.</p>
              </div>
            ) : (
              <ul className="transaction-list">
                {transactions.slice(0, 8).map(t => (
                  <li key={t.id} className="transaction-item">
                    <div className="tx-icon">{CATEGORY_ICONS[t.category] || '📦'}</div>
                    <div className="tx-details">
                      <span className="tx-category">{t.category}</span>
                      {t.description && <span className="tx-desc">{t.description}</span>}
                    </div>
                        <span className={`tx-amount tx-amount--${t.type}`}>
                          {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, currency)}
                        </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="quick-actions-panel">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="qa-btn qa-btn--red" onClick={() => setModal('expense')}>
                <span className="qa-icon">−</span>
                <span>Add<br/>Expense</span>
              </button>
              <button className="qa-btn qa-btn--green" onClick={() => setModal('income')}>
                <span className="qa-icon">+</span>
                <span>Add<br/>Income</span>
              </button>
            </div>

            {/* Spending breakdown */}
            {totalExpenses > 0 && (
              <div className="breakdown">
                <h4>Expense Breakdown</h4>
                {Object.entries(
                  transactions
                    .filter(t => t.type === 'expense')
                    .reduce((acc, t) => {
                      acc[t.category] = (acc[t.category] || 0) + t.amount;
                      return acc;
                    }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => (
                    <div key={cat} className="breakdown-row">
                      <span>{CATEGORY_ICONS[cat]} {cat}</span>
                        <span>{formatCurrency(amt, currency)}</span>
                      <div className="breakdown-bar-track">
                        <div
                          className="breakdown-bar"
                          style={{ width: `${(amt / totalExpenses) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
