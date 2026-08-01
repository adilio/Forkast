import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb, errorResponse, json, requireUser } from '../lib/admin';

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
    const user = await requireUser(request);
    const profile = await adminDb.doc(`users/${user.uid}`).get();
    const householdId = profile.data()?.householdId;
    if (!householdId) return json({ message: 'No household found.' }, 404);
    const member = await adminDb
      .doc(`households/${householdId}/members/${user.uid}`)
      .get();
    if (member.data()?.role !== 'owner')
      return json({ message: 'Only the household owner can invite someone.' }, 403);
    const token = randomBytes(18).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    await adminDb.collection(`households/${householdId}/invites`).add({
      tokenHash: hash,
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      usedAt: null,
    });
    return json({ token, expiresInHours: 24 });
  } catch (e) {
    return errorResponse(e);
  }
};
