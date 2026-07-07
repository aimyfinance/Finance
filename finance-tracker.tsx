import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Wallet, History as HistoryIcon, Tags, Banknote, Settings as SettingsIcon,
  Plus, Minus, ArrowLeftRight, RefreshCw, Sun, Moon, X, Trash2, Edit3, Search,
  ShoppingCart, Utensils, Bus, Plane, Fuel, Car, HeartPulse, Dumbbell, Shirt,
  GraduationCap, PartyPopper, Gift, Home, Zap, MoreHorizontal, Briefcase, Building2,
  TrendingUp, TrendingDown, RotateCcw, Users, AlertTriangle, CreditCard, Landmark,
  PiggyBank, LineChart as LineChartIcon, ChevronRight, ChevronDown, Check, Archive, Calendar,
  Filter, ArrowUpRight, ArrowDownRight, Coins
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid
} from "recharts";

/* ============================== CONSTANTS ============================== */

const CURRENCIES = ["UAH", "USD", "EUR", "GBP", "PLN", "CHF"];
const CURRENCY_SYMBOLS = { UAH: "₴", USD: "$", EUR: "€", GBP: "£", PLN: "zł", CHF: "CHF" };

const ACCOUNT_TYPES = [
  { id: "cash", label: "Готівка", icon: "Wallet" },
  { id: "bank", label: "Банківський рахунок", icon: "Landmark" },
  { id: "card", label: "Картка", icon: "CreditCard" },
  { id: "deposit", label: "Депозит", icon: "PiggyBank" },
  { id: "invest", label: "Інвестиційний рахунок", icon: "LineChartIcon" },
  { id: "other", label: "Інший", icon: "Wallet" },
];

const ICONS = {
  ShoppingCart, Utensils, Bus, Plane, Fuel, Car, HeartPulse, Dumbbell, Shirt,
  GraduationCap, PartyPopper, Gift, Home, Zap, MoreHorizontal, Briefcase, Building2,
  TrendingUp, RotateCcw, Wallet, Landmark, CreditCard, PiggyBank, LineChartIcon, Coins
};

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Продукти", icon: "ShoppingCart", color: "#34D399" },
  { name: "Ресторани", icon: "Utensils", color: "#F2B84B" },
  { name: "Транспорт", icon: "Bus", color: "#6C7CFF" },
  { name: "Подорожі", icon: "Plane", color: "#4FD1E6" },
  { name: "Паливо", icon: "Fuel", color: "#F1595C" },
  { name: "Автомобіль", icon: "Car", color: "#9CA3AF" },
  { name: "Здоров'я", icon: "HeartPulse", color: "#F06595" },
  { name: "Спорт", icon: "Dumbbell", color: "#22D3EE" },
  { name: "Одяг", icon: "Shirt", color: "#C084FC" },
  { name: "Освіта", icon: "GraduationCap", color: "#818CF8" },
  { name: "Розваги", icon: "PartyPopper", color: "#FB923C" },
  { name: "Подарунки", icon: "Gift", color: "#F472B6" },
  { name: "Дім", icon: "Home", color: "#34D399" },
  { name: "Комунальні послуги", icon: "Zap", color: "#FBBF24" },
  { name: "Інше", icon: "MoreHorizontal", color: "#8B93A3" },
].map((c) => ({ ...c, id: uid("cat"), type: "expense", archived: false, parentId: null }));

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Зарплата", icon: "Briefcase", color: "#34D399" },
  { name: "Бізнес", icon: "Building2", color: "#6C7CFF" },
  { name: "Інвестиції", icon: "TrendingUp", color: "#22D3EE" },
  { name: "Повернення коштів", icon: "RotateCcw", color: "#F2B84B" },
  { name: "Подарунки", icon: "Gift", color: "#F472B6" },
  { name: "Інше", icon: "MoreHorizontal", color: "#8B93A3" },
].map((c) => ({ ...c, id: uid("cat"), type: "income", archived: false, parentId: null }));

const ACCOUNT_COLORS = ["#34D399", "#6C7CFF", "#F2B84B", "#F1595C", "#22D3EE", "#C084FC", "#F472B6", "#FBBF24"];

const MONTHS_UA = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

/* ============================== HELPERS ============================== */

function fmtMoney(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${sym}`;
}

function fmtDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / MS);
}

function convert(amount, from, to, ratesToUAH) {
  if (from === to) return amount;
  const uahAmount = amount * (ratesToUAH[from] || 1);
  return uahAmount / (ratesToUAH[to] || 1);
}

function Icon({ name, size = 18, className = "", style = {} }) {
  const C = ICONS[name] || MoreHorizontal;
  return <C size={size} className={className} style={style} />;
}

/* ============================== DEMO DATA ============================== */
/*
  Accounts are containers (e.g. "Готівка", "Monobank"). Each account can hold
  multiple currency "pockets" — one balance per currency, e.g. Готівка can
  hold a UAH pocket, a USD pocket and an EUR pocket at the same time.
*/

function buildDemoData() {
  const expenseCats = DEFAULT_EXPENSE_CATEGORIES;
  const incomeCats = DEFAULT_INCOME_CATEGORIES;
  const catByName = (name) => [...expenseCats, ...incomeCats].find((c) => c.name === name);

  const accCash = { id: uid("acc"), name: "Готівка", type: "cash", color: ACCOUNT_COLORS[0], archived: false, createdAt: "2026-01-05" };
  const accCard = { id: uid("acc"), name: "Monobank", type: "card", color: ACCOUNT_COLORS[1], archived: false, createdAt: "2026-01-05" };
  const accDeposit = { id: uid("acc"), name: "Заощадження", type: "deposit", color: ACCOUNT_COLORS[3], archived: false, createdAt: "2026-01-05" };
  const accounts = [accCash, accCard, accDeposit];

  const pCashUAH = { id: uid("pk"), accountId: accCash.id, currency: "UAH", initialBalance: 3200, archived: false };
  const pCashUSD = { id: uid("pk"), accountId: accCash.id, currency: "USD", initialBalance: 100, archived: false };
  const pCardUAH = { id: uid("pk"), accountId: accCard.id, currency: "UAH", initialBalance: 18500, archived: false };
  const pCardUSD = { id: uid("pk"), accountId: accCard.id, currency: "USD", initialBalance: 950, archived: false };
  const pDepositEUR = { id: uid("pk"), accountId: accDeposit.id, currency: "EUR", initialBalance: 600, archived: false };
  const pockets = [pCashUAH, pCashUSD, pCardUAH, pCardUSD, pDepositEUR];

  const rand = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);

  const transactions = [];

  for (let m = 3; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 3);
    transactions.push({
      id: uid("tx"), type: "income", date: iso(monthDate), amount: rand(28000, 32000), currency: "UAH",
      pocketId: pCardUAH.id, categoryId: catByName("Зарплата").id, note: "Зарплата", receipt: null,
    });
    const expenseSet = [
      ["Продукти", pCardUAH.id, "UAH", 3200, 5400],
      ["Ресторани", pCashUAH.id, "UAH", 600, 1800],
      ["Транспорт", pCardUAH.id, "UAH", 300, 900],
      ["Комунальні послуги", pCardUAH.id, "UAH", 2200, 3100],
      ["Розваги", pCardUSD.id, "USD", 20, 60],
    ];
    expenseSet.forEach(([catName, pocketId, cur, min, max]) => {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + Math.floor(Math.random() * 20));
      transactions.push({
        id: uid("tx"), type: "expense", date: iso(d), amount: rand(min, max), currency: cur,
        pocketId, categoryId: catByName(catName).id, note: "", receipt: null,
      });
    });
  }

  transactions.push({
    id: uid("tx"), type: "transfer", date: iso(new Date(today.getFullYear(), today.getMonth(), 8)),
    fromPocketId: pCardUAH.id, toPocketId: pCashUAH.id,
    fromAmount: 2000, fromCurrency: "UAH", toAmount: 2000, toCurrency: "UAH", rate: 1, fee: 0,
    note: "Поповнення готівки",
  });

  transactions.push({
    id: uid("tx"), type: "exchange", date: iso(new Date(today.getFullYear(), today.getMonth(), 12)),
    fromPocketId: pCardUSD.id, toPocketId: pDepositEUR.id,
    fromAmount: 300, fromCurrency: "USD", toAmount: 276, toCurrency: "EUR", rate: 0.92, fee: 1.5,
    note: "Обмін на подорож",
  });

  const loan1 = {
    id: uid("loan"), borrower: "Олег К.", amount: 500, currency: "USD", pocketId: pCardUSD.id,
    dateGiven: iso(new Date(today.getFullYear(), today.getMonth() - 1, 15)),
    dueDate: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
    note: "Позика на ремонт", status: "partial", returned: 150,
  };
  transactions.push({ id: uid("tx"), type: "loan_out", date: loan1.dateGiven, amount: 500, currency: "USD", pocketId: pCardUSD.id, loanId: loan1.id, note: `Позика: ${loan1.borrower}` });
  transactions.push({ id: uid("tx"), type: "loan_return", date: iso(new Date(today.getFullYear(), today.getMonth(), 1)), amount: 150, currency: "USD", pocketId: pCardUSD.id, loanId: loan1.id, note: `Часткове повернення: ${loan1.borrower}` });

  const loan2 = {
    id: uid("loan"), borrower: "Марина В.", amount: 3000, currency: "UAH", pocketId: pCashUAH.id,
    dateGiven: iso(new Date(today.getFullYear(), today.getMonth() - 3, 1)),
    dueDate: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    note: "Борг на навчання", status: "active", returned: 0,
  };
  transactions.push({ id: uid("tx"), type: "loan_out", date: loan2.dateGiven, amount: 3000, currency: "UAH", pocketId: pCashUAH.id, loanId: loan2.id, note: `Позика: ${loan2.borrower}` });

  const loans = [loan1, loan2];
  const rates = { UAH: 1, USD: 41.5, EUR: 45, GBP: 53, PLN: 10.5, CHF: 48 };

  return { accounts, pockets, categories: [...expenseCats, ...incomeCats], transactions, loans, rates, baseCurrency: "UAH" };
}

/* ============================== PERSISTENCE ============================== */

const STORAGE_KEY = "financeTrackerUA_v2";

function loadState() {
  try {
    const raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function saveState(state) {
  try { if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ============================== THEME TOKENS ============================== */

function themeVars(theme) {
  if (theme === "light") {
    return {
      "--bg": "#F3F4F7", "--surface": "#FFFFFF", "--surface2": "#FAFAFC", "--border": "#E5E7EB",
      "--text": "#12151C", "--text-dim": "#6B7280", "--accent": "#0E9F6E", "--accent2": "#4F5BD5",
      "--danger": "#DC2626", "--warn": "#B45309", "--shadow": "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
    };
  }
  return {
    "--bg": "#0A0C10", "--surface": "#13161D", "--surface2": "#1A1E27", "--border": "#242836",
    "--text": "#EDEFF3", "--text-dim": "#8B93A3", "--accent": "#34D399", "--accent2": "#6C7CFF",
    "--danger": "#F1595C", "--warn": "#F2B84B", "--shadow": "0 1px 2px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.25)",
  };
}

/* ============================== SMALL UI PRIMITIVES ============================== */

function Card({ children, className = "", style = {}, onClick }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border ${className}`} style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow)", ...style }}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: { background: "var(--accent)", color: "#08110D" },
    secondary: { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" },
    danger: { background: "var(--danger)", color: "#fff" },
    ghost: { background: "transparent", color: "var(--text-dim)" },
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={styles[variant]}>{children}</button>;
}

function Field({ label, error, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>{label}</span>
      {children}
      {error && <span className="block text-xs mt-1" style={{ color: "var(--danger)" }}>{error}</span>}
    </label>
  );
}

function inputStyle() { return { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }; }

function Input(props) {
  return <input {...props} style={inputStyle()} className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition ${props.className || ""}`} />;
}
function Select({ children, ...props }) {
  return <select {...props} style={inputStyle()} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition">{children}</select>;
}
function Textarea(props) {
  return <textarea {...props} style={inputStyle()} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] transition resize-none" />;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.55)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-md"} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border`} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--text-dim)" }}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${color}22`, color }}>{children}</span>;
}

/* ============================== MAIN APP ============================== */

export default function FinanceTracker() {
  const [state, setState] = useState(() => loadState() || buildDemoData());
  const [theme, setTheme] = useState(() => (loadState() && loadState().theme) || "dark");
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { saveState({ ...state, theme }); }, [state, theme]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const { accounts, pockets, categories, transactions, loans, rates, baseCurrency } = state;
  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const notify = (msg) => setToast(msg);

  /* ---------- pocket / account helpers ---------- */
  const getPocket = useCallback((pocketId) => {
    const pocket = pockets.find((p) => p.id === pocketId);
    if (!pocket) return null;
    const account = accounts.find((a) => a.id === pocket.accountId);
    return { ...pocket, account };
  }, [pockets, accounts]);

  const pocketBalance = useCallback((pocketId) => {
    const pocket = pockets.find((p) => p.id === pocketId);
    if (!pocket) return 0;
    let bal = pocket.initialBalance || 0;
    transactions.forEach((tx) => {
      if (tx.type === "income" && tx.pocketId === pocketId) bal += tx.amount;
      else if (tx.type === "expense" && tx.pocketId === pocketId) bal -= tx.amount;
      else if (tx.type === "transfer" || tx.type === "exchange") {
        if (tx.fromPocketId === pocketId) bal -= tx.fromAmount;
        if (tx.toPocketId === pocketId) bal += tx.toAmount;
      } else if (tx.type === "loan_out" && tx.pocketId === pocketId) bal -= tx.amount;
      else if (tx.type === "loan_return" && tx.pocketId === pocketId) bal += tx.amount;
    });
    return bal;
  }, [pockets, transactions]);

  const accountPockets = useCallback((accountId, includeArchived = false) =>
    pockets.filter((p) => p.accountId === accountId && (includeArchived || !p.archived)),
  [pockets]);

  const accountTotalBase = useCallback((accountId) =>
    accountPockets(accountId).reduce((sum, p) => sum + convert(pocketBalance(p.id), p.currency, baseCurrency, rates), 0),
  [accountPockets, pocketBalance, baseCurrency, rates]);

  const pocketLabel = (pocketId) => {
    const p = getPocket(pocketId);
    if (!p) return "—";
    return `${p.account?.name || "Рахунок"} · ${p.currency}`;
  };

  const activePockets = useMemo(() =>
    pockets.filter((p) => !p.archived && !accounts.find((a) => a.id === p.accountId)?.archived),
  [pockets, accounts]);

  const totalInBase = useMemo(() =>
    activePockets.reduce((sum, p) => sum + convert(pocketBalance(p.id), p.currency, baseCurrency, rates), 0),
  [activePockets, pocketBalance, baseCurrency, rates]);

  const byCurrencyTotals = useMemo(() => {
    const m = {};
    activePockets.forEach((p) => { m[p.currency] = (m[p.currency] || 0) + pocketBalance(p.id); });
    return m;
  }, [activePockets, pocketBalance]);

  /* ---------- month stats ---------- */
  const now = new Date();
  const monthKey = (d) => d.slice(0, 7);
  const thisMonthKey = now.toISOString().slice(0, 7);
  const monthTx = transactions.filter((t) => (t.type === "income" || t.type === "expense") && monthKey(t.date) === thisMonthKey);
  const monthIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + convert(t.amount, t.currency, baseCurrency, rates), 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + convert(t.amount, t.currency, baseCurrency, rates), 0);

  const categoryBreakdown = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const key = cat ? cat.name : "Інше";
      m[key] = (m[key] || 0) + convert(t.amount, t.currency, baseCurrency, rates);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value, color: (categories.find((c) => c.name === name) || {}).color || "#8B93A3" })).sort((a, b) => b.value - a.value);
  }, [monthTx, categories, baseCurrency, rates]);

  const monthlySeries = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const inc = transactions.filter((t) => t.type === "income" && monthKey(t.date) === key).reduce((s, t) => s + convert(t.amount, t.currency, baseCurrency, rates), 0);
      const exp = transactions.filter((t) => t.type === "expense" && monthKey(t.date) === key).reduce((s, t) => s + convert(t.amount, t.currency, baseCurrency, rates), 0);
      arr.push({ month: MONTHS_UA[d.getMonth()], income: Math.round(inc), expense: Math.round(exp) });
    }
    return arr;
  }, [transactions, baseCurrency, rates]);

  /* ---------- loans ---------- */
  const loanRemaining = (loan) => Math.max(0, Math.round((loan.amount - loan.returned) * 100) / 100);
  const activeLoans = loans.filter((l) => l.status !== "returned");
  const totalLoanedOut = activeLoans.reduce((s, l) => s + convert(loanRemaining(l), l.currency, baseCurrency, rates), 0);
  const overdueLoans = loans.filter((l) => l.status !== "returned" && new Date(l.dueDate) < now);
  const overdueTotal = overdueLoans.reduce((s, l) => s + convert(loanRemaining(l), l.currency, baseCurrency, rates), 0);
  const upcomingLoans = [...activeLoans].filter((l) => new Date(l.dueDate) >= now).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);

  /* ============================== ACTIONS ============================== */

  const addAccountWithPocket = (accData, currency, initialBalance) => {
    const account = { id: uid("acc"), archived: false, createdAt: new Date().toISOString().slice(0, 10), ...accData };
    const pocket = { id: uid("pk"), accountId: account.id, currency, initialBalance: parseFloat(initialBalance) || 0, archived: false };
    update({ accounts: [...accounts, account], pockets: [...pockets, pocket] });
    notify("Рахунок створено");
  };
  const editAccount = (id, patch) => update({ accounts: accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const archiveAccount = (id) => update({ accounts: accounts.map((a) => (a.id === id ? { ...a, archived: !a.archived } : a)) });

  const addPocket = (accountId, currency, initialBalance) => {
    update({ pockets: [...pockets, { id: uid("pk"), accountId, currency, initialBalance: parseFloat(initialBalance) || 0, archived: false }] });
    notify("Валютний субрахунок додано");
  };
  const editPocket = (id, patch) => update({ pockets: pockets.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const archivePocket = (id) => update({ pockets: pockets.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)) });

  const addCategory = (data) => update({ categories: [...categories, { id: uid("cat"), archived: false, parentId: null, ...data }] });
  const editCategory = (id, patch) => update({ categories: categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const archiveCategory = (id) => update({ categories: categories.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)) });

  const addTransaction = (tx) => { update({ transactions: [{ id: uid("tx"), ...tx }, ...transactions] }); notify("Операцію збережено"); };
  const editTransaction = (id, patch) => update({ transactions: transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const deleteTransaction = (id) => { update({ transactions: transactions.filter((t) => t.id !== id) }); notify("Операцію видалено"); };
  const duplicateTransaction = (tx) => { update({ transactions: [{ ...tx, id: uid("tx"), date: new Date().toISOString().slice(0, 10) }, ...transactions] }); notify("Операцію дубльовано"); };

  const addLoan = (loan, sourcePocketId, amount, currency, note) => {
    const newLoan = { id: uid("loan"), status: "active", returned: 0, ...loan };
    const tx = { id: uid("tx"), type: "loan_out", date: loan.dateGiven, amount, currency, pocketId: sourcePocketId, loanId: newLoan.id, note: note || `Позика: ${loan.borrower}` };
    update({ loans: [newLoan, ...loans], transactions: [tx, ...transactions] });
    notify("Позику створено");
  };

  const registerLoanReturn = (loanId, returnAmount, returnPocketId, currency, date, note) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    const remaining = loanRemaining(loan);
    const amt = Math.min(returnAmount, remaining);
    const newReturned = Math.round((loan.returned + amt) * 100) / 100;
    const newStatus = newReturned >= loan.amount - 0.005 ? "returned" : "partial";
    update({
      loans: loans.map((l) => (l.id === loanId ? { ...l, returned: newReturned, status: newStatus } : l)),
      transactions: [{ id: uid("tx"), type: "loan_return", date, amount: amt, currency, pocketId: returnPocketId, loanId, note: note || `Повернення позики: ${loan.borrower}` }, ...transactions],
    });
    notify(newStatus === "returned" ? "Позику повністю повернено" : "Часткове повернення зареєстровано");
  };

  /* ============================== NAV ============================== */

  const NAV_ITEMS = [
    { id: "dashboard", label: "Огляд", icon: LayoutDashboard },
    { id: "accounts", label: "Рахунки", icon: Wallet },
    { id: "history", label: "Історія", icon: HistoryIcon },
    { id: "loans", label: "Позики", icon: Banknote },
    { id: "categories", label: "Категорії", icon: Tags },
    { id: "settings", label: "Налаштування", icon: SettingsIcon },
  ];
  const MOBILE_NAV = NAV_ITEMS.filter((n) => ["dashboard", "accounts", "history", "loans"].includes(n.id));
  const vars = themeVars(theme);

  return (
    <div style={{ ...vars, background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Sora', system-ui, sans-serif; }
        .tabular { font-variant-numeric: tabular-nums; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-card { scroll-snap-align: start; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeSlideUp 0.28s ease both; }
        .lucide { stroke-width: 1.5; }
        .bank-card { position: relative; border-radius: 20px; padding: 20px; overflow: hidden; background: linear-gradient(150deg, #1C2029 0%, #0B0D12 78%); box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
        .bank-card::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--card-accent, var(--accent)); }
        .bank-card-glow { position: absolute; width: 140px; height: 140px; border-radius: 999px; right: -50px; top: -60px; opacity: 0.10; background: radial-gradient(circle, #fff, transparent 70%); pointer-events: none; }
        .pill-link { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; background: var(--surface2); color: var(--text-dim); border: 1px solid var(--border); }
        .mono-circle { width: 52px; height: 52px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: #12151C; box-shadow: 0 2px 8px rgba(0,0,0,0.25); flex-shrink: 0; }
      `}</style>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r px-4 py-6" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}><Coins size={18} color="#08110D" /></div>
            <span className="font-display font-bold text-lg">Фінанси</span>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Ic = item.icon;
              const active = view === item.id;
              const badge = item.id === "loans" ? overdueLoans.length : 0;
              return (
                <button key={item.id} onClick={() => setView(item.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: active ? "var(--surface2)" : "transparent", color: active ? "var(--accent)" : "var(--text-dim)" }}>
                  <span className="relative flex items-center">
                    <Ic size={18} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none" style={{ background: "var(--danger)", color: "#fff" }}>{badge}</span>
                    )}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium" style={{ color: "var(--text-dim)" }}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}{theme === "dark" ? "Світла тема" : "Темна тема"}
          </button>
        </aside>

        <main className="flex-1 min-w-0 pb-24 md:pb-8">
          <div className="md:hidden flex items-center justify-between px-4 py-4 border-b sticky top-0 z-30" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}><Coins size={15} color="#08110D" /></div>
              <span className="font-display font-bold">Фінанси</span>
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg" style={{ color: "var(--text-dim)" }}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
            {view === "dashboard" && (
              <Dashboard
                accounts={accounts} accountPockets={accountPockets} pocketBalance={pocketBalance} accountTotalBase={accountTotalBase}
                totalInBase={totalInBase} baseCurrency={baseCurrency} byCurrencyTotals={byCurrencyTotals}
                monthIncome={monthIncome} monthExpense={monthExpense} categoryBreakdown={categoryBreakdown} monthlySeries={monthlySeries}
                transactions={transactions} categories={categories} getPocket={getPocket} pocketLabel={pocketLabel}
                setModal={setModal} setView={setView} totalLoanedOut={totalLoanedOut} overdueTotal={overdueTotal} upcomingLoans={upcomingLoans} activeLoans={activeLoans}
              />
            )}
            {view === "accounts" && (
              <AccountsView accounts={accounts} accountPockets={accountPockets} pocketBalance={pocketBalance} accountTotalBase={accountTotalBase}
                baseCurrency={baseCurrency} setModal={setModal} archiveAccount={archiveAccount} archivePocket={archivePocket} />
            )}
            {view === "history" && (
              <HistoryView transactions={transactions} pockets={pockets} accounts={accounts} categories={categories} getPocket={getPocket} pocketLabel={pocketLabel}
                deleteTransaction={deleteTransaction} duplicateTransaction={duplicateTransaction} setModal={setModal} />
            )}
            {view === "loans" && (
              <LoansView loans={loans} pockets={pockets} getPocket={getPocket} setModal={setModal} loanRemaining={loanRemaining} />
            )}
            {view === "categories" && (
              <CategoriesView categories={categories} setModal={setModal} archiveCategory={archiveCategory} />
            )}
            {view === "settings" && (
              <SettingsView baseCurrency={baseCurrency} rates={rates} update={update} />
            )}
          </div>
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex items-stretch" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {MOBILE_NAV.map((item) => {
          const Ic = item.icon;
          const active = view === item.id;
          const badge = item.id === "loans" ? overdueLoans.length : 0;
          return (
            <button key={item.id} onClick={() => setView(item.id)} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium" style={{ color: active ? "var(--accent)" : "var(--text-dim)" }}>
              <span className="relative flex items-center">
                <Ic size={20} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none" style={{ background: "var(--danger)", color: "#fff" }}>{badge}</span>
                )}
              </span>
              {item.label}
            </button>
          );
        })}
        <button onClick={() => setView("settings")} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium" style={{ color: view === "settings" || view === "categories" ? "var(--accent)" : "var(--text-dim)" }}>
          <SettingsIcon size={20} />Ще
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium animate-in flex items-center gap-2" style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          <Check size={15} color="var(--accent)" /> {toast}
        </div>
      )}

      {modal && (
        <ModalRouter
          modal={modal} setModal={setModal} accounts={accounts} pockets={pockets} categories={categories} rates={rates} baseCurrency={baseCurrency}
          addAccountWithPocket={addAccountWithPocket} editAccount={editAccount} addPocket={addPocket} editPocket={editPocket} archivePocket={archivePocket}
          addCategory={addCategory} editCategory={editCategory}
          addTransaction={addTransaction} editTransaction={editTransaction} addLoan={addLoan} registerLoanReturn={registerLoanReturn}
          loans={loans} loanRemaining={loanRemaining} getPocket={getPocket} pocketBalance={pocketBalance} pocketLabel={pocketLabel}
          transactions={transactions} deleteTransaction={deleteTransaction} duplicateTransaction={duplicateTransaction}
        />
      )}
    </div>
  );
}

/* ============================== POCKET SELECT ============================== */
/* Renders a <select> of all active pockets, grouped by parent account */
function PocketSelect({ accounts, pockets, value, onChange, excludePocketId, className }) {
  const activeAccounts = accounts.filter((a) => !a.archived);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {activeAccounts.map((acc) => {
        const accPockets = pockets.filter((p) => p.accountId === acc.id && !p.archived && p.id !== excludePocketId);
        if (accPockets.length === 0) return null;
        return (
          <optgroup key={acc.id} label={acc.name}>
            {accPockets.map((p) => <option key={p.id} value={p.id}>{acc.name} · {p.currency}</option>)}
          </optgroup>
        );
      })}
    </Select>
  );
}

/* ============================== DASHBOARD ============================== */

function Dashboard({ accounts, accountPockets, pocketBalance, accountTotalBase, totalInBase, baseCurrency, byCurrencyTotals, monthIncome, monthExpense, categoryBreakdown, monthlySeries, transactions, categories, getPocket, pocketLabel, setModal, setView, totalLoanedOut, overdueTotal, upcomingLoans, activeLoans }) {
  const net = monthIncome - monthExpense;
  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const allPocketCards = activeAccounts.flatMap((acc) => accountPockets(acc.id).map((p) => ({ ...p, account: acc })));

  return (
    <div className="space-y-6 animate-in">
      <div>
        <p className="text-sm mb-1" style={{ color: "var(--text-dim)" }}>Загальний капітал</p>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl tabular" style={{ color: "var(--text)" }}>{fmtMoney(totalInBase, baseCurrency)}</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(byCurrencyTotals).map(([cur, val]) => <Badge key={cur} color="var(--accent2)">{fmtMoney(val, cur)}</Badge>)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon={Minus} label="Додати витрату" onClick={() => setModal({ type: "transaction", payload: { kind: "expense" } })} />
        <QuickAction icon={Plus} label="Додати дохід" onClick={() => setModal({ type: "transaction", payload: { kind: "income" } })} />
        <QuickAction icon={ArrowLeftRight} label="Переказ" onClick={() => setModal({ type: "transfer" })} />
        <QuickAction icon={RefreshCw} label="Обмін валюти" onClick={() => setModal({ type: "exchange" })} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Рахунки</h2>
          <button onClick={() => setView("accounts")} className="pill-link">Усі рахунки <ChevronRight size={13} /></button>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1">
          {allPocketCards.map((p) => (
            <PocketCard key={p.id} pocket={p} balance={pocketBalance(p.id)} onClick={() => setModal({ type: "pocketDetail", payload: p.id })} className="w-64 shrink-0 snap-card" />
          ))}
          <button onClick={() => setModal({ type: "account" })} className="snap-card shrink-0 w-64 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
            <Plus size={16} /> Новий рахунок
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Дохід за місяць</p><p className="font-display font-bold tabular" style={{ color: "var(--accent)" }}>{fmtMoney(monthIncome, baseCurrency)}</p></Card>
        <Card className="p-4"><p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Витрати за місяць</p><p className="font-display font-bold tabular" style={{ color: "var(--danger)" }}>{fmtMoney(monthExpense, baseCurrency)}</p></Card>
        <Card className="p-4"><p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Чистий результат</p><p className="font-display font-bold tabular" style={{ color: net >= 0 ? "var(--accent)" : "var(--danger)" }}>{fmtMoney(net, baseCurrency)}</p></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-display font-semibold mb-3 text-sm">Витрати за категоріями (цей місяць)</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-dim)" }}>Немає витрат цього місяця</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart><Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} stroke="none" />)}
                </Pie></PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1 min-w-0">
                {categoryBreakdown.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />{c.name}</span>
                    <span className="tabular shrink-0" style={{ color: "var(--text-dim)" }}>{fmtMoney(c.value, baseCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-display font-semibold mb-3 text-sm">Дохід і витрати за місяцями</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-dim)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="income" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Дохід" />
              <Bar dataKey="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Витрати" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {activeLoans.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Banknote size={16} /> Позики надані</h3>
            <button onClick={() => setView("loans")} className="pill-link">Усі позики <ChevronRight size={13} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Загалом надано</p><p className="font-display font-bold tabular">{fmtMoney(totalLoanedOut, baseCurrency)}</p></div>
            <div><p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Прострочено</p><p className="font-display font-bold tabular" style={{ color: overdueTotal > 0 ? "var(--danger)" : "var(--text)" }}>{fmtMoney(overdueTotal, baseCurrency)}</p></div>
          </div>
          {upcomingLoans.length > 0 && (
            <div className="space-y-1.5">
              {upcomingLoans.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text)" }}>{l.borrower}</span>
                  <span style={{ color: "var(--text-dim)" }}>до {fmtDate(l.dueDate)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Останні транзакції</h2>
          <button onClick={() => setView("history")} className="pill-link">Уся історія <ChevronRight size={13} /></button>
        </div>
        <Card className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recent.map((tx) => <TxRow key={tx.id} tx={tx} categories={categories} pocketLabel={pocketLabel} />)}
          {recent.length === 0 && <p className="text-sm py-8 text-center" style={{ color: "var(--text-dim)" }}>Ще немає транзакцій</p>}
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ icon: Ic, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className="mono-circle"><Ic size={20} color="#fff" /></div>
      <span className="text-xs font-medium text-center leading-tight" style={{ color: "var(--text)" }}>{label}</span>
    </button>
  );
}

function PocketCard({ pocket, balance, onClick, className = "" }) {
  const acc = pocket.account;
  const typeInfo = ACCOUNT_TYPES.find((t) => t.id === acc.type);
  const masked = `•••• ${pocket.id.slice(-4).toUpperCase()}`;
  return (
    <div onClick={onClick} className={`bank-card ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`} style={{ "--card-accent": acc.color }}>
      <div className="bank-card-glow" />
      <div className="flex items-center justify-between gap-2 mb-8">
        <span className="flex items-center gap-1.5 text-[11px] font-medium min-w-0" style={{ color: "rgba(255,255,255,0.55)" }}>
          <Icon name={typeInfo?.icon} size={13} style={{ color: "rgba(255,255,255,0.55)" }} />
          <span className="truncate">{typeInfo?.label}</span>
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>{pocket.currency}</span>
      </div>
      <p className="font-display font-bold text-2xl tabular text-white">{fmtMoney(balance, pocket.currency)}</p>
      <p className="text-xs mt-1.5 tracking-wider" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{masked}</p>
      <p className="text-sm font-medium mt-3 truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{acc.name}</p>
    </div>
  );
}

function TxRow({ tx, categories, pocketLabel, onClick }) {
  let label = "", sub = "", amountStr = "", amountColor = "var(--text)";
  const cat = categories.find((c) => c.id === tx.categoryId);

  if (tx.type === "income") { label = cat?.name || "Дохід"; sub = pocketLabel(tx.pocketId); amountStr = `+${fmtMoney(tx.amount, tx.currency)}`; amountColor = "var(--accent)"; }
  else if (tx.type === "expense") { label = cat?.name || "Витрата"; sub = pocketLabel(tx.pocketId); amountStr = `−${fmtMoney(tx.amount, tx.currency)}`; amountColor = "var(--danger)"; }
  else if (tx.type === "transfer") { label = "Переказ"; sub = `${pocketLabel(tx.fromPocketId)} → ${pocketLabel(tx.toPocketId)}`; amountStr = `${fmtMoney(tx.fromAmount, tx.fromCurrency)}`; amountColor = "var(--accent2)"; }
  else if (tx.type === "exchange") { label = "Обмін валюти"; sub = `${pocketLabel(tx.fromPocketId)} → ${pocketLabel(tx.toPocketId)}`; amountStr = `${fmtMoney(tx.fromAmount, tx.fromCurrency)} → ${fmtMoney(tx.toAmount, tx.toCurrency)}`; amountColor = "var(--warn)"; }
  else if (tx.type === "loan_out") { label = "Позика надана"; sub = tx.note || pocketLabel(tx.pocketId); amountStr = `−${fmtMoney(tx.amount, tx.currency)}`; amountColor = "var(--warn)"; }
  else if (tx.type === "loan_return") { label = "Повернення позики"; sub = tx.note || pocketLabel(tx.pocketId); amountStr = `+${fmtMoney(tx.amount, tx.currency)}`; amountColor = "var(--accent)"; }

  const TypeIcon = tx.type === "transfer" ? ArrowLeftRight : tx.type === "exchange" ? RefreshCw : tx.type === "loan_out" ? ArrowUpRight : tx.type === "loan_return" ? ArrowDownRight : (ICONS[cat?.icon] || MoreHorizontal);

  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--surface2)" }}><TypeIcon size={16} style={{ color: "var(--text-dim)" }} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{label}</p><p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{sub}</p></div>
      <div className="text-right shrink-0"><p className="text-sm font-semibold tabular" style={{ color: amountColor }}>{amountStr}</p><p className="text-[11px]" style={{ color: "var(--text-dim)" }}>{fmtDate(tx.date)}</p></div>
    </div>
  );
}

/* ============================== ACCOUNTS VIEW ============================== */

function AccountsView({ accounts, accountPockets, pocketBalance, accountTotalBase, baseCurrency, setModal, archiveAccount, archivePocket }) {
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState({});
  const list = accounts.filter((a) => (showArchived ? a.archived : !a.archived));

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Рахунки</h1>
        <Button onClick={() => setModal({ type: "account" })}><Plus size={16} /> Новий рахунок</Button>
      </div>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setShowArchived(false)} className="px-3 py-1.5 rounded-lg font-medium" style={{ background: !showArchived ? "var(--surface2)" : "transparent", color: !showArchived ? "var(--text)" : "var(--text-dim)" }}>Активні</button>
        <button onClick={() => setShowArchived(true)} className="px-3 py-1.5 rounded-lg font-medium" style={{ background: showArchived ? "var(--surface2)" : "transparent", color: showArchived ? "var(--text)" : "var(--text-dim)" }}>Архів</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {list.map((acc) => {
          const pks = accountPockets(acc.id, true).filter((p) => showArchived ? true : true);
          const isOpen = expanded[acc.id] ?? true;
          return (
            <Card key={acc.id} className="p-5">
              <button onClick={() => toggle(acc.id)} className="w-full flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${acc.color}22` }}>
                    <Icon name={ACCOUNT_TYPES.find((t) => t.id === acc.type)?.icon} size={18} style={{ color: acc.color }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{acc.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>{ACCOUNT_TYPES.find((t) => t.id === acc.type)?.label} · {pks.filter(p=>!p.archived).length} валют{pks.filter(p=>!p.archived).length===1?"а":""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-base tabular">{fmtMoney(accountTotalBase(acc.id), baseCurrency)}</p>
                  <ChevronDown size={16} style={{ color: "var(--text-dim)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </div>
              </button>
              <div className="flex gap-1 mb-3">
                <button onClick={() => setModal({ type: "account", payload: acc })} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Edit3 size={14} /></button>
                <button onClick={() => archiveAccount(acc.id)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Archive size={14} /></button>
              </div>
              {isOpen && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {pks.map((p) => (
                    <div key={p.id} onClick={() => setModal({ type: "pocketDetail", payload: p.id })} className={`flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:opacity-90 ${p.archived ? "opacity-50" : ""}`} style={{ background: "var(--surface2)" }}>
                      <div>
                        <Badge color={acc.color}>{p.currency}</Badge>
                      </div>
                      <p className="font-semibold text-sm tabular">{fmtMoney(pocketBalance(p.id), p.currency)}</p>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: "pocket", payload: { accountId: acc.id, existing: p } }); }} className="p-1 rounded-md" style={{ color: "var(--text-dim)" }}><Edit3 size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); archivePocket(p.id); }} className="p-1 rounded-md" style={{ color: "var(--text-dim)" }}><Archive size={13} /></button>
                      </div>
                    </div>
                  ))}
                  {!showArchived && (
                    <button onClick={() => setModal({ type: "pocket", payload: { accountId: acc.id } })} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
                      <Plus size={14} /> Додати валютний субрахунок
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {list.length === 0 && <p className="text-sm col-span-full text-center py-10" style={{ color: "var(--text-dim)" }}>Немає рахунків у цій категорії</p>}
      </div>
    </div>
  );
}

/* ============================== HISTORY VIEW ============================== */

function HistoryView({ transactions, pockets, accounts, categories, getPocket, pocketLabel, deleteTransaction, duplicateTransaction, setModal }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPocket, setFilterPocket] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterPocket !== "all") {
        const match = t.pocketId === filterPocket || t.fromPocketId === filterPocket || t.toPocketId === filterPocket;
        if (!match) return false;
      }
      if (filterCategory !== "all" && t.categoryId !== filterCategory) return false;
      if (filterCurrency !== "all") {
        const curMatch = t.currency === filterCurrency || t.fromCurrency === filterCurrency || t.toCurrency === filterCurrency;
        if (!curMatch) return false;
      }
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (search) {
        const hay = `${t.note || ""} ${pocketLabel(t.pocketId || t.fromPocketId)}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterType, filterPocket, filterCategory, filterCurrency, dateFrom, dateTo, search, pocketLabel]);

  const typeLabel = { all: "Усі типи", income: "Доходи", expense: "Витрати", transfer: "Перекази", exchange: "Обмін валют", loan_out: "Позики надані", loan_return: "Повернення позик" };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Історія операцій</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}><Filter size={16} /></button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
        <Input placeholder="Пошук за описом..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {showFilters && (
        <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Тип операції">
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Рахунок">
            <Select value={filterPocket} onChange={(e) => setFilterPocket(e.target.value)}>
              <option value="all">Усі рахунки</option>
              {accounts.map((acc) => pockets.filter((p) => p.accountId === acc.id).map((p) => (
                <option key={p.id} value={p.id}>{acc.name} · {p.currency}</option>
              )))}
            </Select>
          </Field>
          <Field label="Категорія">
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Усі категорії</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Валюта">
            <Select value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
              <option value="all">Усі валюти</option>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Період від"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></Field>
          <Field label="Період до"><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></Field>
        </Card>
      )}

      <Card className="divide-y" style={{ borderColor: "var(--border)" }}>
        {filtered.map((tx) => (
          <div key={tx.id} className="group flex items-center">
            <div className="flex-1 min-w-0"><TxRow tx={tx} categories={categories} pocketLabel={pocketLabel} /></div>
            <div className="hidden group-hover:flex items-center gap-2 pr-4 shrink-0">
              {(tx.type === "income" || tx.type === "expense") && (
                <button onClick={() => setModal({ type: "transaction", payload: { kind: tx.type, editing: tx } })} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Edit3 size={14} /></button>
              )}
              <button onClick={() => duplicateTransaction(tx)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Plus size={14} /></button>
              <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm py-10 text-center" style={{ color: "var(--text-dim)" }}>Немає операцій за заданими фільтрами</p>}
      </Card>
    </div>
  );
}

/* ============================== LOANS VIEW ============================== */

function LoansView({ loans, pockets, getPocket, setModal, loanRemaining }) {
  const [showArchived, setShowArchived] = useState(false);
  const active = loans.filter((l) => l.status !== "returned");
  const done = loans.filter((l) => l.status === "returned");
  const overdueCount = active.filter((l) => new Date(l.dueDate) < new Date()).length;
  const list = showArchived ? done : active;

  const statusInfo = {
    active: { label: "Активна", color: "var(--accent2)" },
    partial: { label: "Частково повернена", color: "var(--warn)" },
    returned: { label: "Повернена", color: "var(--accent)" },
    overdue: { label: "Прострочена", color: "var(--danger)" },
  };
  const effectiveStatus = (l) => {
    if (l.status === "returned") return "returned";
    if (new Date(l.dueDate) < new Date()) return "overdue";
    return l.status;
  };

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Позики</h1>
        <Button onClick={() => setModal({ type: "loan" })}><Plus size={16} /> Надати позику</Button>
      </div>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setShowArchived(false)} className="px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-2" style={{ background: !showArchived ? "var(--surface2)" : "transparent", color: !showArchived ? "var(--text)" : "var(--text-dim)" }}>
          Активні ({active.length})
          {overdueCount > 0 && <span className="min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none" style={{ background: "var(--danger)", color: "#fff" }}>{overdueCount}</span>}
        </button>
        <button onClick={() => setShowArchived(true)} className="px-3 py-1.5 rounded-lg font-medium" style={{ background: showArchived ? "var(--surface2)" : "transparent", color: showArchived ? "var(--text)" : "var(--text-dim)" }}>Архів завершених ({done.length})</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((loan) => {
          const st = effectiveStatus(loan);
          const remaining = loanRemaining(loan);
          const days = daysBetween(new Date(), loan.dueDate);
          const pk = getPocket(loan.pocketId);
          return (
            <Card key={loan.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--surface2)" }}><Users size={16} style={{ color: "var(--text-dim)" }} /></div>
                  <div>
                    <p className="text-sm font-semibold">{loan.borrower}</p>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>{loan.note}</p>
                  </div>
                </div>
                <Badge color={statusInfo[st].color}>{statusInfo[st].label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div><p className="text-xs" style={{ color: "var(--text-dim)" }}>Початкова сума</p><p className="font-semibold tabular">{fmtMoney(loan.amount, loan.currency)}</p></div>
                <div><p className="text-xs" style={{ color: "var(--text-dim)" }}>Залишок боргу</p><p className="font-semibold tabular" style={{ color: remaining > 0 ? "var(--warn)" : "var(--accent)" }}>{fmtMoney(remaining, loan.currency)}</p></div>
                <div><p className="text-xs" style={{ color: "var(--text-dim)" }}>Повернено</p><p className="font-semibold tabular">{fmtMoney(loan.returned, loan.currency)}</p></div>
                <div><p className="text-xs" style={{ color: "var(--text-dim)" }}>Дата повернення</p><p className="font-semibold">{fmtDate(loan.dueDate)}</p></div>
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Видано з: {pk ? `${pk.account?.name} · ${pk.currency}` : "—"}</p>
              <p className="text-xs mb-3" style={{ color: days < 0 ? "var(--danger)" : "var(--text-dim)" }}>
                {days === 0 ? "Строк сьогодні" : days > 0 ? `Залишилось ${days} дн.` : `Прострочено на ${Math.abs(days)} дн.`}
              </p>
              {loan.status !== "returned" && (
                <Button variant="secondary" className="w-full" onClick={() => setModal({ type: "loanReturn", payload: loan })}>Зареєструвати повернення</Button>
              )}
            </Card>
          );
        })}
        {list.length === 0 && <p className="text-sm col-span-full text-center py-10" style={{ color: "var(--text-dim)" }}>Немає позик у цій категорії</p>}
      </div>
    </div>
  );
}

/* ============================== CATEGORIES VIEW ============================== */

function CategoriesView({ categories, setModal, archiveCategory }) {
  const [tab, setTab] = useState("expense");
  const list = categories.filter((c) => c.type === tab);
  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Категорії</h1>
        <Button onClick={() => setModal({ type: "category", payload: { type: tab } })}><Plus size={16} /> Нова категорія</Button>
      </div>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab("expense")} className="px-3 py-1.5 rounded-lg font-medium" style={{ background: tab === "expense" ? "var(--surface2)" : "transparent", color: tab === "expense" ? "var(--text)" : "var(--text-dim)" }}>Витрати</button>
        <button onClick={() => setTab("income")} className="px-3 py-1.5 rounded-lg font-medium" style={{ background: tab === "income" ? "var(--surface2)" : "transparent", color: tab === "income" ? "var(--text)" : "var(--text-dim)" }}>Доходи</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((c) => (
          <Card key={c.id} className={`p-4 flex items-center gap-3 ${c.archived ? "opacity-50" : ""}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}22` }}><Icon name={c.icon} size={16} style={{ color: c.color }} /></div>
            <p className="text-sm font-medium flex-1 truncate">{c.name}</p>
            <button onClick={() => setModal({ type: "category", payload: c })} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Edit3 size={14} /></button>
            <button onClick={() => archiveCategory(c.id)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Archive size={14} /></button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================== SETTINGS VIEW ============================== */

function SettingsView({ baseCurrency, rates, update }) {
  const [localRates, setLocalRates] = useState(rates);
  const [base, setBase] = useState(baseCurrency);
  const save = () => update({ rates: localRates, baseCurrency: base });
  return (
    <div className="space-y-5 animate-in max-w-xl">
      <h1 className="font-display font-bold text-2xl">Налаштування</h1>
      <Card className="p-5">
        <Field label="Базова валюта (для загального балансу)">
          <Select value={base} onChange={(e) => setBase(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        </Field>
        <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>Курси валют (скільки UAH за 1 одиницю)</p>
        <div className="grid grid-cols-2 gap-3">
          {CURRENCIES.filter((c) => c !== "UAH").map((c) => (
            <Field key={c} label={`1 ${c} =`}><Input type="number" step="0.01" value={localRates[c]} onChange={(e) => setLocalRates({ ...localRates, [c]: parseFloat(e.target.value) || 0 })} /></Field>
          ))}
        </div>
        <Button onClick={save} className="mt-2">Зберегти налаштування</Button>
      </Card>
    </div>
  );
}

/* ============================== MODAL ROUTER ============================== */

function ModalRouter({ modal, setModal, accounts, pockets, categories, rates, baseCurrency, addAccountWithPocket, editAccount, addPocket, editPocket, archivePocket, addCategory, editCategory, addTransaction, editTransaction, addLoan, registerLoanReturn, loans, loanRemaining, getPocket, pocketBalance, pocketLabel, transactions, deleteTransaction, duplicateTransaction }) {
  const close = () => setModal(null);
  if (modal.type === "account") return <AccountModal onClose={close} existing={modal.payload} addAccountWithPocket={addAccountWithPocket} editAccount={editAccount} />;
  if (modal.type === "pocket") return <PocketModal onClose={close} accountId={modal.payload.accountId} existing={modal.payload.existing} accounts={accounts} pockets={pockets} addPocket={addPocket} editPocket={editPocket} />;
  if (modal.type === "category") return <CategoryModal onClose={close} existing={modal.payload} addCategory={addCategory} editCategory={editCategory} />;
  if (modal.type === "transaction") return <TransactionModal onClose={close} kind={modal.payload.kind} editing={modal.payload.editing} presetPocketId={modal.payload.presetPocketId} accounts={accounts} pockets={pockets} categories={categories} addTransaction={addTransaction} editTransaction={editTransaction} />;
  if (modal.type === "transfer") return <TransferExchangeModal onClose={close} mode="transfer" presetFromPocketId={modal.payload?.presetPocketId} accounts={accounts} pockets={pockets} rates={rates} addTransaction={addTransaction} />;
  if (modal.type === "exchange") return <TransferExchangeModal onClose={close} mode="exchange" presetFromPocketId={modal.payload?.presetPocketId} accounts={accounts} pockets={pockets} rates={rates} addTransaction={addTransaction} />;
  if (modal.type === "loan") return <LoanModal onClose={close} accounts={accounts} pockets={pockets} addLoan={addLoan} />;
  if (modal.type === "loanReturn") return <LoanReturnModal onClose={close} loan={modal.payload} accounts={accounts} pockets={pockets} registerLoanReturn={registerLoanReturn} loanRemaining={loanRemaining} />;
  if (modal.type === "pocketDetail") return <PocketDetailModal pocketId={modal.payload} onClose={close} getPocket={getPocket} pocketBalance={pocketBalance} pocketLabel={pocketLabel} transactions={transactions} categories={categories} setModal={setModal} editTransaction={editTransaction} deleteTransaction={deleteTransaction} duplicateTransaction={duplicateTransaction} archivePocket={archivePocket} />;
  return null;
}

/* ---------- Pocket Detail (full-screen account view, Monobank-style) ---------- */
function RoundAction({ icon: Ic, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className="mono-circle"><Ic size={18} color="#fff" /></div>
      <span className="text-[11px] font-medium text-center leading-tight" style={{ color: "var(--text-dim)" }}>{label}</span>
    </button>
  );
}

function PocketDetailModal({ pocketId, onClose, getPocket, pocketBalance, pocketLabel, transactions, categories, setModal, editTransaction, deleteTransaction, duplicateTransaction, archivePocket }) {
  const pocket = getPocket(pocketId);
  if (!pocket || !pocket.account) return null;
  const acc = pocket.account;
  const balance = pocketBalance(pocketId);

  const history = useMemo(() =>
    transactions
      .filter((t) => t.pocketId === pocketId || t.fromPocketId === pocketId || t.toPocketId === pocketId)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
  [transactions, pocketId]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-in" style={{ background: "var(--bg)" }}>
      <div className="relative px-5 pt-6 pb-10" style={{ background: `linear-gradient(160deg, ${acc.color}, ${acc.color}66 65%, var(--bg))` }}>
        <button onClick={onClose} className="p-2 rounded-full mb-6" style={{ background: "rgba(0,0,0,0.18)" }}><X size={18} color="#fff" /></button>
        <p className="text-sm mb-1" style={{ color: "rgba(8,17,13,0.75)" }}>{acc.name} · {ACCOUNT_TYPES.find((t) => t.id === acc.type)?.label}</p>
        <h1 className="font-display font-extrabold text-4xl tabular" style={{ color: "#08110D" }}>{fmtMoney(balance, pocket.currency)}</h1>

        <div className="mt-6 max-w-sm">
          <PocketCard pocket={pocket} balance={balance} />
        </div>
      </div>

      <div className="px-5 -mt-5">
        <div className="grid grid-cols-4 gap-2 mb-6">
          <RoundAction icon={Plus} label="Дохід" onClick={() => setModal({ type: "transaction", payload: { kind: "income", presetPocketId: pocketId } })} />
          <RoundAction icon={Minus} label="Витрата" onClick={() => setModal({ type: "transaction", payload: { kind: "expense", presetPocketId: pocketId } })} />
          <RoundAction icon={ArrowLeftRight} label="Переказ" onClick={() => setModal({ type: "transfer", payload: { presetPocketId: pocketId } })} />
          <RoundAction icon={RefreshCw} label="Обмін" onClick={() => setModal({ type: "exchange", payload: { presetPocketId: pocketId } })} />
        </div>

        <Card className="divide-y mb-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-display font-semibold text-sm">Операції по цьому рахунку</h3>
          </div>
          {history.map((tx) => (
            <div key={tx.id} className="flex items-center">
              <div className="flex-1 min-w-0"><TxRow tx={tx} categories={categories} pocketLabel={pocketLabel} /></div>
              <div className="flex items-center gap-2 pr-4 shrink-0">
                {(tx.type === "income" || tx.type === "expense") && (
                  <button onClick={() => setModal({ type: "transaction", payload: { kind: tx.type, editing: tx } })} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Edit3 size={14} /></button>
                )}
                <button onClick={() => duplicateTransaction(tx)} className="p-1.5 rounded-lg" style={{ color: "var(--text-dim)" }}><Plus size={14} /></button>
                <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded-lg" style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm py-8 text-center" style={{ color: "var(--text-dim)" }}>Ще немає операцій по цьому рахунку</p>}
        </Card>

        <button onClick={() => { archivePocket(pocketId); onClose(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium mb-8" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
          <Archive size={14} /> Архівувати субрахунок
        </button>
      </div>
    </div>
  );
}

/* ---------- Account Modal (creates account + its first currency pocket) ---------- */
function AccountModal({ onClose, existing, addAccountWithPocket, editAccount }) {
  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState(existing?.type || "cash");
  const [color, setColor] = useState(existing?.color || ACCOUNT_COLORS[0]);
  const [currency, setCurrency] = useState("UAH");
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("Введіть назву рахунку");
    if (existing) { editAccount(existing.id, { name: name.trim(), type, color }); }
    else { addAccountWithPocket({ name: name.trim(), type, color }, currency, balance); }
    onClose();
  };

  return (
    <Modal title={existing ? "Редагувати рахунок" : "Новий рахунок"} onClose={onClose}>
      <Field label="Назва" error={error}><Input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Напр. Готівка, Monobank" /></Field>
      <Field label="Тип рахунку">
        <Select value={type} onChange={(e) => setType(e.target.value)}>{ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
      </Field>
      <Field label="Колір">
        <div className="flex gap-2 flex-wrap">
          {ACCOUNT_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full" style={{ background: c, border: color === c ? "2px solid var(--text)" : "2px solid transparent" }} />)}
        </div>
      </Field>
      {!existing && (
        <>
          <p className="text-xs mb-2 mt-1" style={{ color: "var(--text-dim)" }}>Створимо перший валютний субрахунок. Інші валюти можна додати пізніше.</p>
          <Field label="Валюта">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
          <Field label="Початковий баланс"><Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} /></Field>
        </>
      )}
      <Button className="w-full mt-2" onClick={submit}>{existing ? "Зберегти зміни" : "Створити рахунок"}</Button>
    </Modal>
  );
}

/* ---------- Pocket Modal (add / edit a currency sub-account) ---------- */
function PocketModal({ onClose, accountId, existing, accounts, pockets, addPocket, editPocket }) {
  const account = accounts.find((a) => a.id === accountId);
  const usedCurrencies = pockets.filter((p) => p.accountId === accountId && p.id !== existing?.id).map((p) => p.currency);
  const availableCurrencies = CURRENCIES.filter((c) => !usedCurrencies.includes(c) || c === existing?.currency);
  const [currency, setCurrency] = useState(existing?.currency || availableCurrencies[0] || "UAH");
  const [balance, setBalance] = useState(existing ? existing.initialBalance : 0);
  const [error, setError] = useState("");

  const submit = () => {
    if (!currency) return setError("Оберіть валюту");
    if (existing) editPocket(existing.id, { initialBalance: parseFloat(balance) || 0 });
    else addPocket(accountId, currency, balance);
    onClose();
  };

  return (
    <Modal title={existing ? `Субрахунок ${account?.name}` : `Новий валютний субрахунок · ${account?.name}`} onClose={onClose}>
      <Field label="Валюта" error={error}>
        <Select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!!existing}>
          {(existing ? [existing.currency] : availableCurrencies).map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label={existing ? "Початковий баланс (без транзакцій)" : "Початковий баланс"}>
        <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
      </Field>
      {availableCurrencies.length === 0 && !existing && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>Усі доступні валюти вже додані до цього рахунку.</p>}
      <Button className="w-full mt-2" onClick={submit} disabled={!existing && availableCurrencies.length === 0}>{existing ? "Зберегти зміни" : "Додати субрахунок"}</Button>
    </Modal>
  );
}

/* ---------- Category Modal ---------- */
function CategoryModal({ onClose, existing, addCategory, editCategory }) {
  const isEdit = existing && existing.id;
  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState(existing?.type || "expense");
  const [icon, setIcon] = useState(existing?.icon || "MoreHorizontal");
  const [color, setColor] = useState(existing?.color || ACCOUNT_COLORS[0]);
  const [error, setError] = useState("");
  const iconOptions = Object.keys(ICONS);

  const submit = () => {
    if (!name.trim()) return setError("Введіть назву категорії");
    const data = { name: name.trim(), type, icon, color };
    if (isEdit) editCategory(existing.id, data); else addCategory(data);
    onClose();
  };

  return (
    <Modal title={isEdit ? "Редагувати категорію" : "Нова категорія"} onClose={onClose}>
      <Field label="Назва" error={error}><Input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} /></Field>
      <Field label="Тип">
        <Select value={type} onChange={(e) => setType(e.target.value)} disabled={isEdit}>
          <option value="expense">Витрата</option>
          <option value="income">Дохід</option>
        </Select>
      </Field>
      <Field label="Іконка">
        <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
          {iconOptions.map((k) => (
            <button key={k} onClick={() => setIcon(k)} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: icon === k ? "var(--accent)" : "var(--surface2)" }}>
              <Icon name={k} size={15} style={{ color: icon === k ? "#08110D" : "var(--text-dim)" }} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Колір">
        <div className="flex gap-2 flex-wrap">{ACCOUNT_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full" style={{ background: c, border: color === c ? "2px solid var(--text)" : "2px solid transparent" }} />)}</div>
      </Field>
      <Button className="w-full mt-2" onClick={submit}>{isEdit ? "Зберегти зміни" : "Створити категорію"}</Button>
    </Modal>
  );
}

/* ---------- Transaction (income/expense) Modal ---------- */
function TransactionModal({ onClose, kind, editing, presetPocketId, accounts, pockets, categories, addTransaction, editTransaction }) {
  const isIncome = kind === "income";
  const cats = categories.filter((c) => c.type === kind && !c.archived);
  const firstPocket = pockets.find((p) => !p.archived);
  const [amount, setAmount] = useState(editing?.amount || "");
  const [pocketId, setPocketId] = useState(editing?.pocketId || presetPocketId || firstPocket?.id || "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId || cats[0]?.id || "");
  const [date, setDate] = useState(editing?.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(editing?.note || "");
  const [receipt, setReceipt] = useState(editing?.receipt || null);
  const [error, setError] = useState("");

  const currentPocket = pockets.find((p) => p.id === pocketId);
  const currency = currentPocket?.currency || "UAH";

  const handleReceipt = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReceipt(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Введіть коректну суму");
    if (!pocketId) return setError("Оберіть рахунок");
    if (!categoryId) return setError("Оберіть категорію");
    const data = { type: kind, amount: amt, currency, pocketId, categoryId, date, note, receipt };
    if (editing) editTransaction(editing.id, data); else addTransaction(data);
    onClose();
  };

  return (
    <Modal title={editing ? "Редагувати операцію" : isIncome ? "Додати дохід" : "Додати витрату"} onClose={onClose}>
      <Field label="Рахунок">
        <PocketSelect accounts={accounts} pockets={pockets} value={pocketId} onChange={setPocketId} />
      </Field>
      <Field label={`Сума (${currency})`} error={error}>
        <Input type="number" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="0.00" />
      </Field>
      <Field label="Категорія">
        <div className="grid grid-cols-4 gap-2">
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: categoryId === c.id ? "var(--surface2)" : "transparent", border: categoryId === c.id ? `1px solid ${c.color}` : "1px solid var(--border)" }}>
              <Icon name={c.icon} size={16} style={{ color: c.color }} />
              <span className="text-[10px] text-center leading-tight" style={{ color: "var(--text)" }}>{c.name}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Дата"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Опис / коментар"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
      <Field label="Фото чеку (необов'язково)">
        <input type="file" accept="image/*" onChange={handleReceipt} className="text-xs" style={{ color: "var(--text-dim)" }} />
        {receipt && <img src={receipt} alt="чек" className="mt-2 h-24 rounded-lg object-cover" />}
      </Field>
      <Button className="w-full mt-2" onClick={submit}>{editing ? "Зберегти зміни" : "Зберегти"}</Button>
    </Modal>
  );
}

/* ---------- Transfer / Exchange Modal ---------- */
function TransferExchangeModal({ onClose, mode, presetFromPocketId, accounts, pockets, rates, addTransaction }) {
  const isExchange = mode === "exchange";
  const active = pockets.filter((p) => !p.archived);
  const [fromPocketId, setFromPocketId] = useState(presetFromPocketId || active[0]?.id || "");
  const [toPocketId, setToPocketId] = useState(active.find((p) => p.id !== (presetFromPocketId || active[0]?.id))?.id || active[0]?.id || "");
  const [fromAmount, setFromAmount] = useState("");
  const [rate, setRate] = useState(1);
  const [toAmount, setToAmount] = useState("");
  const [fee, setFee] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [manualTo, setManualTo] = useState(false);

  const fromPocket = pockets.find((p) => p.id === fromPocketId);
  const toPocket = pockets.find((p) => p.id === toPocketId);
  const fromCurrency = fromPocket?.currency || "UAH";
  const toCurrency = toPocket?.currency || "UAH";
  const crossCurrency = fromCurrency !== toCurrency;

  useEffect(() => {
    if (crossCurrency) setRate(Math.round(convert(1, fromCurrency, toCurrency, rates) * 10000) / 10000);
    else setRate(1);
  }, [fromCurrency, toCurrency, crossCurrency]);

  useEffect(() => {
    if (manualTo) return;
    const amt = parseFloat(fromAmount) || 0;
    const f = parseFloat(fee) || 0;
    const computed = crossCurrency ? amt * rate - f : amt - f;
    setToAmount(computed > 0 ? Math.round(computed * 100) / 100 : 0);
  }, [fromAmount, rate, fee, crossCurrency, manualTo]);

  const submit = () => {
    const amt = parseFloat(fromAmount);
    if (!amt || amt <= 0) return setError("Введіть коректну суму списання");
    if (!fromPocketId || !toPocketId) return setError("Оберіть рахунки");
    if (fromPocketId === toPocketId) return setError("Оберіть різні рахунки");
    const to = parseFloat(toAmount);
    if (!to || to <= 0) return setError("Сума зарахування має бути додатною");
    addTransaction({ type: isExchange ? "exchange" : "transfer", date, fromPocketId, toPocketId, fromAmount: amt, fromCurrency, toAmount: to, toCurrency, rate: crossCurrency ? rate : 1, fee: parseFloat(fee) || 0, note });
    onClose();
  };

  return (
    <Modal title={isExchange ? "Обмін валюти" : "Переказ між рахунками"} onClose={onClose}>
      <Field label="Рахунок списання">
        <PocketSelect accounts={accounts} pockets={pockets} value={fromPocketId} onChange={setFromPocketId} />
      </Field>
      <Field label="Рахунок зарахування">
        <PocketSelect accounts={accounts} pockets={pockets} value={toPocketId} onChange={setToPocketId} excludePocketId={fromPocketId} />
      </Field>
      <Field label={`Сума списання (${fromCurrency})`} error={error}>
        <Input type="number" step="0.01" value={fromAmount} onChange={(e) => { setFromAmount(e.target.value); setError(""); }} />
      </Field>
      {crossCurrency && (
        <Field label={`Курс обміну (1 ${fromCurrency} = X ${toCurrency})`}><Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} /></Field>
      )}
      <Field label={`Комісія (${crossCurrency ? toCurrency : fromCurrency}, необов'язково)`}><Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
      <Field label={`Сума зарахування (${toCurrency})`}><Input type="number" step="0.01" value={toAmount} onChange={(e) => { setToAmount(e.target.value); setManualTo(true); }} /></Field>
      <Field label="Дата"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Коментар"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
      <Button className="w-full mt-2" onClick={submit}>{isExchange ? "Обміняти" : "Переказати"}</Button>
    </Modal>
  );
}

/* ---------- Loan Modal ---------- */
function LoanModal({ onClose, accounts, pockets, addLoan }) {
  const active = pockets.filter((p) => !p.archived);
  const [borrower, setBorrower] = useState("");
  const [amount, setAmount] = useState("");
  const [pocketId, setPocketId] = useState(active[0]?.id || "");
  const [dateGiven, setDateGiven] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const currency = pockets.find((p) => p.id === pocketId)?.currency || "UAH";

  const submit = () => {
    const amt = parseFloat(amount);
    if (!borrower.trim()) return setError("Введіть ім'я позичальника");
    if (!amt || amt <= 0) return setError("Введіть коректну суму");
    if (!pocketId) return setError("Оберіть рахунок");
    if (!dueDate) return setError("Вкажіть очікувану дату повернення");
    addLoan({ borrower: borrower.trim(), amount: amt, currency, pocketId, dateGiven, dueDate, note }, pocketId, amt, currency, note);
    onClose();
  };

  return (
    <Modal title="Надати позику" onClose={onClose}>
      <Field label="Ім'я / назва позичальника" error={error}><Input value={borrower} onChange={(e) => { setBorrower(e.target.value); setError(""); }} placeholder="Напр. Олег К." /></Field>
      <Field label="Рахунок, з якого видано кошти">
        <PocketSelect accounts={accounts} pockets={pockets} value={pocketId} onChange={setPocketId} />
      </Field>
      <Field label={`Сума (${currency})`}><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Дата надання"><Input type="date" value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} /></Field>
      <Field label="Очікувана дата повернення"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      <Field label="Коментар / домовленість"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
      <Button className="w-full mt-2" onClick={submit}>Надати позику</Button>
    </Modal>
  );
}

/* ---------- Loan Return Modal ---------- */
function LoanReturnModal({ onClose, loan, accounts, pockets, registerLoanReturn, loanRemaining }) {
  const active = pockets.filter((p) => !p.archived && p.currency === loan.currency);
  const remaining = loanRemaining(loan);
  const [amount, setAmount] = useState(remaining);
  const [pocketId, setPocketId] = useState(active.find((p) => p.id === loan.pocketId)?.id || active[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Введіть коректну суму повернення");
    if (amt > remaining + 0.005) return setError(`Сума не може перевищувати залишок боргу (${fmtMoney(remaining, loan.currency)})`);
    if (!pocketId) return setError("Оберіть рахунок зарахування");
    registerLoanReturn(loan.id, amt, pocketId, loan.currency, date, note);
    onClose();
  };

  return (
    <Modal title={`Повернення позики: ${loan.borrower}`} onClose={onClose}>
      <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text-dim)" }}>
        Залишок боргу: <strong style={{ color: "var(--text)" }}>{fmtMoney(remaining, loan.currency)}</strong>
      </p>
      <Field label={`Сума повернення (${loan.currency})`} error={error}>
        <Input type="number" step="0.01" max={remaining} value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} />
      </Field>
      <Field label={`Рахунок зарахування (валюта ${loan.currency})`}>
        <PocketSelect accounts={accounts} pockets={active} value={pocketId} onChange={setPocketId} />
      </Field>
      <Field label="Дата повернення"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Коментар"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
      <Button className="w-full mt-2" onClick={submit}>Зареєструвати повернення</Button>
    </Modal>
  );
}
