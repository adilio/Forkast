import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, errorResponse, json, requireUser } from '../lib/admin';

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
    const user = await requireUser(request);
    const { token } = (await request.json().catch(() => ({}))) as { token?: string };
    if (!token) return json({ message: 'Enter a valid invite link.' }, 400);
    const hash = createHash('sha256')
      .update(String(token || ''))
      .digest('hex');
    const matches = await adminDb
      .collectionGroup('invites')
      .where('tokenHash', '==', hash)
      .limit(1)
      .get();
    if (matches.empty) return json({ message: 'That invite is not valid.' }, 400);
    const invite = matches.docs[0];
    const householdId = invite.ref.parent.parent?.id;
    if (!householdId) return json({ message: 'That invite is not valid.' }, 400);
    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(invite.ref);
      const data = fresh.data();
      if (!data || data.usedAt || data.expiresAt.toMillis() < Date.now())
        throw new Error('Invite expired');
      tx.update(invite.ref, { usedAt: FieldValue.serverTimestamp() });
      tx.set(adminDb.doc(`households/${householdId}/members/${user.uid}`), {
        role: 'member',
        // See bootstrap-household: the shared list names people from here.
        displayName: user.name || '',
        joinedAt: FieldValue.serverTimestamp(),
      });
      tx.set(adminDb.doc(`users/${user.uid}`), {
        displayName: user.name || '',
        email: user.email || '',
        householdId,
      });
    });
    return json({ householdId });
  } catch (e) {
    if (e instanceof Error && e.message === 'Invite expired')
      return json({ message: 'That invite has expired or was already used.' }, 400);
    return errorResponse(e);
  }
};
