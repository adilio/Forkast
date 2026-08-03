import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Icon } from './Icon';

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={compact ? 'rail-sign-out' : 'button button--danger'}
      disabled={!auth}
      onClick={() => {
        if (auth) void signOut(auth);
      }}
    >
      {compact && <Icon name="log-out" />}
      <span>Sign out</span>
    </button>
  );
}
