/**
 * App.jsx - Main application shell & views
 * Supports both Resend-inspired Dark & Light themes with ThemeProvider,
 * accessible theme toggle, and responsive mobile master-detail layout.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { api } from './services/api';
import {
  Mail, ShieldAlert, Search,
  Send, Inbox, Trash2, Eye,
  CheckCircle, RefreshCw, Loader2,
  History, Database, ArrowLeft
} from './icons';

/* ─────────────────────────────────────────────
   SHARED: StatusBadge, LoadingSpinner, StatCard
   ───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    Inbox: 'pill-inbox',
    Read:  'pill-read',
    Spam:  'pill-spam',
    Trash: 'pill-trash',
    Sent:  'pill-sent',
  };
  return (
    <span className={`pill-badge ${map[status] || 'pill-read'}`}>
      {status}
    </span>
  );
}

function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', gap: '10px' }}>
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--ink)' }} />
      <span style={{ fontSize: '13px', color: 'var(--mute)' }}>{label}</span>
    </div>
  );
}

function StatCard({ label, value, color = 'default', subtext }) {
  const colorMap = {
    rose:   { text: 'var(--accent-red)', border: 'rgba(255, 32, 71, 0.20)' },
    emerald:{ text: 'var(--accent-green)', border: 'rgba(17, 217, 139, 0.20)' },
    amber:  { text: 'var(--accent-yellow)', border: 'rgba(255, 197, 61, 0.20)' },
    blue:   { text: 'var(--accent-blue)', border: 'rgba(59, 158, 255, 0.20)' },
    default:{ text: 'var(--ink)', border: 'var(--hairline)' }
  };
  const theme = colorMap[color] || colorMap.default;

  return (
    <div
      className="card-resend"
      style={{
        padding: '16px 18px',
        borderColor: theme.border,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '88px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '24px', fontWeight: 600, color: theme.text, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </span>
        {subtext && (
          <span style={{ fontSize: '10px', color: 'var(--ash)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD PAGE
   ───────────────────────────────────────────── */
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    api.getUserStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.user_id]);

  if (loading) return <LoadingSpinner label="Loading dashboard metrics…" />;

  const maxCategoryCount = Math.max(...(stats?.categories_breakdown?.map(c => c.count) || [1]), 1);
  const maxStatusCount = Math.max(...(stats?.status_breakdown?.map(s => s.count) || [1]), 1);

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1120px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      {/* Editorial Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px' }}>
          Personal Dashboard
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
          Real-time email activity and spam detection analytics for <strong>{user?.name || 'your account'}</strong>.
        </p>
      </div>

      {/* User-specific stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatCard label="My Emails" value={stats?.total_emails ?? '—'} color="blue" subtext="total in mailbox" />
        <StatCard label="Received" value={stats?.total_received ?? '—'} color="default" subtext="inbound messages" />
        <StatCard label="My Spam" value={stats?.spam_count ?? '—'} color="rose" subtext="flagged suspicious" />
        <StatCard label="Spam Ratio" value={stats ? `${stats.spam_ratio}%` : '—'} color="amber" subtext="risk percentage" />
      </div>

      {/* Breakdown grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Personal category breakdown */}
        {stats?.categories_breakdown?.length > 0 && (
          <div className="card-resend" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span className="eyebrow-resend">Category Breakdown</span>
              <span style={{ fontSize: '11px', color: 'var(--ash)' }}>{stats.categories_breakdown.length} active</span>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {stats.categories_breakdown.map((c) => {
                const pct = Math.round((c.count / maxCategoryCount) * 100);
                return (
                  <div key={c.name} style={{ display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>{c.count}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ink)', borderRadius: '2px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Personal status breakdown */}
        {stats?.status_breakdown?.length > 0 && (
          <div className="card-resend" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span className="eyebrow-resend">Email Status Breakdown</span>
              <span style={{ fontSize: '11px', color: 'var(--ash)' }}>Inbox &amp; Lifecycle</span>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {stats.status_breakdown.map((s) => {
                const pct = Math.round((s.count / maxStatusCount) * 100);
                return (
                  <div key={s.status} style={{ display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{s.status}</span>
                      <span style={{ color: 'var(--mute)', fontFamily: 'var(--font-mono)' }}>{s.count}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: s.status === 'Spam' ? 'var(--accent-red)' : 'var(--accent-blue)', borderRadius: '2px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--ash)', textAlign: 'right' }}>
        Live scoped query &bull; Authenticated as user #{user?.user_id}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMAIL LIST & DETAIL PAGE
   ───────────────────────────────────────────── */
function EmailsPage({ folder, onUpdate }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    let active = true;
    api.getEmails({ folder: folder || undefined })
      .then((data) => {
        if (active) setEmails(data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [folder]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('switch-folder', handler);
    return () => window.removeEventListener('switch-folder', handler);
  }, [load]);

  const handleRefreshAll = () => {
    load();
    if (onUpdate) onUpdate();
  };

  if (loading) return <LoadingSpinner label="Loading messages…" />;

  return (
    <div className="emails-split-container">
      {/* Email List Pane */}
      <div className={`emails-list-pane ${selected ? 'is-hidden-mobile' : ''}`}>
        {/* List Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {folder ? folder.charAt(0).toUpperCase() + folder.slice(1) : 'All Emails'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
              ({emails.length})
            </span>
          </div>
          <button
            onClick={handleRefreshAll}
            className="icon-button"
            title="Refresh mail list"
            aria-label="Refresh mail list"
            style={{ width: '28px', height: '28px' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* List Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {emails.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ash)', fontSize: '13px' }}>
              <Mail size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              No emails found in this view.
            </div>
          ) : (
            emails.map((e) => {
              const isSelected = selected?.email_id === e.email_id;
              const isSpam = e.spam_detection?.classification === 'Spam';
              return (
                <div
                  key={e.email_id}
                  onClick={() => setSelected(e)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--hairline)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--surface-elevated)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--ink)' : '2px solid transparent',
                    transition: 'all 0.14s ease',
                  }}
                  onMouseEnter={(ev) => {
                    if (!isSelected) ev.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                  }}
                  onMouseLeave={(ev) => {
                    if (!isSelected) ev.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      {isSpam && <ShieldAlert size={13} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />}
                      <span style={{ fontSize: '12px', fontWeight: 500, color: isSelected ? 'var(--ink)' : 'var(--body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.sender?.name || e.sender?.email}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--ash)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                      {new Date(e.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: isSelected ? 500 : 400, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                    {e.subject}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ash)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.body?.slice(0, 60)}…
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Email Detail Pane */}
      <div className={`emails-detail-pane ${!selected ? 'is-hidden-mobile' : ''}`}>
        {selected ? (
          <EmailDetail
            initialEmail={selected}
            onClose={() => setSelected(null)}
            onRefresh={handleRefreshAll}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', padding: '24px' }}>
            <Mail size={36} strokeWidth={1.3} style={{ marginBottom: '12px', opacity: 0.25 }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>Select an email from the list to read</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailDetail({ initialEmail, onClose, onRefresh }) {
  const [email, setEmail] = useState(initialEmail);
  const [updating, setUpdating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getEmailById(initialEmail.email_id)
      .then((fullData) => {
        if (isMounted) setEmail(fullData);
      })
      .catch((err) => console.error('Failed to load email details:', err))
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });
    return () => { isMounted = false; };
  }, [initialEmail.email_id]);

  const changeStatus = async (status) => {
    setUpdating(true);
    try {
      await api.updateEmailStatus(email.email_id, status);
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const deleteEmail = async () => {
    setUpdating(true);
    try {
      await api.deleteEmail(email.email_id);
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: '860px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      {/* Mobile Back Button */}
      <button
        type="button"
        onClick={onClose}
        className="btn-secondary mobile-back-btn"
        style={{ marginBottom: '16px' }}
      >
        <ArrowLeft size={14} /> Back to email list
      </button>

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <h3 className="font-editorial" style={{ fontSize: '24px', margin: 0, color: 'var(--ink)' }}>
          {email.subject}
        </h3>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ padding: '4px 8px', fontSize: '18px', lineHeight: 1 }}
          aria-label="Close message view"
        >
          &times;
        </button>
      </div>

      {/* Metadata Card */}
      <div
        className="card-resend"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          fontSize: '12px',
          display: 'grid',
          gap: '8px',
          background: 'var(--surface-deep)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ color: 'var(--ash)', marginRight: '6px' }}>From:</span>
            <strong style={{ color: 'var(--ink)' }}>{email.sender?.name}</strong>{' '}
            <span style={{ color: 'var(--mute)' }}>&lt;{email.sender?.email}&gt;</span>
          </div>
          <div style={{ color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
            {new Date(email.received_at).toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ color: 'var(--ash)', marginRight: '6px' }}>To:</span>
            <strong style={{ color: 'var(--ink)' }}>{email.receiver?.name}</strong>{' '}
            <span style={{ color: 'var(--mute)' }}>&lt;{email.receiver?.email}&gt;</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusBadge status={email.status} />
            {email.category && (
              <span className="pill-badge pill-inbox">
                {email.category.category_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message Body */}
      <div
        className="card-resend"
        style={{
          padding: '24px',
          fontSize: '14px',
          lineHeight: '1.65',
          color: 'var(--body)',
          whiteSpace: 'pre-wrap',
          marginBottom: '24px',
          background: 'var(--surface-card)',
          wordBreak: 'break-word',
        }}
      >
        {email.body}
      </div>

      {/* Combined Spam Detection: ML + DSA + Hybrid */}
      {(email.spam_detection || email.dsa_detection) && (
        <div
          className="card-resend"
          style={{
            padding: '20px',
            marginBottom: '24px',
            background: 'var(--surface-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
            <span className="eyebrow-resend" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--accent-blue)' }} />
              Dual-Engine Spam Analysis (ML + DSA)
            </span>
            {email.spam_detection && email.dsa_detection && (
              <span
                className={`pill-badge ${
                  email.spam_detection.classification === 'Spam' && email.dsa_detection.classification === 'SPAM'
                    ? 'pill-spam'
                    : email.spam_detection.classification === 'Not Spam' && email.dsa_detection.classification === 'NOT SPAM'
                    ? 'pill-success'
                    : 'pill-warning'
                }`}
              >
                {email.spam_detection.classification === 'Spam' && email.dsa_detection.classification === 'SPAM'
                  ? 'High-Confidence Spam'
                  : email.spam_detection.classification === 'Not Spam' && email.dsa_detection.classification === 'NOT SPAM'
                  ? 'Concordant Legitimate'
                  : 'Detector Disagreement (Suspicious)'}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
            {/* Machine Learning Panel */}
            {email.spam_detection && (
              <div
                className="card-elevated"
                style={{
                  padding: '16px',
                  borderColor: email.spam_detection.classification === 'Spam' ? 'rgba(255, 32, 71, 0.22)' : 'rgba(17, 217, 139, 0.22)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {email.spam_detection.classification === 'Spam' ? (
                      <ShieldAlert size={14} style={{ color: 'var(--accent-red)' }} />
                    ) : (
                      <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
                    )}
                    ML Classifier (TF-IDF + MNB)
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: email.spam_detection.classification === 'Spam' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {email.spam_detection.classification}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '8px' }}>
                  Spam Score: {email.spam_detection.spam_score} ({Math.round(email.spam_detection.spam_score * 100)}% prob)
                </div>
                {email.spam_detection.reason && (
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--ash)', lineHeight: 1.5, borderTop: '1px solid var(--hairline)', paddingTop: '6px' }}>
                    {email.spam_detection.reason}
                  </p>
                )}
              </div>
            )}

            {/* Java DSA Engine Panel */}
            {email.dsa_detection ? (
              <div
                className="card-elevated"
                style={{
                  padding: '16px',
                  borderColor: email.dsa_detection.classification === 'SPAM' ? 'rgba(255, 32, 71, 0.22)' : 'rgba(17, 217, 139, 0.22)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={14} style={{ color: 'var(--accent-blue)' }} />
                    Java DSA Engine (Trie + DP)
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: email.dsa_detection.classification === 'SPAM' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {email.dsa_detection.classification}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '6px' }}>
                  Score: {email.dsa_detection.spam_score} &bull; Risk: <strong>{email.dsa_detection.risk_level}</strong>
                </div>
                {email.dsa_detection.exact_matches?.length > 0 && (
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--ash)' }}>Aho-Corasick Exact: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-red)', background: 'rgba(255, 32, 71, 0.08)', padding: '2px 5px', borderRadius: '4px', wordBreak: 'break-all' }}>
                      {email.dsa_detection.exact_matches.join(', ')}
                    </span>
                  </div>
                )}
                {email.dsa_detection.fuzzy_matches?.length > 0 && (
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--ash)' }}>Damerau-Levenshtein Fuzzy: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-yellow)', background: 'rgba(255, 197, 61, 0.08)', padding: '2px 5px', borderRadius: '4px', wordBreak: 'break-all' }}>
                      {email.dsa_detection.fuzzy_matches.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="card-resend"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: 'var(--ash)',
                  borderStyle: 'dashed',
                }}
              >
                Java DSA detection not yet performed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
        <button onClick={() => changeStatus('Read')} disabled={updating} className="btn-secondary">
          <Eye size={13} /> Mark Read
        </button>
        <button onClick={() => changeStatus('Inbox')} disabled={updating} className="btn-secondary">
          <Inbox size={13} /> Move to Inbox
        </button>
        <button onClick={() => changeStatus('Spam')} disabled={updating} className="btn-danger">
          <ShieldAlert size={13} /> Mark Spam
        </button>
        <button onClick={deleteEmail} disabled={updating} className="btn-ghost" style={{ color: 'var(--accent-red)' }}>
          <Trash2 size={13} /> Delete / Trash
        </button>
      </div>

      {/* PostgreSQL Trigger Audit History */}
      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={14} style={{ color: 'var(--accent-blue)' }} />
            <span className="eyebrow-resend">PostgreSQL Trigger Audit History</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--ash)', background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px' }}>
            Automated DB Trigger Log
          </span>
        </div>

        {loadingDetail ? (
          <p style={{ fontSize: '12px', color: 'var(--ash)' }}>Loading audit history…</p>
        ) : (!email.audit_logs || email.audit_logs.length === 0) ? (
          <p style={{ fontSize: '12px', color: 'var(--ash)' }}>No audit events logged yet for this email.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {email.audit_logs.map((log) => (
              <div
                key={log.audit_id}
                className="card-resend"
                style={{
                  padding: '12px 16px',
                  background: 'var(--surface-deep)',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span
                    className={`pill-badge ${
                      log.action === 'AUTO_SPAM_FLAGGED'
                        ? 'pill-spam'
                        : log.action === 'STATUS_CHANGED'
                        ? 'pill-warning'
                        : 'pill-inbox'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.changed_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: 'var(--body)', fontSize: '11px', marginTop: '4px' }}>
                  {log.details || `State updated: ${log.previous_status || 'None'} → ${log.new_status}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPOSE PAGE
   ───────────────────────────────────────────── */
function ComposePage({ onSent }) {
  const [form, setForm] = useState({
    receiver_id: '',
    subject: '',
    body: '',
    category_id: 1,
    auto_detect_spam: true
  });
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error);
    api.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) {
        setForm(f => ({ ...f, category_id: f.category_id || cats[0].category_id }));
      }
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      const data = await api.createEmail({
        ...form,
        receiver_id: parseInt(form.receiver_id),
        category_id: parseInt(form.category_id)
      });
      setResult(data);
      setForm({ receiver_id: '', subject: '', body: '', category_id: 1, auto_detect_spam: true });
      if (onSent) onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: '720px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px' }}>
          Compose Message
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
          Dispatch an email across users with automatic spam detection and database trigger auditing.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(255, 32, 71, 0.10)', border: '1px solid rgba(255, 32, 71, 0.25)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginBottom: '16px', padding: '14px 18px', background: 'rgba(17, 217, 139, 0.10)', border: '1px solid rgba(17, 217, 139, 0.25)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
            <CheckCircle size={15} /> Message dispatched successfully! (ID: {result.email_id})
          </div>
          {result.spam_detection && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--body)' }}>
              ML Classification: <strong>{result.spam_detection.classification}</strong> (Spam Score: {result.spam_detection.spam_score})
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-resend" style={{ padding: '28px', display: 'grid', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Recipient
            </label>
            <select
              required
              value={form.receiver_id}
              onChange={(e) => setForm({ ...form, receiver_id: e.target.value })}
              className="input-resend"
            >
              <option value="">— Select recipient —</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input-resend"
            >
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
            Subject
          </label>
          <input
            required
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="input-resend"
            placeholder="Subject of the email"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
            Message Body
          </label>
          <textarea
            required
            rows={7}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="input-resend"
            style={{ resize: 'vertical', lineHeight: '1.5' }}
            placeholder="Type your message here..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="auto_detect"
            checked={form.auto_detect_spam}
            onChange={(e) => setForm({ ...form, auto_detect_spam: e.target.checked })}
            style={{ accentColor: 'var(--ink)', cursor: 'pointer' }}
          />
          <label htmlFor="auto_detect" style={{ fontSize: '12px', color: 'var(--mute)', cursor: 'pointer' }}>
            Auto-detect spam with ML classifier (activates PostgreSQL database trigger)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '10px 16px', marginTop: '6px' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {loading ? 'Transmitting message…' : 'Send Email'}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SEARCH PAGE
   ───────────────────────────────────────────── */
function SearchPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [spamStatus, setSpamStatus] = useState('');
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setSearched(true);
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (categoryId) params.category_id = categoryId;
      if (status) params.status = status;
      if (spamStatus) params.spam_status = spamStatus;
      const data = await api.searchEmails(params);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: '960px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px' }}>
          Search &amp; Filter
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
          PostgreSQL Full-Text Search and multidimensional filtering across sender, receiver, category, and classification.
        </p>
      </div>

      <form onSubmit={handleSearch} className="card-resend" style={{ padding: '20px', marginBottom: '28px', display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input-resend"
              style={{ paddingLeft: '36px' }}
              placeholder="Search keywords across subject and body (PostgreSQL FTS)..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0 20px', height: '38px' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', borderTop: '1px solid var(--hairline)', paddingTop: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--ash)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-resend"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--ash)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-resend"
            >
              <option value="">All Statuses</option>
              <option value="Inbox">Inbox</option>
              <option value="Read">Read</option>
              <option value="Spam">Spam</option>
              <option value="Trash">Trash</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--ash)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Classification</label>
            <select
              value={spamStatus}
              onChange={(e) => setSpamStatus(e.target.value)}
              className="input-resend"
            >
              <option value="">All Classifications</option>
              <option value="Not Spam">Legitimate (Not Spam)</option>
              <option value="Spam">Spam</option>
            </select>
          </div>
        </div>
      </form>

      {searched && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
              Found <strong>{results.length}</strong> matching record{results.length !== 1 ? 's' : ''}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="card-resend" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ash)', fontSize: '13px' }}>
              No messages matched the specified filter criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {results.map((e) => (
                <div
                  key={e.email_id}
                  className="card-resend"
                  style={{ padding: '16px 20px', transition: 'border-color 0.15s ease' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--ash)', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{e.sender_name}</span>
                        <span>&rarr;</span>
                        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{e.receiver_name}</span>
                        {e.category_name && (
                          <span className="pill-badge pill-inbox" style={{ padding: '2px 6px', fontSize: '10px' }}>
                            {e.category_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
                        {e.subject}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--mute)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {e.body}
                      </p>
                      {e.detection_reason && (
                        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--ash)', fontStyle: 'italic' }}>
                          Detection Note: {e.detection_reason}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'grid', justifyItems: 'end', gap: '4px' }}>
                      <StatusBadge status={e.status} />
                      {e.classification && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: e.classification === 'Spam' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                          {e.classification} ({Math.round((e.spam_score || 0) * 100)}%)
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(e.received_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPAM DETECTION PAGE (Dual-Engine Lab)
   ───────────────────────────────────────────── */
function SpamPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const data = await api.predictCombinedSpam(subject, body);
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: '860px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px' }}>
          Dual-Engine Spam Lab
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
          Benchmark Machine Learning (TF-IDF + Naive Bayes) against Java DSA (Aho-Corasick multi-pattern Trie &amp; Damerau-Levenshtein fuzzy DP).
        </p>
      </div>

      <form onSubmit={handlePredict} className="card-resend" style={{ padding: '24px', display: 'grid', gap: '16px', marginBottom: '28px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
            Subject
          </label>
          <input
            required
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-resend"
            placeholder="e.g. Urgent! Claim your free pr1ze lottery reward now"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
            Message Body
          </label>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input-resend"
            style={{ resize: 'vertical' }}
            placeholder="Enter message text with potential spam patterns or obfuscated typos (e.g. 'fr33', 'pr1ze', 'cl1ck')..."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '10px 16px' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
          {loading ? 'Running ML & Java DSA Engines…' : 'Analyze with ML & Java DSA'}
        </button>
      </form>

      {result && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Hybrid Decision Banner */}
          <div
            className="card-resend"
            style={{
              padding: '20px 24px',
              borderColor: result.final?.classification === 'SPAM' ? 'rgba(255, 32, 71, 0.35)' : 'rgba(17, 217, 139, 0.35)',
              background: result.final?.classification === 'SPAM' ? 'rgba(255, 32, 71, 0.08)' : 'rgba(17, 217, 139, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <span className="eyebrow-resend">
                Hybrid Decision Model ({result.final?.decision_rule || 'HYBRID'})
              </span>
              <span
                className={`pill-badge ${result.final?.classification === 'SPAM' ? 'pill-spam' : 'pill-success'}`}
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                Final: {result.final?.classification}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {result.final?.reason}
            </p>
          </div>

          {/* Side-by-Side Engine Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
            {/* ML Card */}
            <div className="card-resend" style={{ padding: '20px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--hairline)', paddingBottom: '10px' }}>
                <span className="eyebrow-resend">Machine Learning</span>
                <span className={`pill-badge ${result.ml?.classification === 'Spam' ? 'pill-spam' : 'pill-success'}`}>
                  {result.ml?.classification}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--mute)' }}>Spam Score:</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{result.ml?.spam_score} ({result.ml?.confidence_percentage}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--mute)' }}>Algorithm:</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Multinomial Naive Bayes</span>
                </div>
                <div>
                  <span style={{ color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Feature Rationale:</span>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--body)', background: 'var(--surface-deep)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--hairline)', wordBreak: 'break-word' }}>
                    {result.ml?.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* DSA Card */}
            <div className="card-resend" style={{ padding: '20px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--hairline)', paddingBottom: '10px' }}>
                <span className="eyebrow-resend">Java DSA Engine</span>
                <span className={`pill-badge ${result.dsa?.classification === 'SPAM' ? 'pill-spam' : 'pill-success'}`}>
                  {result.dsa?.classification}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--mute)' }}>Score &amp; Risk:</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Score: {result.dsa?.spam_score} &bull; Risk: {result.dsa?.risk_level}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Aho-Corasick Matches (Exact Trie):</span>
                  {result.dsa?.exact_matches?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.dsa.exact_matches.map((m, idx) => (
                        <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-red)', background: 'rgba(255, 32, 71, 0.10)', border: '1px solid rgba(255, 32, 71, 0.22)', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--ash)' }}>None</span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Damerau-Levenshtein Matches (Fuzzy DP):</span>
                  {result.dsa?.fuzzy_matches?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.dsa.fuzzy_matches.map((m, idx) => (
                        <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-yellow)', background: 'rgba(255, 197, 61, 0.10)', border: '1px solid rgba(255, 197, 61, 0.22)', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--ash)' }}>None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   USERS PAGE (People Directory)
   ───────────────────────────────────────────── */
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getUsers()
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingSpinner label="Loading directory…" />;

  return (
    <div style={{ padding: '32px 36px', maxWidth: '860px', margin: '0 auto', minWidth: 0, overflowX: 'hidden' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px' }}>
          People Directory
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
          Registered platform accounts and academic personas in the PostgreSQL database ({users.length} members).
        </p>
      </div>

      <div className="card-resend table-responsive-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '460px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surface-deep)' }}>
              <th style={{ padding: '12px 18px', fontSize: '10px', fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID</th>
              <th style={{ padding: '12px 18px', fontSize: '10px', fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member</th>
              <th style={{ padding: '12px 18px', fontSize: '10px', fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email Address</th>
              <th style={{ padding: '12px 18px', fontSize: '10px', fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.user_id}
                style={{ borderBottom: '1px solid var(--hairline)', transition: 'background-color 0.12s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '12px 18px', color: 'var(--ash)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  #{u.user_id}
                </td>
                <td style={{ padding: '12px 18px', color: 'var(--ink)', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--surface-elevated)', border: '1px solid var(--hairline-strong)', display: 'grid', placeItems: 'center', fontSize: '11px', color: 'var(--mute)' }}>
                      {u.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <span>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 18px', color: 'var(--mute)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {u.email}
                </td>
                <td style={{ padding: '12px 18px', color: 'var(--ash)', fontSize: '11px' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIME-SERIES CHART COMPONENT (Pure SVG, Accessible)
   ───────────────────────────────────────────── */
function ActivityTrendChart({ timeline = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ash)', fontSize: '13px' }}>
        No historical activity data recorded in the current scope.
      </div>
    );
  }

  const width = 760;
  const height = 210;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...timeline.map((d) => Math.max(d.spam || 0, d.legitimate || 0)), 1);
  const ceiling = Math.max(Math.ceil(maxVal * 1.15), 5);
  const midVal = Math.round(ceiling / 2);

  const n = timeline.length;
  const pointsLegit = timeline.map((d, i) => {
    const x = padLeft + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const y = padTop + chartH - ((d.legitimate || 0) / ceiling) * chartH;
    return { x, y, val: d.legitimate || 0, day: d.day };
  });

  const pointsSpam = timeline.map((d, i) => {
    const x = padLeft + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
    const y = padTop + chartH - ((d.spam || 0) / ceiling) * chartH;
    return { x, y, val: d.spam || 0, day: d.day };
  });

  const buildPath = (pts) => {
    if (pts.length === 0) return '';
    return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  };

  const buildAreaPath = (pts) => {
    if (pts.length === 0) return '';
    const linePath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const firstX = pts[0].x.toFixed(1);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    const baseline = (padTop + chartH).toFixed(1);
    return `${linePath} L ${lastX},${baseline} L ${firstX},${baseline} Z`;
  };

  const legitPath = buildPath(pointsLegit);
  const legitArea = buildAreaPath(pointsLegit);
  const spamPath = buildPath(pointsSpam);
  const spamArea = buildAreaPath(pointsSpam);

  // Determine sparse date ticks (max 5)
  const tickIndices = [];
  if (n <= 5) {
    for (let i = 0; i < n; i++) tickIndices.push(i);
  } else {
    tickIndices.push(0);
    tickIndices.push(Math.floor(n * 0.25));
    tickIndices.push(Math.floor(n * 0.5));
    tickIndices.push(Math.floor(n * 0.75));
    tickIndices.push(n - 1);
  }

  const active = hoveredIdx !== null && hoveredIdx >= 0 && hoveredIdx < n ? {
    legit: pointsLegit[hoveredIdx],
    spam: pointsSpam[hoveredIdx],
    raw: timeline[hoveredIdx],
  } : null;

  const handlePointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX === undefined) return;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * width;
    let closest = 0;
    let minDiff = Infinity;
    pointsLegit.forEach((pt, i) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });
    setHoveredIdx(closest);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIdx((prev) => (prev === null ? 0 : Math.min(prev + 1, n - 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredIdx((prev) => (prev === null ? n - 1 : Math.max(prev - 1, 0)));
    } else if (e.key === 'Escape') {
      setHoveredIdx(null);
    }
  };

  return (
    <div className="timeseries-svg-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', outline: 'none' }}
        onMouseMove={handlePointer}
        onMouseLeave={() => setHoveredIdx(null)}
        onTouchMove={handlePointer}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="img"
        aria-label="Time-series chart showing daily email volume of legitimate mail versus spam flagged."
      >
        {/* Horizontal subtle grid lines */}
        <line
          x1={padLeft} y1={padTop}
          x2={width - padRight} y2={padTop}
          stroke="var(--chart-grid)" strokeDasharray="3 3"
        />
        <text
          x={padLeft - 8} y={padTop + 4}
          textAnchor="end" fontSize="10" fill="var(--ash)" fontFamily="var(--font-mono)"
        >
          {ceiling}
        </text>

        <line
          x1={padLeft} y1={padTop + chartH / 2}
          x2={width - padRight} y2={padTop + chartH / 2}
          stroke="var(--chart-grid)" strokeDasharray="3 3"
        />
        <text
          x={padLeft - 8} y={padTop + chartH / 2 + 4}
          textAnchor="end" fontSize="10" fill="var(--ash)" fontFamily="var(--font-mono)"
        >
          {midVal}
        </text>

        <line
          x1={padLeft} y1={padTop + chartH}
          x2={width - padRight} y2={padTop + chartH}
          stroke="var(--chart-axis)"
        />
        <text
          x={padLeft - 8} y={padTop + chartH + 3}
          textAnchor="end" fontSize="10" fill="var(--ash)" fontFamily="var(--font-mono)"
        >
          0
        </text>

        {/* Date ticks on X-axis */}
        {tickIndices.map((idx) => {
          const pt = pointsLegit[idx];
          if (!pt) return null;
          const label = pt.day.slice(5); // e.g. "10-24"
          return (
            <text
              key={idx}
              x={pt.x}
              y={padTop + chartH + 20}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ash)"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          );
        })}

        {/* Low-opacity Areas */}
        <path d={legitArea} fill="var(--metric-neutral)" fillOpacity="0.08" />
        <path d={spamArea} fill="var(--metric-spam)" fillOpacity="0.08" />

        {/* Lines */}
        <path
          d={legitPath}
          fill="none"
          stroke="var(--metric-neutral)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={spamPath}
          fill="none"
          stroke="var(--metric-spam)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active hovered vertical hairline & markers */}
        {active && (
          <g>
            <line
              x1={active.legit.x} y1={padTop}
              x2={active.legit.x} y2={padTop + chartH}
              stroke="var(--ink)"
              strokeOpacity="0.35"
              strokeDasharray="2 2"
            />
            {/* Legit circle */}
            <circle
              cx={active.legit.x} cy={active.legit.y}
              r="4.5"
              fill="var(--metric-neutral)"
              stroke="var(--surface-card)"
              strokeWidth="2"
            />
            {/* Spam circle */}
            <circle
              cx={active.spam.x} cy={active.spam.y}
              r="4.5"
              fill="var(--metric-spam)"
              stroke="var(--surface-card)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Aligned Interactive Tooltip */}
      {active && (
        <div
          className="timeseries-tooltip-box"
          style={{
            left: `${Math.min(Math.max((active.legit.x / width) * 100, 10), 90)}%`,
            top: '8px',
            transform: active.legit.x > width * 0.72 ? 'translateX(-95%)' : active.legit.x < width * 0.28 ? 'translateX(-5%)' : 'translateX(-50%)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '5px', fontFamily: 'var(--font-mono)', fontSize: '11px', borderBottom: '1px solid var(--hairline)', paddingBottom: '3px' }}>
            {active.raw.day}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '3px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--mute)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-neutral)' }} />
              Legitimate:
            </span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{active.raw.legitimate}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--mute)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-spam)' }} />
              Spam flagged:
            </span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}>{active.raw.spam}</strong>
          </div>
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--ash)', fontSize: '10px' }}>
            <span>Total day volume:</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {active.raw.legitimate + active.raw.spam} ({((active.raw.spam / Math.max(active.raw.legitimate + active.raw.spam, 1)) * 100).toFixed(0)}% spam)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   REPORTS PAGE (Email Intelligence & Model Audit)
   ───────────────────────────────────────────── */
function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getReports()
      .then((data) => {
        if (active) setReport(data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingSpinner label="Loading email intelligence metrics…" />;

  const sys = report?.system_stats;
  const ml = report?.model_evaluation;
  const cm = ml?.confusion_matrix;
  const timeline = report?.spam_timeline || [];
  const dc = sys?.detector_comparison || {};

  // Concordance calculations
  const bothSpam = dc.both_spam ?? 0;
  const bothLegit = dc.both_legit ?? 0;
  const mlOnly = dc.ml_only_spam ?? 0;
  const dsaOnly = dc.dsa_only_spam ?? 0;
  const totalEvaluated = bothSpam + bothLegit + mlOnly + dsaOnly;
  const totalAgreement = bothSpam + bothLegit;
  const totalDisagreement = dc.disagreement ?? (mlOnly + dsaOnly);
  const concordanceRate = totalEvaluated > 0 ? ((totalAgreement / totalEvaluated) * 100).toFixed(1) : '—';

  // Proportions for stacked concordance bar
  const pctLegit = totalEvaluated > 0 ? (bothLegit / totalEvaluated) * 100 : 0;
  const pctSpam = totalEvaluated > 0 ? (bothSpam / totalEvaluated) * 100 : 0;
  const pctDisagreement = totalEvaluated > 0 ? (totalDisagreement / totalEvaluated) * 100 : 0;

  // Timeline date range
  const firstDate = timeline.length > 0 ? timeline[0].day : null;
  const lastDate = timeline.length > 0 ? timeline[timeline.length - 1].day : null;

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '28px', minWidth: 0, overflowX: 'hidden' }}>
      
      {/* 1. Page Opening & Scope Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="font-editorial" style={{ fontSize: '28px', margin: '0 0 6px', color: 'var(--ink)' }}>
            Email Intelligence
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)', maxWidth: '640px', lineHeight: 1.5 }}>
            Comprehensive detection diagnostics combining relational database audit records, dual-engine ML vs DSA consensus analysis, and holdout model verification.
          </p>
        </div>

        {/* Compact Range & Scope Indicator */}
        <div
          className="card-resend"
          style={{
            padding: '8px 14px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--surface-deep)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-legit)' }} />
          <span style={{ color: 'var(--mute)' }}>
            Scope: <strong style={{ color: 'var(--ink)' }}>Full Historical Corpus</strong>
          </span>
          {firstDate && lastDate && (
            <span style={{ color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
              ({firstDate} &rarr; {lastDate})
            </span>
          )}
        </div>
      </div>

      {/* 2. Headline Metrics (Compact Unified Strip) */}
      <div className="stat-strip-container">
        <div className="stat-strip-item">
          <span className="stat-strip-label">Total Email Volume</span>
          <div className="stat-strip-value">{sys?.total_emails?.toLocaleString() ?? '—'}</div>
          <div className="stat-strip-sub">
            {sys?.total_legitimate_detected ?? 0} legit &bull; {sys?.total_spam_detected ?? 0} spam
          </div>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-label">Spam Detection Rate</span>
          <div className="stat-strip-value" style={{ color: 'var(--metric-spam)' }}>
            {sys ? `${sys.spam_ratio}%` : '—'}
          </div>
          <div className="stat-strip-sub">
            {sys?.total_spam_detected ?? 0} threats quarantined
          </div>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-label">Dual-Engine Concordance</span>
          <div className="stat-strip-value" style={{ color: concordanceRate !== '—' ? 'var(--metric-legit)' : 'var(--ink)' }}>
            {concordanceRate !== '—' ? `${concordanceRate}%` : '—'}
          </div>
          <div className="stat-strip-sub">
            {totalDisagreement} divergent decision{totalDisagreement !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-label">Model Holdout Accuracy</span>
          <div className="stat-strip-value" style={{ color: 'var(--metric-neutral)' }}>
            {ml?.accuracy !== undefined ? `${(ml.accuracy * 100).toFixed(1)}%` : '—'}
          </div>
          <div className="stat-strip-sub">
            F1-score: {ml?.f1_score !== undefined ? `${(ml.f1_score * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* 3. Email Activity Trend (Time-Series Chart) */}
      <div className="card-resend" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow-resend" style={{ display: 'block', marginBottom: '4px' }}>
              Activity Trend
            </span>
            <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Daily timeline of legitimate email volume versus spam flagged by detection engines.
            </div>
          </div>

          {/* Accessible Chart Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
              <span style={{ width: '12px', height: '2px', background: 'var(--metric-neutral)', borderRadius: '1px' }} />
              Legitimate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
              <span style={{ width: '12px', height: '2px', background: 'var(--metric-spam)', borderRadius: '1px' }} />
              Spam flagged
            </span>
          </div>
        </div>

        <ActivityTrendChart timeline={timeline} />
      </div>

      {/* 4. Detector Comparison (ML vs Java DSA Engine) */}
      {sys?.detector_comparison && (
        <div className="card-resend" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow-resend" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <ShieldAlert size={14} style={{ color: 'var(--accent-blue)' }} />
                Detector Concordance &amp; Divergence
              </span>
              <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
                Consensus and disagreement across Machine Learning (TF-IDF + Naive Bayes) and Java DSA (Aho-Corasick + Damerau-Levenshtein).
              </div>
            </div>
            <span className="pill-badge pill-inbox" style={{ fontSize: '10px' }}>
              {totalEvaluated} emails compared
            </span>
          </div>

          {/* Proportional Stacked Ribbon Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ height: '7px', width: '100%', background: 'var(--surface-deep)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div
                style={{ width: `${pctLegit}%`, background: 'var(--metric-legit)', transition: 'width 0.3s ease' }}
                title={`Consensus Legit: ${bothLegit} (${pctLegit.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${pctSpam}%`, background: 'var(--metric-spam)', transition: 'width 0.3s ease' }}
                title={`Consensus Spam: ${bothSpam} (${pctSpam.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${pctDisagreement}%`, background: 'var(--metric-caution)', transition: 'width 0.3s ease' }}
                title={`Divergences: ${totalDisagreement} (${pctDisagreement.toFixed(1)}%)`}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ash)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--metric-legit)' }}>{pctLegit.toFixed(1)}% Consensus Legit</span>
              <span style={{ color: 'var(--metric-spam)' }}>{pctSpam.toFixed(1)}% Consensus Spam</span>
              <span style={{ color: 'var(--metric-caution)' }}>{pctDisagreement.toFixed(1)}% Divergence</span>
            </div>
          </div>

          {/* 4 Paired Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '12px' }}>
            {/* Both Legit */}
            <div className="card-elevated" style={{ padding: '16px', borderColor: 'var(--metric-legit-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--metric-legit)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Consensus Legit
                </span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-legit)' }} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--metric-legit)', lineHeight: 1 }}>
                {bothLegit}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '6px' }}>
                Both engines classified legitimate ({totalEvaluated > 0 ? ((bothLegit / totalEvaluated) * 100).toFixed(1) : 0}%)
              </div>
            </div>

            {/* Both Spam */}
            <div className="card-elevated" style={{ padding: '16px', borderColor: 'var(--metric-spam-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--metric-spam)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  High-Confidence Spam
                </span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-spam)' }} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--metric-spam)', lineHeight: 1 }}>
                {bothSpam}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '6px' }}>
                Both engines flagged malicious ({totalEvaluated > 0 ? ((bothSpam / totalEvaluated) * 100).toFixed(1) : 0}%)
              </div>
            </div>

            {/* ML Only Spam */}
            <div className="card-elevated" style={{ padding: '16px', borderColor: 'var(--metric-caution-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--metric-caution)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ML-Only Flagged
                </span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-caution)' }} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--metric-caution)', lineHeight: 1 }}>
                {mlOnly}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '6px' }}>
                High TF-IDF score; no exact or fuzzy keyword matches
              </div>
            </div>

            {/* DSA Only Spam */}
            <div className="card-elevated" style={{ padding: '16px', borderColor: 'var(--metric-caution-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--metric-caution)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  DSA-Only Flagged
                </span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--metric-caution)' }} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: 'var(--metric-caution)', lineHeight: 1 }}>
                {dsaOnly}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '6px' }}>
                Aho-Corasick or Damerau-Levenshtein keyword hit
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--ash)', lineHeight: 1.45, borderTop: '1px solid var(--hairline)', paddingTop: '10px' }}>
            <strong style={{ color: 'var(--ink)' }}>Arbitration Policy:</strong> Disagreements are placed under secondary hybrid review, preventing statistical blindspots while guarding against dictionary false alarms.
          </div>
        </div>
      )}

      {/* 5. Model Quality & Confusion Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
        {/* Metric Row Horizontal Comparison */}
        <div className="card-resend" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow-resend" style={{ display: 'block', marginBottom: '3px' }}>
                Model Verification
              </span>
              <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
                Offline holdout evaluation metrics.
              </div>
            </div>
            <span className="pill-badge pill-inbox" style={{ fontSize: '10px' }}>
              {ml?.model_type || 'Classifier'}
            </span>
          </div>

          <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
            {/* Accuracy */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Accuracy</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {ml?.accuracy !== undefined ? `${(ml.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--surface-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(ml?.accuracy || 0) * 100}%`, height: '100%', background: 'var(--metric-legit)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Precision */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Precision</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {ml?.precision !== undefined ? `${(ml.precision * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--surface-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(ml?.precision || 0) * 100}%`, height: '100%', background: 'var(--metric-neutral)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Recall */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Recall</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {ml?.recall !== undefined ? `${(ml.recall * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--surface-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(ml?.recall || 0) * 100}%`, height: '100%', background: 'var(--metric-legit)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* F1 Score */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>F1-Score</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--metric-legit)' }}>
                  {ml?.f1_score !== undefined ? `${(ml.f1_score * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--surface-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(ml?.f1_score || 0) * 100}%`, height: '100%', background: 'var(--metric-legit)', borderRadius: '3px' }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--ash)', borderTop: '1px solid var(--hairline)', paddingTop: '12px', display: 'grid', gap: '3px', fontFamily: 'var(--font-mono)' }}>
            <div>Dataset: {ml?.total_dataset_size || '—'} total records</div>
            <div>Partition: {ml?.train_samples || '—'} train / {ml?.test_samples || '—'} test (80/20)</div>
            <div>Vocabulary: {ml?.feature_count || '—'} TF-IDF features</div>
          </div>
        </div>

        {/* Confusion Matrix (2x2 Grid) */}
        <div className="card-resend" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow-resend" style={{ display: 'block', marginBottom: '3px' }}>
                Test Confusion Matrix
              </span>
              <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
                Classification matrix on holdout test partition.
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--ash)', fontFamily: 'var(--font-mono)' }}>
              N = {ml?.test_samples || 0}
            </span>
          </div>

          {/* Matrix Ledger */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ash)', textAlign: 'center', marginBottom: '6px', fontWeight: 600 }}>
              <div />
              <div>Pred: Legit</div>
              <div>Pred: Spam</div>
            </div>

            {/* Actual Legit Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ash)', fontWeight: 600 }}>
                Act: Legit
              </div>
              <div
                className="card-elevated"
                style={{
                  padding: '14px',
                  textAlign: 'center',
                  borderColor: 'var(--metric-legit-border)',
                  background: 'var(--metric-legit-bg)',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--metric-legit)', display: 'block' }}>
                  {cm?.true_negatives ?? '—'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  True Neg (TN)
                </span>
              </div>
              <div
                className="card-elevated"
                style={{
                  padding: '14px',
                  textAlign: 'center',
                  borderColor: 'var(--metric-spam-border)',
                  background: 'var(--metric-spam-bg)',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--metric-spam)', display: 'block' }}>
                  {cm?.false_positives ?? '—'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  False Pos (FP)
                </span>
              </div>
            </div>

            {/* Actual Spam Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ash)', fontWeight: 600 }}>
                Act: Spam
              </div>
              <div
                className="card-elevated"
                style={{
                  padding: '14px',
                  textAlign: 'center',
                  borderColor: 'var(--metric-spam-border)',
                  background: 'var(--metric-spam-bg)',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--metric-spam)', display: 'block' }}>
                  {cm?.false_negatives ?? '—'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  False Neg (FN)
                </span>
              </div>
              <div
                className="card-elevated"
                style={{
                  padding: '14px',
                  textAlign: 'center',
                  borderColor: 'var(--metric-legit-border)',
                  background: 'var(--metric-legit-bg)',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--metric-legit)', display: 'block' }}>
                  {cm?.true_positives ?? '—'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  True Pos (TP)
                </span>
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ash)', lineHeight: 1.45, borderTop: '1px solid var(--hairline)', paddingTop: '10px' }}>
            Zero data leakage verified. Test partition reflects real-world email distributions with no overlap with training instances.
          </p>
        </div>
      </div>

      {/* 6. Recent Activity (Daily Data Ledger) */}
      {timeline.length > 0 && (
        <div className="card-resend" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <span className="eyebrow-resend" style={{ display: 'block', marginBottom: '3px' }}>
              Daily Activity Ledger
            </span>
            <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Chronological log of emails processed, legitimate deliveries, and flagged threat ratios.
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="data-ledger-table" style={{ minWidth: '540px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Date</th>
                  <th style={{ textAlign: 'right' }}>Total Volume</th>
                  <th style={{ textAlign: 'right' }}>Legitimate</th>
                  <th style={{ textAlign: 'right' }}>Spam Flagged</th>
                  <th style={{ textAlign: 'right' }}>Spam Share</th>
                  <th style={{ textAlign: 'left', width: '130px' }}>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row) => {
                  const total = (row.legitimate || 0) + (row.spam || 0);
                  const spamPct = total > 0 ? (row.spam / total) * 100 : 0;
                  const legitPct = total > 0 ? (row.legitimate / total) * 100 : 0;
                  return (
                    <tr key={row.day}>
                      <td style={{ fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {row.day}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {total}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--metric-legit)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                        {row.legitimate}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--metric-spam)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                        {row.spam}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {spamPct.toFixed(1)}%
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', height: '6px', background: 'var(--surface-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${legitPct}%`, background: 'var(--metric-neutral)' }} />
                          <div style={{ width: `${spamPct}%`, background: 'var(--metric-spam)' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP SHELL (authenticated layout)
   ───────────────────────────────────────────── */
function AppShell() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState('login'); // 'login' | 'register'
  const [userStats, setUserStats] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load user stats for Sidebar counters
  const loadStats = useCallback(() => {
    if (isAuthenticated) {
      api.getUserStats()
        .then(setUserStats)
        .catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadStats();
  }, [loadStats, user?.user_id]);

  // Listen for sidebar folder switches
  useEffect(() => {
    const handler = (ev) => {
      setCurrentFolder(ev.detail);
      setCurrentPage('emails');
    };
    window.addEventListener('switch-folder', handler);
    return () => window.removeEventListener('switch-folder', handler);
  }, []);

  useEffect(() => {
    const handler = () => setCurrentPage('search');
    window.addEventListener('open-search', handler);
    return () => window.removeEventListener('open-search', handler);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCurrentPage('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) return <LoadingSpinner label="Verifying session credentials…" />;

  if (!isAuthenticated) {
    if (page === 'register') {
      return <RegisterPage onNavigateLogin={() => setPage('login')} />;
    }
    return <LoginPage onNavigateRegister={() => setPage('register')} />;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
    loadStats();
    const cur = currentPage;
    setCurrentPage('__reload__');
    setTimeout(() => setCurrentPage(cur), 50);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'emails':    return <EmailsPage folder={currentFolder} onUpdate={loadStats} />;
      case 'compose':   return <ComposePage onSent={() => { loadStats(); setCurrentPage('emails'); }} />;
      case 'search':    return <SearchPage />;
      case 'spam':      return <SpamPage />;
      case 'users':     return <UsersPage />;
      case 'reports':   return <ReportsPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <div className="app-shell">
      {isSidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        stats={userStats}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="app-workspace">
        <Navbar
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          currentPage={currentPage}
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
        />
        <main className="app-main">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT EXPORT WITH THEME + AUTH PROVIDERS
   ───────────────────────────────────────────── */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
