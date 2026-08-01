import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { callFunction } from '../lib/api';
import { exportHousehold } from '../lib/data';
function download(name: string, data: unknown, type = 'application/json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export default function SettingsPage() {
  const { user, householdId } = useAuth();
  const [invite, setInvite] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'invite' | 'export' | ''>('');
  async function makeInvite() {
    setBusy('invite');
    setError('');
    try {
      const result = await callFunction<{ token: string }>('create-invite', {});
      const url = `${location.origin}/?invite=${encodeURIComponent(result.token)}`;
      setInvite(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      setStatus('Invite ready. It expires in 24 hours and works once.');
    } catch {
      setError('An invite could not be created. Check your connection and try again.');
    } finally {
      setBusy('');
    }
  }
  async function exportAll() {
    setBusy('export');
    setError('');
    setStatus('Preparing export…');
    try {
      const data = await exportHousehold(householdId!);
      download(`forkast-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
      const recipes = (data.data.recipes as Array<Record<string, unknown>>).map(
        (r) => ({
          '@context': 'https://schema.org',
          '@type': 'Recipe',
          name: r.title,
          description: r.description,
          image: r.imageUrl,
          recipeYield: r.baseServings ? `${r.baseServings} servings` : undefined,
          recipeIngredient: (r.ingredients as Array<{ rawText: string }>).map(
            (x) => x.rawText,
          ),
          recipeInstructions: (r.instructions as string[]).map((text) => ({
            '@type': 'HowToStep',
            text,
          })),
          url: r.sourceUrl,
        }),
      );
      download(
        `forkast-recipes-${new Date().toISOString().slice(0, 10)}.jsonld`,
        recipes,
        'application/ld+json',
      );
      download(
        `forkast-recipe-sources-${new Date().toISOString().slice(0, 10)}.json`,
        (data.data.recipes as Array<Record<string, unknown>>).map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          sourceUrl: recipe.sourceUrl,
          imageUrl: recipe.imageUrl,
        })),
      );
      setStatus('Backup, portable recipes, and source manifest downloaded.');
    } catch {
      setStatus('');
      setError(
        'The export could not be prepared. Check your connection and try again.',
      );
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="task-page settings-page">
      <header className="page-heading">
        <p className="kicker">Household controls</p>
        <h1>Settings</h1>
        <p>Signed in as {user?.email}</p>
      </header>
      <section>
        <h2>Invite your spouse</h2>
        <p>Create a private link that works once and expires after 24 hours.</p>
        <button
          className="button button--outline"
          onClick={makeInvite}
          disabled={Boolean(busy)}
        >
          {busy === 'invite' ? 'Creating invite…' : 'Create invite link'}
        </button>
        {invite && <input aria-label="Invite link" readOnly value={invite} />}
      </section>
      <section>
        <h2>Own every recipe</h2>
        <p>Download a complete Forkast backup and portable schema.org recipe data.</p>
        <button
          className="button button--primary"
          onClick={exportAll}
          disabled={Boolean(busy)}
        >
          {busy === 'export' ? 'Preparing export…' : 'Export all household data'}
        </button>
      </section>
      <section>
        <h2>iPhone installation</h2>
        <p>
          Add Forkast to the Home Screen and use the Save to Forkast Shortcut from
          Safari.
        </p>
        <a className="button button--outline" href="/install">
          View installation steps
        </a>
      </section>
      {status && (
        <p className="connection-state" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      <button className="text-button danger-text" onClick={() => signOut(auth!)}>
        Sign out
      </button>
    </section>
  );
}
