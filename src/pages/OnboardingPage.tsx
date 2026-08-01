import { useState } from 'react';
import { callFunction } from '../lib/api';

export default function OnboardingPage() {
  const [code, setCode] = useState(
    new URLSearchParams(location.search).get('invite') || '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function act(kind: 'bootstrap-household' | 'redeem-invite') {
    setBusy(true);
    setError('');
    try {
      await callFunction(
        kind,
        kind === 'redeem-invite' ? { token: code } : { name: 'Our household' },
      );
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed.');
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <img src="/forkast-mark.svg" alt="" />
      <p className="kicker">Household setup</p>
      <h1>Start together</h1>
      <p>
        Create the household if you are setting up Forkast first, or use the private
        invite from your spouse.
      </p>
      <button
        className="button button--primary"
        disabled={busy}
        onClick={() => act('bootstrap-household')}
      >
        Create our household
      </button>
      <div className="or-rule">
        <span>or join with an invite</span>
      </div>
      <label>
        Invite code
        <input value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <button
        className="button button--outline"
        disabled={busy || !code}
        onClick={() => act('redeem-invite')}
      >
        Join household
      </button>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
