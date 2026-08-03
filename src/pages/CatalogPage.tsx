import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CatalogRows } from '../components/CatalogRows';
import { catalog } from '../data/catalog';
import { useAuth } from '../lib/auth';
import { useCatalogAdder } from '../lib/useCatalogAdder';

export default function CatalogPage() {
  const { householdId } = useAuth();
  const { add, isSaved, addingIds, progress, failures, ready } =
    useCatalogAdder(householdId);
  const [tag, setTag] = useState('all');
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
  return (
    <section className="task-page">
      <header className="page-heading">
        <p className="kicker">Starter catalog</p>
        <h1>Recipes to try</h1>
        <p>
          {catalog.length} recipes from sites Forkast can read. Adding one reads the
          recipe from the original site, the same way saving a link does, and keeps the
          source on the recipe.
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
        onAdd={(entry) => void add([entry])}
      />
      <Link className="text-button" href="/recipes">
        ← Back to recipes
      </Link>
    </section>
  );
}
