import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import { Mail, Lock, UserPlus, AlertCircle, ArrowLeft } from '../icons';

export default function RegisterPage({ onNavigateLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header-toggle">
        <ThemeToggle showLabel />
      </div>
      <div className="auth-intro">
        <div className="auth-mark">
          <UserPlus size={20} strokeWidth={1.7} />
        </div>
        <h2 className="auth-headline">
          Create Account
        </h2>
        <p className="auth-subhead">
          Join the Intelligent Email Detection &amp; Management Platform
        </p>
      </div>

      <div className="auth-card">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/25 rounded-lg p-3 flex items-start gap-2.5 text-red-400 text-xs leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-resend"
              placeholder="Jane Doe"
            />
          </div>

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
                placeholder="jane.doe@emailmgmt.local"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-resend"
                style={{ paddingLeft: '34px' }}
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--mute)', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-resend"
                style={{ paddingLeft: '34px' }}
                placeholder="Repeat your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '10px 16px', marginTop: '6px' }}
          >
            <UserPlus size={15} />
            {loading ? 'Creating account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px' }}>
          <button
            type="button"
            onClick={onNavigateLogin}
            style={{ color: 'var(--accent-blue)', background: 'transparent', border: 0, padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}
          >
            <ArrowLeft size={14} />
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
