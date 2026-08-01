import { auth } from './firebase';

export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.message || 'Forkast could not complete that request.');
  return data as T;
}
