import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import { LogOut, RefreshCw, Menu, Search, ChevronDown } from '../icons';

const pageLabels = {
  dashboard: 'Overview', emails: 'Mail', compose: 'New message', search: 'Search',
  spam: 'Spam analysis', users: 'People', reports: 'Analytics',
};

export default function Navbar({ onRefresh, isRefreshing, currentPage, onMenuToggle }) {
  const { user, logout, quickSwitchUser } = useAuth();
  const demoAccounts = [
    { label: 'Admin Evaluator', email: 'admin@emailmgmt.local', password: 'Admin@1234' },
    { label: 'John Doe', email: 'john.doe@emailmgmt.local', password: 'User@1234' },
    { label: 'Alice Smith', email: 'alice.smith@emailmgmt.local', password: 'User@1234' },
  ];

  return (
    <header className="app-topbar">
      <div className="topbar-leading">
        <button className="mobile-menu-button" onClick={onMenuToggle} aria-label="Open navigation"><Menu size={19} /></button>
        <div className="page-heading">
          <span className="eyebrow-resend">MAILGUARD / WORKSPACE</span>
          <h1>{pageLabels[currentPage] || 'Overview'}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="topbar-search" onClick={() => window.dispatchEvent(new CustomEvent('open-search'))} aria-label="Go to search">
          <Search size={15} /><span>Search mail</span><kbd>⌘ K</kbd>
        </button>
        {onRefresh && (
          <button onClick={onRefresh} className="icon-button refresh-button" aria-label="Refresh data" title="Refresh data">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Visible, Accessible Theme Toggle */}
        <ThemeToggle />

        <details className="account-menu">
          <summary className="account-trigger" aria-label="Account options">
            <span className="account-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <span className="account-copy"><strong>{user?.name || 'User'}</strong><small>{user?.email}</small></span>
            <ChevronDown size={14} />
          </summary>
          <div className="account-popover">
            <div className="popover-label">Switch demo account</div>
            {demoAccounts.map((account) => (
              <button key={account.email} onClick={() => quickSwitchUser(account.email, account.password)} className="account-option">
                <span>{account.label}</span>{user?.email === account.email && <span className="option-current">Current</span>}
              </button>
            ))}
            <div className="popover-divider" />
            <button onClick={logout} className="account-option logout-option"><LogOut size={14} /> Sign out</button>
          </div>
        </details>
      </div>
    </header>
  );
}
