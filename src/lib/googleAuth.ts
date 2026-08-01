import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
} from 'firebase/auth';

export type AuthFeedback = {
  kind: 'success' | 'error';
  message: string;
};

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export function usesRedirectFlow(userAgent: string, standalone: boolean) {
  return /iPad|iPhone|iPod/i.test(userAgent) || standalone;
}

function shouldRedirect() {
  const iosStandalone = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const displayModeStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  return usesRedirectFlow(navigator.userAgent, iosStandalone || displayModeStandalone);
}

export async function startGoogleSignIn(auth: Auth) {
  if (!shouldRedirect()) {
    await signInWithPopup(auth, googleProvider());
    return;
  }
  await signInWithRedirect(auth, googleProvider());
}

export async function finishGoogleRedirect(auth: Auth): Promise<AuthFeedback | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return { kind: 'success', message: 'Signed in with Google.' };
  } catch (error) {
    return { kind: 'error', message: authMessage(error) };
  }
}

export function authMessage(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    'auth/account-exists-with-different-credential':
      'This email is already registered with a different sign-in method. Forkast only uses Google, so choose the Google account that owns this email.',
    'auth/cancelled-popup-request':
      'Google sign-in was cancelled. Choose Continue with Google when you are ready.',
    'auth/network-request-failed':
      'Forkast could not reach Google sign-in. Check your connection and try again.',
    'auth/operation-not-allowed':
      'Google sign-in is not enabled yet. Finish the Firebase Google provider setup, then try again.',
    'auth/popup-blocked':
      'The browser blocked Google sign-in. Allow the sign-in window or try again in Safari.',
    'auth/popup-closed-by-user':
      'Google sign-in was closed before it finished. Try again when you are ready.',
    'auth/redirect-cancelled-by-user':
      'Google sign-in was cancelled. Choose Continue with Google when you are ready.',
    'auth/too-many-requests':
      'Google sign-in is temporarily limited after several attempts. Wait a moment, then try again.',
    'auth/user-disabled':
      'This Google account is no longer allowed to use Forkast. Contact the household owner.',
    'auth/user-token-expired':
      'Your sign-in session expired. Continue with Google to sign in again.',
    'auth/unauthorized-domain':
      'This Forkast address is not authorized for Google sign-in. Use forkast.4dl.ca or finish the Firebase authorized-domain setup.',
    'auth/web-storage-unsupported':
      'This browser is blocking the storage needed to finish Google sign-in. Open Forkast in Safari and try again.',
  };
  const fallback =
    'Google sign-in could not be completed. Your Forkast data was not changed; try again.';
  if (messages[code || message]) return messages[code || message];

  // Firebase Auth codes are stable, non-sensitive diagnostics. Never surface the
  // provider's raw error message, which can contain implementation details.
  return code.startsWith('auth/') ? `${fallback} Reference: ${code}.` : fallback;
}
