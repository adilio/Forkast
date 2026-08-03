import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'forkast-rules-test',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'households/home'), { name: 'Home', ownerUid: 'alice' });
    await setDoc(doc(db, 'households/home/members/alice'), { role: 'owner' });
    await setDoc(doc(db, 'households/home/members/bob'), { role: 'member' });
    await setDoc(doc(db, 'households/home/stores/city-market'), {
      name: 'City Market',
      sortOrder: 0,
    });
    await setDoc(doc(db, 'households/home/recipes/soup'), { title: 'Soup' });
    await setDoc(doc(db, 'households/other'), { name: 'Other', ownerUid: 'carol' });
    await setDoc(doc(db, 'households/other/members/carol'), { role: 'owner' });
  });
});
describe('household isolation', () => {
  it('lets members read and blocks another household and signed-out users', async () => {
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext('alice').firestore(),
          'households/home/recipes/soup',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('carol').firestore(),
          'households/home/recipes/soup',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(env.unauthenticatedContext().firestore(), 'households/home/recipes/soup'),
      ),
    );
  });
  it('allows valid member recipes and rejects malformed or cross-household writes', async () => {
    const valid = {
      title: 'Noodles',
      description: '',
      sourceUrl: '',
      sourceHost: '',
      imageUrl: '',
      baseServings: 4,
      ingredients: [],
      instructions: [],
      notes: '',
      tags: [],
      starred: false,
      importMetadata: {},
      createdAt: new Date(),
      createdBy: 'bob',
      updatedAt: new Date(),
      updatedBy: 'bob',
    };
    const memberDb = env.authenticatedContext('bob').firestore();
    await assertSucceeds(
      setDoc(doc(memberDb, 'households/home/recipes/noodles'), valid),
    );
    await assertFails(
      setDoc(doc(memberDb, 'households/home/recipes/spoofed'), {
        ...valid,
        createdBy: 'alice',
      }),
    );
    await assertFails(
      setDoc(doc(memberDb, 'households/home/recipes/malformed'), {
        ...valid,
        title: '',
      }),
    );
    await assertFails(
      setDoc(doc(memberDb, 'households/home/recipes/extra'), {
        ...valid,
        admin: true,
      }),
    );
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext('carol').firestore(),
          'households/home/recipes/cross-household',
        ),
        { ...valid, createdBy: 'carol', updatedBy: 'carol' },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          env.unauthenticatedContext().firestore(),
          'households/home/recipes/signed-out',
        ),
        valid,
      ),
    );
  });
  it('validates shopping stores and fields', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const base = {
      name: 'Milk',
      normalizedName: 'milk',
      quantity: null,
      quantityMax: null,
      unit: null,
      note: null,
      storeId: 'city-market',
      checked: false,
      manual: true,
      sourceRecipeId: null,
      sourceIngredientId: null,
      createdAt: new Date(),
      createdBy: 'alice',
      updatedAt: new Date(),
      updatedBy: 'alice',
    };
    await assertSucceeds(setDoc(doc(db, 'households/home/shoppingItems/one'), base));
    await assertFails(
      setDoc(doc(db, 'households/home/shoppingItems/two'), {
        ...base,
        storeId: 'unknown',
      }),
    );
    await assertFails(
      setDoc(doc(db, 'households/home/shoppingItems/three'), { ...base, admin: true }),
    );
  });
  it('keeps store preferences personal', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const prefs = {
      defaultStoreId: 'city-market',
      updatedAt: new Date(),
      updatedBy: 'alice',
    };
    const rule = {
      displayName: 'Milk',
      storeId: 'city-market',
      updatedAt: new Date(),
      updatedBy: 'alice',
    };

    await assertSucceeds(
      setDoc(doc(alice, 'households/home/memberPrefs/alice'), prefs),
    );
    await assertSucceeds(
      setDoc(doc(alice, 'households/home/memberPrefs/alice/storeRules/milk'), rule),
    );

    // Bob shares the list and may read how Alice routes, but never write it.
    await assertSucceeds(getDoc(doc(bob, 'households/home/memberPrefs/alice')));
    await assertFails(
      setDoc(doc(bob, 'households/home/memberPrefs/alice'), {
        ...prefs,
        updatedBy: 'bob',
      }),
    );
    await assertFails(
      setDoc(doc(bob, 'households/home/memberPrefs/alice/storeRules/milk'), {
        ...rule,
        updatedBy: 'bob',
      }),
    );

    // A store that does not exist, and a stranger, are both refused.
    await assertFails(
      setDoc(doc(alice, 'households/home/memberPrefs/alice'), {
        ...prefs,
        defaultStoreId: 'unknown',
      }),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('carol').firestore(),
          'households/home/memberPrefs/alice',
        ),
      ),
    );

    // The pre-split household baseline is readable but frozen.
    await assertSucceeds(
      getDoc(doc(alice, 'households/home/ingredientStoreRules/milk')),
    );
    await assertFails(
      setDoc(doc(alice, 'households/home/ingredientStoreRules/milk'), rule),
    );
  });
  it('blocks role escalation', async () => {
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext('alice').firestore(),
          'households/home/members/bob',
        ),
        { role: 'owner' },
      ),
    );
  });
});
