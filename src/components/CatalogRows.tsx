import type { CatalogEntry } from '../data/catalog';

/**
 * Catalog entries as prep tickets: the publisher's title, where it comes from,
 * and one action. There is no image and no description, because the catalog
 * holds neither — the recipe arrives from the publisher when it is added.
 */
export function CatalogRows({
  entries,
  isSaved,
  addingIds,
  onAdd,
}: {
  entries: CatalogEntry[];
  isSaved: (entry: CatalogEntry) => boolean;
  addingIds: Set<string>;
  onAdd: (entry: CatalogEntry) => void;
}) {
  return (
    <div className="catalog-index">
      {entries.map((entry) => {
        const saved = isSaved(entry);
        const adding = addingIds.has(entry.id);
        return (
          <article className="catalog-row" key={entry.id}>
            <div className="catalog-row__copy">
              <strong>{entry.title}</strong>
              <span>
                {entry.siteName}
                {entry.minutes ? ` · ${formatMinutes(entry.minutes)}` : ''}
                {entry.tags.length ? ` · ${entry.tags.join(', ')}` : ''}
              </span>
            </div>
            {saved ? (
              <span className="catalog-row__saved">In your recipes</span>
            ) : (
              <button
                className="button button--outline"
                disabled={adding}
                onClick={() => onAdd(entry)}
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
