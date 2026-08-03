import { useEffect, useMemo, useState } from 'react';
import {
  createStore,
  deleteStore,
  listenShopping,
  listenStores,
  renameStore,
  reorderStores,
} from '../lib/data';
import {
  canRemoveStore,
  moveStore,
  STORE_NAME_MAX,
  storeNameProblem,
} from '../lib/stores';
import type { ShoppingItem, Store } from '../lib/types';

/** Drops one store's in-progress name, so the row shows what is saved again. */
function stopEditing(edits: Record<string, string>, id: string) {
  const rest = { ...edits };
  delete rest[id];
  return rest;
}

/**
 * Defining the household's own stores.
 *
 * Forkast seeded two stores and then locked the list, which fitted exactly one
 * household. Everything here is ordinary member work: any member may add,
 * rename, reorder, and remove, because which shops a household uses is not the
 * owner's decision to make on everyone's behalf.
 *
 * Removal is the only operation that can lose something, so it is the only one
 * that asks a question first — and the question is where the items should go,
 * not merely whether you are sure.
 */
export function StoreManager({ householdId }: { householdId: string }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  /** Names being typed, by store id. Absent means "showing what is saved". */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState('');
  const [removing, setRemoving] = useState<{ id: string; moveTo: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stopStores = listenStores(
      householdId,
      (rows) => {
        setStores(rows);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('Your stores could not be loaded. Try again when connected.');
      },
    );
    const stopItems = listenShopping(householdId, setItems, () => setItems([]));
    return () => {
      stopStores();
      stopItems();
    };
  }, [householdId]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.storeId, (map.get(item.storeId) ?? 0) + 1);
    return map;
  }, [items]);

  const nameOf = (store: Store) => edits[store.id] ?? store.name;

  async function run(key: string, work: () => Promise<string>) {
    setBusy(key);
    setError('');
    try {
      setStatus(await work());
    } catch {
      setStatus('');
      setError('That change could not be saved. Try again when connected.');
    } finally {
      setBusy('');
    }
  }

  async function commitName(store: Store) {
    const next = (edits[store.id] ?? store.name).trim();
    setEdits((current) => stopEditing(current, store.id));
    if (next === store.name) return;
    const problem = storeNameProblem(next, stores, store.id);
    if (problem) {
      setError(problem);
      return;
    }
    await run(`name:${store.id}`, async () => {
      await renameStore(householdId, store.id, next);
      return `Renamed to ${next}.`;
    });
  }

  async function move(store: Store, delta: -1 | 1) {
    const ordered = moveStore(stores, store.id, delta);
    if (ordered[stores.indexOf(store)]?.id === store.id) return;
    await run(`move:${store.id}`, async () => {
      await reorderStores(householdId, ordered);
      return `Moved ${store.name}.`;
    });
  }

  async function add() {
    const problem = storeNameProblem(adding, stores);
    if (problem) {
      setError(problem);
      return;
    }
    await run('add', async () => {
      const name = adding.trim();
      await createStore(householdId, name, stores);
      setAdding('');
      return `Added ${name}.`;
    });
  }

  async function remove(store: Store) {
    const moveTo = removing?.moveTo || stores.find((s) => s.id !== store.id)?.id;
    if (!moveTo) return;
    await run(`remove:${store.id}`, async () => {
      const moved = await deleteStore(householdId, store.id, moveTo, items);
      setRemoving(null);
      const target = stores.find((s) => s.id === moveTo)?.name ?? 'another store';
      return moved
        ? `Removed ${store.name} and moved ${moved} ${moved === 1 ? 'item' : 'items'} to ${target}.`
        : `Removed ${store.name}.`;
    });
  }

  return (
    <>
      <h2>Your household&rsquo;s stores</h2>
      <p>
        These are the lists you shop from. Add the shops this household actually uses,
        put them in the order you walk them, and rename any of them at any time — a
        shopping list follows a store even when its name changes.
      </p>

      {loading ? (
        <p className="connection-state" role="status">
          Loading your stores…
        </p>
      ) : (
        <ul className="store-manager">
          {stores.map((store, index) => {
            const count = counts.get(store.id) ?? 0;
            const closing = removing?.id === store.id;
            return (
              <li className="store-manager__row" key={store.id}>
                <div className="store-manager__main">
                  <label className="visually-hidden" htmlFor={`store-name-${store.id}`}>
                    Name of store {index + 1}
                  </label>
                  <input
                    id={`store-name-${store.id}`}
                    value={nameOf(store)}
                    maxLength={STORE_NAME_MAX}
                    autoComplete="off"
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [store.id]: event.target.value,
                      }))
                    }
                    onBlur={() => void commitName(store)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape')
                        setEdits((current) => stopEditing(current, store.id));
                    }}
                  />
                  <small>
                    {count === 0
                      ? 'Nothing on this list'
                      : `${count} ${count === 1 ? 'item' : 'items'} on this list`}
                  </small>
                </div>
                <div className="store-manager__actions">
                  <button
                    className="icon-button"
                    aria-label={`Move ${store.name} up`}
                    disabled={index === 0 || Boolean(busy)}
                    onClick={() => void move(store, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${store.name} down`}
                    disabled={index === stores.length - 1 || Boolean(busy)}
                    onClick={() => void move(store, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="text-button danger-text"
                    disabled={!canRemoveStore(stores) || Boolean(busy)}
                    aria-expanded={closing}
                    onClick={() =>
                      setRemoving(
                        closing
                          ? null
                          : {
                              id: store.id,
                              moveTo: stores.find((s) => s.id !== store.id)?.id ?? '',
                            },
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                {closing && (
                  <div className="store-manager__confirm">
                    <p>
                      {count === 0
                        ? `Remove ${store.name}? Nothing is on its list.`
                        : `${store.name} has ${count} ${count === 1 ? 'item' : 'items'} on its list. They will move rather than be lost — choose where they go.`}
                    </p>
                    {count > 0 && (
                      <>
                        <label
                          className="field-label"
                          htmlFor={`store-move-${store.id}`}
                        >
                          Move them to
                        </label>
                        <select
                          id={`store-move-${store.id}`}
                          value={removing.moveTo}
                          onChange={(event) =>
                            setRemoving({ id: store.id, moveTo: event.target.value })
                          }
                        >
                          {stores
                            .filter((s) => s.id !== store.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </>
                    )}
                    <div className="store-manager__confirm-actions">
                      <button
                        className="button button--outline"
                        onClick={() => setRemoving(null)}
                      >
                        Keep it
                      </button>
                      <button
                        className="button button--danger"
                        disabled={Boolean(busy)}
                        onClick={() => void remove(store)}
                      >
                        {busy === `remove:${store.id}`
                          ? 'Removing…'
                          : `Remove ${store.name}`}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !canRemoveStore(stores) && stores.length > 0 && (
        <p className="store-manager__note">
          Add a second store before removing this one — Forkast needs somewhere to send
          an ingredient.
        </p>
      )}

      <div className="store-manager__add">
        <label className="field-label" htmlFor="new-store">
          Add a store
        </label>
        <div>
          <input
            id="new-store"
            value={adding}
            maxLength={STORE_NAME_MAX}
            placeholder="Corner grocer"
            autoComplete="off"
            onChange={(event) => setAdding(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void add();
              }
            }}
          />
          <button
            className="button button--primary"
            disabled={!adding.trim() || Boolean(busy)}
            onClick={() => void add()}
          >
            {busy === 'add' ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

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
    </>
  );
}
