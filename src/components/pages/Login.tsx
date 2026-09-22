import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { validatePassword } from '../../lib/security';
import { AuthShell } from '../brand/AuthShell';

type LoginMode = 'signin' | 'signup' | 'forgot';

const fieldClass =
  'w-full rounded-full border border-aryx-line bg-aryx-ink/[0.06] py-3 pl-11 pr-4 text-aryx-ink outline-none placeholder:text-aryx-faint';

export default function Login({ onLoginSuccess }: { onLoginSuccess?: () => void } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn: authSignIn, signUp, requestPasswordReset, loading, profileReady } = useAuth();
  const [mode, setMode] = useState<LoginMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (location.pathname !== '/login') return;
    if (hasRedirected.current) return;
    if (!loading && profileReady && user) {
      if (sessionStorage.getItem('cos_password_recovery') === '1') {
        navigate('/auth/reset-password', { replace: true });
        return;
      }
      hasRedirected.current = true;
      navigate('/home', { replace: true });
    }
  }, [user, loading, profileReady, navigate, location.pathname]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('mpb_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (rememberMe) localStorage.setItem('mpb_remembered_email', email);
      else localStorage.removeItem('mpb_remembered_email');
      await authSignIn(email, password);
      onLoginSuccess?.();
      setSuccess('Signed in.');
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const validation = validatePassword(password, undefined, { email });
      if (!validation.valid) {
        throw new Error(validation.errors[0] || 'Password does not meet requirements.');
      }
      await signUp(email, password);
      setSuccess('Check your email to confirm this address.');
      setMode('signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSuccess('If that email has an ARYX CEO account, we sent a reset link.');
      setMode('signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === 'signup' ? 'Create access' : mode === 'forgot' ? 'Reset password' : 'Welcome back';
  const subtitle = mode === 'forgot'
    ? 'We will email a one-time link to choose a new password.'
    : 'One login. One CEO workspace.';

  return (
    <AuthShell>
      <div className="rounded-[2rem] bg-aryx-ink/5 p-1.5 ring-1 ring-aryx-line">
        <div className="rounded-[calc(2rem-0.375rem)] bg-aryx-elevated p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <h1 className="font-display text-3xl font-semibold text-aryx-ink">{title}</h1>
          <p className="mt-2 text-sm text-aryx-muted">{subtitle}</p>

          {!isSupabaseConfigured && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-200">Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-300">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}

          <form
            onSubmit={mode === 'signup' ? handleSignUp : mode === 'forgot' ? handleForgot : handleLogin}
            className="mt-8 space-y-5"
          >
            <label className="block text-sm text-aryx-muted">
              Email
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-aryx-faint" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={fieldClass} />
              </div>
            </label>
            {mode !== 'forgot' && (
              <label className="block text-sm text-aryx-muted">
                Password
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-aryx-faint" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${fieldClass} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-aryx-faint">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs text-aryx-faint">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember email
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                  className="text-aryx-accent"
                >
                  Forgot password
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured}
              className="w-full rounded-full bg-aryx-accent py-3 text-sm font-medium text-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Working…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setSuccess(null);
            }}
            className="mt-6 w-full text-center text-xs text-aryx-faint"
          >
            {mode === 'signup' || mode === 'forgot' ? 'Already have access? Sign in' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
