import { formatQuantity, parseIngredient } from '../lib/ingredients';
import type { ImportedDraft } from '../lib/recipes';
import type { CatalogEntry } from '../data/catalog';

/**
 * The recipe as the publisher wrote it, read live and shown before anything is
 * saved. Nothing here is stored until someone adds it: `import-recipe` returns
 * a draft and writes nothing.
 */
export function CatalogPreview({
  entry,
  draft,
  saved,
  adding,
  onAdd,
  onBack,
}: {
  entry: CatalogEntry;
  draft: ImportedDraft;
  saved: boolean;
  adding: boolean;
  onAdd: () => void;
  onBack: () => void;
}) {
  const image = draft.imageUrl || entry.imageUrl;
  return (
    <article className="catalog-preview">
      <header>
        <button className="text-button" onClick={onBack}>
          ← All recipes to try
        </button>
        <p className="kicker">
          {entry.siteName}
          {draft.baseServings ? ` · ${draft.baseServings} servings` : ''}
        </p>
        <h1>{draft.title || entry.title}</h1>
        {draft.description && (
          <p className="catalog-preview__lede">{draft.description}</p>
        )}
        <div className="catalog-preview__actions">
          {saved ? (
            <span className="catalog-row__saved">In your recipes</span>
          ) : (
            <button
              className="button button--primary"
              disabled={adding}
              onClick={onAdd}
            >
              {adding ? 'Adding…' : 'Add to my recipes'}
            </button>
          )}
          <a
            className="text-button"
            href={entry.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open on {entry.siteName}
          </a>
        </div>
      </header>
      {image && (
        <img
          className="catalog-preview__image"
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      <div className="recipe-columns">
        <section>
          <h2>Ingredients</h2>
          <ul className="ingredient-list ingredient-list--plain">
            {draft.ingredientLines.map((line, index) => {
              const item = parseIngredient(line, `${entry.id}-${index}`);
              return (
                <li key={index}>
                  <strong>
                    {formatQuantity(item.quantity)}
                    {item.quantityMax != null
                      ? `–${formatQuantity(item.quantityMax)}`
                      : ''}{' '}
                    {item.unit || ''}
                  </strong>
                  <span>
                    {item.name}
                    {item.note ? `, ${item.note}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h2>Directions</h2>
          <ol className="direction-list">
            {draft.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
