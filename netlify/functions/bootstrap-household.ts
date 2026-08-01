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
      joinedAt: FieldValue.serverTimestamp(),
    });
    batch.set(adminDb.doc(`households/${householdId}/stores/city-market`), {
      name: 'City Market',
      sortOrder: 0,
    });
    batch.set(adminDb.doc(`households/${householdId}/stores/costco`), {
      name: 'Costco',
      sortOrder: 1,
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
