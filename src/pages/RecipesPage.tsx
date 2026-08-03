import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CatalogRows } from '../components/CatalogRows';
import { RecipeForm } from '../components/RecipeForm';
import { catalog } from '../data/catalog';
import { spreadBy, weekIndex, weeklyPicks } from '../lib/catalogWeek';
import { emptyRecipe } from '../lib/recipes';
import { useCatalogAdder } from '../lib/useCatalogAdder';
import { useAuth } from '../lib/auth';
import {
  addIngredientToShopping,
  deleteRecipe,
  getStoreRules,
  listenMemberPrefs,
  listenRecipes,
  listenStores,
  rememberStore,
  saveRecipe,
  setStarred,
} from '../lib/data';
import {
  formatQuantity,
  normalizedIngredientName,
  scaleIngredient,
} from '../lib/ingredients';
import { fallbackStore, routeIngredient, type StoreRouting } from '../lib/storeRouting';
import type { Recipe } from '../lib/types';
import type { Store } from '../lib/types';

export default function RecipesPage() {
  const { householdId } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const [loadingRecipes, setLoadingRecipes] = useState(Boolean(householdId));
  useEffect(() => {
    document.body.classList.toggle('editor-mode', Boolean(editing));
    return () => document.body.classList.remove('editor-mode');
  }, [editing]);
  useEffect(() => {
    if (!householdId) return;
    return listenRecipes(
      householdId,
      (rows) => {
        setRecipes(rows);
        setLoadingRecipes(false);
      },
      () => {
        setLoadingRecipes(false);
        setError('Recipes could not be loaded. Check your connection and try again.');
      },
    );
  }, [householdId]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [recipes, search]);
  if (editing)
    return (
      <section className="task-page">
        <header className="page-heading">
          <p className="kicker">Recipe editor</p>
          <h1>{editing.id ? 'Edit recipe' : 'New recipe'}</h1>
        </header>
        <RecipeForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (recipe) => {
            await saveRecipe(householdId!, recipe);
            setEditing(null);
          }}
        />
      </section>
    );
  if (selected)
    return (
      <RecipeDetail
        householdId={householdId!}
        recipe={selected}
        onBack={() => setSelected(null)}
        onEdit={() => setEditing(selected)}
      />
    );
  return (
    <section className="task-page">
      <header className="page-heading page-heading--actions">
        <div>
          <p className="kicker">Household recipe book</p>
          <h1>Recipes</h1>
        </div>
        {recipes.length > 0 && (
          <button
            className="button button--primary"
            onClick={() => setEditing(emptyRecipe())}
          >
            New recipe
          </button>
        )}
      </header>
      {recipes.length > 0 && (
        <div className="library-tools">
          <label className="search-field">
            <span>Search title or ingredient</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try chicken or lime"
            />
          </label>
          <Link className="button button--outline" href="/import-csv">
            Import CSV
          </Link>
        </div>
      )}
      {error && <p className="form-message">{error}</p>}
      {!search && <RecipesOfTheWeek householdId={householdId} />}
      <div className="recipe-index">
        {filtered.map((recipe) => (
          <article className="recipe-row" key={recipe.id}>
            <button
              className="star-button"
              aria-label={
                recipe.starred ? `Unstar ${recipe.title}` : `Star ${recipe.title}`
              }
              onClick={() =>
                void setStarred(householdId!, recipe.id, !recipe.starred).catch(() =>
                  setError('The favorite could not be updated. Try again.'),
                )
              }
            >
              {recipe.starred ? '★' : '☆'}
            </button>
            <button
              className={`recipe-row__main ${recipe.imageUrl ? 'recipe-row__main--image' : ''}`}
              onClick={() => setSelected(recipe)}
            >
              {recipe.imageUrl && (
                <img
                  className="recipe-thumb"
                  src={recipe.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              )}
              <span className="recipe-row__copy">
                <strong>{recipe.title}</strong>
                <span>
                  {recipe.sourceHost || `${recipe.ingredients.length} ingredients`}
                </span>
              </span>
            </button>
            <span className="recipe-row__servings">
              {recipe.baseServings ? `${recipe.baseServings} servings` : ''}
            </span>
          </article>
        ))}
      </div>
      {loadingRecipes && (
        <p className="connection-state" role="status">
          Loading recipes…
        </p>
      )}
      {!loadingRecipes && !filtered.length && (
        <div className="empty-list">
          <h2>{search ? 'No matching recipes' : 'Your recipe book is ready'}</h2>
          <p>
            {search
              ? 'Try a title or ingredient with fewer words.'
              : 'Add one by hand, import your Plan to Eat CSV, or share a recipe from Safari.'}
          </p>
          {!search && (
            <div className="empty-actions">
              <button
                className="button button--primary"
                onClick={() => setEditing(emptyRecipe())}
              >
                Add first recipe
              </button>
              <Link className="button button--outline" href="/import-csv">
                Import Plan to Eat CSV
              </Link>
              <Link className="button button--outline" href="/catalog">
                Browse starter recipes
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
/**
 * Three catalog recipes chosen by the week rather than by chance, so both
 * people in a household see the same suggestions and the section is quiet
 * enough to sit above someone's own recipe book without competing with it.
 */
function RecipesOfTheWeek({ householdId }: { householdId: string | null }) {
  const { add, isSaved, addingIds, progress, failures } = useCatalogAdder(householdId);
  const picks = useMemo(
    () =>
      weeklyPicks(
        spreadBy(catalog, (entry) => entry.siteName),
        weekIndex(new Date()),
        3,
      ),
    [],
  );
  return (
    <section className="week-picks">
      <header>
        <div>
          <p className="kicker">Recipes of the week</p>
          <p>Three from the starter catalog, changing each Monday.</p>
        </div>
        <Link className="text-button" href="/catalog">
          Browse all {catalog.length}
        </Link>
      </header>
      <CatalogRows
        entries={picks}
        isSaved={isSaved}
        addingIds={addingIds}
        onAdd={(entry) => void add([entry])}
      />
      {progress && (
        <p className="connection-state" role="status">
          {progress}
        </p>
      )}
      {failures.map((failure) => (
        <p className="form-message" role="alert" key={failure.entry.id}>
          {failure.entry.title}: {failure.message}
        </p>
      ))}
    </section>
  );
}

function RecipeDetail({
  householdId,
  recipe,
  onBack,
  onEdit,
}: {
  householdId: string;
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [servings, setServings] = useState(recipe.baseServings ?? 1);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState('remembered');
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);
  const [rules, setRules] = useState<{
    mine: Map<string, string>;
    household: Map<string, string>;
  }>(() => ({ mine: new Map(), household: new Map() }));
  const [selectedIngredients, setSelectedIngredients] = useState(
    () => new Set(recipe.ingredients.map((x) => x.id)),
  );
  const [transferReceipt, setTransferReceipt] = useState<
    Array<{ storeName: string; count: number }>
  >([]);
  const [adding, setAdding] = useState(false);
  const [routeError, setRouteError] = useState('');
  useEffect(() => {
    const stopStores = listenStores(householdId, setStores);
    if (!uid) return stopStores;
    const stopPrefs = listenMemberPrefs(householdId, uid, (prefs) =>
      setDefaultStoreId(prefs.defaultStoreId),
    );
    void getStoreRules(householdId, uid).then(setRules);
    return () => {
      stopStores();
      stopPrefs();
    };
  }, [householdId, uid]);
  const routing: StoreRouting = useMemo(
    () => ({ ...rules, defaultStoreId, stores }),
    [rules, defaultStoreId, stores],
  );
  const factor = recipe.baseServings ? servings / recipe.baseServings : 1;
  return (
    <article className="recipe-detail">
      <header>
        <button className="text-button" onClick={onBack}>
          ← All recipes
        </button>
        <p className="kicker">{recipe.sourceHost || 'Household recipe'}</p>
        <h1>{recipe.title}</h1>
        {recipe.description && <p>{recipe.description}</p>}
        <div className="recipe-detail__actions">
          <button className="button button--outline" onClick={onEdit}>
            Edit
          </button>
          <button
            className="text-button danger-text"
            onClick={async () => {
              if (confirm(`Delete ${recipe.title}?`)) {
                await deleteRecipe(householdId, recipe.id);
                onBack();
              }
            }}
          >
            Delete
          </button>
        </div>
      </header>
      <div className="serving-control">
        <span>Servings</span>
        <button
          aria-label="Decrease servings"
          onClick={() => setServings(Math.max(0.25, servings - 1))}
        >
          −
        </button>
        <input
          aria-label="Servings"
          type="number"
          min=".25"
          step=".25"
          value={servings}
          onChange={(e) => setServings(Number(e.target.value) || 1)}
        />
        <button
          aria-label="Increase servings"
          onClick={() => setServings(servings + 1)}
        >
          +
        </button>
      </div>
      <div className="recipe-columns">
        <section>
          <h2>Ingredients</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((item) => {
              const scaled = scaleIngredient(item, factor);
              return (
                <li key={item.id}>
                  <label className="ingredient-toggle">
                    <input
                      aria-label={`Select ${item.name}`}
                      type="checkbox"
                      checked={selectedIngredients.has(item.id)}
                      onChange={(event) =>
                        setSelectedIngredients((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        })
                      }
                    />
                  </label>
                  <strong>
                    {formatQuantity(scaled.quantity)}
                    {scaled.quantityMax != null
                      ? `–${formatQuantity(scaled.quantityMax)}`
                      : ''}{' '}
                    {scaled.unit || ''}
                  </strong>
                  <span>
                    {scaled.name}
                    {scaled.note ? `, ${scaled.note}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="send-to-store">
            <label>
              Send selected to
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="remembered">Your usual stores</option>
                {stores.map((store) => (
                  <option value={store.id} key={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            {storeId === 'remembered' && (
              <p>
                Ingredients you have bought before return to the store you buy them at.
                New ones go to {fallbackStore(routing)?.name || 'your first store'},
                which you can change in Settings.
              </p>
            )}
            <button
              className="button button--primary"
              disabled={!selectedIngredients.size || !stores.length || adding}
              onClick={async () => {
                setAdding(true);
                setTransferReceipt([]);
                setRouteError('');
                try {
                  const routed = new Map<string, number>();
                  for (const item of recipe.ingredients.filter((x) =>
                    selectedIngredients.has(x.id),
                  )) {
                    const scaled = scaleIngredient(item, factor);
                    const normalizedName = normalizedIngredientName(scaled.name);
                    const destination =
                      storeId === 'remembered'
                        ? routeIngredient(normalizedName, routing)?.storeId
                        : storeId;
                    if (!destination) continue;
                    await addIngredientToShopping(householdId, {
                      name: scaled.name,
                      normalizedName,
                      quantity: scaled.quantity,
                      quantityMax: scaled.quantityMax,
                      unit: scaled.unit,
                      note: scaled.note,
                      storeId: destination,
                      checked: false,
                      manual: false,
                      sourceRecipeId: recipe.id,
                      sourceIngredientId: item.id,
                    });
                    await rememberStore(householdId, scaled.name, destination);
                    routed.set(destination, (routed.get(destination) || 0) + 1);
                    setRules((current) => ({
                      ...current,
                      mine: new Map(current.mine).set(normalizedName, destination),
                    }));
                  }
                  setTransferReceipt(
                    [...routed].map(([destination, count]) => ({
                      storeName:
                        stores.find((store) => store.id === destination)?.name ||
                        'Shopping',
                      count,
                    })),
                  );
                } catch {
                  setRouteError(
                    'Some ingredients could not be added. Check your connection and try again.',
                  );
                } finally {
                  setAdding(false);
                }
              }}
            >
              {adding ? 'Adding ingredients…' : 'Add selected'}
            </button>
            {transferReceipt.length > 0 && (
              <div className="transfer-receipt" role="status">
                <strong>Ingredients routed</strong>
                <ul>
                  {transferReceipt.map((entry) => (
                    <li key={entry.storeName}>
                      <span>{entry.storeName}</span>
                      <span>
                        {entry.count} {entry.count === 1 ? 'item' : 'items'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {routeError && (
              <p className="form-message" role="alert">
                {routeError}
              </p>
            )}
          </div>
        </section>
        <section>
          <h2>Directions</h2>
          <ol className="direction-list">
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {recipe.notes && (
            <aside className="honest-note">
              <strong>Notes</strong>
              <p>{recipe.notes}</p>
            </aside>
          )}
        </section>
      </div>
    </article>
  );
}
