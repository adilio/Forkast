import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { RecipeForm } from '../components/RecipeForm';
import { Icon } from '../components/Icon';
import { callFunction } from '../lib/api';
import { useAuth } from '../lib/auth';
import { saveRecipe } from '../lib/data';
import { parseIngredient } from '../lib/ingredients';
import { emptyRecipe } from '../lib/recipes';
import type { Recipe } from '../lib/types';

type Draft = {
  title: string;
  description: string;
  sourceUrl: string;
  imageUrl: string;
  baseServings: number | null;
  ingredientLines: string[];
  instructions: string[];
  notes: string;
  tags: string[];
};
export default function ImportPage() {
  const { householdId } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const incomingUrl = params.get('url') ?? '';
  const [url, setUrl] = useState(incomingUrl);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sourceHost = useMemo(() => {
    try {
      return incomingUrl ? new URL(incomingUrl).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  }, [incomingUrl]);
  async function review(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await callFunction<{ recipe: Draft }>('import-recipe', { url });
      const d = result.recipe;
      setDraft({
        ...emptyRecipe(),
        title: d.title,
        description: d.description,
        sourceUrl: d.sourceUrl,
        imageUrl: d.imageUrl,
        baseServings: d.baseServings,
        ingredients: d.ingredientLines.map((x) => parseIngredient(x)),
        instructions: d.instructions,
        notes: d.notes,
        tags: d.tags,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This recipe could not be imported.');
      setDraft({ ...emptyRecipe(), sourceUrl: url });
    } finally {
      setBusy(false);
    }
  }
  if (draft)
    return (
      <section className="task-page">
        <header className="page-heading">
          <p className="kicker">Review before saving</p>
          <h1>{draft.title || 'Enter recipe details'}</h1>
          <p>Check every field. The original website is retained as the source.</p>
        </header>
        {error && (
          <p className="form-message" role="alert">
            {error} The link is preserved below; enter the missing details by hand.
          </p>
        )}
        <RecipeForm
          initial={draft}
          draftNamespace={`website-import:${draft.sourceUrl || url}`}
          submitLabel="Save recipe"
          onCancel={() => setDraft(null)}
          onSave={async (recipe) => {
            await saveRecipe(householdId!, recipe);
            location.href = '/recipes';
          }}
        />
      </section>
    );
  return (
    <section className="task-page" aria-labelledby="import-title">
      <header className="task-page__header">
        <p className="kicker">Bring only the useful parts</p>
        <h1 id="import-title">Save a recipe</h1>
        <p>
          Forkast looks for the title, servings, ingredients, and directions. You review
          everything before saving.
        </p>
      </header>
      {incomingUrl && (
        <div className="incoming-ticket" role="status">
          <span className="incoming-ticket__step">1</span>
          <div>
            <strong>Recipe link received</strong>
            <span>{sourceHost || 'Check the URL below'}</span>
          </div>
          <Icon name="check" />
        </div>
      )}
      <form className="url-form" onSubmit={review}>
        <label htmlFor="recipe-url">Recipe website URL</label>
        <div className="url-form__row">
          <input
            id="recipe-url"
            name="url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://example.com/recipe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button className="button button--primary" disabled={!url || busy}>
            {busy ? 'Reading page…' : 'Review recipe'}
          </button>
        </div>
        <p>
          Normal recipe pages work best. Login-walled and social sites may need manual
          entry.
        </p>
      </form>
      <button
        className="text-button"
        onClick={() => setDraft({ ...emptyRecipe(), sourceUrl: url })}
      >
        Enter a recipe by hand
      </button>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      <aside className="shortcut-callout">
        <div>
          <p className="kicker">Faster on iPhone</p>
          <h2>Share straight to Forkast</h2>
          <p>
            Install the small Save to Forkast Shortcut once, then use it from Safari's
            Share Sheet.
          </p>
        </div>
        <Link className="button button--outline" href="/install">
          See iPhone setup
        </Link>
      </aside>
    </section>
  );
}
