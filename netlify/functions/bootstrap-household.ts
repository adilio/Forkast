import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, errorResponse, json, requireUser } from '../lib/admin';

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
    const user = await requireUser(request);
    const existing = await adminDb.doc(`users/${user.uid}`).get();
    if (existing.exists)
      return json({ message: 'This account already belongs to a household.' }, 409);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const householdId = randomUUID();
    const batch = adminDb.batch();
    batch.set(adminDb.doc(`households/${householdId}`), {
      name: String(body.name || 'Our household').slice(0, 80),
      ownerUid: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(adminDb.doc(`households/${householdId}/members/${user.uid}`), {
      role: 'owner',
      // Mirrored here because users/{uid} is only readable by that user, so a
      // shared list has no other way to name who added an item.
      displayName: user.name || '',
      joinedAt: FieldValue.serverTimestamp(),
    });
    // One neutral store, not this household's two. Nothing works without at
    // least one — an ingredient has nowhere to go — but which shops a household
    // uses is theirs to say, and Settings is where they say it.
    batch.set(adminDb.doc(`households/${householdId}/stores/${randomUUID()}`), {
      name: 'Groceries',
      sortOrder: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    });
    batch.set(adminDb.doc(`users/${user.uid}`), {
      displayName: user.name || '',
      email: user.email || '',
      householdId,
    });
    await batch.commit();
    return json({ householdId });
  } catch (e) {
    return errorResponse(e);
  }
};
