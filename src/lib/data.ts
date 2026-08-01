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
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizedIngredientName } from './ingredients';
import { recipeDuplicateKey } from './recipes';
import type { Recipe, ShoppingItem, Store } from './types';

function path(householdId: string, name: string) {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'households', householdId, name);
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
export async function addShoppingItem(
  householdId: string,
  input: Omit<ShoppingItem, 'id'>,
) {
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
  input: Omit<ShoppingItem, 'id'>,
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
export async function rememberStore(
  householdId: string,
  name: string,
  storeId: string,
) {
  const key = normalizedIngredientName(name);
  await setDoc(doc(path(householdId, 'ingredientStoreRules'), key), {
    displayName: name,
    storeId,
    updatedAt: serverTimestamp(),
    updatedBy: actor(),
  });
}
export async function getRememberedStores(householdId: string) {
  const snap = await getDocs(path(householdId, 'ingredientStoreRules'));
  return new Map(snap.docs.map((d) => [d.id, d.data().storeId as string]));
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
