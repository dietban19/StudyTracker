// src/components/AuthGate.jsx
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../config/firebase/firebase';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ children }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--color-background)]">
        <div className="animate-pulse w-[90%] max-w-sm">
          <div className="h-8 w-32 bg-black/10 rounded mb-4" />
          <div className="h-20 w-full bg-black/10 rounded" />
        </div>
      </div>
    );
  }

  if (user) return children;

  return <AuthScreen onGoogle={signInWithGoogle} />;
}

function AuthScreen({ onGoogle }) {
  const [tab, setTab] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function handleEmailAuth(e) {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      if (tab === 'in') {
        await signInWithEmailAndPassword(auth, email.trim(), pw);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), pw);
      }
    } catch (error) {
      setErr(prettyFirebaseError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg p-6 sm:p-8 backdrop-blur-sm">
          {/* Brand */}
          <div className="mb-6 text-center">
            <Badge>Semester Tracker</Badge>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-[var(--color-text-900)]">
              Stay on top of your semester.
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-600)]">
              Clean, fast, and made for students.
            </p>
          </div>

          {/* Tabs */}
          <div
            className="flex items-center gap-2 rounded-lg bg-[var(--color-muted)] p-1"
            role="tablist"
            aria-label="Authentication"
          >
            <TabButton
              active={tab === 'in'}
              onClick={() => setTab('in')}
              role="tab"
              aria-selected={tab === 'in'}
            >
              Sign in
            </TabButton>
            <TabButton
              active={tab === 'up'}
              onClick={() => setTab('up')}
              role="tab"
              aria-selected={tab === 'up'}
            >
              Create
            </TabButton>
          </div>

          {/* Google */}
          <button
            onClick={onGoogle}
            type="button"
            aria-label="Continue with Google"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-[var(--color-text-900)] hover:bg-[var(--color-muted)] transition text-sm sm:text-base"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="mx-3 text-xs text-[var(--color-text-500)]">
              or
            </span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[var(--color-text-700)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm sm:text-base text-[var(--color-text-900)] placeholder-[var(--color-text-500)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                placeholder="you@school.edu"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--color-text-700)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={pwVisible ? 'text' : 'password'}
                  autoComplete={
                    tab === 'in' ? 'current-password' : 'new-password'
                  }
                  required
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 pr-10 text-sm sm:text-base text-[var(--color-text-900)] placeholder-[var(--color-text-500)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setPwVisible((v) => !v)}
                  aria-label={pwVisible ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 grid place-items-center text-[var(--color-text-500)] hover:text-[var(--color-text-700)]"
                  tabIndex={-1}
                >
                  {pwVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {err && (
              <p
                className="text-sm"
                style={{ color: 'var(--color-danger)' }}
                role="alert"
              >
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-white font-medium transition disabled:opacity-60 text-sm sm:text-base"
              style={{ background: 'var(--color-text-900)' }}
            >
              {submitting
                ? tab === 'in'
                  ? 'Signing in…'
                  : 'Creating…'
                : tab === 'in'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--color-text-500)] leading-snug">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>

      <footer className="pb-4 text-center text-xs text-[var(--color-text-500)]">
        Protected by Firebase Authentication
      </footer>
    </div>
  );
}

/* -------------------------- UI helpers -------------------------- */

function TabButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={[
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition outline-offset-2',
        active
          ? 'bg-white shadow text-[var(--color-text-900)]'
          : 'text-[var(--color-text-700)] hover:text-[var(--color-text-900)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Badge({ children }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white shadow"
      style={{ background: 'var(--color-text-900)' }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: 'var(--color-primary-400)' }}
      />
      {children}
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.95h5.6c-.24 1.27-1.69 3.72-5.6 3.72-3.37 0-6.12-2.78-6.12-6.22S8.63 5.43 12 5.43c1.93 0 3.22.82 3.96 1.53l2.7-2.6C17.43 2.64 14.94 1.5 12 1.5 6.75 1.5 2.5 5.85 2.5 11s4.25 9.5 9.5 9.5c5.49 0 9.1-3.86 9.1-9.3 0-.62-.07-1.09-.16-1.58H12z"
      />
    </svg>
  );
}

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path d="M3 3l18 18-1.5 1.5L18 19.5A13.6 13.6 0 0 1 12 21C5 21 2 14 2 14a17.2 17.2 0 0 1 5.1-6.68L1.5 4.5 3 3Zm7.5 7.5l3 3a4 4 0 0 0-3-3ZM21.95 10.76C21.33 9.67 18.86 5 12 5c-1.03 0-1.98.11-2.85.31l2.2 2.2c.2-.03.41-.05.65-.05a4 4 0 0 1 4 4c0 .24-.02.45-.05.65l4.48 4.48C22.78 14.88 24 12 24 12s-.5-1.05-2.05-1.24Z" />
    </svg>
  );
}

/* -------------------------- Error helper -------------------------- */

function prettyFirebaseError(err) {
  const msg = String(err?.message || err || '');
  if (msg.includes('auth/email-already-in-use'))
    return 'That email is already in use. Try signing in.';
  if (msg.includes('auth/invalid-email'))
    return 'Please enter a valid email address.';
  if (msg.includes('auth/weak-password'))
    return 'Password should be at least 6 characters.';
  if (
    msg.includes('auth/invalid-credential') ||
    msg.includes('auth/wrong-password')
  )
    return 'Incorrect email or password.';
  if (msg.includes('auth/user-not-found'))
    return 'No account found with that email.';
  return 'Something went wrong. Please try again.';
}
