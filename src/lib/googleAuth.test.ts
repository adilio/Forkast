import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  getRedirectResult: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
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
  startGoogleSignIn,
  usesRedirectFlow,
} from './googleAuth';

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('Google-only authentication', () => {
  it('uses a popup for desktop Google sign-in', async () => {
    const auth = { name: 'auth' };
    await startGoogleSignIn(auth as never);

    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledWith(
      auth,
      expect.any(Object),
    );
    expect(firebaseMocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('keeps redirect auth for iPhone and installed PWAs', () => {
    expect(usesRedirectFlow('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', false)).toBe(
      true,
    );
    expect(usesRedirectFlow('desktop browser', true)).toBe(true);
    expect(usesRedirectFlow('desktop browser', false)).toBe(false);
  });

  it('reports nothing when no redirect sign-in is pending', async () => {
    firebaseMocks.getRedirectResult.mockResolvedValue(null);

    await expect(finishGoogleRedirect({} as never)).resolves.toBeNull();
  });

  it('confirms a completed redirect sign-in', async () => {
    firebaseMocks.getRedirectResult.mockResolvedValue({ user: { uid: 'google-uid' } });

    await expect(finishGoogleRedirect({} as never)).resolves.toEqual({
      kind: 'success',
      message: 'Signed in with Google.',
    });
  });

  it('turns a failed redirect into recoverable copy', async () => {
    firebaseMocks.getRedirectResult.mockRejectedValue({
      code: 'auth/network-request-failed',
    });

    await expect(finishGoogleRedirect({} as never)).resolves.toEqual({
      kind: 'error',
      message:
        'Forkast could not reach Google sign-in. Check your connection and try again.',
    });
  });

  it('gives direct recovery copy for a cancelled popup', () => {
    expect(authMessage({ code: 'auth/popup-closed-by-user' })).toMatch(
      /closed before it finished/i,
    );
    expect(authMessage({ code: 'auth/popup-blocked' })).toMatch(
      /allow the sign-in window/i,
    );
  });

  it('never mentions passwords or account linking', () => {
    const codes = [
      'auth/account-exists-with-different-credential',
      'auth/cancelled-popup-request',
      'auth/network-request-failed',
      'auth/operation-not-allowed',
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/redirect-cancelled-by-user',
      'auth/too-many-requests',
      'auth/user-disabled',
      'auth/user-token-expired',
      'auth/unauthorized-domain',
      'auth/web-storage-unsupported',
      'auth/internal-error',
    ];
    for (const code of codes) {
      expect(authMessage({ code })).not.toMatch(/password|link/i);
    }
  });

  it('falls back without exposing raw provider errors', () => {
    expect(authMessage(new Error('private provider detail'))).toBe(
      'Google sign-in could not be completed. Your Forkast data was not changed; try again.',
    );
  });

  it('surfaces only a safe Firebase code for an unmapped auth error', () => {
    expect(
      authMessage({
        code: 'auth/internal-error',
        message: 'private provider detail',
      }),
    ).toBe(
      'Google sign-in could not be completed. Your Forkast data was not changed; try again. Reference: auth/internal-error.',
    );
  });
});
