import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: String(form.get('name')) });
      } else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    const email = (
      document.querySelector<HTMLInputElement>('#email')?.value || ''
    ).trim();
    if (!email) {
      setError('Enter your email first, then choose reset.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordResetEmail(auth!, email);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <img src="/forkast-mark.svg" alt="" />
        <p className="kicker">Private by default</p>
        <h1>Recipes to groceries, without the clutter.</h1>
        <p>
          One shared household, two real stores, and every recipe kept under your
          control.
        </p>
      </section>
      <section className="auth-panel">
        <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Name
              <input name="name" autoComplete="name" required />
            </label>
          )}
          <label>
            Email
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>
          {error && (
            <p className="form-message" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-message form-message--success" role="status">
              {notice}
            </p>
          )}
          <button className="button button--primary" disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin'
            ? 'New to Forkast? Create an account'
            : 'Already have an account? Sign in'}
        </button>
        {mode === 'signin' && (
          <button className="text-button" onClick={reset}>
            Reset password
          </button>
        )}
      </section>
    </main>
  );
}

function authMessage(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/invalid-credential': 'The email or password does not match.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed':
      'Forkast could not reach the sign-in service. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment, then try again.',
    'auth/weak-password': 'Use a password with at least eight characters.',
  };
  return (
    messages[code] ||
    'Sign-in could not be completed. Check your details and try again.'
  );
}
