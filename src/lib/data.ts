import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizedIngredientName } from './ingredients';
import { recipeDuplicateKey } from './recipes';
import type {
  Member,
  MemberPrefs,
  NewShoppingItem,
  Recipe,
  ShoppingItem,
  Store,
} from './types';

function path(householdId: string, name: string) {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'households', householdId, name);
}
/** One person's own preference documents, which only they may write. */
function memberPath(householdId: string, uid: string, name: string) {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'households', householdId, 'memberPrefs', uid, name);
}
function memberPrefsDoc(householdId: string, uid: string) {
  if (!db) throw new Error('Firebase is not configured.');
  return doc(db, 'households', householdId, 'memberPrefs', uid);
}
const actor = () => auth?.currentUser?.uid ?? '';
export function listenRecipes(
  householdId: string,
  onData: (rows: Recipe[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(path(householdId, 'recipes'), orderBy('updatedAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe)),
    onError,
  );
}
export async function saveRecipe(householdId: string, recipe: Recipe) {
  const ref = recipe.id
    ? doc(path(householdId, 'recipes'), recipe.id)
    : doc(path(householdId, 'recipes'));
  const existing = Boolean(recipe.id);
  const body: Partial<Recipe> = { ...recipe };
  delete body.id;
  await setDoc(
    ref,
    {
      ...body,
      ...(!existing ? { createdAt: serverTimestamp(), createdBy: actor() } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: actor(),
    },
    { merge: true },
  );
  return ref.id;
}
export async function deleteRecipe(householdId: string, id: string) {
  await deleteDoc(doc(path(householdId, 'recipes'), id));
}
export async function setStarred(householdId: string, id: string, starred: boolean) {
  await updateDoc(doc(path(householdId, 'recipes'), id), {
    starred,
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}
export function listenStores(
  householdId: string,
  onData: (rows: Store[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(path(householdId, 'stores'), orderBy('sortOrder')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Store)),
    onError,
  );
}
/**
 * Adds a store at the end of the list. Any member may: which shops a household
 * uses is not the owner's decision to make for everyone.
 */
export async function createStore(householdId: string, name: string, after: Store[]) {
  const ref = doc(path(householdId, 'stores'));
  await setDoc(ref, {
    name: name.trim().slice(0, 60),
    sortOrder: Math.max(-1, ...after.map((store) => store.sortOrder)) + 1,
    createdAt: serverTimestamp(),
    createdBy: actor(),
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
  return ref.id;
}

/** Renaming is safe at any time: items reference a store by id, never by name. */
export async function renameStore(householdId: string, id: string, name: string) {
  await updateDoc(doc(path(householdId, 'stores'), id), {
    name: name.trim().slice(0, 60),
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}

/**
 * Rewrites the whole order as consecutive positions rather than swapping two
 * values, so an order that drifted — two stores sharing a position, or a gap
 * left by a delete — comes back consistent instead of staying subtly wrong.
 */
export async function reorderStores(householdId: string, ordered: Store[]) {
  const batch = writeBatch(db!);
  ordered.forEach((store, index) => {
    batch.update(doc(path(householdId, 'stores'), store.id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
      updatedBy: actor(),
    });
  });
  await batch.commit();
}

/**
 * Removes a store, moving everything on its list to `moveToId` first.
 *
 * The move is not a courtesy. An item pointing at a store that no longer exists
 * is invisible — the shopping page shows one store at a time — and also frozen,
 * because every item write checks that its store exists, so it cannot even be
 * unchecked or reassigned afterwards. Both writes go in one batch: either the
 * store is gone and its items moved, or nothing happened.
 *
 * Ingredient routing rules and default-store preferences are deliberately left
 * alone. They may only be written by the person who owns them, so this could
 * not fix everyone's anyway, and routeIngredient already steps over a rule
 * pointing at a store that no longer exists.
 */
export async function deleteStore(
  householdId: string,
  id: string,
  moveToId: string,
  items: ShoppingItem[],
) {
  if (id === moveToId) throw new Error('Pick a different store to move items to.');
  const moving = items.filter((item) => item.storeId === id);
  const batch = writeBatch(db!);
  for (const item of moving) {
    batch.update(doc(path(householdId, 'shoppingItems'), item.id), {
      storeId: moveToId,
      updatedAt: serverTimestamp(),
      updatedBy: actor(),
    });
  }
  batch.delete(doc(path(householdId, 'stores'), id));
  await batch.commit();
  return moving.length;
}

export function listenShopping(
  householdId: string,
  onData: (rows: ShoppingItem[]) => void,
  onError: (e: Error) => void,
  onState?: (state: { pending: boolean; fromCache: boolean }) => void,
): Unsubscribe {
  return onSnapshot(
    query(path(householdId, 'shoppingItems'), orderBy('createdAt')),
    { includeMetadataChanges: true },
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShoppingItem));
      onState?.({
        pending: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache,
      });
    },
    onError,
  );
}
export async function addShoppingItem(householdId: string, input: NewShoppingItem) {
  await addDoc(path(householdId, 'shoppingItems'), {
    ...input,
    createdAt: serverTimestamp(),
    createdBy: actor(),
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}
export async function addIngredientToShopping(
  householdId: string,
  input: NewShoppingItem,
) {
  const snap = await getDocs(path(householdId, 'shoppingItems'));
  const match = snap.docs.find((row) => {
    const item = row.data() as ShoppingItem;
    return (
      !item.checked &&
      item.storeId === input.storeId &&
      item.normalizedName === input.normalizedName &&
      item.unit === input.unit &&
      item.quantity != null &&
      input.quantity != null
    );
  });
  if (match) {
    const item = match.data() as ShoppingItem;
    await updateShoppingItem(householdId, match.id, {
      quantity: (item.quantity ?? 0) + (input.quantity ?? 0),
    });
    return;
  }
  await addShoppingItem(householdId, input);
}
export async function updateShoppingItem(
  householdId: string,
  id: string,
  patch: Partial<ShoppingItem>,
) {
  await updateDoc(doc(path(householdId, 'shoppingItems'), id), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}
export async function removeShoppingItem(householdId: string, id: string) {
  await deleteDoc(doc(path(householdId, 'shoppingItems'), id));
}
export async function restoreShoppingItem(householdId: string, item: ShoppingItem) {
  const { id, ...body } = item;
  await setDoc(doc(path(householdId, 'shoppingItems'), id), {
    ...body,
    createdAt: serverTimestamp(),
    createdBy: actor(),
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}
export async function clearChecked(
  householdId: string,
  storeId: string,
  items: ShoppingItem[],
) {
  const batch = writeBatch(db!);
  items
    .filter((x) => x.storeId === storeId && x.checked)
    .forEach((x) => batch.delete(doc(path(householdId, 'shoppingItems'), x.id)));
  await batch.commit();
}
/**
 * Records where *this person* buys an ingredient. Deliberately writes only the
 * caller's own rules: the household-wide collection is the pre-split baseline
 * and is now read-only, because writing it let whoever shopped last silently
 * retrain routing for everyone else.
 */
export async function rememberStore(
  householdId: string,
  name: string,
  storeId: string,
) {
  const uid = actor();
  if (!uid) throw new Error('Sign in to save a store preference.');
  await setDoc(
    doc(memberPath(householdId, uid, 'storeRules'), normalizedIngredientName(name)),
    {
      displayName: name,
      storeId,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
  );
}

/** This person's own rules, and the household baseline they inherit. */
export async function getStoreRules(householdId: string, uid: string) {
  const [mine, household] = await Promise.all([
    getDocs(memberPath(householdId, uid, 'storeRules')),
    getDocs(path(householdId, 'ingredientStoreRules')),
  ]);
  const toMap = (snap: QuerySnapshot) =>
    new Map(snap.docs.map((d) => [d.id, d.data().storeId as string]));
  return { mine: toMap(mine), household: toMap(household) };
}

export async function clearMyStoreRules(householdId: string, uid: string) {
  const snap = await getDocs(memberPath(householdId, uid, 'storeRules'));
  const batch = writeBatch(db!);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export function listenMemberPrefs(
  householdId: string,
  uid: string,
  onData: (prefs: MemberPrefs) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    memberPrefsDoc(householdId, uid),
    (snap) =>
      onData({ defaultStoreId: (snap.data()?.defaultStoreId as string) ?? null }),
    onError,
  );
}

export async function setDefaultStore(
  householdId: string,
  uid: string,
  storeId: string,
) {
  await setDoc(
    memberPrefsDoc(householdId, uid),
    { defaultStoreId: storeId, updatedAt: serverTimestamp(), updatedBy: uid },
    { merge: true },
  );
}

export function listenMembers(
  householdId: string,
  onData: (rows: Member[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    path(householdId, 'members'),
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          displayName: (d.data().displayName as string) || '',
          role: (d.data().role as Member['role']) ?? 'member',
        })),
      ),
    onError,
  );
}
export async function getRecipeDuplicateKeys(householdId: string) {
  const snap = await getDocs(path(householdId, 'recipes'));
  return new Set(
    snap.docs.map((document) => recipeDuplicateKey(document.data() as Recipe)),
  );
}
export async function exportHousehold(householdId: string) {
  const names = ['recipes', 'stores', 'shoppingItems', 'ingredientStoreRules'] as const;
  const entries = await Promise.all(
    names.map(
      async (name) =>
        [
          name,
          (await getDocs(path(householdId, name))).docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        ] as const,
    ),
  );
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    householdId,
    data: Object.fromEntries(entries),
  };
}
