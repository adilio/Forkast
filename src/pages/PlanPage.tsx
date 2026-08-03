import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../lib/auth';
import {
  addIngredientToShopping,
  deletePlannedMeal,
  getStoreRules,
  listenMemberPrefs,
  listenPlannedMeals,
  listenRecipes,
  listenStores,
  rememberStore,
  savePlannedMeal,
} from '../lib/data';
import {
  addDays,
  longDay,
  planFactor,
  SLOT_LABELS,
  SLOTS,
  startOfWeek,
  todayISO,
  weekDays,
  weekLabel,
  type Slot,
} from '../lib/mealPlan';
import { fallbackStore, type StoreRouting } from '../lib/storeRouting';
import { mergeRouted, REMEMBERED, sendIngredientsToList } from '../lib/transfer';
import type { PlannedMeal, Recipe, Store } from '../lib/types';

/**
 * The week's meals.
 *
 * Tap to place, not drag to place. Dragging a recipe onto a Tuesday is a
 * desktop gesture; on the phone this is actually planned on it means a long
 * press, an autoscroll, and a drop target the size of a fingernail. Tapping an
 * empty slot and then picking a recipe is two ordinary taps and works the same
 * on both.
 *
 * The week is a column of days rather than a seven-across grid. Twenty-eight
 * cells will not fit across 320px legibly, and the question this screen answers
 * is "what are we eating, and what do I need to buy" — which reads down a list
 * perfectly well.
 */
export default function PlanPage() {
  const { householdId, user } = useAuth();
  const uid = user?.uid ?? '';
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);
  const [rules, setRules] = useState<{
    mine: Map<string, string>;
    household: Map<string, string>;
  }>(() => ({ mine: new Map(), household: new Map() }));
  const [placing, setPlacing] = useState<{ date: string; slot: Slot } | null>(null);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  useEffect(() => {
    if (!householdId) return;
    const stopMeals = listenPlannedMeals(
      householdId,
      weekStart,
      addDays(weekStart, 6),
      (rows) => {
        setMeals(rows);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('This week could not be loaded. Try again when connected.');
      },
    );
    return stopMeals;
  }, [householdId, weekStart]);

  useEffect(() => {
    if (!householdId) return;
    const stopRecipes = listenRecipes(householdId, setRecipes, () =>
      setError('Your recipes could not be loaded.'),
    );
    const stopStores = listenStores(householdId, setStores);
    if (!uid) {
      return () => {
        stopRecipes();
        stopStores();
      };
    }
    const stopPrefs = listenMemberPrefs(householdId, uid, (prefs) =>
      setDefaultStoreId(prefs.defaultStoreId),
    );
    void getStoreRules(householdId, uid).then(setRules);
    return () => {
      stopRecipes();
      stopStores();
      stopPrefs();
    };
  }, [householdId, uid]);

  const routing: StoreRouting = useMemo(
    () => ({ ...rules, defaultStoreId, stores }),
    [rules, defaultStoreId, stores],
  );
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const found = query
      ? recipes.filter((recipe) => recipe.title.toLowerCase().includes(query))
      : recipes;
    return found.slice(0, 40);
  }, [recipes, search]);

  const today = todayISO();
  const thisWeek = startOfWeek(today);

  async function place(recipe: Recipe) {
    if (!placing) return;
    setError('');
    try {
      await savePlannedMeal(householdId!, {
        date: placing.date,
        slot: placing.slot,
        recipeId: recipe.id,
        servings: recipe.baseServings,
        note: null,
      });
      setPlacing(null);
      setSearch('');
      setStatus(`${recipe.title} planned for ${longDay(placing.date)}.`);
    } catch {
      setError('That meal could not be saved. Try again when connected.');
    }
  }

  /**
   * Sends every planned recipe this week to the shopping list, each scaled to
   * the servings it was planned for.
   *
   * Ingredients already on the list are not skipped. An exact match — same
   * store, name, and unit — is already combined into one line by
   * addIngredientToShopping, and anything less exact is a judgement Forkast
   * cannot make correctly: two recipes wanting "1 onion" really do want two.
   */
  async function sendWeek() {
    const planned = meals
      .map((meal) => ({ meal, recipe: recipeById.get(meal.recipeId) }))
      .filter((entry): entry is { meal: PlannedMeal; recipe: Recipe } =>
        Boolean(entry.recipe),
      );
    if (!planned.length || !stores.length) return;
    setSending(true);
    setError('');
    setStatus('');
    try {
      const results = [];
      for (const { meal, recipe } of planned) {
        const result = await sendIngredientsToList(
          {
            recipe,
            factor: planFactor(meal.servings, recipe.baseServings),
            target: REMEMBERED,
            routing,
          },
          {
            addIngredient: (item) => addIngredientToShopping(householdId!, item),
            rememberStore: (name, storeId) =>
              rememberStore(householdId!, name, storeId),
          },
        );
        results.push(result.routed);
      }
      const total = mergeRouted(results);
      const parts = [...total].map(
        ([storeId, count]) =>
          `${count} to ${stores.find((store) => store.id === storeId)?.name ?? 'your list'}`,
      );
      setStatus(
        parts.length
          ? `Sent ${parts.join(', ')}. Ingredients you already had are combined.`
          : 'Nothing to send.',
      );
    } catch {
      setError(
        'Some ingredients could not be added. What already landed is on your list; try again when connected.',
      );
    } finally {
      setSending(false);
    }
  }

  const plannedCount = meals.length;

  return (
    <section className="task-page plan-page">
      <header className="page-heading">
        <p className="kicker">Household meal plan</p>
        <h1>This week</h1>
      </header>

      <div className="plan-week-nav">
        <button
          className="icon-button"
          aria-label="Previous week"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ←
        </button>
        <div>
          <strong>{weekLabel(weekStart)}</strong>
          {weekStart !== thisWeek && (
            <button className="text-button" onClick={() => setWeekStart(thisWeek)}>
              Back to this week
            </button>
          )}
        </div>
        <button
          className="icon-button"
          aria-label="Next week"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          →
        </button>
      </div>

      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="connection-state" role="status">
          Loading this week…
        </p>
      ) : (
        <ol className="plan-week">
          {days.map((date) => {
            const dayMeals = meals.filter((meal) => meal.date === date);
            return (
              <li
                className={`plan-day ${date === today ? 'plan-day--today' : ''}`}
                key={date}
              >
                <h2>
                  {longDay(date)}
                  {date === today && <span className="plan-today-mark">Today</span>}
                </h2>
                {SLOTS.map((slot) => {
                  const slotMeals = dayMeals.filter((meal) => meal.slot === slot);
                  // Only slots with something in them. An empty week is seven
                  // days, not twenty-eight blanks asking to be filled.
                  if (!slotMeals.length) return null;
                  return (
                    <div className="plan-slot" key={slot}>
                      <span className="plan-slot__name">{SLOT_LABELS[slot]}</span>
                      <div className="plan-slot__body">
                        {slotMeals.map((meal) => {
                          const recipe = recipeById.get(meal.recipeId);
                          return (
                            <div className="plan-meal" key={meal.id}>
                              <span>
                                <strong>
                                  {recipe?.title ?? 'A recipe no longer in your book'}
                                </strong>
                                {recipe && meal.servings ? (
                                  <small>{meal.servings} servings</small>
                                ) : null}
                              </span>
                              <button
                                className="row-remove"
                                aria-label={`Remove ${recipe?.title ?? 'this meal'} from ${SLOT_LABELS[slot].toLowerCase()} on ${longDay(date)}`}
                                onClick={() =>
                                  void deletePlannedMeal(householdId!, meal.id).catch(
                                    () =>
                                      setError(
                                        'That meal could not be removed. Try again when connected.',
                                      ),
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* The visible label is short because the day is the heading
                    directly above it; the accessible name carries the day,
                    since a screen reader reaching this button out of order
                    would otherwise hear seven identical "Plan a meal"s. */}
                <button
                  className="plan-add"
                  aria-label={`Plan a meal for ${longDay(date)}`}
                  onClick={() => {
                    setPlacing({ date, slot: 'dinner' });
                    setSearch('');
                  }}
                >
                  <span aria-hidden="true">+</span> Plan a meal
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {placing && (
        <div className="plan-picker" role="dialog" aria-label="Plan a meal">
          <div className="plan-picker__head">
            <div>
              <p className="kicker">{longDay(placing.date)}</p>
              <h2>Plan a meal</h2>
            </div>
            <button className="text-button" onClick={() => setPlacing(null)}>
              Cancel
            </button>
          </div>
          {/* Dinner is preselected because it is the meal a household actually
              plans; the other slots are here for the weeks it plans more. */}
          <div className="plan-slot-choice" role="group" aria-label="Which meal">
            {SLOTS.map((slot) => (
              <button
                key={slot}
                aria-pressed={placing.slot === slot}
                onClick={() => setPlacing({ ...placing, slot })}
              >
                {SLOT_LABELS[slot]}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span>Search your recipes</span>
            <input
              type="search"
              value={search}
              autoFocus
              placeholder="Try chicken or lime"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="plan-picker__list">
            {matches.map((recipe) => (
              <button key={recipe.id} onClick={() => void place(recipe)}>
                <strong>{recipe.title}</strong>
                <small>
                  {recipe.baseServings
                    ? `${recipe.baseServings} servings`
                    : `${recipe.ingredients.length} ingredients`}
                </small>
              </button>
            ))}
            {!matches.length && (
              <p className="plan-picker__empty">
                {recipes.length
                  ? 'No recipe matches that. Try fewer words.'
                  : 'Your recipe book is empty. Save a recipe first and it will appear here.'}
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <section className="plan-send">
          <h2>Shop for this week</h2>
          <p>
            Every planned recipe goes to your list, scaled to the servings you planned
            and routed to the store you buy each ingredient at. New ingredients go to{' '}
            {fallbackStore(routing)?.name || 'your first store'}.
          </p>
          <button
            className="button button--primary"
            disabled={!plannedCount || !stores.length || sending}
            onClick={() => void sendWeek()}
          >
            {sending
              ? 'Adding ingredients…'
              : plannedCount
                ? `Send ${plannedCount} ${plannedCount === 1 ? 'meal' : 'meals'} to the list`
                : 'Send this week to the list'}
          </button>
          {!plannedCount && <p>Plan a meal above and this will fill your list.</p>}
        </section>
      )}

      {status && (
        <p className="connection-state" role="status">
          {status}
        </p>
      )}

      <p className="plan-footer">
        <Link className="text-button" href="/recipes">
          Back to your recipes
        </Link>
      </p>
    </section>
  );
}
