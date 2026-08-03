import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import {
  addShoppingItem,
  clearChecked,
  listenMemberPrefs,
  listenMembers,
  listenShopping,
  listenStores,
  removeShoppingItem,
  rememberStore,
  restoreShoppingItem,
  updateShoppingItem,
} from '../lib/data';
import { formatQuantity, normalizedIngredientName } from '../lib/ingredients';
import type { Member, ShoppingItem, Store } from '../lib/types';

/**
 * Names the other person on an item, and nobody on your own. A list that
 * labels every row "Adil" when Adil is reading it is noise; the useful signal
 * is only "someone else put this here".
 */
function creditFor(item: ShoppingItem, members: Member[], uid: string) {
  if (!item.createdBy || item.createdBy === uid) return '';
  const member = members.find((m) => m.id === item.createdBy);
  return member?.displayName || 'someone in your household';
}

export default function ShoppingPage() {
  const { householdId, user } = useAuth();
  const uid = user?.uid ?? '';
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);
  // Only what this reader explicitly tapped. The store actually shown is
  // derived below, because it also depends on their saved preference.
  const [chosen, setChosen] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [storesLoading, setStoresLoading] = useState(Boolean(householdId));
  const [itemsLoading, setItemsLoading] = useState(Boolean(householdId));
  const [pending, setPending] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removed, setRemoved] = useState<ShoppingItem | null>(null);
  useEffect(() => {
    if (!householdId) return;
    const a = listenStores(
      householdId,
      (rows) => {
        setStores(rows);
        setStoresLoading(false);
      },
      () => {
        setStoresLoading(false);
        setError('Stores could not be loaded. Check your connection and try again.');
      },
    );
    const b = listenShopping(
      householdId,
      (rows) => {
        setItems(rows);
        setItemsLoading(false);
      },
      () => {
        setItemsLoading(false);
        setError('The shopping lists could not be loaded. Try again when connected.');
      },
      (state) => {
        setPending(state.pending);
        setFromCache(state.fromCache);
      },
    );
    const c = uid
      ? listenMemberPrefs(householdId, uid, (prefs) =>
          setDefaultStoreId(prefs.defaultStoreId),
        )
      : () => {};
    const d = listenMembers(householdId, setMembers, () => setMembers([]));
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update);
    addEventListener('offline', update);
    return () => {
      a();
      b();
      c();
      d();
      removeEventListener('online', update);
      removeEventListener('offline', update);
    };
  }, [householdId, uid]);
  /**
   * Derived rather than stored, so the tab can open on the reader's own store
   * the moment their preference arrives without an effect racing the render.
   * An explicit tap wins; otherwise this person's default store does; otherwise
   * the first one the household has.
   */
  const active =
    stores.find((store) => store.id === chosen)?.id ??
    stores.find((store) => store.id === defaultStoreId)?.id ??
    stores[0]?.id ??
    '';
  const visible = useMemo(
    () => items.filter((x) => x.storeId === active),
    [items, active],
  );
  const open = visible.filter((x) => !x.checked),
    done = visible.filter((x) => x.checked);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('item')).trim();
    if (!name || !stores.some((store) => store.id === active)) return;
    setAdding(true);
    setError('');
    try {
      await addShoppingItem(householdId!, {
        name,
        normalizedName: normalizedIngredientName(name),
        quantity: null,
        quantityMax: null,
        unit: null,
        note: null,
        storeId: active,
        checked: false,
        manual: true,
        sourceRecipeId: null,
        sourceIngredientId: null,
      });
      form.reset();
    } catch {
      setError('That item could not be added. Check your connection and try again.');
    } finally {
      setAdding(false);
    }
  }
  const status =
    storesLoading || itemsLoading
      ? 'Loading lists…'
      : !online
        ? pending
          ? 'Saved on this phone'
          : 'Working offline'
        : pending
          ? 'Saving changes…'
          : fromCache
            ? 'Checking for updates…'
            : 'All changes saved';
  return (
    <section className="shopping-page">
      <header className="shopping-header">
        <div>
          <p className="kicker">Shared household list</p>
          <h1>Shopping</h1>
        </div>
        <span
          className={`connection-state ${online ? '' : 'connection-state--offline'}`}
          role="status"
          aria-live="polite"
        >
          {status}
        </span>
      </header>
      <div className="store-tabs" role="group" aria-label="Choose a store">
        {stores.map((store) => (
          <button
            aria-pressed={active === store.id}
            key={store.id}
            onClick={() => setChosen(store.id)}
          >
            <span>{store.name}</span>
            <small>
              {items.filter((x) => x.storeId === store.id && !x.checked).length} left
            </small>
          </button>
        ))}
      </div>
      <form className="quick-add" onSubmit={add}>
        <label htmlFor="quick-item">
          Add to {stores.find((x) => x.id === active)?.name || 'this store'}
        </label>
        <div>
          <input
            id="quick-item"
            name="item"
            placeholder="Add an item"
            autoComplete="off"
            disabled={storesLoading || !stores.length || adding}
          />
          <button
            className="button button--primary"
            disabled={storesLoading || !stores.length || adding}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
      {error && <p className="form-message">{error}</p>}
      {!storesLoading && !stores.length && !error && (
        <p className="form-message" role="alert">
          No stores are available for this household. Ask the household owner to finish
          setup.
        </p>
      )}
      <div className="shopping-list">
        {open.map((item) => (
          <ShoppingRow
            key={item.id}
            item={item}
            householdId={householdId!}
            stores={stores}
            addedBy={creditFor(item, members, uid)}
            onRemove={async (item) => {
              await removeShoppingItem(householdId!, item.id);
              setRemoved(item);
            }}
          />
        ))}
      </div>
      {!itemsLoading && !storesLoading && stores.length > 0 && !open.length && (
        <div className="empty-list">
          <h2>Nothing left to pick up</h2>
          <p>Add an item above or send ingredients from a recipe.</p>
        </div>
      )}
      {done.length > 0 && (
        <details className="completed-items">
          <summary>{done.length} completed</summary>
          {done.map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              householdId={householdId!}
              stores={stores}
              addedBy={creditFor(item, members, uid)}
              onRemove={async (item) => {
                await removeShoppingItem(householdId!, item.id);
                setRemoved(item);
              }}
            />
          ))}
          <button
            className="text-button danger-text"
            onClick={() => {
              if (confirm(`Clear ${done.length} completed items?`)) {
                void clearChecked(householdId!, active, items);
              }
            }}
          >
            Clear completed
          </button>
        </details>
      )}
      {removed && (
        <div className="undo-banner" role="status">
          <span>Removed {removed.name}</span>
          <button
            className="text-button"
            onClick={async () => {
              await restoreShoppingItem(householdId!, removed);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
function ShoppingRow({
  item,
  householdId,
  stores,
  addedBy,
  onRemove,
}: {
  item: ShoppingItem;
  householdId: string;
  stores: Store[];
  addedBy: string;
  onRemove: (item: ShoppingItem) => Promise<void>;
}) {
  const detail = [
    item.quantity != null
      ? `${formatQuantity(item.quantity)}${
          item.quantityMax != null ? `–${formatQuantity(item.quantityMax)}` : ''
        } ${item.unit || ''}`.trim()
      : '',
    item.note || '',
    addedBy ? `added by ${addedBy}` : '',
  ].filter(Boolean);
  return (
    <div className={`shopping-row ${item.checked ? 'shopping-row--checked' : ''}`}>
      <label>
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) =>
            updateShoppingItem(householdId, item.id, { checked: e.target.checked })
          }
        />
        <span>
          <strong>{item.name}</strong>
          {detail.length > 0 && <small>{detail.join(' · ')}</small>}
        </span>
      </label>
      <select
        aria-label={`Store for ${item.name}`}
        value={item.storeId}
        onChange={async (e) => {
          const storeId = e.target.value;
          await updateShoppingItem(householdId, item.id, { storeId });
          await rememberStore(householdId, item.name, storeId);
        }}
      >
        {stores.map((s) => (
          <option value={s.id} key={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        className="row-remove"
        aria-label={`Remove ${item.name}`}
        onClick={() => void onRemove(item)}
      >
        ×
      </button>
    </div>
  );
}
