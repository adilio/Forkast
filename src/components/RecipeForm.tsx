import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { parseIngredient } from '../lib/ingredients';
import { sourceHostOf } from '../lib/recipes';
import type { Recipe } from '../lib/types';

export function RecipeForm({
  initial,
  onSave,
  onCancel,
  submitLabel = 'Save recipe',
  draftNamespace = 'manual',
}: {
  initial: Recipe;
  onSave: (recipe: Recipe) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  draftNamespace?: string;
}) {
  const draftKey = useMemo(
    () => `forkast:recipe-draft:${draftNamespace}:${initial.id || 'new'}`,
    [draftNamespace, initial.id],
  );
  const recovered = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || 'null') as {
        recipe: Recipe;
        ingredients: string;
        instructions: string;
      } | null;
    } catch {
      return null;
    }
  }, [draftKey]);
  const [recipe, setRecipe] = useState(recovered?.recipe ?? initial);
  const [ingredients, setIngredients] = useState(
    recovered?.ingredients ?? initial.ingredients.map((x) => x.rawText).join('\n'),
  );
  const [instructions, setInstructions] = useState(
    recovered?.instructions ?? initial.instructions.join('\n\n'),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryVisible, setRecoveryVisible] = useState(Boolean(recovered));
  const dirty =
    recipe !== initial ||
    ingredients !== initial.ingredients.map((x) => x.rawText).join('\n') ||
    instructions !== initial.instructions.join('\n\n');
  useEffect(() => {
    if (!dirty) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ recipe, ingredients, instructions }),
    );
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty, draftKey, ingredients, instructions, recipe]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        ...recipe,
        ingredients: ingredients
          .split(/\n/)
          .map((x) => x.trim())
          .filter(Boolean)
          .map((x, i) => parseIngredient(x, initial.ingredients[i]?.id)),
        instructions: instructions
          .split(/\n\s*\n|\n(?=\d+[.)]\s)/)
          .map((x) => x.replace(/^\d+[.)]\s*/, '').trim())
          .filter(Boolean),
        sourceHost: sourceHostOf(recipe.sourceUrl),
      });
      localStorage.removeItem(draftKey);
    } catch {
      setError('Recipe could not be saved. Check your connection and try again.');
      setBusy(false);
    }
  }
  return (
    <form className="recipe-form" onSubmit={submit}>
      {recoveryVisible && (
        <div className="draft-recovery" role="status">
          <span>Recovered an unfinished draft from this device.</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRecipe(initial);
              setIngredients(initial.ingredients.map((x) => x.rawText).join('\n'));
              setInstructions(initial.instructions.join('\n\n'));
              localStorage.removeItem(draftKey);
              setRecoveryVisible(false);
            }}
          >
            Use fresh details
          </button>
        </div>
      )}
      <div className="form-grid">
        <label>
          Recipe title
          <input
            value={recipe.title}
            onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
            required
            maxLength={300}
          />
        </label>
        <label>
          Base servings
          <input
            type="number"
            min=".25"
            step=".25"
            value={recipe.baseServings ?? ''}
            onChange={(e) =>
              setRecipe({
                ...recipe,
                baseServings: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
      </div>
      <label>
        Ingredients <span>One line each; quantities stay editable.</span>
        <textarea
          rows={10}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          required
        />
      </label>
      <label>
        Directions <span>Separate steps with a blank line.</span>
        <textarea
          rows={12}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </label>
      <details
        className="optional-fields"
        open={Boolean(
          recipe.description || recipe.sourceUrl || recipe.imageUrl || recipe.notes,
        )}
      >
        <summary>More details</summary>
        <div>
          <label>
            Description
            <textarea
              value={recipe.description}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
            />
          </label>
          <label>
            Source URL
            <input
              type="url"
              value={recipe.sourceUrl}
              onChange={(e) => setRecipe({ ...recipe, sourceUrl: e.target.value })}
            />
          </label>
          <label>
            Image URL
            <input
              type="url"
              value={recipe.imageUrl}
              onChange={(e) => setRecipe({ ...recipe, imageUrl: e.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              value={recipe.notes}
              onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })}
            />
          </label>
        </div>
      </details>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button button--outline"
          onClick={() => {
            if (!dirty || confirm('Discard this recipe draft?')) {
              localStorage.removeItem(draftKey);
              onCancel();
            }
          }}
        >
          Cancel
        </button>
        <button className="button button--primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
