import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { updateMeApi } from '../api/auth';
import { InlineError } from '../components/ui/ErrorMessage';
import { Spinner } from '../components/ui/Spinner';

const REGIONS = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
];

const PLATFORM_OPTIONS = [
  { value: 'netflix', label: 'Netflix' },
  { value: 'hulu', label: 'Hulu' },
  { value: 'disney-plus', label: 'Disney+' },
  { value: 'hbo-max', label: 'Max (HBO)' },
  { value: 'amazon-prime', label: 'Amazon Prime' },
  { value: 'apple-tv-plus', label: 'Apple TV+' },
  { value: 'peacock', label: 'Peacock' },
  { value: 'paramount-plus', label: 'Paramount+' },
  { value: 'espn-plus', label: 'ESPN+' },
  { value: 'fubo-tv', label: 'FuboTV' },
];

// ─── Auth section (shown to unauthenticated users) ─────────────────────────

function AuthSection() {
  const { login, register } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr?.response?.data?.message ?? 'Authentication failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input-base"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="input-base"
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        {mode === 'register' && (
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm password
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="input-base"
              placeholder="••••••••"
            />
          </div>
        )}

        {error && <InlineError message={error} />}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? (
            <>
              <Spinner size="sm" />
              {mode === 'login' ? 'Signing in…' : 'Creating account…'}
            </>
          ) : mode === 'login' ? (
            'Sign in'
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

// ─── Profile section (shown to authenticated users) ───────────────────────

function ProfileSection() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [region, setRegion] = useState(user?.region ?? 'US');
  const [subscriptions, setSubscriptions] = useState<string[]>(user?.subscriptions ?? []);
  const [notifyEmail, setNotifyEmail] = useState(user?.notify_email ?? true);
  const [notifyPush, setNotifyPush] = useState(user?.notify_push ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setRegion(user.region);
      setSubscriptions(user.subscriptions);
      setNotifyEmail(user.notify_email);
      setNotifyPush(user.notify_push);
    }
  }, [user]);

  if (!user) return null;

  const toggleSubscription = (platform: string) => {
    setSubscriptions((prev) =>
      prev.includes(platform) ? prev.filter((s) => s !== platform) : [...prev, platform],
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await updateMeApi({
        region,
        subscriptions,
        notify_email: notifyEmail,
        notify_push: notifyPush,
      });
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message ?? 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Account card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Account</h2>
            <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Sign out
          </button>
        </div>
      </div>

      {/* Preferences card */}
      <div className="card p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Preferences</h2>

        <div className="space-y-6">
          {/* Region */}
          <div>
            <label htmlFor="pref-region" className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              id="pref-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="input-base max-w-xs"
            >
              {REGIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Used to show streaming availability in your country.
            </p>
          </div>

          {/* Subscriptions */}
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              My streaming subscriptions
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Select platforms you subscribe to for personalised results.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {PLATFORM_OPTIONS.map(({ value, label }) => {
                const isChecked = subscriptions.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleSubscription(value)}
                    aria-pressed={isChecked}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      isChecked
                        ? 'border-brand-300 bg-brand-50 text-brand-700 font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`h-3 w-3 flex-shrink-0 rounded-sm border-2 ${
                        isChecked ? 'border-brand-600 bg-brand-600' : 'border-gray-400'
                      }`}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications card */}
      <div className="card p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Notifications</h2>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Email notifications</p>
              <p className="text-xs text-gray-400">
                Receive emails when watchlist titles become available or are leaving.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={(e) => setNotifyPush(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Push notifications</p>
              <p className="text-xs text-gray-400">
                Receive browser push notifications for watchlist alerts.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <Spinner size="sm" /> Saving…
            </>
          ) : (
            'Save settings'
          )}
        </button>

        {success && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Saved successfully
          </span>
        )}

        {error && <InlineError message={error} />}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>
      {isAuthenticated ? <ProfileSection /> : <AuthSection />}
    </div>
  );
}
