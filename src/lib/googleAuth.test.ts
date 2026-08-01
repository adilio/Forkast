import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  getRedirectResult: vi.fn(),
  linkWithRedirect: vi.fn(),
  signInWithRedirect: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    static PROVIDER_ID = 'google.com';
    setCustomParameters = vi.fn();
  },
  ...firebaseMocks,
}));

import {
  authMessage,
  finishGoogleRedirect,
  linkCurrentUserWithGoogle,
  startGoogleSignIn,
} from './googleAuth';

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('Google authentication recovery messages', () => {
  it('guides an existing password account through explicit linking', () => {
    expect(
      authMessage({ code: 'auth/account-exists-with-different-credential' }),
    ).toMatch(/temporary owner password.*link Google from Settings/i);
  });

  it('does not promise an automatic provider or household merge', () => {
    expect(authMessage({ code: 'auth/credential-already-in-use' })).toMatch(
      /will not merge accounts or households automatically/i,
    );
  });

  it('gives a recoverable network error', () => {
    expect(authMessage({ code: 'auth/network-request-failed' })).toMatch(
      /check your connection and try again/i,
    );
  });

  it('falls back without exposing raw provider errors', () => {
    expect(authMessage(new Error('private provider detail'))).toBe(
      'Google sign-in could not be completed. Your Forkast data was not changed; try again.',
    );
  });

  it('starts Google sign-in with a remembered redirect intent', async () => {
    const auth = { name: 'auth' };
    await startGoogleSignIn(auth as never);

    expect(sessionStorage.getItem('forkast:google-redirect-intent')).toBe('signin');
    expect(firebaseMocks.signInWithRedirect).toHaveBeenCalledWith(
      auth,
      expect.any(Object),
    );
  });

  it('links Google to the signed-in user rather than creating another user', async () => {
    const user = { uid: 'original-uid', email: 'owner@example.test' };
    await linkCurrentUserWithGoogle(user as never);

    expect(sessionStorage.getItem('forkast:google-link-uid')).toBe('original-uid');
    expect(firebaseMocks.linkWithRedirect).toHaveBeenCalledWith(
      user,
      expect.any(Object),
    );
  });

  it('accepts a linked Google result only for the original UID and email', async () => {
    sessionStorage.setItem('forkast:google-redirect-intent', 'link');
    sessionStorage.setItem('forkast:google-link-uid', 'original-uid');
    sessionStorage.setItem('forkast:google-link-email', 'owner@example.test');
    firebaseMocks.getRedirectResult.mockResolvedValue({
      user: {
        uid: 'original-uid',
        providerData: [{ providerId: 'google.com', email: 'OWNER@example.test' }],
      },
    });

    await expect(finishGoogleRedirect({} as never)).resolves.toMatchObject({
      kind: 'success',
      message: expect.stringMatching(/same Forkast account|Google is linked/i),
    });
    expect(firebaseMocks.unlink).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('forkast:google-link-uid')).toBeNull();
  });

  it('unlinks a mismatched Google email before reporting recovery', async () => {
    const user = {
      uid: 'original-uid',
      providerData: [{ providerId: 'google.com', email: 'wrong@example.test' }],
    };
    sessionStorage.setItem('forkast:google-redirect-intent', 'link');
    sessionStorage.setItem('forkast:google-link-uid', 'original-uid');
    sessionStorage.setItem('forkast:google-link-email', 'owner@example.test');
    firebaseMocks.getRedirectResult.mockResolvedValue({ user });

    await expect(finishGoogleRedirect({} as never)).resolves.toEqual({
      kind: 'error',
      message:
        'That Google email does not match the existing owner account, so it was not linked. Choose the Google account with the same email.',
    });
    expect(firebaseMocks.unlink).toHaveBeenCalledWith(user, 'google.com');
  });
});
