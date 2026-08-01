import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  unlink,
  type Auth,
  type User,
} from 'firebase/auth';

const REDIRECT_INTENT_KEY = 'forkast:google-redirect-intent';
const LINK_UID_KEY = 'forkast:google-link-uid';
const LINK_EMAIL_KEY = 'forkast:google-link-email';

type RedirectIntent = 'signin' | 'link';

export type AuthFeedback = {
  kind: 'success' | 'error';
  message: string;
};

function googleProvider(email?: string | null) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    ...(email ? { login_hint: email } : {}),
  });
  return provider;
}

function rememberRedirect(intent: RedirectIntent, user?: User) {
  sessionStorage.setItem(REDIRECT_INTENT_KEY, intent);
  if (intent === 'link' && user) {
    sessionStorage.setItem(LINK_UID_KEY, user.uid);
    if (user.email) sessionStorage.setItem(LINK_EMAIL_KEY, user.email);
  }
}

function clearRedirectMemory() {
  sessionStorage.removeItem(REDIRECT_INTENT_KEY);
  sessionStorage.removeItem(LINK_UID_KEY);
  sessionStorage.removeItem(LINK_EMAIL_KEY);
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
  rememberRedirect('signin');
  await signInWithRedirect(auth, googleProvider());
}

async function validateLinkedUser(
  user: User,
  originalUid: string | null,
  originalEmail: string | null,
): Promise<AuthFeedback> {
  const googleIdentity = user.providerData.find(
    (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID,
  );
  if (originalUid && user.uid !== originalUid) {
    throw new Error('forkast/linked-account-changed');
  }
  if (
    originalEmail &&
    googleIdentity?.email &&
    googleIdentity.email.toLowerCase() !== originalEmail.toLowerCase()
  ) {
    try {
      await unlink(user, GoogleAuthProvider.PROVIDER_ID);
    } catch {
      throw new Error('forkast/google-mismatch-unlink-failed');
    }
    throw new Error('forkast/google-email-mismatch');
  }
  return {
    kind: 'success',
    message:
      'Google is linked to this Forkast account. Sign out, then continue with Google to verify access before the password option is retired.',
  };
}

export async function linkCurrentUserWithGoogle(
  user: User,
): Promise<AuthFeedback | null> {
  if (!shouldRedirect()) {
    const result = await linkWithPopup(user, googleProvider(user.email));
    return validateLinkedUser(result.user, user.uid, user.email);
  }
  rememberRedirect('link', user);
  await linkWithRedirect(user, googleProvider(user.email));
  return null;
}

export async function finishGoogleRedirect(auth: Auth): Promise<AuthFeedback | null> {
  const intent = sessionStorage.getItem(REDIRECT_INTENT_KEY) as RedirectIntent | null;

  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    if (intent === 'link') {
      const originalUid = sessionStorage.getItem(LINK_UID_KEY);
      const originalEmail = sessionStorage.getItem(LINK_EMAIL_KEY);
      return await validateLinkedUser(result.user, originalUid, originalEmail);
    }

    return { kind: 'success', message: 'Signed in with Google.' };
  } catch (error) {
    return { kind: 'error', message: authMessage(error) };
  } finally {
    clearRedirectMemory();
  }
}

export function authMessage(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    'auth/account-exists-with-different-credential':
      'This email already belongs to the existing Forkast owner account. Sign in with the temporary owner password, then link Google from Settings. Your household data will stay with the same account.',
    'auth/cancelled-popup-request':
      'Google sign-in was cancelled. Choose Continue with Google when you are ready.',
    'auth/credential-already-in-use':
      'That Google identity is already connected to another Firebase account. Forkast will not merge accounts or households automatically.',
    'auth/invalid-credential':
      'The temporary owner email or password does not match. Check both and try again.',
    'auth/invalid-email': 'Enter a valid owner email address.',
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
    'auth/provider-already-linked': 'Google is already linked to this Forkast account.',
    'auth/too-many-requests':
      'Google sign-in is temporarily limited after several attempts. Wait a moment, then try again.',
    'auth/user-token-expired':
      'Your sign-in session expired. Sign in again, then retry linking Google.',
    'auth/unauthorized-domain':
      'This Forkast address is not authorized for Google sign-in. Use forkast.4dl.ca or finish the Firebase authorized-domain setup.',
    'auth/web-storage-unsupported':
      'This browser is blocking the storage needed to finish Google sign-in. Open Forkast in Safari and try again.',
    'forkast/google-email-mismatch':
      'That Google email does not match the existing owner account, so it was not linked. Choose the Google account with the same email.',
    'forkast/linked-account-changed':
      'Forkast could not verify the original account after linking. The migration was stopped; use the temporary owner sign-in and try again.',
    'forkast/google-mismatch-unlink-failed':
      'A different Google email was selected and Forkast could not remove it automatically. Do not sign out. Retry from Settings before the password option is retired.',
  };
  const fallback =
    'Google sign-in could not be completed. Your Forkast data was not changed; try again.';
  if (messages[code || message]) return messages[code || message];

  // Firebase Auth codes are stable, non-sensitive diagnostics. Never surface the
  // provider's raw error message, which can contain implementation details.
  return code.startsWith('auth/') ? `${fallback} Reference: ${code}.` : fallback;
}
