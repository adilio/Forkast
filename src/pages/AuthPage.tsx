/**
 * THESIS: Signing in feels like arriving at the household kitchen, not entering a SaaS gate.
 * OWN-WORLD: A real prep counter, cool-paper panel, graphite rules, and food-safe green actions.
 * STORY: Forkast carries a recipe from capture through scaling to the right grocery list.
 * FIRST VIEWPORT: One quiet sign-in sheet sits left of a lived-in kitchen planning scene.
 * FORM: Full-bleed household still life with an operational prep ticket in the foreground.
 */
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
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-brand" aria-label="Forkast">
          <img src="/forkast-mark.svg" alt="" width="42" height="42" />
          <span>Forkast</span>
        </div>

        <div className="auth-intro">
          <p className="kicker">Your household kitchen, in one place</p>
          <h1 id="auth-heading">Dinner plans that make it to the store.</h1>
          <p>
            Save the useful part of a recipe, scale it for the table, and send every
            ingredient to the store where you actually buy it.
          </p>
        </div>

        <div className="auth-panel__primary">
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
            Private by default. Google confirms who you are; Forkast never asks for or
            stores your password.
          </p>
        </div>
      </section>
    </main>
  );
}
