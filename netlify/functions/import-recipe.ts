import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { adminDb, errorResponse, json, requireUser } from '../lib/admin';
import { extractRecipeFromHtml } from '../lib/recipe-schema';
const attempts = new Map<string, { start: number; count: number }>();
function blocked(address: string) {
  const parsed = ipaddr.parse(address);
  const range = parsed.range();
  return (
    !['unicast'].includes(range) ||
    [
      'private',
      'loopback',
      'linkLocal',
      'uniqueLocal',
      'carrierGradeNat',
      'unspecified',
      'reserved',
      'multicast',
      'broadcast',
    ].includes(range)
  );
}
async function validate(raw: string) {
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error('UNSAFE_URL');
  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((x) => blocked(x.address)))
    throw new Error('UNSAFE_URL');
  return url;
}
async function safeFetch(initial: string) {
  let url = await validate(initial);
  for (let i = 0; i < 4; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': 'Forkast/1.0 household recipe importer (+https://forkast.4dl.ca)',
        accept: 'text/html,application/xhtml+xml',
      },
    }).finally(() => clearTimeout(timer));
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new Error('FETCH_FAILED');
      url = await validate(new URL(next, url).toString());
      continue;
    }
    if (!response.ok) throw new Error('FETCH_FAILED');
    if (!response.headers.get('content-type')?.toLowerCase().includes('text/html'))
      throw new Error('NOT_HTML');
    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) throw new Error('TOO_LARGE');
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error('TOO_MANY_REDIRECTS');
}
export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
    const user = await requireUser(request);
    const profile = await adminDb.doc(`users/${user.uid}`).get();
    if (!profile.data()?.householdId)
      return json({ message: 'Finish household setup first.' }, 403);
    const slot = attempts.get(user.uid);
    if (!slot || Date.now() - slot.start > 60_000)
      attempts.set(user.uid, { start: Date.now(), count: 1 });
    else if (++slot.count > 10)
      return json(
        { message: 'Too many imports. Try again in a minute.', code: 'RATE_LIMIT' },
        429,
      );
    const { url } = (await request.json().catch(() => ({}))) as { url?: string };
    if (!url) return json({ message: 'Enter a recipe website URL.' }, 400);
    const source = (await validate(url)).toString();
    const recipe = extractRecipeFromHtml(await safeFetch(source), source);
    if (!recipe)
      return json(
        {
          message:
            'This page does not publish a structured recipe. Keep the URL and enter the recipe by hand.',
          code: 'NO_RECIPE',
        },
        422,
      );
    return json({ recipe });
  } catch (e) {
    if (e instanceof Error) {
      const map: Record<string, [string, number]> = {
        UNSAFE_URL: ['That URL is not a safe public website.', 400],
        FETCH_FAILED: ['The recipe site would not let Forkast read that page.', 502],
        NOT_HTML: ['That link is not an HTML recipe page.', 415],
        TOO_LARGE: ['That page is too large to import safely.', 413],
        TOO_MANY_REDIRECTS: ['That page redirected too many times.', 400],
        AbortError: ['The recipe site took too long to respond.', 504],
      };
      const found = map[e.message] || map[e.name];
      if (found) return json({ message: found[0], code: e.message }, found[1]);
    }
    return errorResponse(e);
  }
};
