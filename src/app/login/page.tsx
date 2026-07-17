'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect on successful authentication
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        // Redirection handled by useEffect
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - var(--nav-height) - 150px)', padding: '40px 0' }}>
      <div className="form-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Log in to your account to check order status</p>
        </div>

        {error && (
          <div className="btn-danger" style={{ padding: '10px 14px', borderRadius: 4, fontSize: 13, marginBottom: 20, fontWeight: 500, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input 
              className="form-input" 
              type="text" 
              id="username" 
              placeholder="e.g. collector_44"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              className="form-input" 
              type="password" 
              id="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: 12, borderRadius: 4 }}
            disabled={submitting}
          >
            {submitting ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              Sign Up
            </Link>
          </p>
          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 20, paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Default credentials (Admin): <strong>admin</strong> / <strong>admin123</strong>
            </p>
            <Link href="/" style={{ color: 'var(--text-muted)', display: 'inline-block', marginTop: 12, fontSize: 12 }}>
              ← Return to Catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
