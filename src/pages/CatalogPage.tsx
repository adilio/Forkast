import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CatalogPreview } from '../components/CatalogPreview';
import { CatalogRows } from '../components/CatalogRows';
import { catalog, type CatalogEntry } from '../data/catalog';
import { useAuth } from '../lib/auth';
import type { ImportedDraft } from '../lib/recipes';
import { useCatalogAdder } from '../lib/useCatalogAdder';

export default function CatalogPage() {
  const { householdId } = useAuth();
  const { add, preview, previewing, isSaved, addingIds, progress, failures, ready } =
    useCatalogAdder(householdId);
  const [tag, setTag] = useState('all');
  const [opened, setOpened] = useState<{
    entry: CatalogEntry;
    draft: ImportedDraft;
  } | null>(null);
  const [readError, setReadError] = useState('');
  const tags = useMemo(
    () => [...new Set(catalog.flatMap((entry) => entry.tags))].sort(),
    [],
  );
  const shown = useMemo(
    () => (tag === 'all' ? catalog : catalog.filter((e) => e.tags.includes(tag))),
    [tag],
  );
  const unsaved = shown.filter((entry) => !isSaved(entry));
  const working = addingIds.size > 0;

  async function open(entry: CatalogEntry) {
    setReadError('');
    const result = await preview(entry);
    if (result.draft) setOpened({ entry, draft: result.draft });
    else setReadError(`${entry.title}: ${result.message}`);
  }

  // The week's picks link here with a recipe already chosen, so the same tap
  // opens the same preview from either surface.
  const requested = useMemo(() => {
    const wanted = new URLSearchParams(window.location.search).get('recipe');
    return catalog.find((row) => row.id === wanted);
  }, []);
  useEffect(() => {
    if (!requested) return;
    let live = true;
    void preview(requested).then((result) => {
      if (!live) return;
      if (result.draft) setOpened({ entry: requested, draft: result.draft });
      else setReadError(`${requested.title}: ${result.message}`);
    });
    return () => {
      live = false;
    };
  }, [requested, preview]);

  if (opened)
    return (
      <section className="task-page">
        <CatalogPreview
          entry={opened.entry}
          draft={opened.draft}
          saved={isSaved(opened.entry)}
          adding={addingIds.has(opened.entry.id)}
          onAdd={() => void add([opened.entry])}
          onBack={() => setOpened(null)}
        />
      </section>
    );

  return (
    <section className="task-page">
      <header className="page-heading">
        <p className="kicker">Starter catalog</p>
        <h1>Recipes to try</h1>
        <p>
          {catalog.length} recipes from sites Forkast can read. Open one to see the
          whole recipe before you decide; adding it reads from the original site, the
          same way saving a link does, and keeps the source on the recipe.
        </p>
      </header>
      <div className="library-tools">
        <label className="search-field catalog-filter">
          <span>Show</span>
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="all">Everything ({catalog.length})</option>
            {tags.map((name) => (
              <option key={name} value={name}>
                {name} ({catalog.filter((entry) => entry.tags.includes(name)).length})
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button--primary"
          disabled={!ready || working || !unsaved.length}
          onClick={() => void add(unsaved)}
        >
          {working
            ? 'Adding recipes…'
            : unsaved.length
              ? `Add all ${unsaved.length}`
              : 'All added'}
        </button>
      </div>
      {progress && (
        <p className="connection-state" role="status">
          {progress}
        </p>
      )}
      {readError && (
        <p className="form-message" role="alert">
          {readError}
        </p>
      )}
      {failures.length > 0 && (
        <details className="catalog-failures">
          <summary>{failures.length} could not be read</summary>
          <ul>
            {failures.map((failure) => (
              <li key={failure.entry.id}>
                <a href={failure.entry.url} target="_blank" rel="noreferrer noopener">
                  {failure.entry.title}
                </a>{' '}
                — {failure.message} Open it and save it by hand if you want it.
              </li>
            ))}
          </ul>
        </details>
      )}
      <CatalogRows
        entries={shown}
        isSaved={isSaved}
        addingIds={addingIds}
        previewing={previewing}
        onAdd={(entry) => void add([entry])}
        onPreview={(entry) => void open(entry)}
      />
      <Link className="text-button" href="/recipes">
        ← Back to recipes
      </Link>
    </section>
  );
}
