import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import { Mail, Lock, LogIn, AlertCircle } from '../icons';

export default function LoginPage({ onNavigateRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('john.doe@emailmgmt.local');
  const [password, setPassword] = useState('User@1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-header-toggle">
        <ThemeToggle showLabel />
      </div>
      <div className="auth-intro">
        <div className="auth-mark">
          <Mail size={20} strokeWidth={1.7} />
        </div>
        <h2 className="auth-headline">
          Email Detection Platform
        </h2>
        <p className="auth-subhead">
          Unified Relational DBMS &amp; Dual-Engine ML + Java DSA Spam Defense
        </p>
      </div>

      <div className="auth-card">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/25 rounded-lg p-3 flex items-start gap-2.5 text-red-400 text-xs leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-resend"
                style={{ paddingLeft: '34px' }}
                placeholder="user@emailmgmt.local"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-resend"
                style={{ paddingLeft: '34px' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '10px 16px', marginTop: '6px' }}
          >
            <LogIn size={15} />
            {loading ? 'Authenticating...' : 'Sign in to workspace'}
          </button>
        </form>

        {/* Quick Demo Persona Pickers */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--hairline)' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', textAlign: 'center' }}>
            Quick Academic Demo Personas
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@emailmgmt.local', 'Admin@1234')}
              className="demo-pill-btn"
            >
              Admin (Faculty)
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('john.doe@emailmgmt.local', 'User@1234')}
              className="demo-pill-btn"
            >
              John Doe (Student)
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('alice.smith@emailmgmt.local', 'User@1234')}
              className="demo-pill-btn"
            >
              Alice Smith (Student)
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('bob.wilson@emailmgmt.local', 'User@1234')}
              className="demo-pill-btn"
            >
              Prof. Bob Wilson
            </button>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--mute)' }}>Need a new account? </span>
          <button
            type="button"
            onClick={onNavigateRegister}
            style={{ color: 'var(--accent-blue)', background: 'transparent', border: 0, padding: 0, textDecoration: 'underline', fontWeight: 500 }}
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}
