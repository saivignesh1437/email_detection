import React from 'react';
import {
  LayoutDashboard, Mail, PenSquare, Search, ShieldAlert, Users,
  BarChart3, Inbox, Send, Trash2,
} from '../icons';

export default function Sidebar({ currentPage, setCurrentPage, stats, open = false, onClose }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'emails', label: 'All mail', icon: Mail, count: stats?.inbox_count },
    { id: 'compose', label: 'Compose', icon: PenSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'spam', label: 'Spam analysis', icon: ShieldAlert, count: stats?.spam_count, isAlert: true },
    { id: 'users', label: 'People', icon: Users },
    { id: 'reports', label: 'Analytics', icon: BarChart3 },
  ];

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, folder: 'inbox' },
    { id: 'sent', label: 'Sent', icon: Send, folder: 'sent' },
    { id: 'spam_folder', label: 'Spam', icon: ShieldAlert, folder: 'spam' },
    { id: 'trash', label: 'Trash', icon: Trash2, folder: 'trash' },
  ];

  const navigate = (page) => {
    setCurrentPage(page);
    onClose?.();
  };

  const openFolder = (folder) => {
    setCurrentPage('emails');
    window.dispatchEvent(new CustomEvent('switch-folder', { detail: folder }));
    onClose?.();
  };

  return (
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="brand-mark"><Mail size={18} strokeWidth={1.7} /></div>
        <div className="brand-copy">
          <span className="brand-name">Mailguard</span>
          <span className="brand-caption">Intelligent email</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <section className="nav-section">
          <p className="nav-label">Workspace</p>
          <nav className="sidebar-nav">
            {navItems.map(({ id, label, icon: Icon, count, isAlert }) => (
              <button key={id} onClick={() => navigate(id)} className={`nav-item ${currentPage === id ? 'is-active' : ''}`}>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
                {count > 0 && <span className={`nav-count ${isAlert ? 'is-alert' : ''}`}>{count}</span>}
              </button>
            ))}
          </nav>
        </section>

        <section className="nav-section folder-section">
          <p className="nav-label">Folders</p>
          <nav className="sidebar-nav">
            {folders.map(({ id, label, icon: Icon, folder }) => (
              <button key={id} onClick={() => openFolder(folder)} className="nav-item">
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </section>
      </div>
    </aside>
  );
}
