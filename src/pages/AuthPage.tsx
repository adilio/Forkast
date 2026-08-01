import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../lib/auth';
import { auth } from '../lib/firebase';
import { authMessage, startGoogleSignIn } from '../lib/googleAuth';

export default function AuthPage() {
  const { feedback, clearFeedback } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function continueWithGoogle() {
    if (!auth) return;
    setBusy(true);
    setError('');
    clearFeedback();
    try {
      await startGoogleSignIn(auth);
    } catch (e) {
      setError(authMessage(e));
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setBusy(true);
    setError('');
    clearFeedback();
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
        <div className="auth-panel__primary">
          <p className="kicker">Google sign-in</p>
          <h2>Welcome to Forkast</h2>
          <p>
            Continue with Google to open your household or create a private one of your
            own.
          </p>
          <button
            className="button button--primary google-button"
            disabled={busy}
            onClick={continueWithGoogle}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {(error || feedback?.kind === 'error') && (
            <p className="form-message" role="alert">
              {error || feedback?.message}
            </p>
          )}
        </div>
        <details className="legacy-auth">
          <summary>Existing owner migration</summary>
          <p>
            Use the temporary owner password only to link this existing account to
            Google. New households should continue with Google above.
          </p>
          <form onSubmit={submit}>
            <label>
              Owner email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Temporary password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            <button className="button button--outline" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to link Google'}
            </button>
          </form>
        </details>
      </section>
    </main>
  );
}
