import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  : applicationDefault();
const app =
  getApps()[0] ??
  initializeApp({
    credential: credentials,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'forkast-4dl',
  });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token)
    throw new Response(JSON.stringify({ message: 'Sign in to continue.' }), {
      status: 401,
    });
  return adminAuth.verifyIdToken(token);
}
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
export function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return json({ message: 'Forkast could not complete that request.' }, 500);
}
