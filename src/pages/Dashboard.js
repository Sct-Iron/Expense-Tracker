import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {
  doc, getDoc, updateDoc,
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, deleteDoc
} from "firebase/firestore";
import { getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import { getExchangeRate } from "../components/exchange";
import {
  Utensils,
  Car,
  Home,
  Film,
  Pill,
  ShoppingBag,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  Tag,
  Pencil,
  Trash2,
  AlertTriangle,
  Wallet,
  Settings,
  CreditCard,
  TrendingDown,
  PiggyBank,
  Target,
  Receipt,
  X,
  ChevronDown,
  Check,
  Search
} from 'lucide-react';

// ── Modal ─────────────────────────────────────────────────────────────────────
function AddTransactionModal({ type, onClose, onSave, currency, customCategories = [] }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCat] = useState('');
  const [description, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultExpense = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Shopping'];
  const defaultIncome = ['Salary', 'Freelance', 'Investment', 'Gift'];
  const defaults = type === 'expense' ? defaultExpense : defaultIncome;
  // Merge saved custom categories (before "Other") — deduplicate
  const merged = [...defaults, ...customCategories.filter(c => !defaults.includes(c))];
  const categories = [...merged, 'Other'];

  const resolvedCategory = category === 'Other' ? customCategory.trim() : category;

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (category === 'Other' && !customCategory.trim()) {
      setError('Please enter a custom category name.');
      return;
    }
    setLoading(true);
    try {
      await onSave({ type, amount: parseFloat(amount), category: resolvedCategory, description });
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
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
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
          <CustomDropdown
            value={category}
            placeholder="— Select —"
            options={categories.map(option => ({ value: option, label: option }))}
            onChange={next => { setCategory(next); setCustomCat(''); }}
          />
          <select
            className="field-input"
            value={category}
            onChange={e => { setCategory(e.target.value); setCustomCat(''); }}
          >
            <option value="">— Select —</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {category === 'Other' && (
            <input
              className="field-input"
              style={{ marginTop: '10px' }}
              type="text"
              placeholder="Enter custom category name…"
              value={customCategory}
              onChange={e => setCustomCat(e.target.value)}
              autoFocus
              maxLength={40}
            />
          )}

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

// ── Budget Modal ──────────────────────────────────────────────────────────────
function AddBudgetModal({ onClose, onSave, currency, existingBudget, customCategories = [] }) {
  const defaultBudgetCats = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Shopping'];
  const merged = [...defaultBudgetCats, ...customCategories.filter(c => !defaultBudgetCats.includes(c))];
  const allCategories = [...merged, 'Other'];
  const [category, setCategory] = useState(existingBudget?.category || '');
  const [customCategory, setCustomCat] = useState('');
  const [amount, setAmount] = useState(existingBudget?.amount?.toString() || '');
  const [period, setPeriod] = useState(existingBudget?.period || 'monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolvedCategory = category === 'Other' ? customCategory.trim() : category;

  const handleSubmit = async () => {
    if (!category) { setError('Please select a category.'); return; }
    if (category === 'Other' && !customCategory.trim()) { setError('Please enter a custom category name.'); return; }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) { setError('Please enter a valid amount.'); return; }
    setLoading(true);
    try {
      await onSave({ category: resolvedCategory, amount: parseFloat(amount), period });
      onClose();
    } catch (e) {
      setError('Failed to save budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header modal-header--budget">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {existingBudget ? <Pencil size={18} /> : <Target size={18} />}
            {existingBudget ? 'Edit Budget' : 'Add Budget'}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <label className="field-label">Category</label>
          <CustomDropdown
            value={category}
            placeholder="— Select —"
            options={allCategories.map(option => ({ value: option, label: option }))}
            onChange={next => { setCategory(next); setCustomCat(''); }}
            disabled={!!existingBudget}
          />
          <select
            className="field-input"
            value={category}
            onChange={e => { setCategory(e.target.value); setCustomCat(''); }}
            disabled={!!existingBudget}
          >
            <option value="">— Select —</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {category === 'Other' && !existingBudget && (
            <input
              className="field-input"
              style={{ marginTop: '10px' }}
              type="text"
              placeholder="Enter custom category name…"
              value={customCategory}
              onChange={e => setCustomCat(e.target.value)}
              autoFocus
              maxLength={40}
            />
          )}

          <label className="field-label">Budget Period</label>
          <CustomDropdown
            value={period}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' }
            ]}
            onChange={setPeriod}
          />
          <select
            className="field-input"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <label className="field-label">
            Budget Limit ({CURRENCY_SYMBOLS[currency] || currency})
          </label>
          <input
            className="field-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-save modal-save--budget"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving…' : existingBudget ? 'Update' : 'Add Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Modal ──────────────────────────────────────────────────────────

function CurrencyDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const options = [
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' }
  ];
  const selected = options.find(option => option.code === value) || options[1];
  const filteredOptions = options.filter(option =>
    `${option.code} ${option.name}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const chooseCurrency = (code) => {
    setOpen(false);
    setSearch('');
    onChange(code);
  };

  return (
    <div className={`currency-dropdown ${open ? 'currency-dropdown--open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="currency-dropdown-trigger"
        onClick={() => !disabled && setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className="currency-flag" aria-hidden="true">{selected.flag}</span>
        <span className="currency-selected-copy">
          <strong>{selected.name}</strong>
          <small>{selected.code} · {selected.symbol}</small>
        </span>
        <ChevronDown className="currency-chevron" size={20} />
      </button>

      {open && (
        <div className="currency-dropdown-menu" role="listbox" aria-label="Currencies">
          <div className="currency-search-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search currency..."
              aria-label="Search currency"
            />
          </div>
          <div className="currency-options">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <button
                type="button"
                role="option"
                aria-selected={option.code === value}
                className={`currency-option ${option.code === value ? 'currency-option--selected' : ''}`}
                key={option.code}
                onClick={() => chooseCurrency(option.code)}
              >
                <span className="currency-flag" aria-hidden="true">{option.flag}</span>
                <span className="currency-option-copy">
                  <strong>{option.name}</strong>
                  <small>{option.code} · {option.symbol}</small>
                </span>
                {option.code === value && <Check size={19} />}
              </button>
            )) : (
              <p className="currency-empty">No currencies found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomDropdown({ value, onChange, options, placeholder = 'Select', disabled = false }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className={`currency-dropdown ${open ? 'currency-dropdown--open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="currency-dropdown-trigger"
        onClick={() => !disabled && setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className="currency-selected-copy">
          <strong>{selected ? selected.label : placeholder}</strong>
        </span>
        <ChevronDown className="currency-chevron" size={18} />
      </button>
      {open && (
        <div className="currency-dropdown-menu" role="listbox">
          <div className="currency-options">
            {options.map(option => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`currency-option ${option.value === value ? 'currency-option--selected' : ''}`}
                key={option.value}
                onClick={() => { onChange(option.value); setOpen(false); }}
              >
                <span className="currency-option-copy"><strong>{option.label}</strong></span>
                {option.value === value && <Check size={17} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    try { localStorage.setItem('theme', theme) } catch { }
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
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Application preferences</p>

          <label className="field-label">Change Currency</label>
          <CurrencyDropdown
            value={currency}
            disabled={changing}
            onChange={async (next) => {
              setChangeError('');
              if (next === currency) return;
              setChanging(true);
              try {
                if (typeof setCurrency === 'function') await setCurrency(next, setChangeError);
              } catch (err) {
                setChangeError(err?.message || 'Failed to change currency');
              } finally {
                setChanging(false);
              }
            }}
          />
          <select
            className="currency-select"
            value={currency}
            onChange={async (e) => {
              const next = e.target.value;
              setChangeError('');
              if (next === currency) return;
              setChanging(true);
              try {
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
  Food: Utensils,
  Transport: Car,
  Housing: Home,
  Entertainment: Film,
  Health: Pill,
  Shopping: ShoppingBag,
  Salary: Briefcase,
  Freelance: Laptop,
  Investment: TrendingUp,
  Gift: Gift,
  Other: Tag
};

const CURRENCY_SYMBOLS = {
  USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥'
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

// Returns the start of the current period for budget filtering
const getPeriodStart = (period) => {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  }
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  if (period === 'yearly') {
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }
  return new Date(0);
};

// ── BudgetCard ────────────────────────────────────────────────────────────────
function BudgetCard({ budget, transactions, currency, onEdit, onDelete }) {
  const periodStart = getPeriodStart(budget.period);

  const spent = transactions
    .filter(t => {
      if (t.type !== 'expense' || t.category !== budget.category) return false;
      if (!t.createdAt) return true;
      const date = typeof t.createdAt.toDate === 'function' ? t.createdAt.toDate() : new Date(t.createdAt);
      return date >= periodStart;
    })
    .reduce((s, t) => s + t.amount, 0);

  const pct = Math.min((spent / budget.amount) * 100, 100);
  const over = spent > budget.amount;
  const remaining = budget.amount - spent;

  let barColor = '#22c55e';
  if (pct > 85) barColor = '#ef4444';
  else if (pct > 60) barColor = '#f59e0b';

  return (
    <div className={`budget-card ${over ? 'budget-card--over' : ''}`}>
      <div className="budget-card-header">
        <div className="budget-card-title">
          <span className="budget-icon">
            {(() => {
              const IconComponent = CATEGORY_ICONS[budget.category] || Tag;
              return <IconComponent size={20} />;
            })()}
          </span>
          <div>
            <span className="budget-category">{budget.category}</span>
            <span className="budget-period-badge">{budget.period}</span>
          </div>
        </div>
        <div className="budget-card-actions">
          <button className="budget-action-btn" onClick={() => onEdit(budget)} title="Edit" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button className="budget-action-btn budget-action-btn--delete" onClick={() => onDelete(budget.id)} title="Delete" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="budget-amounts">
        <span className="budget-spent">{formatCurrency(spent, currency)} spent</span>
        <span className="budget-limit">of {formatCurrency(budget.amount, currency)}</span>
      </div>

      <div className="budget-bar-track">
        <div
          className="budget-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="budget-footer">
        {over ? (
          <span className="budget-over-msg" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={14} /> Over budget by {formatCurrency(Math.abs(remaining), currency)}
          </span>
        ) : (
          <span className="budget-remaining">{formatCurrency(remaining, currency)} remaining</span>
        )}
        <span className="budget-pct">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [modal, setModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [customExpenseCats, setCustomExpenseCats] = useState([]);
  const [customIncomeCats, setCustomIncomeCats] = useState([]);

  // Auth listener
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, currentUser => {
      if (currentUser) setUser(currentUser);
      else navigate('/');
    });
    return () => unsub();
  }, [navigate]);

  // Fetch username & prefs
  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUsername(snap.data().username || '');
        setCurrency(snap.data().currency || 'USD');
        setCustomExpenseCats(snap.data().customExpenseCategories || []);
        setCustomIncomeCats(snap.data().customIncomeCategories || []);
        const userTheme = snap.data().theme;
        try {
          if (userTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          }
        } catch { }
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

  // Real-time budgets listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'budgets'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await getAuth().signOut();
    navigate('/');
  };

  // Helper to persist a new custom category to Firestore
  const saveCustomCategory = useCallback(async (catName, type) => {
    if (!user || !catName) return;
    const defaultExpense = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Shopping', 'Other'];
    const defaultIncome = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
    // Only save if it's not a built-in category
    if (defaultExpense.includes(catName) || defaultIncome.includes(catName)) return;

    if (type === 'expense' && !customExpenseCats.includes(catName)) {
      const updated = [...customExpenseCats, catName];
      setCustomExpenseCats(updated);
      await updateDoc(doc(db, 'users', user.uid), { customExpenseCategories: updated });
    } else if (type === 'income' && !customIncomeCats.includes(catName)) {
      const updated = [...customIncomeCats, catName];
      setCustomIncomeCats(updated);
      await updateDoc(doc(db, 'users', user.uid), { customIncomeCategories: updated });
    }
  }, [user, customExpenseCats, customIncomeCats]);

  const handleSave = useCallback(async ({ type, amount, category, description }) => {
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      type, amount, category, description,
      createdAt: serverTimestamp()
    });
    // If this is a custom category, save it for future use
    await saveCustomCategory(category, type);
  }, [user, saveCustomCategory]);

  // Save or update a budget
  const handleSaveBudget = useCallback(async ({ category, amount, period }) => {
    if (editingBudget) {
      await updateDoc(doc(db, 'users', user.uid, 'budgets', editingBudget.id), {
        amount, period
      });
    } else {
      // Check for duplicate category
      const existing = budgets.find(b => b.category === category);
      if (existing) {
        throw new Error(`A budget for ${category} already exists. Edit it instead.`);
      }
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        category, amount, period,
        createdAt: serverTimestamp()
      });
    }
    setEditingBudget(null);
    // Save custom budget category for future use (treat as expense type)
    await saveCustomCategory(category, 'expense');
  }, [user, budgets, editingBudget, saveCustomCategory]);

  const handleDeleteBudget = useCallback(async (budgetId) => {
    if (!window.confirm('Delete this budget?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'budgets', budgetId));
  }, [user]);

  const openEditBudget = useCallback((budget) => {
    setEditingBudget(budget);
    setBudgetModalOpen(true);
  }, []);

  // Exchange rate and currency change handler
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

      const txUpdates = snap.docs.map(d => {
        const data = d.data();
        if (typeof data.amount === 'number') {
          const converted = parseFloat((data.amount * rate).toFixed(2));
          return updateDoc(doc(db, 'users', user.uid, 'transactions', d.id), { amount: converted });
        }
        return null;
      }).filter(Boolean);

      // Also convert budget amounts
      const budgetCol = collection(db, 'users', user.uid, 'budgets');
      const budgetSnap = await getDocs(budgetCol);
      const budgetUpdates = budgetSnap.docs.map(d => {
        const data = d.data();
        if (typeof data.amount === 'number') {
          const converted = parseFloat((data.amount * rate).toFixed(2));
          return updateDoc(doc(db, 'users', user.uid, 'budgets', d.id), { amount: converted });
        }
        return null;
      }).filter(Boolean);

      await Promise.all([...txUpdates, ...budgetUpdates]);

      await updateDoc(doc(db, 'users', user.uid), { currency: nextCurrency });
      setCurrency(nextCurrency);
    } catch (err) {
      console.error('Currency change failed', err);
      if (setChangeError) setChangeError(err?.message || 'Currency conversion failed');
      throw err;
    }
  }, [user, currency]);

  // Derived totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savings = Math.max(0, balance);

  const overBudgetCount = budgets.filter(b => {
    const periodStart = getPeriodStart(b.period);
    const spent = transactions
      .filter(t => {
        if (t.type !== 'expense' || t.category !== b.category) return false;
        if (!t.createdAt) return true;
        const date = typeof t.createdAt.toDate === 'function' ? t.createdAt.toDate() : new Date(t.createdAt);
        return date >= periodStart;
      })
      .reduce((s, t) => s + t.amount, 0);
    return spent > b.amount;
  }).length;

  if (!user) return <div className="loading-screen">Loading…</div>;

  return (
    <>
      {modal && (
        <AddTransactionModal
          type={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          currency={currency}
          customCategories={modal === 'expense' ? customExpenseCats : customIncomeCats}
        />
      )}

      {budgetModalOpen && (
        <AddBudgetModal
          onClose={() => { setBudgetModalOpen(false); setEditingBudget(null); }}
          onSave={handleSaveBudget}
          currency={currency}
          existingBudget={editingBudget}
          customCategories={customExpenseCats}
        />
      )}

      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="nav-icon"><Wallet size={18} /></div>
            <h1>Expense <span>Flow</span></h1>
          </div>
          <div className="nav-actions">
            <button
              className="settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              title="Settings"
            >
              <span className="settings-icon"><Settings size={18} /></span>
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
              <div className="card-icon"><CreditCard size={20} /></div>
            </div>
            <div className="card-value">{formatCurrency(balance, currency)}</div>
            <div className="card-badge">
              {transactions.length === 0 ? 'No activity yet' : balance >= 0 ? 'Looking good!' : 'Overspending'}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--green"><TrendingUp size={18} /></div>
            <span className="card-label">Total Income</span>
            <div className="card-value">{formatCurrency(totalIncome, currency)}</div>
            <div className="card-sub card-sub--green">
              {totalIncome === 0 ? 'No income recorded' : `${transactions.filter(t => t.type === 'income').length} entries`}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--red"><TrendingDown size={18} /></div>
            <span className="card-label">Total Expenses</span>
            <div className="card-value">{formatCurrency(totalExpenses, currency)}</div>
            <div className="card-sub card-sub--red">
              {totalExpenses === 0 ? 'No expenses recorded' : `${transactions.filter(t => t.type === 'expense').length} entries`}
            </div>
          </div>

          <div className="card">
            <div className="card-icon-circle card-icon-circle--purple"><PiggyBank size={18} /></div>
            <span className="card-label">Savings</span>
            <div className="card-value">{formatCurrency(savings, currency)}</div>
            <div className="card-sub card-sub--purple">
              {savings === 0 ? 'No savings yet' : `${totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0}% of income`}
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="budgets-section">
          <div className="section-header">
            <div>
              <h3>Budgets</h3>
              <p className="panel-sub">
                {budgets.length === 0 ? (
                  'No budgets set'
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>{budgets.length} budget{budgets.length > 1 ? 's' : ''}</span>
                    {overBudgetCount > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#ef4444' }}>
                          <AlertTriangle size={13} />
                          {overBudgetCount} over limit
                        </span>
                      </>
                    )}
                  </span>
                )}
              </p>
            </div>
            <button
              className="add-budget-btn"
              onClick={() => { setEditingBudget(null); setBudgetModalOpen(true); }}
            >
              + Add Budget
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="empty-state empty-state--budget">
              <div className="empty-icon"><Target size={40} /></div>
              <p>Set spending limits for each category to track your budget goals.</p>
              <button
                className="add-budget-btn add-budget-btn--cta"
                onClick={() => { setEditingBudget(null); setBudgetModalOpen(true); }}
              >
                Create your first budget
              </button>
            </div>
          ) : (
            <div className="budgets-grid">
              {budgets.map(b => (
                <BudgetCard
                  key={b.id}
                  budget={b}
                  transactions={transactions}
                  currency={currency}
                  onEdit={openEditBudget}
                  onDelete={handleDeleteBudget}
                />
              ))}
            </div>
          )}
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
                <div className="empty-icon"><Receipt size={40} /></div>
                <p>Your transactions will appear here once you add income or expenses.</p>
              </div>
            ) : (
              <ul className="transaction-list">
                {transactions.slice(0, 8).map(t => {
                  const TxIcon = CATEGORY_ICONS[t.category] || Tag;
                  return (
                    <li key={t.id} className="transaction-item">
                      <div className="tx-icon"><TxIcon size={18} /></div>
                      <div className="tx-details">
                        <span className="tx-category">{t.category}</span>
                        {t.description && <span className="tx-desc">{t.description}</span>}
                        <span className="tx-date">{formatDate(t.createdAt)}</span>
                      </div>
                      <span className={`tx-amount tx-amount--${t.type}`}>
                        {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="quick-actions-panel">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="qa-btn qa-btn--red" onClick={() => setModal('expense')}>
                <span className="qa-icon">−</span>
                <span>Add<br />Expense</span>
              </button>
              <button className="qa-btn qa-btn--green" onClick={() => setModal('income')}>
                <span className="qa-icon">+</span>
                <span>Add<br />Income</span>
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
                  .map(([cat, amt]) => {
                    const CatIcon = CATEGORY_ICONS[cat] || Tag;
                    return (
                      <div key={cat} className="breakdown-row">
                        <span className="breakdown-cat" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <CatIcon size={14} className="breakdown-icon" />
                          {cat}
                        </span>
                        <span>{formatCurrency(amt, currency)}</span>
                        <div className="breakdown-bar-track">
                          <div
                            className="breakdown-bar"
                            style={{ width: `${(amt / totalExpenses) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
