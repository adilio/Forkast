import { describe, expect, it } from 'vitest';
import { createDraftCache } from './catalogImport';
import { createDraftPersistence, DRAFT_MAX_ENTRIES, DRAFT_TTL_MS } from './draftCache';
import type { ImportedDraft } from './recipes';

function draft(title = 'Chicken and rice'): ImportedDraft {
  return {
    title,
    description: 'A weeknight dinner.',
    sourceUrl: 'https://example.com/chicken-and-rice',
    imageUrl: 'https://example.com/chicken.jpg',
    baseServings: 4,
    ingredientLines: ['2 cups rice', '1 lb chicken'],
    instructions: ['Cook the rice.', 'Cook the chicken.'],
    notes: '',
    tags: ['dinner'],
  };
}

/** A `Storage` that lives in a Map, plus the failure modes real ones have. */
function fakeStorage({ quota = Infinity } = {}) {
  const map = new Map<string, string>();
  return {
    map,
    storage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length > quota) throw new Error('QuotaExceededError');
        map.set(key, value);
      },
      removeItem: (key: string) => void map.delete(key),
      clear: () => map.clear(),
      key: (index: number) => [...map.keys()][index] ?? null,
      get length() {
        return map.size;
      },
    } as Storage,
  };
}

describe('remembering previews between visits', () => {
  it('serves a draft stored by an earlier visit without reading again', async () => {
    const { storage } = fakeStorage();
    const first = createDraftCache(
      async () => draft(),
      createDraftPersistence(storage),
    );
    await first.get('https://example.com/one');

    let reads = 0;
    const second = createDraftCache(async () => {
      reads += 1;
      return draft();
    }, createDraftPersistence(storage));
    expect(await second.get('https://example.com/one')).toMatchObject({
      title: 'Chicken and rice',
    });
    expect(reads).toBe(0);
  });

  it('reports a stored draft as already in hand, so a batch does not pace for it', async () => {
    const { storage } = fakeStorage();
    const first = createDraftCache(
      async () => draft(),
      createDraftPersistence(storage),
    );
    await first.get('https://example.com/one');

    const second = createDraftCache(
      async () => draft(),
      createDraftPersistence(storage),
    );
    expect(second.peek('https://example.com/one')).toMatchObject({
      title: 'Chicken and rice',
    });
  });

  it('forgets an entry once it is a fortnight old', async () => {
    const { storage } = fakeStorage();
    let clock = 1_000_000;
    const now = () => clock;
    const write = createDraftCache(
      async () => draft(),
      createDraftPersistence(storage, now),
    );
    await write.get('https://example.com/one');

    clock += DRAFT_TTL_MS + 1;
    let reads = 0;
    const later = createDraftCache(
      async () => {
        reads += 1;
        return draft();
      },
      createDraftPersistence(storage, now),
    );
    await later.get('https://example.com/one');
    expect(reads).toBe(1);
  });

  it('keeps the cap, dropping the least recently read', async () => {
    const { storage, map } = fakeStorage();
    let clock = 1_000_000;
    const persistence = createDraftPersistence(storage, () => (clock += 1_000));
    for (let index = 0; index < DRAFT_MAX_ENTRIES + 5; index += 1) {
      persistence!.set(`https://example.com/${index}`, draft(`Recipe ${index}`));
    }
    const stored = JSON.parse(map.get('forkast.catalog-drafts.v1')!);
    expect(stored).toHaveLength(DRAFT_MAX_ENTRIES);
    expect(persistence!.get('https://example.com/0')).toBeUndefined();
    expect(
      persistence!.get(`https://example.com/${DRAFT_MAX_ENTRIES + 4}`),
    ).toBeDefined();
  });

  it('does not store a failure', async () => {
    const { storage } = fakeStorage();
    const cache = createDraftCache(async () => {
      throw new Error('The recipe site took too long to respond.');
    }, createDraftPersistence(storage));
    await expect(cache.get('https://example.com/slow')).rejects.toThrow('too long');
    expect(
      createDraftPersistence(storage)!.get('https://example.com/slow'),
    ).toBeUndefined();
  });
});

describe('when storage will not cooperate', () => {
  it('previews anyway when there is no storage at all', async () => {
    const cache = createDraftCache(async () => draft(), null);
    expect(await cache.get('https://example.com/one')).toMatchObject({
      title: 'Chicken and rice',
    });
  });

  it('reports no persistence rather than throwing when storage is unreachable', () => {
    // Safari in private mode throws on access rather than reporting absence.
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(createDraftPersistence()).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('keeps what fits when the quota is exceeded', () => {
    const { storage, map } = fakeStorage({ quota: 900 });
    const persistence = createDraftPersistence(storage)!;
    for (let index = 0; index < 12; index += 1) {
      persistence.set(`https://example.com/${index}`, draft(`Recipe ${index}`));
    }
    const raw = map.get('forkast.catalog-drafts.v1');
    expect(raw && raw.length).toBeLessThanOrEqual(900);
    // The most recent read is the one worth having.
    expect(persistence.get('https://example.com/11')).toBeDefined();
  });

  it('ignores a value that is not ours', () => {
    const { storage, map } = fakeStorage();
    map.set('forkast.catalog-drafts.v1', 'not json at all');
    const persistence = createDraftPersistence(storage)!;
    expect(persistence.get('https://example.com/one')).toBeUndefined();
    persistence.set('https://example.com/one', draft());
    expect(persistence.get('https://example.com/one')).toBeDefined();
  });

  it('ignores a stored entry whose shape is wrong', () => {
    const { storage, map } = fakeStorage();
    map.set(
      'forkast.catalog-drafts.v1',
      JSON.stringify([
        { url: 'https://example.com/one', readAt: Date.now(), draft: { title: 42 } },
      ]),
    );
    expect(
      createDraftPersistence(storage)!.get('https://example.com/one'),
    ).toBeUndefined();
  });
});
