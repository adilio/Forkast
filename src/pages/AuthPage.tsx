import { useState } from 'react';
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
          <p className="auth-panel__note">
            Forkast never asks for a password. Google confirms who you are, and your
            household decides what you can see.
          </p>
        </div>
      </section>
    </main>
  );
}
