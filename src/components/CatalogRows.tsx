import type { CatalogEntry } from '../data/catalog';

/**
 * Catalog entries as prep tickets: the publisher's title, where it comes from,
 * and one action. The thumbnail is the publisher's own image, hotlinked exactly
 * as a saved recipe's is, and hides itself if it has rotted.
 *
 * Tapping the row reads the recipe and shows it; the recipe text is not in this
 * app until then, and is not saved even then.
 */
export function CatalogRows({
  entries,
  isSaved,
  addingIds,
  previewing,
  onAdd,
  onPreview,
}: {
  entries: CatalogEntry[];
  isSaved: (entry: CatalogEntry) => boolean;
  addingIds: Set<string>;
  previewing: string | null;
  onAdd: (entry: CatalogEntry) => void;
  onPreview: (entry: CatalogEntry) => void;
}) {
  return (
    <div className="catalog-index">
      {entries.map((entry) => {
        const saved = isSaved(entry);
        const adding = addingIds.has(entry.id);
        const reading = previewing === entry.id;
        return (
          <article className="catalog-row" key={entry.id}>
            <button
              className="catalog-row__main"
              onClick={() => onPreview(entry)}
              aria-label={`Preview ${entry.title} from ${entry.siteName}`}
            >
              {entry.imageUrl && (
                <img
                  className="recipe-thumb"
                  src={entry.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              )}
              <span className="catalog-row__copy">
                <strong>{entry.title}</strong>
                <span>
                  {reading ? 'Reading the recipe…' : entry.siteName}
                  {entry.minutes ? ` · ${formatMinutes(entry.minutes)}` : ''}
                  {entry.tags.length ? ` · ${entry.tags.join(', ')}` : ''}
                </span>
              </span>
            </button>
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
